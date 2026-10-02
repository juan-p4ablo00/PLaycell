(() => {
  'use strict';

  document.documentElement.classList.add('js');

  const PHONE = '5594992204960';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* WhatsApp: mensagem contextual em cada link */
  document.querySelectorAll('a[data-wa]').forEach((a) => {
    a.href = `https://wa.me/${PHONE}?text=${encodeURIComponent(a.dataset.wa)}`;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
  });

  /* Menu mobile */
  const toggle = document.getElementById('toggle');
  const menu = document.getElementById('menu');
  const setMenu = (open) => {
    toggle.setAttribute('aria-expanded', open);
    toggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    menu.classList.toggle('is-open', open);
  };
  toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') { setMenu(false); toggle.focus(); }
  });

  /* Abertura: o progresso do scroll vira uma única variável CSS (--p).
     Toda a desmontagem é interpolada em CSS a partir dela. */
  const nav = document.getElementById('nav');
  const hero = document.getElementById('topo');
  const stage = document.getElementById('stage');
  const captions = [...stage.querySelectorAll('.stage__caption b')];
  const floatWa = document.getElementById('float-wa');

  let act = -1;
  let top = 0;
  let span = 1;

  // O handler de scroll só escreve estilo; a geometria é medida no resize,
  // para não forçar layout a cada evento (e sem rAF, que trava se a aba parar de compor).
  const update = () => {
    const y = window.scrollY;
    nav.classList.toggle('is-scrolled', y > 20);
    floatWa.classList.toggle('is-on', y > top + span * 0.75);
    if (reduced) return;

    const p = Math.min(Math.max((y - top) / span, 0), 1);
    stage.style.setProperty('--p', p.toFixed(4));

    const next = Math.min(4, Math.floor(p * 5));
    if (next !== act) {
      act = next;
      stage.dataset.act = act;
      captions.forEach((b, i) => b.classList.toggle('is-on', i === act));
    }
  };

  const measure = () => {
    top = hero.offsetTop;
    span = Math.max(hero.offsetHeight - window.innerHeight, 1);
    update();
  };

  addEventListener('scroll', update, { passive: true });
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

  document.getElementById('year').textContent = new Date().getFullYear();
})();
