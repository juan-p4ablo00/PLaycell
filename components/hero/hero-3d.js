/* Hero 3D: o mesmo celular que se desmonta, agora com volume, material e luz (WebGL puro, sem biblioteca).
   A coreografia continua toda no CSS: a cada desenho este script lê a transformação calculada de .device e de
   cada .layer (que o hero-animation.js move com --p) e coloca peças 3D exatamente ali. Arrastar gira o aparelho.
   Sem WebGL, nada muda: o .device em CSS continua aparecendo. Modelo desenhado aqui mesmo: nenhum arquivo 3D. */
(() => {
  'use strict';

  const stage = document.getElementById('stage');
  const device = stage && stage.querySelector('.device');
  if (!device) return;

  const canvas = document.createElement('canvas');
  canvas.className = 'stage__gl';
  canvas.setAttribute('aria-hidden', 'true');
  const gl = canvas.getContext('webgl', { antialias: true, alpha: true, premultipliedAlpha: true });
  if (!gl) return;

  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = matchMedia('(pointer: coarse)').matches;

  /* ---------- matrizes 4x4 (coluna a coluna, como o matrix3d do CSS) ---------- */
  const ident = () => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  const mul = (a, b) => {
    const o = new Array(16);
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
      o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
    }
    return o;
  };
  const move = (x, y, z) => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1];
  const rotY = (a) => { const c = Math.cos(a), s = Math.sin(a); return [c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]; };
  const rotX = (a) => { const c = Math.cos(a), s = Math.sin(a); return [1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]; };
  const cssMatrix = (el) => {
    const t = getComputedStyle(el).transform;
    if (!t || t === 'none') return ident();
    const v = t.slice(t.indexOf('(') + 1, -1).split(',').map(parseFloat);
    return v.length === 16 ? v : [v[0], v[1], 0, 0, v[2], v[3], 0, 0, 0, 0, 1, 0, v[4], v[5], 0, 1];
  };

  /* ---------- geometria: tudo sai de dois primitivos ---------- */
  // Contorno de um retângulo arredondado: [x, y, nx, ny] por ponto
  const outline = (w, h, r, seg = 10) => {
    const pts = [], cx = w / 2 - r, cy = h / 2 - r;
    [[cx, cy, 0], [-cx, cy, .5], [-cx, -cy, 1], [cx, -cy, 1.5]].forEach(([ox, oy, a0]) => {
      for (let i = 0; i <= seg; i++) {
        const a = (a0 + i / seg * .5) * Math.PI, c = Math.cos(a), s = Math.sin(a);
        pts.push([ox + c * r, oy + s * r, c, s]);
      }
    });
    return pts;
  };
  const mesh = () => ({ p: [], n: [], i: [] });
  const vert = (m, x, y, z, nx, ny, nz) => { m.p.push(x, y, z); m.n.push(nx, ny, nz); return m.p.length / 3 - 1; };

  // Placa com laterais arredondadas (vidro, bateria, chip, lente: muda só a proporção)
  const slab = (m, w, h, d, r, x = 0, y = 0, z = 0) => {
    const hz = d / 2, re = Math.min(hz, r * .9);
    const core = outline(w - 2 * re, h - 2 * re, Math.max(r - re, .01));
    const N = core.length, P = 6, b0 = m.p.length / 3;
    for (let k = 0; k <= P; k++) {
      const t = (k / P - .5) * Math.PI, c = Math.cos(t), s = Math.sin(t);
      const a = c / re, b = s / hz, L = Math.hypot(a, b) || 1;
      core.forEach(([px, py, nx, ny]) => vert(m, x + px + nx * re * c, y + py + ny * re * c, z + hz * s, nx * a / L, ny * a / L, b / L));
    }
    for (let k = 0; k < P; k++) for (let i = 0; i < N; i++) {
      const p = b0 + k * N + i, q = b0 + k * N + (i + 1) % N;
      m.i.push(p, q, p + N, q, q + N, p + N);
    }
    [1, -1].forEach((sgn) => {
      const c0 = vert(m, x, y, z + hz * sgn, 0, 0, sgn), f0 = m.p.length / 3;
      core.forEach(([px, py]) => vert(m, x + px, y + py, z + hz * sgn, 0, 0, sgn));
      for (let i = 0; i < N; i++) m.i.push(c0, f0 + i, f0 + (i + 1) % N);
    });
    return m;
  };

  // Moldura: anel com furo (chassi, borda da capinha, aro das lentes)
  const ring = (m, w, h, r, t, d, x = 0, y = 0, z = 0) => {
    const o = outline(w, h, r), n = outline(w - 2 * t, h - 2 * t, Math.max(r - t, .01)), N = o.length, hz = d / 2;
    const loop = (pts, zz, nz, flip) => {
      const b = m.p.length / 3;
      pts.forEach(([px, py, nx, ny]) => vert(m, x + px, y + py, z + zz, nz ? 0 : nx * flip, nz ? 0 : ny * flip, nz));
      return b;
    };
    const strip = (A, B) => { for (let i = 0; i < N; i++) { const j = (i + 1) % N; m.i.push(A + i, A + j, B + i, A + j, B + j, B + i); } };
    strip(loop(o, hz, 1), loop(n, hz, 1));
    strip(loop(o, -hz, -1), loop(n, -hz, -1));
    strip(loop(o, hz, 0, 1), loop(o, -hz, 0, 1));
    strip(loop(n, hz, 0, -1), loop(n, -hz, 0, -1));
    return m;
  };

  /* ---------- texturas desenhadas em canvas (tela, placa, bateria) ---------- */
  const tex2d = (w, h, paint) => {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    paint(c.getContext('2d'), w, h);
    return c;
  };
  const mark = (g, x, y, s) => { // o "play" da marca
    g.fillStyle = '#e01424';
    g.beginPath(); g.roundRect(x - s / 2, y - s / 2, s, s, s * .27); g.fill();
    g.fillStyle = '#fff';
    g.beginPath(); g.moveTo(x - s * .1, y - s * .21); g.lineTo(x + s * .23, y); g.lineTo(x - s * .1, y + s * .21); g.fill();
  };
  const paintScreen = (g, w, h) => {
    const bg = g.createRadialGradient(w * .5, h * .16, 0, w * .5, h * .16, h * .8);
    bg.addColorStop(0, '#2c0b12'); bg.addColorStop(.72, '#0a0609'); bg.addColorStop(1, '#0a0609');
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    const glow = g.createRadialGradient(w / 2, h / 2, w * .25, w / 2, h / 2, h * .62);
    glow.addColorStop(0, 'rgba(224,20,36,0)'); glow.addColorStop(1, 'rgba(224,20,36,.32)');
    g.fillStyle = glow; g.fillRect(0, 0, w, h);
    g.shadowColor = 'rgba(224,20,36,.6)'; g.shadowBlur = w * .09;
    mark(g, w / 2, h * .47, w * .2);
    g.shadowBlur = 0;
    g.fillStyle = 'rgba(244,241,238,.78)';
    g.font = `600 ${Math.round(w * .052)}px Sora, Inter, sans-serif`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    if ('letterSpacing' in g) g.letterSpacing = `${Math.round(w * .014)}px`;
    g.fillText('PLAY CELL', w / 2, h * .47 + w * .2);
  };
  const paintBoard = (g, w, h) => {
    g.fillStyle = '#141016'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(224,20,36,.38)'; g.lineWidth = 2;
    for (let x = 18; x < w; x += 22) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h * (.35 + (x % 3) * .2)); g.lineTo(x + 14, h); g.stroke(); }
    g.strokeStyle = 'rgba(244,241,238,.08)'; g.lineWidth = 1;
    for (let y = 16; y < h; y += 16) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    g.fillStyle = 'rgba(214,180,120,.55)';
    for (let i = 0; i < 26; i++) g.fillRect((i * 37) % (w - 10) + 4, (i * 53) % (h - 10) + 4, 6, 6);
  };
  const paintBattery = (g, w, h) => {
    g.fillStyle = '#121015'; g.fillRect(0, 0, w, h);
    const r = g.createLinearGradient(0, 0, 0, h);
    r.addColorStop(0, '#d0172a'); r.addColorStop(1, '#5c0912');
    g.fillStyle = r; g.beginPath(); g.roundRect(w * .1, h * .1, w * .8, h * .8, w * .05); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = 2; g.stroke();
    g.fillStyle = 'rgba(255,255,255,.85)';
    g.font = `600 ${Math.round(w * .07)}px Sora, Inter, sans-serif`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('PLAY CELL', w / 2, h / 2);
  };

  /* ---------- shaders ---------- */
  const VS = `
attribute vec3 aP; attribute vec3 aN;
uniform mat4 uM, uProj; uniform mat3 uNM;
varying vec3 vW, vN, vL, vON;
void main(){ vec4 w = uM * vec4(aP, 1.0); vW = w.xyz; vN = uNM * aN; vL = aP; vON = aN; gl_Position = uProj * w; }`;
  const FS = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec3 uCol, uCam; uniform float uMet, uRough, uAlpha, uMode, uSheen, uBand; uniform vec4 uRect; uniform sampler2D uTex;
