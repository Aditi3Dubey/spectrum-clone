/**
 * @file
 * Industries Slider: dots, pause/play, autoplay and swipe.
 */
((Drupal, once) => {
  Drupal.behaviors.spectrumIndustriesSlider = {
    attach(context) {
      once('industries-slider', '.industries-slider', context).forEach((slider) => {
        const track = slider.querySelector('.industries-slider__track');
        const dotsBox = slider.querySelector('.industries-slider__dots');
        const toggle = slider.querySelector('.industries-slider__toggle');
        const slides = Array.from(track.children);

        if (slides.length < 2) {
          slider.classList.add('is-static');
          return;
        }

        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const delay = 5000;
        let index = 0;
        let timer = null;
        let playing = slider.dataset.autoplay === 'true' && !reduceMotion;

        // A dot button for each slide.
        const dots = slides.map((slide, i) => {
          const dot = document.createElement('button');
          dot.type = 'button';
          dot.className = 'industries-slider__dot';
          dot.setAttribute('aria-label', Drupal.t('Show slide @n of @total', { '@n': i + 1, '@total': slides.length }));
          dot.addEventListener('click', () => {
            goTo(i);
            start();
          });
          dotsBox.append(dot);
          return dot;
        });

        function goTo(i) {
          index = (i + slides.length) % slides.length;
          track.style.transform = `translateX(-${index * 100}%)`;
          slides.forEach((slide, n) => {
            const active = n === index;
            slide.classList.toggle('is-active', active);
            slide.setAttribute('aria-hidden', String(!active));
            slide.inert = !active;
          });
          dots.forEach((dot, n) => dot.setAttribute('aria-current', String(n === index)));
        }

        function stop() {
          clearInterval(timer);
          timer = null;
        }

        function start() {
          stop();
          if (playing) {
            timer = setInterval(() => goTo(index + 1), delay);
          }
        }

        function setPlaying(value) {
          playing = value;
          toggle.classList.toggle('is-paused', !playing);
          toggle.setAttribute('aria-label', playing ? Drupal.t('Pause autoplay') : Drupal.t('Play autoplay'));
          start();
        }

        toggle.addEventListener('click', () => setPlaying(!playing));

        // . mouse hover or keyboard focus, stop the slide.
        slider.addEventListener('mouseenter', stop);
        slider.addEventListener('mouseleave', start);
        slider.addEventListener('focusin', stop);
        slider.addEventListener('focusout', (event) => {
          if (!slider.contains(event.relatedTarget)) {
            start();
          }
        });

        // touch screen slide left/right.
        let startX = null;
        track.addEventListener('pointerdown', (event) => {
          startX = event.clientX;
        });
        track.addEventListener('pointerup', (event) => {
          if (startX === null) {
            return;
          }
          const diff = event.clientX - startX;
          startX = null;
          if (Math.abs(diff) > 50) {
            goTo(index + (diff < 0 ? 1 : -1));
            start();
          }
        });

        goTo(0);
        setPlaying(playing);
        slider.classList.add('is-ready');
      });
    },
  };
})(Drupal, once);
