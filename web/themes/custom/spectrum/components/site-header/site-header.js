/**
 * @file
 * Site Header: mobile menu toggle and search panel.
 */
((Drupal, once) => {
  Drupal.behaviors.spectrumSiteHeader = {
    attach(context) {
      once('site-header', '.site-header', context).forEach((header) => {
        const burger = header.querySelector('.site-header__burger');
        const nav = header.querySelector('.site-header__nav');
        const searchToggle = header.querySelector('.site-header__search-toggle');
        const search = header.querySelector('.site-header__search');

        burger.addEventListener('click', () => {
          const isOpen = burger.getAttribute('aria-expanded') === 'true';
          burger.setAttribute('aria-expanded', String(!isOpen));
          nav.classList.toggle('is-open', !isOpen);
        });

        // The search icon can be switched off in Canvas ("Show search").
        if (!searchToggle || !search) {
          return;
        }

        searchToggle.addEventListener('click', () => {
          const isOpen = searchToggle.getAttribute('aria-expanded') === 'true';
          searchToggle.setAttribute('aria-expanded', String(!isOpen));
          search.hidden = isOpen;
          if (!isOpen) {
            search.querySelector('input').focus();
          }
        });

        header.addEventListener('keydown', (event) => {
          if (event.key === 'Escape' && !search.hidden) {
            search.hidden = true;
            searchToggle.setAttribute('aria-expanded', 'false');
            searchToggle.focus();
          }
        });
      });
    },
  };
})(Drupal, once);
