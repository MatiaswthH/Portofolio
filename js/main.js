/* Matias Sulca - portfolio behaviour
   Four small, self-contained pieces:
   1. the headline morph (the page's signature motion)
   2. experience accordion
   3. nav: mobile menu, current-section marker, stuck border
   4. figures count-up and the signal rail fill
*/

(function () {
  'use strict';

  var calm = window.matchMedia('(prefers-reduced-motion: reduce)');
  document.documentElement.classList.add('js-ready');

  /* ---------- 1. headline morph ---------------------------- */

  // Each pair is the same promise said four ways: the thing a client
  // hands over, and the thing that comes back.
  var PAIRS = [
    ['hojas de cálculo', 'modelos que deciden'],
    ['procesos manuales', 'flujos automáticos'],
    ['preguntas del negocio', 'software que responde'],
    ['ideas sin forma', 'productos en uso']
  ];

  function Slot(root) {
    this.root = root;
    this.text = root.querySelector('.slot-text');
    this.ghost = root.querySelector('.slot-ghost');
  }

  // The slot's own padding, read from CSS rather than derived from the
  // current box: once width is set inline, the box no longer tells us.
  Slot.prototype.pad = function () {
    var cs = window.getComputedStyle(this.root);
    return parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
  };

  // Narrow screens let the slot wrap onto two lines, so a pinned pixel
  // width would clip it. There we crossfade without animating the box.
  function fluid() { return window.innerWidth < 900; }   // matches the CSS breakpoint

  Slot.prototype.lock = function () {
    if (fluid()) { this.root.style.width = ''; return; }
    // Freeze the natural width so the first transition has somewhere to go.
    this.root.style.width = this.text.getBoundingClientRect().width + this.pad() + 'px';
  };

  Slot.prototype.measure = function (value) {
    this.ghost.textContent = value;
    return this.ghost.getBoundingClientRect().width + this.pad();
  };

  Slot.prototype.set = function (value) {
    var self = this;
    this.root.style.width = fluid() ? '' : this.measure(value) + 'px';
    this.text.classList.remove('is-in');
    this.text.classList.add('is-out');
    window.setTimeout(function () {
      self.text.textContent = value;
      self.text.classList.remove('is-out');
      self.text.classList.add('is-in');
    }, 220);
  };

  var slotA = document.querySelector('.slot--a');
  var slotB = document.querySelector('.slot--b');

  if (slotA && slotB && !calm.matches) {
    var slots = [new Slot(slotA), new Slot(slotB)];
    var index = 0;
    var timer = null;

    var advance = function () {
      index = (index + 1) % PAIRS.length;
      slots[0].set(PAIRS[index][0]);
      slots[1].set(PAIRS[index][1]);
    };

    var start = function () {
      if (timer) return;
      slots.forEach(function (slot) { slot.lock(); });
      timer = window.setInterval(advance, 3800);
    };
    var stop = function () {
      window.clearInterval(timer);
      timer = null;
      slots.forEach(function (slot) { slot.root.style.width = ''; });
    };

    // Only runs while the headline is actually on screen.
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) { entry.isIntersecting ? start() : stop(); });
      }, { threshold: 0.3 }).observe(slotA.closest('.headline'));
    } else {
      start();
    }

    document.addEventListener('visibilitychange', function () {
      document.hidden ? stop() : start();
    });

    window.addEventListener('resize', function () {
      if (!timer) return;
      slots.forEach(function (slot, i) {
        slot.root.style.width = fluid() ? '' : slot.measure(PAIRS[index][i]) + 'px';
      });
    });
  }

  /* ---------- 2. experience accordion ---------------------- */

  var roles = Array.prototype.slice.call(document.querySelectorAll('.role'));

  roles.forEach(function (role, i) {
    var button = role.querySelector('.role-btn');
    var body = role.querySelector('.role-body');
    if (!button || !body) return;

    var open = i === 0;
    role.classList.toggle('is-open', open);
    button.setAttribute('aria-expanded', String(open));
    body.hidden = false;

    button.addEventListener('click', function () {
      var next = !role.classList.contains('is-open');
      roles.forEach(function (other) {
        other.classList.remove('is-open');
        var btn = other.querySelector('.role-btn');
        if (btn) btn.setAttribute('aria-expanded', 'false');
      });
      role.classList.toggle('is-open', next);
      button.setAttribute('aria-expanded', String(next));
    });
  });

  /* ---------- 3. navigation -------------------------------- */

  var nav = document.querySelector('.nav');
  var links = document.querySelector('.nav-links');
  var toggle = document.querySelector('.nav-toggle');

  if (toggle && links) {
    var setMenu = function (open) {
      links.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.querySelector('.nav-toggle-label').textContent = open ? 'Cerrar' : 'Menú';
    };
    toggle.addEventListener('click', function () {
      setMenu(!links.classList.contains('is-open'));
    });
    links.addEventListener('click', function (event) {
      if (event.target.closest('a')) setMenu(false);
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && links.classList.contains('is-open')) {
        setMenu(false);
        toggle.focus();
      }
    });
  }

  if (nav) {
    var onScroll = function () {
      nav.classList.toggle('is-stuck', window.scrollY > 8);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // Mark the section the reader is actually in.
  var navAnchors = Array.prototype.slice.call(
    document.querySelectorAll('.nav-links a[href^="#"]')
  );
  var sections = navAnchors
    .map(function (a) { return document.querySelector(a.getAttribute('href')); })
    .filter(Boolean);

  if (sections.length && 'IntersectionObserver' in window) {
    var mark = function (id) {
      navAnchors.forEach(function (a) {
        if (a.getAttribute('href') === '#' + id) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      });
    };
    var spy = new IntersectionObserver(function (entries) {
      var best = entries
        .filter(function (e) { return e.isIntersecting; })
        .sort(function (a, b) { return b.intersectionRatio - a.intersectionRatio; })[0];
      if (best) mark(best.target.id);
    }, { rootMargin: '-45% 0px -45% 0px', threshold: 0 });
    sections.forEach(function (section) { spy.observe(section); });
  }

  /* ---------- 4. figures + rail ---------------------------- */

  function countUp(el) {
    var target = parseInt(el.getAttribute('data-count'), 10);
    if (isNaN(target) || calm.matches) { el.textContent = String(target || el.textContent); return; }
    var duration = 1100;
    var started = null;
    var step = function (now) {
      if (started === null) started = now;
      var p = Math.min((now - started) / duration, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = String(Math.round(target * eased));
      if (p < 1) window.requestAnimationFrame(step);
    };
    window.requestAnimationFrame(step);
  }

  var counters = Array.prototype.slice.call(document.querySelectorAll('[data-count]'));
  var rail = document.querySelector('.rail-line');

  if ('IntersectionObserver' in window) {
    var once = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        once.unobserve(entry.target);
        if (entry.target === rail) rail.style.setProperty('--rail-progress', '1');
        else countUp(entry.target);
      });
    }, { threshold: 0.4 });

    counters.forEach(function (el) { once.observe(el); });
    if (rail) once.observe(rail);
  } else {
    counters.forEach(function (el) { el.textContent = el.getAttribute('data-count'); });
    if (rail) rail.style.setProperty('--rail-progress', '1');
  }

  /* ---------- year --------------------------------------- */

  var year = document.getElementById('year');
  if (year) year.textContent = String(new Date().getFullYear());
})();
