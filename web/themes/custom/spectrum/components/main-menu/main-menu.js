/**
 * @file
 * Main Menu: opens mega panels on hover (desktop) and click (all sizes).
 */
((Drupal, once) => {
  Drupal.behaviors.spectrumMainMenu = {
    attach(context) {
      once('main-menu', '.main-menu', context).forEach((menu) => {
        const items = menu.querySelectorAll('.main-menu__item--parent');
        const desktop = window.matchMedia('(min-width: 992px)');

        const close = (item) => {
          item.classList.remove('is-open');
          item.querySelector('.main-menu__toggle').setAttribute('aria-expanded', 'false');
        };
        const open = (item) => {
          items.forEach((other) => other !== item && close(other));
          item.classList.add('is-open');
          item.querySelector('.main-menu__toggle').setAttribute('aria-expanded', 'true');
        };

        items.forEach((item) => {
          const toggle = item.querySelector('.main-menu__toggle');

          toggle.addEventListener('click', () => {
            item.classList.contains('is-open') ? close(item) : open(item);
          });
          item.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
              close(item);
              toggle.focus();
            }
          });
        });

        document.addEventListener('click', (event) => {
          if (desktop.matches && !menu.contains(event.target)) {
            items.forEach(close);
          }
        });
      });
    },
  };
})(Drupal, once);
