/* Instagram: (1) o celular nasce no meio e cresce com a rolagem até a tela do perfil (--g, 0 → 1);
   (2) dentro dele, um Instagram que funciona: abas Posts/Reels, post aberto com a legenda real e
   destaques como story. Sem JS, cada post continua sendo um link para o post de verdade. */
(() => {
  'use strict';

  const insta = document.getElementById('instagram');
  const app = document.getElementById('ig');
  if (!insta || !app) return;
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 1. crescer com a rolagem ---------- */
  // Tamanhos e posição são medidos no resize; no scroll só se escreve um número (sem layout a cada evento).
  if (!still) {
    const phone = insta.querySelector('.mock__phone');
    let top = 0, span = 1, last = '';
    insta.classList.add('is-live');
    const grow = () => {
      const g = Math.min(Math.max((scrollY - top) / (span * .8), 0), 1); // os últimos 20% seguram o perfil na tela
      const v = (g * g * (3 - 2 * g)).toFixed(4);
      if (v === last) return;
      last = v;
      insta.style.setProperty('--g', v);
      insta.classList.toggle('is-end', g > .9);
    };
    const place = () => {
      top = insta.getBoundingClientRect().top + scrollY;
      span = Math.max(insta.offsetHeight - innerHeight, 1);
      const w = phone.offsetWidth, h = phone.offsetHeight; // tamanho de layout: o scale não entra aqui
      insta.style.setProperty('--s0', Math.min(.5 * innerHeight / h, .62 * innerWidth / w).toFixed(3));
      insta.style.setProperty('--s1', Math.min(.8 * innerHeight / h, .94 * innerWidth / w).toFixed(3));
      last = '';
      grow();
    };
    // setTimeout: mede depois que as fontes e as seções acima assentam a altura
    const later = () => setTimeout(place);
    addEventListener('scroll', grow, { passive: true });
    addEventListener('resize', later);
    addEventListener('load', later);
    document.fonts?.ready.then(later);
    later();
  }

  /* ---------- 2. o app ---------- */
  const home = app.querySelector('.ig__home');
  const postView = app.querySelector('.ig__post');
  const storyView = app.querySelector('.ig__story');
  const grid = app.querySelector('.ig__grid');
  const tabs = [...app.querySelectorAll('[role="tab"]')];
  const AVATAR = 'assets/instagram/avatar.webp';
  const PROFILE = 'https://www.instagram.com/play_cell_goianesia/';
  const icon = (id) => `<svg aria-hidden="true"><use href="#${id}"/></svg>`;
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let opener = null;

  const show = (view) => {
    [home, postView, storyView].forEach((v) => { v.hidden = v !== view; });
  };
  const backHome = () => {
    clearTimeout(storyTimer);
    show(home);
    if (opener) opener.focus({ preventScroll: true });
  };

  // Abas: Posts mostra tudo; Reels, só os reels (e em pé, como no app)
  tabs.forEach((t) => t.addEventListener('click', () => {
    tabs.forEach((x) => x.setAttribute('aria-selected', x === t));
    grid.dataset.tab = t.dataset.tab;
  }));

  // Post aberto
  grid.addEventListener('click', (e) => {
    const a = e.target.closest('a');
    if (!a) return;
    e.preventDefault();
    opener = a;
    const { author, date, caption } = a.dataset;
    const img = a.querySelector('img');
    postView.innerHTML = `
      <p class="ig__bar"><button type="button" data-back aria-label="Voltar ao perfil">${icon('i-back')}</button>Publicações</p>
      <p class="ig__author"><img src="${AVATAR}" alt="" width="26" height="26">${esc(author)}</p>
      <img class="ig__media" src="${img.src}" alt="${esc(img.alt)}" width="${img.getAttribute('width')}" height="${img.getAttribute('height')}">
      <p class="ig__icons" aria-hidden="true">${icon('i-heart')}${icon('i-comment')}${icon('i-send')}</p>
      ${caption ? `<p class="ig__caption"><b>${esc(author)}</b>${esc(caption)}</p>` : ''}
      <p class="ig__date">${esc(date)}</p>
      <a class="ig__go" href="${a.href}" target="_blank" rel="noopener noreferrer">Ver no Instagram<span class="sr"> (abre em nova aba)</span></a>`;
    show(postView);
    postView.scrollTop = 0;
    postView.querySelector('[data-back]').focus({ preventScroll: true });
  });
  postView.addEventListener('click', (e) => { if (e.target.closest('[data-back]')) backHome(); });

  // Destaques como story: 5 s cada, toque avança, X ou ESC fecha
  const stories = [...app.querySelectorAll('[data-story]')].map((b) => ({ name: b.textContent.trim(), src: b.querySelector('img').src }));
  let storyAt = 0, storyTimer = 0;
  const playStory = (i) => {
    if (i >= stories.length) { backHome(); return; }
    storyAt = i;
    const s = stories[i];
    storyView.innerHTML = `
      <p class="ig__progress" aria-hidden="true">${stories.map((_, k) => `<i class="${k === i ? 'is-now' : ''}" style="--done:${k < i ? 1 : 0}"></i>`).join('')}</p>
      <div>
        <p class="ig__shead"><img src="${AVATAR}" alt="" width="26" height="26">play_cell_goianesia <small>${esc(s.name)}</small>
          <button type="button" data-close aria-label="Fechar destaque">${icon('i-x')}</button></p>
      </div>
      <img class="ig__simg" src="${s.src}" alt="Destaque ${esc(s.name)}" width="150" height="150">
      <a class="ig__go" href="${PROFILE}" target="_blank" rel="noopener noreferrer">Ver o destaque completo no Instagram<span class="sr"> (abre em nova aba)</span></a>`;
    show(storyView);
    storyView.querySelector('[data-close]').focus({ preventScroll: true });
    clearTimeout(storyTimer);
    storyTimer = setTimeout(() => playStory(storyAt + 1), 5000);
  };
  app.querySelectorAll('[data-story]').forEach((b, i) => b.addEventListener('click', () => { opener = b; playStory(i); }));
  storyView.addEventListener('click', (e) => {
    if (e.target.closest('a')) return;               // o link segue normalmente
    if (e.target.closest('[data-close]')) backHome();
    else playStory(storyAt + 1);                      // tocar na tela passa para o próximo
  });

  app.addEventListener('keydown', (e) => { if (e.key === 'Escape' && home.hidden) { e.stopPropagation(); backHome(); } });
})();
