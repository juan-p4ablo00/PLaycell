/* A caminho: o quadro do céu cresce entre "Vem" e "pra loja." (--g) e, em tela cheia, a rolagem percorre a rota
   quadro a quadro até a Play Cell (--k). São 120 quadros WebP desenhados num canvas: os arquivos comprimidos ficam
   na memória (≈1,5 MB), mas decodificados só os que estão perto do quadro atual (decodificar os 120 passaria de 400 MB).
   Com reduced-motion ou sem suporte, fica o HTML estático: o quadro final, as etapas e o botão de rota. */
(() => {
  'use strict';

  const sec = document.getElementById('caminho');
  if (!sec || matchMedia('(prefers-reduced-motion: reduce)').matches || !('createImageBitmap' in window)) return;

  const N = 120;
  const GROW = 1, ROUTE = 4.5;          // em alturas de tela (a seção tem 1 + 4,5 + uma pausa no fim: 690vh no CSS)
  const WINDOW = 10;                    // quadros decodificados de cada lado do atual
  const FOCUS_X = .56;                  // no retrato, a rota e o pino ficam um pouco à direita do centro do quadro
  const BG = '#060607';                 // a cor das bordas do próprio mapa: o enquadramento emenda sem faixa

  const card = sec.querySelector('.grow__card');
  const steps = [...sec.querySelectorAll('.route__steps li')];
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  canvas.className = 'grow__canvas';
  canvas.setAttribute('aria-hidden', 'true');
  card.prepend(canvas);
  sec.classList.add('is-live');

  const dir = matchMedia('(max-width: 759px)').matches ? 'assets/location/route-m/' : 'assets/location/route/';
  const url = (i) => `${dir}${String(i + 1).padStart(3, '0')}.webp`;
  const blobs = new Array(N);
  const bitmaps = new Map();
  const decoding = new Set();
  let want = 0, shown = -1, started = false, top = 0, vh = innerHeight;

  /* ---------- desenho ---------- */
  const fit = () => {
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    const w = Math.round(canvas.clientWidth * dpr), h = Math.round(canvas.clientHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; shown = -1; }
  };
  const nearest = () => {
    for (let d = 0; d < N; d++) {
      if (bitmaps.has(want - d)) return want - d;
      if (bitmaps.has(want + d)) return want + d;
    }
    return -1;
  };
  const draw = () => {
    const i = nearest();
    if (i < 0 || i === shown) return;
    shown = i;
    const img = bitmaps.get(i), W = canvas.width, H = canvas.height;
    // Cobre a tela; em tela retrato o zoom tem teto (1,9× o "caber inteiro"), senão sobraria só uma fresta da rota
    const s = Math.min(Math.max(W / img.width, H / img.height), (W / img.width) * 1.9);
    const dw = img.width * s, dh = img.height * s;
    const dx = dw > W ? Math.min(0, Math.max(W - dw, W / 2 - dw * FOCUS_X)) : (W - dw) / 2;
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, W, H);
    ctx.drawImage(img, dx, (H - dh) / 2, dw, dh);
  };

  /* ---------- quadros: baixar (todos, comprimidos) e decodificar (só a janela) ---------- */
  const decode = (i) => {
    if (i < 0 || i >= N || !blobs[i] || bitmaps.has(i) || decoding.has(i)) return;
    decoding.add(i);
    createImageBitmap(blobs[i]).then((bmp) => {
      decoding.delete(i);
      if (Math.abs(i - want) > WINDOW * 2 && i !== 0) { bmp.close(); return; } // a rolagem já passou
      bitmaps.set(i, bmp);
      draw();
    }).catch(() => decoding.delete(i));
  };
  const around = () => {
    for (let d = 0; d <= WINDOW; d++) { decode(want + d); decode(want - d); }
    bitmaps.forEach((bmp, i) => {
      if (i !== 0 && Math.abs(i - want) > WINDOW * 2) { bmp.close(); bitmaps.delete(i); }
    });
  };
  const start = () => {
    started = true;
    // Ordem progressiva: o primeiro, o último e depois a cada 16, 8, 4, 2, 1 — rolar rápido nunca mostra buraco
    const order = [0, N - 1];
    [16, 8, 4, 2, 1].forEach((step) => { for (let i = 0; i < N; i += step) if (!order.includes(i)) order.push(i); });
    let next = 0;
    const worker = () => {
      if (next >= order.length) return;
      const i = order[next++];
      fetch(url(i)).then((r) => (r.ok ? r.blob() : null)).then((blob) => {
        if (blob) { blobs[i] = blob; if (Math.abs(i - want) <= WINDOW || i === 0) decode(i); }
      }).catch(() => {}).finally(worker);
    };
    for (let k = 0; k < 6; k++) worker();
  };

  /* ---------- rolagem ---------- */
  const clamp01 = (v) => Math.min(Math.max(v, 0), 1);
  let lastG = '', lastK = '';
  const update = () => {
    const y = scrollY - top;
    if (!started && y > -vh * 1.5) start();
    const g = clamp01(y / (GROW * vh)), k = clamp01((y - GROW * vh) / (ROUTE * vh));
    const gs = (g * g * (3 - 2 * g)).toFixed(4), ks = k.toFixed(4);
    if (gs !== lastG) { lastG = gs; sec.style.setProperty('--g', gs); }
    if (ks !== lastK) {
      lastK = ks;
      sec.style.setProperty('--k', ks);
      steps.forEach((li) => li.classList.toggle('is-on', k >= parseFloat(li.dataset.at)));
      sec.classList.toggle('is-end', k > .97);
    }
    const i = Math.round(k * (N - 1));
    if (i !== want) { want = i; around(); }
    draw();
  };
  const measure = () => {
    vh = innerHeight;
    top = sec.getBoundingClientRect().top + scrollY;
    fit();
    update();
  };

  addEventListener('scroll', update, { passive: true });
  // setTimeout: mede depois que as seções fixadas acima (hero e serviços) ajustam a própria altura
  const later = () => setTimeout(measure);
  addEventListener('resize', later);
  addEventListener('load', later);
  document.fonts?.ready.then(later);
  later();
})();
