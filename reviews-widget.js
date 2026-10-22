(() => {
  const frame = document.getElementById('myReviews__block-widget');
  if (!frame) return;
  const fail = () => {
    frame.style.display = 'none';
    frame.parentElement.classList.add('is-unavailable');
    document.getElementById('widget-error').hidden = false;
  };
  const init = () => {
    if (!window.myReviews?.TileWidget) return fail();
    try {
      Promise.resolve(new window.myReviews.TileWidget({
        uuid: '28bc1af6-09db-47ee-bc82-153124dc8af1',
        name: 'g43114952', additionalFrame: 'none', lang: 'ru', widgetId: '1'
      }).init()).catch(fail);
    } catch { fail(); }
  };
  let started = false;
  const load = () => {
    if (started) return;
    started = true;
    if (window.myReviews?.TileWidget) return init();
    const script = document.createElement('script');
    script.src = 'https://myreviews.dev/widget/dist/tileWidget.js';
    script.async = true;
    script.addEventListener('load', init, {once:true});
    script.addEventListener('error', fail, {once:true});
    document.head.append(script);
  };
  // Reviews are far below the hero: load the external bundle near the viewport.
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { observer.disconnect(); load(); }
    }, {rootMargin:'400px'});
    observer.observe(frame);
  } else load();
})();
