/* ─── technook.in — site behaviour ───────────────────────────────────────────
   No framework, no dependencies. Loaded with `defer`, so it runs after parse
   without blocking render.
   ────────────────────────────────────────────────────────────────────────── */

(function () {
  'use strict';

  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Reveal on scroll.
     IntersectionObserver only — no scroll handler on the critical path.
     Each element unobserves once shown, so this never re-runs. */
  function initReveal() {
    var items = document.querySelectorAll('[data-reveal]');
    if (!items.length) return;

    // Honour the user's motion setting, and degrade safely on old browsers:
    // if we can't animate, content must still be visible.
    if (prefersReducedMotion || !('IntersectionObserver' in window)) {
      Array.prototype.forEach.call(items, function (el) { el.classList.add('is-visible'); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.1 });

    Array.prototype.forEach.call(items, function (el) { io.observe(el); });
  }

  /* Nav border appears only once the page has scrolled, so the header sits
     flush at rest. Passive listener + rAF — never blocks scrolling. */
  function initNav() {
    var nav = document.getElementById('nav');
    if (!nav) return;

    var ticking = false;
    function update() {
      nav.classList.toggle('is-scrolled', window.scrollY > 8);
      ticking = false;
    }

    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    }, { passive: true });

    update();
  }

  initReveal();
  initNav();
}());
