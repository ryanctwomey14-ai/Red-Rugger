/* ==========================================================================
   Red Rugger LLC — site behavior
   No dependencies. Every animation here is CSS; JS only toggles state.
   ========================================================================== */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ----------------------------------------------- *
   * Scroll reveal — one observer, unobserve on entry *
   * ----------------------------------------------- */
  (function reveal() {
    var targets = $$('[data-reveal], [data-stagger]');
    if (!targets.length) return;

    if (!('IntersectionObserver' in window)) {
      targets.forEach(function (el) { el.classList.add('is-revealed'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-revealed');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });

    targets.forEach(function (el) {
      // Anything already in view on load should not wait for a scroll.
      if (el.getBoundingClientRect().top < window.innerHeight) {
        el.classList.add('is-revealed');
      } else {
        io.observe(el);
      }
    });
  })();

  /* ------------------------------------------------------------------ *
   * Background video                                                    *
   * The source lives in data-src, so the file is never downloaded on     *
   * phones or under reduced motion — those get the poster instead.       *
   * ------------------------------------------------------------------ */
  (function bgVideo() {
    $$('[data-bg-video] video').forEach(function (video) {
      var src = video.getAttribute('data-src');
      if (!src) return;
      if (reduceMotion) return;
      if (window.matchMedia('(max-width: 768px)').matches) return;
      video.setAttribute('src', src);
      var played = video.play();
      // Autoplay can still be refused; the poster simply stays put.
      if (played && played.catch) played.catch(function () {});
    });
  })();

  /* ---------------------------------------- *
   * Masthead: stuck state + scroll progress  *
   * ---------------------------------------- */
  (function masthead() {
    var head = $('[data-masthead]');
    var bar  = $('[data-progress]');
    if (!head) return;
    var hero = document.querySelector('.hero--media, .page-head--media');
    var ticking = false;

    // Publish the header's real height so a media hero can sit under it.
    function measure() {
      document.documentElement.style.setProperty('--header-h', head.offsetHeight + 'px');
    }
    measure();
    window.addEventListener('resize', measure);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);

    function update() {
      var y = window.scrollY || window.pageYOffset;
      head.classList.toggle('is-stuck', y > 8);

      // Float over a media hero only while the header still overlaps it.
      if (hero) {
        var overlap = hero.getBoundingClientRect().bottom > head.offsetHeight + 8;
        head.classList.toggle('is-over-hero', overlap);
      }
      if (bar) {
        var max = document.documentElement.scrollHeight - window.innerHeight;
        bar.style.setProperty('--progress', max > 0 ? Math.min(y / max, 1) : 0);
      }
      ticking = false;
    }
    function onScroll() {
      if (!ticking) { ticking = true; window.requestAnimationFrame(update); }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    update();
  })();

  /* -------------------------------- *
   * Services dropdown (click + hover) *
   * -------------------------------- */
  (function dropdown() {
    $$('[data-dropdown]').forEach(function (root) {
      var trigger = $('[data-dropdown-trigger]', root);
      var panel   = $('[data-dropdown-panel]', root);
      if (!trigger || !panel) return;
      var hoverTimer;

      function open() {
        clearTimeout(hoverTimer);
        panel.hidden = false;
        // Flush the closed state synchronously so the transition has somewhere
        // to run from. requestAnimationFrame would be throttled in a background
        // tab and leave the panel interactive but invisible.
        void panel.offsetHeight;
        panel.classList.add('is-open');
        trigger.setAttribute('aria-expanded', 'true');
      }
      function close() {
        panel.classList.remove('is-open');
        trigger.setAttribute('aria-expanded', 'false');
        hoverTimer = setTimeout(function () { panel.hidden = true; }, 200);
      }
      function toggle() {
        trigger.getAttribute('aria-expanded') === 'true' ? close() : open();
      }

      trigger.addEventListener('click', toggle);

      if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
        root.addEventListener('mouseenter', open);
        root.addEventListener('mouseleave', close);
      }
      root.addEventListener('focusout', function (e) {
        if (!root.contains(e.relatedTarget)) close();
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && trigger.getAttribute('aria-expanded') === 'true') { close(); trigger.focus(); }
      });
      document.addEventListener('click', function (e) {
        if (!root.contains(e.target)) close();
      });
    });
  })();

  /* ------------------ *
   * Mobile menu drawer *
   * ------------------ */
  (function drawer() {
    var toggle = $('[data-menu-toggle]');
    var menu   = $('[data-menu]');
    if (!toggle || !menu) return;
    var lastFocus = null;

    function open() {
      lastFocus = document.activeElement;
      menu.hidden = false;
      void menu.offsetHeight;
      menu.classList.add('is-open');
      toggle.setAttribute('aria-expanded', 'true');
      toggle.setAttribute('aria-label', 'Close menu');
      document.body.classList.add('is-locked');
      var first = $('a, button', menu);
      if (first) first.focus();
    }
    function close() {
      menu.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Open menu');
      document.body.classList.remove('is-locked');
      setTimeout(function () { menu.hidden = true; }, 220);
      if (lastFocus) lastFocus.focus();
    }
    toggle.addEventListener('click', function () {
      toggle.getAttribute('aria-expanded') === 'true' ? close() : open();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') close();
    });
    // Keep focus inside the drawer while it is open.
    menu.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab') return;
      var items = $$('a[href], button:not([disabled])', menu);
      if (!items.length) return;
      var first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  })();

  /* ------------------------------------------------------------------ *
   * Accordions                                                          *
   * Animates height, then releases to `auto` so the panel keeps          *
   * reflowing if the window resizes or the font loads late.              *
   * ------------------------------------------------------------------ */
  (function accordion() {
    function settle(panel) {
      if (panel._end) { panel.removeEventListener('transitionend', panel._end); panel._end = null; }
      if (panel._timer) { clearTimeout(panel._timer); panel._timer = null; }
    }

    function open(panel) {
      settle(panel);
      panel.setAttribute('data-open', '');
      panel.style.height = panel.scrollHeight + 'px';

      // Release to `auto` once open, so the panel keeps reflowing when the
      // window resizes or a late font changes the text height.
      var release = function () {
        settle(panel);
        if (panel.hasAttribute('data-open')) panel.style.height = 'auto';
      };
      panel._end = function (e) {
        if (e.propertyName === 'height' && e.target === panel) release();
      };
      panel.addEventListener('transitionend', panel._end);
      // transitionend does not fire when the duration is zero (reduced motion)
      // or while the tab is not rendering. Never leave the height pinned.
      panel._timer = setTimeout(release, 400);
    }

    function close(panel) {
      settle(panel);
      // Pin the current height before collapsing, or there is nothing to animate from.
      panel.style.height = panel.scrollHeight + 'px';
      void panel.offsetHeight;
      panel.removeAttribute('data-open');
      panel.style.height = '0px';
    }

    $$('.acc__trigger').forEach(function (trigger) {
      var panel = document.getElementById(trigger.getAttribute('aria-controls'));
      if (!panel) return;

      trigger.addEventListener('click', function () {
        var isOpen = trigger.getAttribute('aria-expanded') === 'true';

        // One open at a time within a group, so the answer you just clicked
        // doesn't get pushed off screen by the one above it.
        var group = trigger.closest('[data-accordion]');
        if (group && !isOpen) {
          $$('.acc__trigger[aria-expanded="true"]', group).forEach(function (other) {
            other.setAttribute('aria-expanded', 'false');
            var op = document.getElementById(other.getAttribute('aria-controls'));
            if (op) close(op);
          });
        }

        trigger.setAttribute('aria-expanded', String(!isOpen));
        isOpen ? close(panel) : open(panel);
      });
    });

    // Deep link: /faq.html#i3 arrives with that answer already open.
    if (location.hash.length > 1) {
      var direct = document.getElementById(location.hash.slice(1));
      if (direct && direct.classList.contains('acc__panel')) {
        var trig = document.querySelector('[aria-controls="' + direct.id + '"]');
        if (trig) { trig.setAttribute('aria-expanded', 'true'); open(direct); }
      }
    }
  })();

  /* ------------------------------------------------------------------ *
   * Forms — inline validation on blur, error below the field, focus the  *
   * first problem on submit. Posts to data-endpoint when one is set.     *
   * ------------------------------------------------------------------ */
  (function forms() {
    $$('form[data-form]').forEach(function (form) {
      var status = $('[data-form-status]', form);

      function fieldOf(input) { return input.closest('.field') || input.closest('.check'); }

      function validate(input) {
        var wrap = fieldOf(input);
        if (!wrap) return true;
        var ok = input.checkValidity();
        wrap.classList.toggle('is-invalid', !ok);
        var err = $('.field__error', wrap);
        if (err && !ok) err.textContent = input.validationMessage;
        input.setAttribute('aria-invalid', ok ? 'false' : 'true');
        return ok;
      }

      $$('input, textarea, select', form).forEach(function (input) {
        input.addEventListener('blur', function () { validate(input); });
        input.addEventListener('input', function () {
          var wrap = fieldOf(input);
          if (wrap && wrap.classList.contains('is-invalid')) validate(input);
        });
      });

      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var inputs = $$('input, textarea, select', form);
        var firstBad = null;
        inputs.forEach(function (input) { if (!validate(input) && !firstBad) firstBad = input; });
        if (firstBad) { firstBad.focus(); return; }

        var button = $('button[type="submit"]', form);
        var label = button ? button.textContent : '';
        if (button) { button.disabled = true; button.textContent = 'Sending…'; }

        var endpoint = form.getAttribute('data-endpoint');
        var done = function (ok) {
          if (button) { button.disabled = false; button.textContent = label; }
          if (!status) return;
          status.classList.add('is-shown');
          status.setAttribute('data-state', ok ? 'ok' : 'error');
          status.textContent = ok
            ? 'Thank you — your request is in. A principal will reply within one business day.'
            : 'That did not send. Please call ' + (form.getAttribute('data-phone') || '475-299-8238') + ' and we will take the details directly.';
          if (ok) form.reset();
          status.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
        };

        if (!endpoint) {
          // No handler wired yet — see README, "Connecting the forms".
          window.setTimeout(function () { done(true); }, 600);
          return;
        }
        fetch(endpoint, {
          method: 'POST',
          headers: { 'Accept': 'application/json' },
          body: new FormData(form)
        }).then(function (r) { done(r.ok); }).catch(function () { done(false); });
      });
    });
  })();

  /* ------------------------------------------- *
   * Current year anywhere it is printed in copy *
   * ------------------------------------------- */
  $$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });
})();
