/* Navbar: pílula flutuante; marca a seção em que a pessoa está e, no celular, abre o menu suspenso
   (fecha no link, no ESC e clicando fora). Não é modal: a página continua rolando atrás. */
(() => {
  'use strict';

  const nav = document.getElementById('nav');
  const toggle = document.getElementById('menu-toggle');
  const links = [...nav.querySelectorAll('.nav__menu a[href^="#"]')];

  const onScroll = () => nav.classList.toggle('is-scrolled', window.scrollY > 20);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Seção na metade da tela = item marcado (um observador, nada a cada scroll)
  if ('IntersectionObserver' in window) {
    const byId = new Map(links.map((a) => [a.getAttribute('href').slice(1), a]));
    const io = new IntersectionObserver((entries) => entries.forEach(({ target, isIntersecting }) => {
      const a = byId.get(target.id);
      if (isIntersecting) links.forEach((l) => (l === a ? l.setAttribute('aria-current', 'location') : l.removeAttribute('aria-current')));
      else if (a) a.removeAttribute('aria-current');
    }), { rootMargin: '-50% 0px -50% 0px' });
    byId.forEach((_, id) => { const s = document.getElementById(id); if (s) io.observe(s); });
  }

  const isOpen = () => toggle.getAttribute('aria-expanded') === 'true';
  const setOpen = (open, focusToggle) => {
    toggle.setAttribute('aria-expanded', open);
    toggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    nav.classList.toggle('is-open', open);
    if (open) links[0].focus({ preventScroll: true });
    else if (focusToggle) toggle.focus();
  };

  toggle.addEventListener('click', () => setOpen(!isOpen(), true));
  nav.addEventListener('click', (e) => { if (isOpen() && e.target.closest('.nav__menu a')) setOpen(false, false); });
  document.addEventListener('click', (e) => { if (isOpen() && !nav.contains(e.target)) setOpen(false, false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && isOpen()) setOpen(false, true); });
})();
