/* Hero: o progresso do scroll vira uma única variável CSS (--p) e toda a desmontagem é interpolada em CSS.
   Arrastar gira o aparelho (--yaw/--pitch); ao soltar, ele volta para a pose da rolagem. */
(() => {
  'use strict';

  const hero = document.getElementById('topo');
  const stage = document.getElementById('stage');
  const phone = stage.querySelector('.phone');
  const captions = [...stage.querySelectorAll('.stage__caption p')];

  /* Arrastar para girar: funciona também com reduced-motion (é a pessoa que move) */
  let drag = null, yaw = 0, pitch = 0;
  phone.addEventListener('pointerdown', (e) => {
    drag = { x: e.clientX, y: e.clientY };
    phone.setPointerCapture(e.pointerId);
    stage.classList.add('is-dragging');
  });
  phone.addEventListener('pointermove', (e) => {
    if (!drag) return;
    yaw += (e.clientX - drag.x) * .45;
    pitch = Math.max(-18, Math.min(18, pitch - (e.clientY - drag.y) * .24));
    drag = { x: e.clientX, y: e.clientY };
    stage.style.setProperty('--yaw', `${yaw.toFixed(1)}deg`);
    stage.style.setProperty('--pitch', `${pitch.toFixed(1)}deg`);
  });
  const release = () => {
    if (!drag) return;
    drag = null; yaw = 0; pitch = 0;
    stage.classList.remove('is-dragging');
    stage.style.setProperty('--yaw', '0deg');
    stage.style.setProperty('--pitch', '0deg');
  };
  phone.addEventListener('pointerup', release);
  phone.addEventListener('pointercancel', release);

  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return; // o CSS entrega a composição estática

  let act = -1;
  let top = 0;
  let span = 1;

  // O handler de scroll só escreve estilo; a geometria é medida no resize,
  // para não forçar layout a cada evento (e sem rAF, que trava se a aba parar de compor).
  const update = () => {
    const p = Math.min(Math.max((window.scrollY - top) / span, 0), 1);
    stage.style.setProperty('--p', p.toFixed(4));
    const next = Math.min(captions.length - 1, Math.floor(p * captions.length));
    if (next !== act) {
      act = next;
      stage.dataset.act = act;
      captions.forEach((c, i) => c.classList.toggle('is-on', i === act));
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
})();
