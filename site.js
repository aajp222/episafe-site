/* Shared site behavior — reveals + nav scroll state */
(function () {
  'use strict';

  // Mark ready
  document.documentElement.classList.add('ready');

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

  // Parallax/scroll-bound elements (data-parallax="speed")
  const parallaxEls = document.querySelectorAll('[data-parallax]');
  if (parallaxEls.length) {
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

  // Hero pointer-driven tilt (subtle)
  const tiltEls = document.querySelectorAll('[data-tilt]');
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
})();
