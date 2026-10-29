/* Quatro ambientes: o scroll vertical conduz uma "câmera" por quatro cenários.
   O scroll escreve só --a (ambiente contínuo, 0 → 3) e --L (luzes, 0 → 1);
   câmera, cor e luz saem do CSS. Geometria é medida no resize. */
(() => {
  'use strict';

  const TRAVEL = 4.4;     // percurso do palco fixado, em alturas de tela
  const INTRO = 0.06;     // trecho inicial em que as luzes do estúdio acendem
  const HOLD = 0.55;      // pausa em cada ambiente, em unidades de transição
  const MIN_HEIGHT = 540; // abaixo disso (celular deitado) a seção fica estática

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const section = document.getElementById('servicos');
  const pin = section.querySelector('.things__pin');
  const head = section.querySelector('.things__head');
  const rooms = [...section.querySelectorAll('.room')];
  const videos = rooms.map((room) => room.querySelector('video'));
  const count = section.querySelector('.things__index b');
  const chargeN = section.querySelector('.charge__n');
  const last = rooms.length - 1;
  const UNITS = rooms.length * HOLD + last; // 4 pausas + 3 transições

  let pinned = false;
  let inView = false;
  let top = 0;
  let span = 1;
  let active = -1;
  let lastA = -1;
  let lastL = -1;

  const smooth = (t) => t * t * (3 - 2 * t); // a câmera "assenta" em cada ambiente

  // progresso (0–1) → ambiente contínuo: pausa, transição suave, pausa…
  const roomAt = (p) => {
    let u = Math.max(0, (p - INTRO) / (1 - INTRO)) * UNITS;
    for (let i = 0; i < last; i++) {
      if (u < HOLD) return i;
      u -= HOLD;
      if (u < 1) return i + smooth(u);
      u -= 1;
    }
    return last;
  };
  // Relógio de cada ambiente (--t, 0 → 1): começa no meio da chegada e termina no fim da pausa.
  // É ele que varre o raio-X, carrega a bateria e passa o reflexo na película.
  let lastT = '';
  const clock = (t) => {
    const key = t.map((v) => v.toFixed(3)).join();
    if (key === lastT) return;
    lastT = key;
    rooms.forEach((room, i) => room.style.setProperty('--t', t[i].toFixed(3)));
    if (chargeN) {
      const n = Math.round(t[2] * 100);
      chargeN.textContent = `${n}%`;
      chargeN.parentElement.classList.toggle('is-full', n >= 100);
    }
  };
  const clamp01 = (v) => Math.min(Math.max(v, 0), 1);

  // inverso: posição de scroll no meio da pausa do ambiente i
  const scrollFor = (i) => top + span * (INTRO + (1 - INTRO) * (i * (HOLD + 1) + HOLD / 2) / UNITS);

  // Só o vídeo do ambiente em cena toca; o próximo já começa a carregar.
  const syncVideos = () => {
    videos.forEach((video, i) => {
      if (!video) return;
      if (pinned && inView && i === active) video.play().catch(() => {});
      else if (!video.paused) video.pause();
      if (inView && i === active + 1) video.preload = 'auto'; // nada carrega antes de a seção aparecer
    });
  };

  const setActive = (i) => {
    active = i;
    count.textContent = `0${i + 1}`;
    rooms.forEach((room, k) => room.classList.toggle('is-active', k === i));
    const video = videos[i];
    if (video && video.hasAttribute('data-once')) video.currentTime = 0; // película: a aplicação recomeça a cada entrada
    syncVideos();
  };

  const update = () => {
    if (!pinned) {
      // Painéis estáticos: o relógio de cada um anda enquanto ele atravessa a tela
      if (!reduced) clock(rooms.map((room) => clamp01((innerHeight * .95 - room.querySelector('.room__object').getBoundingClientRect().top) / (innerHeight * .7))));
      return;
    }
    const y = window.scrollY;
    // Visibilidade pela geometria já medida: determinística e sem depender de IntersectionObserver.
    const visible = y + window.innerHeight > top && y < top + span + window.innerHeight;
    if (visible !== inView) {
      inView = visible;
      syncVideos();
    }
    const p = Math.min(Math.max((y - top) / span, 0), 1);
    const a = roomAt(p);
    const L = Math.min(p / INTRO, 1);
    if (a !== lastA || L !== lastL) {
      lastA = a;
      lastL = L;
      section.style.setProperty('--a', a.toFixed(4));
      section.style.setProperty('--L', L.toFixed(3));
      // tinta do cabeçalho/indicador: escura nos estúdios claros, clara no escuro
      section.dataset.ink = L > 0.5 && a < last - 0.5 ? 'dark' : 'light';
    }
    const u = Math.max(0, (p - INTRO) / (1 - INTRO)) * UNITS;
    clock(rooms.map((_, k) => clamp01((u - k * (HOLD + 1) + .45) / (HOLD + .45))));
    const i = Math.round(a);
    if (i !== active) setActive(i);
  };

  // Texto ampliado (ou fonte grande demais): se o texto de algum ambiente não cabe no palco
  // fixado sem tocar o cabeçalho, a tela ou o objeto, a seção usa os painéis estáticos.
  const fits = () => {
    const wide = matchMedia('(min-width: 900px)').matches;
    const base = pin.getBoundingClientRect().top; // tudo relativo ao palco: a seção quase nunca está na tela aqui
    const headBottom = head.getBoundingClientRect().bottom - base;
    return rooms.every((room, i) => {
      section.style.setProperty('--a', i); // a = i → deslocamento zero: os retângulos são os finais
      const copy = room.querySelector('.room__copy').getBoundingClientRect();
      const object = room.querySelector('.room__object');
      const box = object.getBoundingClientRect();
      if (copy.top - base < headBottom || copy.bottom - base > window.innerHeight) return false;
      if (wide) return copy.right <= box.left || box.right <= copy.left;
      const inset = getComputedStyle(object, '::after').top; // o visor começa abaixo do texto
      return copy.bottom <= box.top + (inset.endsWith('%') ? box.height * parseFloat(inset) / 100 : parseFloat(inset));
    });
  };

  const measure = () => {
    const was = pinned;
    pinned = !reduced && window.innerHeight >= MIN_HEIGHT;
    section.classList.toggle('is-pinned', pinned);
    if (pinned) {
      section.style.setProperty('--pad-x', `${head.getBoundingClientRect().left}px`); // alinha com o título
      section.style.setProperty('--h', `${window.innerHeight * (1 + TRAVEL)}px`);
      if (!fits()) {
        pinned = false;
        section.classList.remove('is-pinned');
      }
    }
    if (was && !pinned) videos.forEach((video) => video && (io.unobserve(video), io.observe(video))); // reavalia quem toca
    if (!pinned) { update(); return; }
    top = section.offsetTop;
    span = Math.max(section.offsetHeight - window.innerHeight, 1);
    lastA = -1;
    update();
  };

  // Modo estático (tela baixa): cada vídeo toca só enquanto aparece. Com reduced-motion, nunca.
  const io = new IntersectionObserver((entries) => {
    entries.forEach(({ target, isIntersecting }) => {
      if (pinned || reduced) return;
      if (isIntersecting) target.play().catch(() => {});
      else target.pause();
    });
  });
  videos.forEach((video) => video && io.observe(video));

  // Teclado: focar um link leva a câmera até o ambiente dele.
  section.addEventListener('focusin', (e) => {
    if (!pinned) return;
    const i = rooms.indexOf(e.target.closest('.room'));
    // setTimeout: o navegador rola o elemento focado depois deste evento e desfaria o nosso scroll.
    if (i >= 0) setTimeout(() => window.scrollTo({ top: scrollFor(i) }));
  });

  addEventListener('scroll', update, { passive: true });
  addEventListener('resize', measure);
  measure();
  // As fontes chegam depois (display=swap) e mudam a altura das seções acima: remede.
  document.fonts?.ready.then(measure);
})();
