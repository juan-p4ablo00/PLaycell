/* Comportamentos globais: links do WhatsApp, revelação dos cabeçalhos, botão flutuante, ano. */
(() => {
  'use strict';

  document.documentElement.classList.add('js');

  const PHONE = '5594992204960';

  /* WhatsApp: mensagem contextual em cada link */
  document.querySelectorAll('a[data-wa]').forEach((a) => {
    a.href = `https://wa.me/${PHONE}?text=${encodeURIComponent(a.dataset.wa)}`;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
  });

  /* Botão flutuante: aparece a partir de 75% da abertura */
  const hero = document.getElementById('topo');
  const floatWa = document.getElementById('float-wa');
  let threshold = 0;
  const onScroll = () => floatWa.classList.toggle('is-on', window.scrollY > threshold);
  const measure = () => {
    threshold = hero.offsetTop + Math.max(hero.offsetHeight - window.innerHeight, 1) * 0.75;
    onScroll();
  };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', measure);
  measure();

  /* Revelação discreta — só nos cabeçalhos marcados com .reveal */
  const reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        en.target.classList.add('is-in');
        io.unobserve(en.target);
      });
    }, { threshold: .2, rootMargin: '0px 0px -8% 0px' });
    reveals.forEach((el) => {
      // Já no topo da viewport ou acima dela (deep link): mostra de uma vez,
      // senão o IntersectionObserver nunca dispara e o conteúdo some.
      if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add('is-in');
      else io.observe(el);
    });
  } else {
    reveals.forEach((el) => el.classList.add('is-in'));
  }

  /* Vídeos decorativos (cards e Instagram): só rodam enquanto aparecem; com reduced-motion fica o poster */
  const videos = document.querySelectorAll('video[data-inview]');
  if (videos.length && !matchMedia('(prefers-reduced-motion: reduce)').matches && 'IntersectionObserver' in window) {
    const vio = new IntersectionObserver((entries) => entries.forEach(({ target, isIntersecting }) => (
      isIntersecting ? target.play().catch(() => {}) : target.pause())));
    videos.forEach((v) => vio.observe(v));
  }

  /* Aberto/fechado agora (Instagram da loja: seg a sáb, 08:00 às 19:00) */
  const status = document.querySelector('[data-status]');
  if (status) {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Belem', weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(new Date());
    const get = (t) => parts.find((p) => p.type === t).value;
    const mins = Number(get('hour')) * 60 + Number(get('minute'));
    const open = get('weekday') !== 'Sun' && mins >= 8 * 60 && mins < 19 * 60;
    status.classList.toggle('is-open', open);
    status.textContent = open ? 'Aberto agora' : 'Fechado agora';
  }

  document.getElementById('year').textContent = new Date().getFullYear();
})();
