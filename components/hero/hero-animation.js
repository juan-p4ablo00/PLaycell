/* Hero: o progresso do scroll vira uma única variável CSS (--p).
   Toda a desmontagem é interpolada em CSS a partir dela.
   Parte aprovada e congelada: não conhece nenhuma outra seção. */
(() => {
  'use strict';

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) return; // o CSS entrega a composição estática

  const hero = document.getElementById('topo');
  const stage = document.getElementById('stage');
  const captions = [...stage.querySelectorAll('.stage__caption b')];

  let act = -1;
  let top = 0;
  let span = 1;

  // O handler de scroll só escreve estilo; a geometria é medida no resize,
  // para não forçar layout a cada evento (e sem rAF, que trava se a aba parar de compor).
  const update = () => {
    const y = window.scrollY;
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
})();
