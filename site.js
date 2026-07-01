/* Shared site behavior — reveals + nav scroll state */
(function () {
  'use strict';

  // Mark ready
  document.documentElement.classList.add('ready');
  document.documentElement.classList.add('js');

  const prefersReduced = window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia
    && window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  // Intersection observer for .reveal elements
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('is-in');
          io.unobserve(e.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
  );
  document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

  // Nav glass strengthens on scroll
  const nav = document.querySelector('.nav');
  if (nav) {
    const onScroll = () => {
      if (window.scrollY > 30) nav.classList.add('is-scrolled');
      else nav.classList.remove('is-scrolled');
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  // Scroll progress hairline
  const progressBar = document.querySelector('.progress span');
  if (progressBar) {
    let progressQueued = false;
    const paint = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      progressBar.style.transform = 'scaleX(' + (max > 0 ? Math.min(window.scrollY / max, 1) : 0) + ')';
      progressQueued = false;
    };
    window.addEventListener('scroll', () => {
      if (!progressQueued) { progressQueued = true; requestAnimationFrame(paint); }
    }, { passive: true });
    window.addEventListener('resize', paint);
    paint();
  }

  // Headline assembly — split .split-words into word spans that drift in
  (function splitWords() {
    const els = document.querySelectorAll('.split-words');
    if (!els.length || prefersReduced) return;
    els.forEach((el) => {
      const frag = document.createDocumentFragment();
      let i = 0;
      const mk = (content) => {
        const out = document.createElement('span');
        out.className = 'w-out';
        const inn = document.createElement('span');
        inn.className = 'w-in';
        if (typeof content === 'string') inn.textContent = content;
        else inn.appendChild(content);
        const sign = i % 2 ? 1 : -1;
        inn.style.setProperty('--dx', sign * (10 + (i % 3) * 9) + 'px');
        inn.style.setProperty('--dr', sign * (1.5 + (i % 2) * 1.5) + 'deg');
        inn.style.setProperty('--d', Math.min(i * 0.045, 0.7) + 's');
        out.appendChild(inn);
        i += 1;
        return out;
      };
      Array.from(el.childNodes).forEach((node) => {
        if (node.nodeType === 3) {
          node.textContent.split(/(\s+)/).forEach((tok) => {
            if (tok === '') return;
            if (/^\s+$/.test(tok)) { frag.appendChild(document.createTextNode(' ')); return; }
            frag.appendChild(mk(tok));
          });
        } else if (node.nodeName === 'BR') {
          frag.appendChild(document.createElement('br'));
        } else {
          frag.appendChild(mk(node.cloneNode(true)));
        }
      });
      el.innerHTML = '';
      el.appendChild(frag);
    });
    const wio = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('in'); wio.unobserve(e.target); }
      });
    }, { threshold: 0.2, rootMargin: '0px 0px -8% 0px' });
    els.forEach((el) => wio.observe(el));
  })();

  // Parallax/scroll-bound elements (data-parallax="speed")
  const parallaxEls = document.querySelectorAll('[data-parallax]');
  if (parallaxEls.length && !prefersReduced) {
    let ticking = false;
    const apply = () => {
      const y = window.scrollY;
      parallaxEls.forEach((el) => {
        const speed = parseFloat(el.dataset.parallax) || 0.2;
        const rect = el.getBoundingClientRect();
        const center = rect.top + rect.height / 2;
        const delta = (window.innerHeight / 2 - center) * speed;
        el.style.transform = `translate3d(0, ${delta.toFixed(1)}px, 0)`;
      });
      ticking = false;
    };
    window.addEventListener(
      'scroll',
      () => {
        if (!ticking) {
          requestAnimationFrame(apply);
          ticking = true;
        }
      },
      { passive: true }
    );
    apply();
  }

  // Animated count-up on stat numbers
  const stats = document.querySelectorAll('[data-count]');
  if (stats.length) {
    const sio = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const el = e.target;
        const target = parseFloat(el.dataset.count);
        const decimals = parseInt(el.dataset.decimals || '0', 10);
        if (prefersReduced) {
          el.textContent = decimals ? target.toFixed(decimals) : Math.round(target).toLocaleString();
          sio.unobserve(el);
          return;
        }
        const dur = 1400;
        const start = performance.now();
        const tick = (t) => {
          const p = Math.min(1, (t - start) / dur);
          const eased = 1 - Math.pow(1 - p, 3);
          const v = target * eased;
          el.textContent = decimals ? v.toFixed(decimals) : Math.round(v).toLocaleString();
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
        sio.unobserve(el);
      });
    }, { threshold: 0.4 });
    stats.forEach((s) => sio.observe(s));
  }

  // Magnetic pull on primary CTAs (fine pointers only)
  if (!prefersReduced && finePointer) {
    document.querySelectorAll('.btn--primary, .nav__cta').forEach((el) => {
      el.addEventListener('mousemove', (e) => {
        const r = el.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width / 2)) * 0.22;
        const dy = (e.clientY - (r.top + r.height / 2)) * 0.22;
        el.style.transform = 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px)';
      });
      el.addEventListener('mouseleave', () => { el.style.transform = ''; });
    });
  }

  // Big footer wordmark — cursor-lit, scrolls back to the top
  (function bigfoot() {
    const bf = document.querySelector('.bigfoot');
    if (!bf) return;
    const word = bf.querySelector('.bigfoot-word');
    bf.classList.add('bf-live');
    bf.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: prefersReduced ? 'auto' : 'smooth' });
    });
    if (word && finePointer) {
      const hint = document.createElement('div');
      hint.className = 'bf-hint';
      hint.textContent = '↑ Back to top';
      bf.appendChild(hint);
      bf.addEventListener('mousemove', (e) => {
        const r = word.getBoundingClientRect();
        word.style.setProperty('--mx', (((e.clientX - r.left) / r.width) * 100).toFixed(2) + '%');
      });
    }
  })();

  // mailto links also copy the address, with a small confirmation toast
  document.querySelectorAll('a[href^="mailto:"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const email = a.getAttribute('href').replace(/^mailto:/, '').split('?')[0];
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(email).catch(() => {});
      }
      const t = document.createElement('div');
      t.className = 'copy-toast';
      t.textContent = 'Email copied ✓';
      const x = e.clientX || window.innerWidth / 2;
      const y = e.clientY || window.innerHeight / 2;
      t.style.left = x + 'px';
      t.style.top = y + 'px';
      document.body.appendChild(t);
      setTimeout(() => t.remove(), 1700);
    });
  });

  // Hero pointer-driven tilt (subtle)
  const tiltEls = prefersReduced ? [] : document.querySelectorAll('[data-tilt]');
  tiltEls.forEach((el) => {
    let raf;
    const max = parseFloat(el.dataset.tilt) || 6;
    window.addEventListener('mousemove', (ev) => {
      const x = (ev.clientX / window.innerWidth - 0.5) * 2;
      const y = (ev.clientY / window.innerHeight - 0.5) * 2;
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.style.setProperty('--tilt-x', `${(-y * max).toFixed(2)}deg`);
        el.style.setProperty('--tilt-y', `${(x * max).toFixed(2)}deg`);
      });
    });
  });

  // ---------- Mobile menu (auto-injected) ----------
  (function buildMobileMenu() {
    if (!nav) return;
    const links = Array.from(nav.querySelectorAll('.nav__link'));
    const ctaEl = nav.querySelector('.nav__cta');
    if (!links.length) return;

    // Hamburger button
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'nav__menu-btn';
    btn.setAttribute('aria-label', 'Open menu');
    btn.setAttribute('aria-expanded', 'false');
    btn.innerHTML = '<span></span><span></span>';
    nav.appendChild(btn);

    // Sheet
    const sheet = document.createElement('div');
    sheet.className = 'mobile-sheet';
    sheet.setAttribute('aria-hidden', 'true');
    const inner = document.createElement('div');
    inner.className = 'mobile-sheet__inner';
    sheet.appendChild(inner);

    links.forEach((src) => {
      const a = document.createElement('a');
      a.className = 'mobile-sheet__link' + (src.classList.contains('is-active') ? ' is-active' : '');
      a.href = src.getAttribute('href') || '#';
      a.textContent = src.textContent.trim();
      inner.appendChild(a);
    });
    if (ctaEl) {
      const cta = document.createElement('a');
      cta.className = 'mobile-sheet__cta';
      cta.href = ctaEl.getAttribute('href') || '#';
      cta.textContent = ctaEl.textContent.trim();
      inner.appendChild(cta);
    }
    document.body.appendChild(sheet);

    const close = () => {
      btn.classList.remove('is-open');
      sheet.classList.remove('is-open');
      btn.setAttribute('aria-expanded', 'false');
      sheet.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('is-menu-open');
    };
    const open = () => {
      btn.classList.add('is-open');
      sheet.classList.add('is-open');
      btn.setAttribute('aria-expanded', 'true');
      sheet.setAttribute('aria-hidden', 'false');
      document.body.classList.add('is-menu-open');
    };
    btn.addEventListener('click', () => {
      if (sheet.classList.contains('is-open')) close(); else open();
    });
    // Close on link tap
    sheet.querySelectorAll('a').forEach((a) => a.addEventListener('click', close));
    // Close on resize up
    window.addEventListener('resize', () => {
      if (window.innerWidth > 900 && sheet.classList.contains('is-open')) close();
    });
    // Close on escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && sheet.classList.contains('is-open')) close();
    });
  })();

  // ---------- Waitlist: own-backend capture + analytics + social proof ----------
  (function waitlist() {
    const form = document.getElementById('waitlist-form');
    const proof = document.getElementById('waitlist-proof');
    const API = (window.EPISAFE_API || 'https://episafe-admin.aaryanpanchal.workers.dev') + '/api/public/waitlist';

    function showCount(n) {
      // Only show social proof once it's a number worth showing.
      if (!proof || !n || n < 25) return;
      proof.innerHTML = 'Join <strong>' + n.toLocaleString() + '+</strong> people already on the waitlist.';
      proof.classList.add('is-on');
    }

    if (proof) {
      fetch(API, { method: 'GET' })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => { if (d) showCount(d.count); })
        .catch(() => {});
    }

    if (!form) return;
    form.addEventListener('submit', () => {
      const input = form.querySelector('input[type=email]');
      const email = input && input.value && input.value.trim();
      if (!email) return;
      // Save the lead to our own backend (fire-and-forget; Formspree still runs).
      try {
        fetch(API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, source: 'index', referrer: document.referrer || '' }),
        })
          .then((r) => (r.ok ? r.json() : null))
          .then((d) => { if (d && d.count) showCount(d.count); })
          .catch(() => {});
      } catch (e) { /* ignore */ }
      // Conversion goal in Plausible (no-op if analytics not loaded).
      try { if (typeof window.plausible === 'function') window.plausible('Waitlist Signup'); } catch (e) { /* ignore */ }
    });
  })();
})();