varying vec3 vW, vN, vL, vON;
// Caixa de luz retangular na direção D, vista no reflexo R
float panel(vec3 R, vec3 D, vec2 size, float blur){
  float k = dot(R, D); if (k <= 0.0) return 0.0;
  vec3 X = normalize(cross(vec3(0.0, 1.0, 0.0), D)); vec3 Y = cross(D, X);
  vec2 q = abs(vec2(dot(R, X), dot(R, Y)) / k);
  vec2 e = 1.0 - smoothstep(size - blur, size + blur, q);
  return e.x * e.y;
}
// Estúdio escuro: luz principal à esquerda, recorte branco e um filete vermelho da marca à direita
vec3 studio(vec3 R, float rough){
  float b = 0.03 + rough * 0.7;
  vec3 c = mix(vec3(0.01), vec3(0.07, 0.065, 0.07), smoothstep(-0.3, 1.0, R.y));
  c += vec3(1.7) * panel(R, normalize(vec3(-0.55, 0.5, 0.7)), vec2(0.42, 0.28), b);
  c += vec3(0.8) * panel(R, normalize(vec3(0.05, 1.0, 0.2)), vec2(0.9, 0.5), b);
  c += vec3(2.4, 0.22, 0.28) * panel(R, normalize(vec3(0.95, 0.15, -0.15)), vec2(0.07, 1.2), b);
  c += vec3(1.1) * panel(R, normalize(vec3(-0.92, 0.2, 0.25)), vec2(0.05, 1.1), b);
  return c / (1.0 + rough * 2.5);
}
void main(){
  vec3 N = normalize(vN); N.y = -N.y;                 // o CSS mede y para baixo; a luz pensa em y para cima
  vec3 V = normalize(uCam - vW); V.y = -V.y;
  if (dot(N, V) < 0.0) N = -N;
  vec3 R = reflect(-V, N);
  vec2 uv = (vL.xy - uRect.xy) / uRect.zw + 0.5;
  bool front = vON.z > 0.5;
  vec3 base = uCol, emis = vec3(0.0);
  if (front && uMode > 0.5) {
    vec3 t = pow(texture2D(uTex, uv).rgb, vec3(2.2));
    if (uMode < 1.5) base = t; else emis = t * 1.15;
  }
  float nv = clamp(dot(N, V), 0.0, 1.0);
  vec3 F0 = mix(vec3(0.04), base, uMet);
  vec3 F = F0 + (1.0 - F0) * pow(1.0 - nv, 5.0) * (1.0 - uRough * 0.6);
  vec3 L = normalize(vec3(-0.45, 0.6, 0.7));
  vec3 diff = base * (1.0 - uMet) * (mix(vec3(0.035), vec3(0.22), N.y * 0.5 + 0.5) + vec3(1.0) * max(dot(N, L), 0.0)
            + vec3(0.55, 0.05, 0.07) * max(dot(N, normalize(vec3(0.9, 0.1, -0.3))), 0.0));
  vec3 col = diff + studio(R, uRough) * F + emis;
  float a = uAlpha;
  if (uSheen > 0.5 && front) {                          // película: a faixa de luz atravessa conforme a rolagem
    float s = uv.x * 0.8 + uv.y * 0.6;
    float band = exp(-pow((s - mix(-0.4, 1.8, uBand)) * 6.0, 2.0));
    col += vec3(band * 0.9); a = clamp(a + band * 0.3 + pow(1.0 - nv, 3.0) * 0.12, 0.0, 1.0);
  }
  col = 1.0 - exp(-col * 1.25);
  col = pow(col, vec3(1.0 / 2.2));
  gl_FragColor = vec4(col * a, a);
}`;
  const compile = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
  const prog = gl.createProgram();
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, VS));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FS));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return; // sem 3D: o CSS segue sozinho
  gl.useProgram(prog);
  const U = {};
  ['uM', 'uProj', 'uNM', 'uCol', 'uCam', 'uMet', 'uRough', 'uAlpha', 'uMode', 'uSheen', 'uBand', 'uRect', 'uTex'].forEach((k) => { U[k] = gl.getUniformLocation(prog, k); });
  const aP = gl.getAttribLocation(prog, 'aP'), aN = gl.getAttribLocation(prog, 'aN');
  gl.enableVertexAttribArray(aP); gl.enableVertexAttribArray(aN);
  gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL);
  gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

  const upload = (m) => {
    const buf = (data, target, Type) => { const b = gl.createBuffer(); gl.bindBuffer(target, b); gl.bufferData(target, new Type(data), gl.STATIC_DRAW); return b; };
    return { p: buf(m.p, gl.ARRAY_BUFFER, Float32Array), n: buf(m.n, gl.ARRAY_BUFFER, Float32Array), i: buf(m.i, gl.ELEMENT_ARRAY_BUFFER, Uint16Array), count: m.i.length };
  };
  const texture = (src) => {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
    return t;
  };
  const white = (() => { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255])); return t; })();
  const lin = (hex) => [1, 3, 5].map((i) => Math.pow(parseInt(hex.slice(i, i + 2), 16) / 255, 2.2));

  /* ---------- o aparelho, peça por peça (mesmas camadas do CSS) ---------- */
  let parts = [], builtW = 0;
  const build = () => {
    const W = device.offsetWidth, H = device.offsetHeight;
    if (!W || W === builtW) return;
    builtW = W;
    const T = W * .105, r = W * .105, k = W / 248;
    const camX = -W * .24, camY = -H * .355, camS = W * .42;
    const tw = 512, th = Math.round(512 * H / W);
    const part = (layer, m, mat, rect = [0, 0, W, H]) => parts.push(Object.assign({ el: stage.querySelector(`.layer--${layer}`), g: upload(m), rect }, mat));
    const M = (col, met, rough, extra) => Object.assign({ col: lin(col), met, rough, alpha: 1, mode: 0, sheen: 0, tex: white }, extra);
    parts.forEach((p) => [p.g.p, p.g.n, p.g.i].forEach((b) => gl.deleteBuffer(b)));
    parts = [];

    // película: vidro quase invisível, com a faixa de luz
    part('film', slab(mesh(), W - 2, H - 2, 1.2, r, 0, 0, T / 2 + 3), M('#ffffff', 0, .05, { alpha: .05, sheen: 1 }));
    // tela: vidro preto com a imagem acesa
    part('screen', slab(mesh(), W - 3, H - 3, 2.4, r, 0, 0, T / 2 + 1.2), M('#060507', 0, .07, { mode: 2, tex: texture(tex2d(tw, th, paintScreen)) }));
    // placa + dois chips em relevo
    const bw = W - 16 * k, bh = H * .6, by = -H * .14;
    part('board', slab(mesh(), bw, bh, 2, 8 * k, 0, by, T / 2 - 4), M('#1a1519', .25, .5, { mode: 1, tex: texture(tex2d(tw, Math.round(tw * bh / bw), paintBoard)) }), [0, by, bw, bh]);
    const chips = mesh();
    slab(chips, W * .34, W * .26, 2.6, 3 * k, -W * .1, by - bh * .12, T / 2 - 1.6);
    slab(chips, W * .22, W * .16, 2.2, 2.5 * k, W * .2, by + bh * .18, T / 2 - 1.8);
    part('board', chips, M('#221d24', .3, .3));
    // bateria
    const aw = W - 30 * k, ah = H * .44, ay = H * .2;
    part('batt', slab(mesh(), aw, ah, T * .4, 10 * k, 0, ay, -T * .05), M('#141016', .1, .42, { mode: 1, tex: texture(tex2d(tw, Math.round(tw * ah / aw), paintBattery)) }), [0, ay, aw, ah]);
    // estrutura: aro de metal, traseira de vidro e o módulo de câmera
    part('frame', ring(mesh(), W, H, r * 1.12, 7 * k, T), M('#4c4550', 1, .3));
    part('frame', slab(mesh(), W - 4, H - 4, 2, r, 0, 0, -T / 2 + 1), M('#141116', 0, .16));
    part('frame', slab(mesh(), camS, camS, 4, W * .11, camX, camY, -T / 2 - 4), M('#1c191e', 0, .18));
    const lens = mesh(), rims = mesh(), ls = W * .15;
    [[-1, -1], [1, -1], [-1, 1]].forEach(([dx, dy]) => {
      const lx = camX + dx * camS * .23, ly = camY + dy * camS * .23;
      slab(lens, ls, ls, 5, ls / 2, lx, ly, -T / 2 - 6.5);
      ring(rims, ls + 5 * k, ls + 5 * k, ls / 2 + 2.5 * k, 2.6 * k, 5.4, lx, ly, -T / 2 - 6.5);
    });
    part('frame', lens, M('#030304', 0, .03));
    part('frame', rims, M('#8d8892', 1, .22));
    // capinha: fundo + borda que abraça o aparelho, com o recorte da câmera
    part('case', slab(mesh(), W + 20 * k, H + 20 * k, 3, r * 1.4, 0, 0, -T / 2 - 3.5), M('#f4f1ee', 0, .55));
    part('case', ring(mesh(), W + 20 * k, H + 20 * k, r * 1.4, 9 * k, T + 6, 0, 0, -1.2), M('#f4f1ee', 0, .55));
    part('case', ring(mesh(), camS + 8 * k, camS + 8 * k, W * .13, 3 * k, 3.4, camX, camY, -T / 2 - 3.5), M('#2a252c', 0, .4));
  };

  /* ---------- desenho: só quando algo muda ---------- */
  let yaw = 0, pitch = 0;
  const draw = () => {
    const sw = stage.clientWidth, sh = stage.clientHeight;
    if (!sw || !sh || stage.getBoundingClientRect().bottom < 0) return;
    build();
    const dpr = Math.min(devicePixelRatio || 1, coarse ? 1.5 : 2);
    const bw = Math.round(sw * dpr), bh = Math.round(sh * dpr);
    if (canvas.width !== bw || canvas.height !== bh) { canvas.width = bw; canvas.height = bh; }
    gl.viewport(0, 0, bw, bh);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Projeção = a perspectiva do CSS do .stage (distância e ponto de fuga), em pixels do palco
    const cs = getComputedStyle(stage);
    const d = parseFloat(cs.perspective) || 1500;
    const [ox, oy] = cs.perspectiveOrigin.split(' ').map(parseFloat);
    gl.uniformMatrix4fv(U.uProj, false, [2 / sw, 0, 0, 0, 0, -2 / sh, 0, 0, -(2 * ox / sw - 1) / d, -(1 - 2 * oy / sh) / d, -1 / 1000, -1 / d, -1, 1, 0, 1]);
    gl.uniform3f(U.uCam, ox, oy, d);
    gl.uniform1f(U.uBand, Math.min(Math.max(parseFloat(stage.style.getPropertyValue('--p')) || (still ? 1 : 0), 0), 1) * 1.2 + yaw * .08);

    const same = device.offsetParent === stage;
    const cx = device.offsetLeft - (same ? 0 : stage.offsetLeft) + device.offsetWidth / 2;
    const cy = device.offsetTop - (same ? 0 : stage.offsetTop) + device.offsetHeight / 2;
    const base = mul(mul(move(cx, cy, 0), cssMatrix(device)), mul(rotY(yaw), rotX(pitch)));
    const layerM = new Map();
    const order = parts.filter((p) => p.alpha >= 1).concat(parts.filter((p) => p.alpha < 1));
    order.forEach((p) => {
      if (!layerM.has(p.el)) layerM.set(p.el, mul(base, cssMatrix(p.el)));
      const m = layerM.get(p.el);
      gl.uniformMatrix4fv(U.uM, false, m);
      gl.uniformMatrix3fv(U.uNM, false, [m[0], m[1], m[2], m[4], m[5], m[6], m[8], m[9], m[10]]);
      gl.uniform3fv(U.uCol, p.col);
      gl.uniform1f(U.uMet, p.met); gl.uniform1f(U.uRough, p.rough); gl.uniform1f(U.uAlpha, p.alpha);
      gl.uniform1f(U.uMode, p.mode); gl.uniform1f(U.uSheen, p.sheen);
      gl.uniform4fv(U.uRect, p.rect);
      gl.bindTexture(gl.TEXTURE_2D, p.tex);
      gl.depthMask(p.alpha >= 1);
      gl.bindBuffer(gl.ARRAY_BUFFER, p.g.p); gl.vertexAttribPointer(aP, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, p.g.n); gl.vertexAttribPointer(aN, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, p.g.i);
      gl.drawElements(gl.TRIANGLES, p.g.count, gl.UNSIGNED_SHORT, 0);
    });
    gl.depthMask(true);
  };

  /* ---------- arrastar para girar (solta: volta para a pose da rolagem) ---------- */
  let drag = null, vel = 0, spin = 0;
  const settle = () => {
    spin = 0;
    if (drag) return;
    const rest = Math.round(yaw / (2 * Math.PI)) * 2 * Math.PI;
    if (still) { yaw = rest; pitch = 0; draw(); return; }
    yaw += vel; vel *= .92;
    const pull = (rest - yaw) * .06, done = Math.abs(vel) < .002 && Math.abs(rest - yaw) < .002 && Math.abs(pitch) < .002;
    if (Math.abs(vel) < .02) yaw += pull;
    pitch *= .86;
    if (done) { yaw = Math.round(yaw / (2 * Math.PI)) * 2 * Math.PI; pitch = 0; draw(); return; }
    draw();
    spin = requestAnimationFrame(settle);
  };
  canvas.addEventListener('pointerdown', (e) => {
    cancelAnimationFrame(spin);
    drag = { x: e.clientX, y: e.clientY };
    vel = 0;
    canvas.setPointerCapture(e.pointerId);
    canvas.classList.add('is-grabbing');
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    drag = { x: e.clientX, y: e.clientY };
    vel = dx * .012;
    yaw += vel;
    pitch = Math.max(-.5, Math.min(.5, pitch - dy * .006));
    draw();
  });
  const release = () => { if (!drag) return; drag = null; canvas.classList.remove('is-grabbing'); settle(); };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);

  /* ---------- partida ---------- */
  canvas.addEventListener('webglcontextlost', () => stage.classList.remove('has-3d'));
  stage.appendChild(canvas);
  stage.classList.add('has-3d');
  addEventListener('scroll', draw, { passive: true });
  addEventListener('resize', draw);
  draw();
  // As letras da tela usam a Sora: redesenha a textura quando a fonte chegar
  if (document.fonts) document.fonts.load('600 20px Sora').then(() => { builtW = 0; draw(); }).catch(() => {});
})();
