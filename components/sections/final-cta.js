/* CTA final: o serviço e o modelo escolhidos viram a mensagem do WhatsApp.
   O formulário envia sozinho (GET para wa.me com ?text=); o JS só mantém o texto e a prévia em dia. */
(() => {
  'use strict';

  const form = document.getElementById('ask');
  const preview = document.getElementById('ask-preview');
  if (!form || !preview) return;

  const MSG = {
    pelicula: (m) => `Oi, Play Cell! Preciso de uma película para o meu ${m}.`,
    capinha: (m) => `Oi, Play Cell! Quero ver as capinhas para o meu ${m}.`,
    carregador: (m) => `Oi, Play Cell! Preciso de carregador ou cabo para o meu ${m}.`,
    manutencao: (m) => `Oi, Play Cell! Meu ${m} precisa de manutenção. O que aconteceu foi: `,
  };
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const bubble = preview.parentElement;
  let timer = 0;

  const message = () => MSG[form.servico.value](form.modelo.value.trim() || 'celular');

  // "Digita" como no WhatsApp: apaga só o que mudou e escreve o resto
  const type = (target) => {
    clearTimeout(timer);
    if (still) { preview.textContent = target; return; }
    bubble.classList.add('is-typing');
    const step = () => {
      const now = preview.textContent;
      let same = 0;
      while (same < now.length && now[same] === target[same]) same++;
      if (now.length > same) preview.textContent = now.slice(0, -1);
      else if (now.length < target.length) preview.textContent = target.slice(0, now.length + 1);
      else { bubble.classList.remove('is-typing'); return; }
      timer = setTimeout(step, now.length > same ? 12 : 26);
    };
    step();
  };

  const sync = (animate) => {
    const text = message();
    form.text.value = text;
    if (animate) type(text);
    else { clearTimeout(timer); bubble.classList.remove('is-typing'); preview.textContent = text; }
  };

  form.addEventListener('change', (e) => { if (e.target.name === 'servico') sync(true); });
  form.modelo.addEventListener('input', () => sync(false)); // quem digita é a pessoa: espelha na hora
  sync(false);

  // Na primeira vez que a prévia aparece, a mensagem é digitada do zero
  if (!still && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      preview.textContent = '';
      type(form.text.value);
    }, { threshold: .5 });
    io.observe(bubble);
  }
})();
