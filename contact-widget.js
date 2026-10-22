(() => {
  const widget = document.querySelector('.contact-widget');
  if(!widget) return;
  const toggle = widget.querySelector('.contact-widget__toggle');
  const panel = widget.querySelector('#contact-widget-panel');
  const desktop = window.matchMedia('(min-width: 901px)');
  if(!toggle || !panel) return;

  const setOpen = (open, restoreFocus = false) => {
    const expanded = Boolean(open && desktop.matches && !document.body.classList.contains('locked'));
    toggle.setAttribute('aria-expanded', String(expanded));
    panel.hidden = !expanded;
    if(restoreFocus && desktop.matches && !document.body.classList.contains('locked')) toggle.focus();
  };

  toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
  widget.querySelector('[data-contact-close]')?.addEventListener('click', () => setOpen(false, true));
  widget.addEventListener('click', event => {
    if(event.target.closest('a')) setOpen(false);
  });
  document.addEventListener('click', event => {
    if(!widget.contains(event.target)) setOpen(false);
  });
  document.addEventListener('keydown', event => {
    if(event.key !== 'Escape' || panel.hidden || document.body.classList.contains('locked')) return;
    setOpen(false, true);
  });
  desktop.addEventListener('change', () => {
    if(!desktop.matches) setOpen(false);
  });
})();
