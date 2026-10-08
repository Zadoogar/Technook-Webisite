/* ─── technook.in: site behaviour ───────────────────────────────────────────
   No framework, no dependencies, loaded with `defer`. Everything here is an
   enhancement: every page reads fully without it.
   ────────────────────────────────────────────────────────────────────────── */

(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(pointer: fine)').matches;

  /* Nav border appears once the page has scrolled. Passive listener + rAF. */
  function initNav() {
    var nav = document.querySelector('.nav');
    if (!nav) return;
    var ticking = false;
    function update() { nav.classList.toggle('is-scrolled', window.scrollY > 8); ticking = false; }
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; window.requestAnimationFrame(update); }
    }, { passive: true });
    update();
  }

  /* Cursor spotlight on cards: the CSS reads --mx/--my. */
  function initSpotlight() {
    if (!finePointer) return;
    document.addEventListener('pointermove', function (e) {
      var card = e.target.closest && e.target.closest('.card');
      if (!card) return;
      var r = card.getBoundingClientRect();
      card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      card.style.setProperty('--my', (e.clientY - r.top) + 'px');
    }, { passive: true });
  }

  /* Hero phones drift against the cursor, each by its own depth (see .ph in home.css). */
  function initParallax() {
    var hero = document.querySelector('.hero'), fan = hero && hero.querySelector('.fan');
    if (!fan || reduce || !finePointer) return;
    hero.addEventListener('pointermove', function (e) {
      var r = hero.getBoundingClientRect();
      fan.style.setProperty('--px', ((e.clientX - r.left) / r.width - .5).toFixed(3));
      fan.style.setProperty('--py', ((e.clientY - r.top) / r.height - .5).toFixed(3));
    }, { passive: true });
    hero.addEventListener('pointerleave', function () {
      fan.style.setProperty('--px', 0);
      fan.style.setProperty('--py', 0);
    });
  }

  /* Screenshot slideshows: crossfade to the next <img> every few seconds while
     on screen; the figure's .cap follows the image's data-cap. */
  function initCycles() {
    var screens = [].slice.call(document.querySelectorAll('[data-cycle]'));
    if (!screens.length || reduce || !('IntersectionObserver' in window)) return;
    var visible = new Set();
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { e.isIntersecting ? visible.add(e.target) : visible.delete(e.target); });
    }, { threshold: .3 });
    screens.forEach(function (s) { io.observe(s); });

    window.setInterval(function () {
      if (document.hidden) return;
      visible.forEach(function (s) {
        var imgs = s.querySelectorAll('img');
        if (imgs.length < 2) return;
        var i = [].findIndex.call(imgs, function (img) { return img.classList.contains('on'); });
        imgs[i].classList.remove('on');
        var next = imgs[(i + 1) % imgs.length];
        next.classList.add('on');
        var cap = s.closest('figure') && s.closest('figure').querySelector('.cap');
        if (cap && next.dataset.cap) cap.textContent = next.dataset.cap;
      });
    }, 3800);
  }

  /* Long doc pages get a table of contents built from their h2s, with scroll-spy. */
  function initToc() {
    var layout = document.querySelector('.doc-layout');
    var toc = layout && layout.querySelector('.toc');
    if (!toc) return;
    var heads = [].slice.call(layout.querySelectorAll('.doc h2'));
    if (heads.length < 5) return;

    var label = document.createElement('p');
    label.className = 'label';
    label.textContent = 'On this page';
    var ol = document.createElement('ol');
    var links = heads.map(function (h) {
      var text = h.textContent.replace(/^\s*\d+\.\s*/, '').trim();
      if (!h.id) {
        var slug = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'section';
        while (document.getElementById(slug)) slug += '-';
        h.id = slug;
      }
      var li = document.createElement('li'), a = document.createElement('a');
      a.href = '#' + h.id;
      a.textContent = text;
      li.appendChild(a);
      ol.appendChild(li);
      return a;
    });
    toc.appendChild(label);
    toc.appendChild(ol);
    layout.classList.add('has-toc');

    if (!('IntersectionObserver' in window)) return;
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        links.forEach(function (a) { a.classList.toggle('on', a.hash === '#' + e.target.id); });
      });
    }, { rootMargin: '-20% 0px -70% 0px' });
    heads.forEach(function (h) { spy.observe(h); });
  }

  initNav();
  initSpotlight();
  initParallax();
  initCycles();
  initToc();
}());
