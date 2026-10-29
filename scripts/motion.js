/* Motion compartilhado: títulos que sobem de dentro da linha, luz que segue o cursor (e inclina os objetos dos
   serviços), números que contam ao aparecer.
   Com prefers-reduced-motion nada disso roda: o HTML já está no estado final. */
(() => {
  'use strict';

  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;

  const once = (els, fn, threshold = .3) => {
    const io = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      fn(e.target);
    }), { threshold });
    els.forEach((el) => io.observe(el));
  };

  /* Títulos: cada palavra sobe de dentro da própria linha */
  const split = (node, state) => {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType === 1) { if (child.tagName !== 'BR') split(child, state); return; }
      if (child.nodeType !== 3) return;
      const frag = document.createDocumentFragment();
      child.textContent.split(/(\s+)/).forEach((part) => {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.append(part); return; }
        const w = document.createElement('span');
        const inner = document.createElement('span');
        w.className = 'w';
        inner.textContent = part;
        inner.style.setProperty('--wi', state.i++);
        w.append(inner);
        frag.append(w);
      });
      child.replaceWith(frag);
    });
  };
  const titles = [...document.querySelectorAll('#sobre-title, #serv-title, #visitar-title, #ig-title, #final-title')];
  titles.forEach((h) => {
    h.setAttribute('aria-label', h.textContent.replace(/\s+/g, ' ').trim()); // leitor de tela lê a frase inteira
    h.classList.remove('reveal');
    h.classList.add('split');
    split(h, { i: 0 });
  });
  once(titles, (h) => h.classList.add('is-in'), .2);

  /* Números que contam até o valor real */
  const counters = [...document.querySelectorAll('[data-count]')];
  once(counters, (el) => {
    const to = parseFloat(el.dataset.count), dec = +(el.dataset.dec || 0);
    const fmt = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
    const t0 = performance.now();
    const tick = (now) => {
      const k = Math.min((now - t0) / 1400, 1);
      el.textContent = fmt.format(to * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(tick);
    };
    el.textContent = fmt.format(0);
    requestAnimationFrame(tick);
  }, .6);

  /* Luz que segue o cursor; nos objetos dos serviços, também inclina (só com mouse) */
  if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
    document.querySelectorAll('.room__object, [data-light]').forEach((el) => {
      const tilt = el.classList.contains('room__object');
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        el.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`);
        el.style.setProperty('--my', `${(y * 100).toFixed(1)}%`);
        if (tilt) {
          el.style.setProperty('--rx', `${((.5 - y) * 10).toFixed(2)}deg`);
          el.style.setProperty('--ry', `${((x - .5) * 14).toFixed(2)}deg`);
        }
        el.classList.add('is-lit');
      });
      el.addEventListener('pointerleave', () => {
        el.classList.remove('is-lit');
        el.style.setProperty('--rx', '0deg');
        el.style.setProperty('--ry', '0deg');
      });
    });
  }
})();
