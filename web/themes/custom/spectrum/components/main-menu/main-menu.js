/**
 * @file
 * Main Menu: opens mega panels on click. Uses event delegation so items
 * added later (e.g. in the Canvas editor) work too.
 */
((Drupal, once) => {
  const desktop = window.matchMedia('(min-width: 992px)');

  const setOpen = (item, open) => {
    item.classList.toggle('is-open', open);
    const toggle = item.querySelector(':scope > .main-menu__toggle');
    if (toggle) {
      toggle.setAttribute('aria-expanded', String(open));
    }
  };

  const closeAll = (except) => {
    document.querySelectorAll('.main-menu__item.is-open').forEach((item) => {
      if (item !== except) {
        setOpen(item, false);
      }
    });
  };

  Drupal.behaviors.spectrumMainMenu = {
    attach() {
      once('main-menu', 'html').forEach(() => {
        document.addEventListener('click', (event) => {
          const toggle = event.target.closest('.main-menu__toggle');
          if (toggle) {
            const item = toggle.closest('.main-menu__item');
            const willOpen = !item.classList.contains('is-open');
            closeAll(item);
            setOpen(item, willOpen);
            return;
          }
          if (desktop.matches && !event.target.closest('.main-menu')) {
            closeAll();
          }
        });

        document.addEventListener('keydown', (event) => {
          if (event.key !== 'Escape') {
            return;
          }
          const item = event.target.closest('.main-menu__item.is-open');
          if (item) {
            setOpen(item, false);
            item.querySelector('.main-menu__toggle')?.focus();
          }
        });
      });
    },
  };
})(Drupal, once);
