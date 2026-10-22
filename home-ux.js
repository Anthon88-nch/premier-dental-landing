/* UX update: native mobile carousels on the home page only. */
(() => {
  'use strict';

  if (!document.body.classList.contains('home-page')) return;

  const mobile = window.matchMedia('(max-width: 767px)');
  const counters = [...document.querySelectorAll('[data-carousel-status]')];
  const carousels = [...document.querySelectorAll('[data-ux-carousel]')].map(track => {
    const slides = [...track.children].filter(slide => slide.hasAttribute('data-ux-slide'));
    const counter = counters.find(item => item.dataset.carouselStatus === track.id);
    return { track, slides, counter, observer: null, resizeObserver: null, timer: 0 };
  }).filter(item => item.slides.length && item.counter);

  function setCounter(carousel, index) {
    const label = `${index + 1} / ${carousel.slides.length}`;
    if (carousel.counter.textContent !== label) carousel.counter.textContent = label;
  }

  function updateFromPosition(carousel) {
    const bounds = carousel.track.getBoundingClientRect();
    // Only horizontal visibility matters: a tall card may extend below the viewport.
    const left = bounds.left + carousel.track.clientLeft;
    const right = left + carousel.track.clientWidth;
    let active = 0;
    let highest = -1;
    carousel.slides.forEach((slide, index) => {
      const box = slide.getBoundingClientRect();
      const visible = Math.max(0, Math.min(box.right, right) - Math.max(box.left, left));
      const ratio = box.width ? visible / box.width : 0;
      if (ratio > highest) {
        highest = ratio;
        active = index;
      }
    });
    setCounter(carousel, active);
  }

  function disconnect(carousel) {
    carousel.observer?.disconnect();
    carousel.resizeObserver?.disconnect();
    carousel.observer = null;
    carousel.resizeObserver = null;
    clearTimeout(carousel.timer);
    carousel.track.removeEventListener('scroll', carousel.onScroll);
    carousel.track.removeEventListener('scrollend', carousel.onScrollEnd);
    carousel.counter.hidden = true;
  }

  function connect(carousel) {
    disconnect(carousel);
    carousel.counter.hidden = false;
    updateFromPosition(carousel);

    if ('IntersectionObserver' in window) {
      carousel.observer = new IntersectionObserver(() => updateFromPosition(carousel), {
        root: carousel.track,
        threshold: Array.from({ length: 21 }, (_, index) => index / 20)
      });
      carousel.slides.forEach(slide => carousel.observer.observe(slide));
    }

    // The observer handles visibility changes. The settled scroll check also covers
    // inertial snapping and browsers which skip intermediate observer thresholds.
    carousel.onScrollEnd = () => updateFromPosition(carousel);
    carousel.onScroll = () => {
      clearTimeout(carousel.timer);
      carousel.timer = setTimeout(carousel.onScrollEnd, 120);
    };
    carousel.track.addEventListener('scroll', carousel.onScroll, { passive: true });
    carousel.track.addEventListener('scrollend', carousel.onScrollEnd);

    if ('ResizeObserver' in window) {
      carousel.resizeObserver = new ResizeObserver(() => updateFromPosition(carousel));
      carousel.resizeObserver.observe(carousel.track);
    }
  }

  function refresh() {
    carousels.forEach(carousel => mobile.matches ? connect(carousel) : disconnect(carousel));
  }

  mobile.addEventListener('change', refresh);
  refresh();
})();
