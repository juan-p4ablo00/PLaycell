/* Loja: "Como chegar" e o mapa abrem a escolha do app (Google Maps, Waze, Apple Mapas, Uber, 99);
   "Copiar endereço" copia e avisa. Os apps recebem as coordenadas da loja: a avenida não tem número no endereço. */
(() => {
  'use strict';

  const sheet = document.getElementById('gs');
  const toast = document.getElementById('toast');
  if (!sheet || typeof sheet.showModal !== 'function') return; // sem <dialog>: os botões do mapa seguem no link do Google Maps (ver HTML)

  const STORE = { name: 'Play Cell', lat: -3.8374923, lng: -49.1017017, full: 'Av. Tancredo Neves, Centro, Goianésia do Pará - PA, 68639-000' };
  const enc = encodeURIComponent;
  const ll = `${STORE.lat},${STORE.lng}`;
  const android = /Android/i.test(navigator.userAgent);
  const LINKS = {
    google: 'https://maps.app.goo.gl/TBpPqgsaHeXkrfpd6', // a ficha da loja no Google Maps
    waze: `https://waze.com/ul?ll=${ll}&navigate=yes`,
    apple: `https://maps.apple.com/?ll=${ll}&q=${enc(STORE.name)}`,
    uber: `https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[latitude]=${STORE.lat}&dropoff[longitude]=${STORE.lng}&dropoff[nickname]=${enc(STORE.name)}&dropoff[formatted_address]=${enc(STORE.full)}`,
    99: android ? `intent://open#Intent;scheme=taxis99;package=com.taxis99;S.browser_fallback_url=${enc('https://play.google.com/store/apps/details?id=com.taxis99')};end` : 'https://99app.com/',
  };

  let timer = 0;
  const say = (msg) => {
    toast.textContent = msg;
    toast.classList.add('is-on');
    clearTimeout(timer);
    timer = setTimeout(() => toast.classList.remove('is-on'), 2600);
  };
  const copy = (quiet) => {
    const done = () => say(quiet ? 'Endereço copiado. Se precisar, cole como destino.' : 'Endereço copiado');
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(STORE.full).then(done, () => say(STORE.full));
    else say(STORE.full);
  };

  // Trava a rolagem do fundo (a largura da barra volta como padding: nada "pula")
  const root = document.documentElement;
  const open = () => {
    root.style.setProperty('--sbw', `${innerWidth - root.clientWidth}px`);
    root.classList.add('is-locked');
    sheet.showModal();
  };
  sheet.addEventListener('close', () => root.classList.remove('is-locked'));
  sheet.addEventListener('click', (e) => { if (e.target === sheet) sheet.close(); }); // clique no fundo escurecido

  sheet.querySelectorAll('[data-app]').forEach((a) => {
    a.href = LINKS[a.dataset.app];
    if (a.dataset.app === 'apple' && android) a.hidden = true;
    a.addEventListener('click', () => {
      if (a.dataset.app === 'uber' || a.dataset.app === '99') copy(true); // se o destino não vier preenchido, é só colar
      setTimeout(() => sheet.close(), 250);
    });
  });
  document.querySelectorAll('[data-route]').forEach((b) => b.addEventListener('click', (e) => { e.preventDefault(); open(); }));
  document.querySelectorAll('[data-copy]').forEach((b) => b.addEventListener('click', () => {
    if (sheet.open) sheet.close();
    copy(false);
  }));
})();
