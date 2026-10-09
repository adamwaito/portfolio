// Auto-scroll for recording demo videos. Never deployed (not in netlify.toml's copy list).
// Only loaded when the URL has ?demo (see the loader at the end of index.html).
//
//   ?demo          scroll at the default speed
//   ?demo=150      scroll at 150px per second
//
// Keys: D or Enter = start / restart from the top, Space = pause / resume, Esc = stop.
// Scrolling pauses briefly when the top of each section (and work category) reaches the top of the screen.

(() => {
  const speed = Number(new URLSearchParams(location.search).get('demo')) || 90; // px per second
  const HOLD_MS = 1800; // pause at each stop
  // each stop lines a section's top up with the top of the screen, just below the sticky bar
  // (or the section's own scroll-margin, which also clears the docked bubbles on tablets and phones),
  // the same place the section links land
  const stops = () => {
    const barHeight = document.querySelector('.hero__bar')?.offsetHeight || 0;
    return Array.from(document.querySelectorAll('#work, .work__category, #about, .about__clients, #contact'))
      .map(el => {
        // tablet/phone scroll-margins already include the bar; desktop ones (room for the title) don't
        const scrollMargin = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
        const margin = scrollMargin > barHeight ? scrollMargin : barHeight + scrollMargin;
        return el.getBoundingClientRect().top + window.scrollY - margin;
      })
      .filter(y => y > 0)
      .sort((a, b) => a - b);
  };

  let running = false;
  let paused = false;
  let position = 0;
  let lastTime = 0;
  let holdUntil = 0;
  let pending = [];

  const frame = time => {
    if (!running) return;
    if (!paused && time >= holdUntil) {
      const elapsed = lastTime ? Math.min(time - lastTime, 100) : 16.7;
      position += speed * elapsed / 1000;
      if (pending.length && position >= pending[0]) {
        position = pending.shift();
        holdUntil = time + HOLD_MS;
      }
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (position >= max) { position = max; running = false; }
      window.scrollTo(0, position);
    }
    lastTime = time;
    requestAnimationFrame(frame);
  };

  const start = () => {
    // the page's smooth scroll-behavior would fight a per-frame scroll
    document.documentElement.style.scrollBehavior = 'auto';
    window.scrollTo(0, 0);
    position = 0;
    lastTime = 0;
    holdUntil = performance.now() + HOLD_MS; // a moment on the hero before moving
    pending = stops();
    paused = false;
    if (!running) { running = true; requestAnimationFrame(frame); }
  };

  document.addEventListener('keydown', event => {
    if (event.key === 'd' || event.key === 'D' || event.key === 'Enter') start();
    else if (event.key === ' ' && running) { event.preventDefault(); paused = !paused; lastTime = 0; }
    else if (event.key === 'Escape') running = false;
  });
})();
