/* Navbar: fundo ao rolar + menu lateral (foco, ESC, clique fora, trava de scroll). */
(() => {
  'use strict';

  const nav = document.getElementById('nav');
  const toggle = document.getElementById('menu-toggle');
  const menu = document.getElementById('menu');
  const links = [...menu.querySelectorAll('.menu__links a')];
  const firstLink = links[0];
  // Tudo fora do header fica inerte com o menu aberto: é o "focus trap" nativo.
  const outside = [...document.body.children].filter((el) => el !== nav);

  const onScroll = () => nav.classList.toggle('is-scrolled', window.scrollY > 20);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Marca no menu a seção que está na metade da tela
  const markCurrent = () => links.forEach((a) => {
    const r = document.querySelector(a.getAttribute('href'))?.getBoundingClientRect();
    if (r && r.top <= innerHeight / 2 && r.bottom > innerHeight / 2) a.setAttribute('aria-current', 'location');
    else a.removeAttribute('aria-current');
  });

  const isOpen = () => toggle.getAttribute('aria-expanded') === 'true';

  const setOpen = (open, returnFocus) => {
    toggle.setAttribute('aria-expanded', open);
    toggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    const root = document.documentElement;
    if (open) root.style.setProperty('--sbw', `${window.innerWidth - root.clientWidth}px`);
    nav.classList.toggle('is-open', open);
    root.classList.toggle('menu-open', open);
    menu.inert = !open;
    outside.forEach((el) => { el.inert = open; });
    if (open) { markCurrent(); firstLink.focus(); }
    else if (returnFocus) toggle.focus();
  };

  toggle.addEventListener('click', () => setOpen(!isOpen(), true));

  // Link do header (menu ou logo) fecha o menu e a âncora segue; clicar na área escurecida também fecha.
  nav.addEventListener('click', (e) => {
    if (!isOpen()) return;
    if (e.target.closest('a')) setOpen(false, false);
    else if (e.target.classList.contains('menu__scrim')) setOpen(false, true);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen()) setOpen(false, true);
  });
})();
