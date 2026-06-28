'use strict';

/* 
   Helpers
 */
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => ctx.querySelectorAll(sel);
const on = (el, ev, fn, opts = {}) => el?.addEventListener(ev, fn, opts);
const pad = n => String(Math.max(0, n)).padStart(2, '0');
const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* 
   Navbar — scroll class
 */
function initNavbar() {
  const nav = $('#main-nav');
  if (!nav) return;
  const update = debounce(() => nav.classList.toggle('nav-scrolled', window.scrollY > 80), 10);
  on(window, 'scroll', update, { passive: true });
  update();
}

/* 
   Mobile drawer — open / close / focus trap
 */
function initMobileDrawer() {
  const toggle  = $('#nav-toggle');
  const drawer  = $('#mobile-drawer');
  const overlay = $('#drawer-overlay');
  const closeBtn = $('#drawer-close');
  const nav     = $('#main-nav');
  if (!drawer || !toggle) return;

  const focusable = () => [...$$('a[href],button:not([disabled]),[tabindex="0"]', drawer)];

  const open = () => {
    drawer.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.classList.add('nav-open');
    nav.classList.add('nav-open');
    document.body.style.overflow = 'hidden';
    setTimeout(() => focusable()[0]?.focus(), 320);
  };

  const close = () => {
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.classList.remove('nav-open');
    nav.classList.remove('nav-open');
    document.body.style.overflow = '';
    toggle.focus();
  };

  on(toggle,   'click', open);
  on(closeBtn, 'click', close);
  on(overlay,  'click', close);

  on(document, 'keydown', e => {
    if (e.key === 'Escape' && drawer.classList.contains('is-open')) { close(); return; }
    if (e.key !== 'Tab' || !drawer.classList.contains('is-open')) return;
    const items = focusable();
    const first = items[0]; const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
  });

  // Close on any link click
  $$('.drawer-link', drawer).forEach(l => on(l, 'click', close));
}

/* 
   Hero entrance — staggered opacity/translate
 */
function initHeroAnimations() {
  const items = $$('.animate-hero');
  if (!items.length) return;
  if (prefersReducedMotion()) { items.forEach(el => el.classList.add('is-animated')); return; }
  items.forEach(el => {
    const delay = parseInt(el.dataset.delay || 0, 10);
    setTimeout(() => el.classList.add('is-animated'), delay + 200);
  });
}

/* 
   Countdown — synced across hero, pricing, and final CTA
   Target: 2026-06-30 23:59:59 IST
 */
function initCountdown() {
  const target = new Date('2026-06-30T23:59:59+05:30');

  const displays = [
    { days: $('#cd-days'),   hours: $('#cd-hours'),   mins: $('#cd-mins'),   secs: $('#cd-secs')   },
    { days: $('#p-cd-days'), hours: $('#p-cd-hours'), mins: $('#p-cd-mins'), secs: $('#p-cd-secs') },
    { days: $('#f-cd-days'), hours: $('#f-cd-hours'), mins: $('#f-cd-mins'), secs: $('#f-cd-secs') },
  ].filter(d => d.days);

  if (!displays.length) return;

  const flip = (el, val) => {
    if (!el || el.textContent === val) return;
    el.textContent = val;
    el.style.cssText = 'transform:scale(.8);opacity:.5';
    setTimeout(() => { el.style.cssText = 'transform:scale(1);opacity:1;transition:transform 150ms ease,opacity 150ms ease'; }, 50);
  };

  const tick = () => {
    const diff = target - Date.now();
    if (diff <= 0) { displays.forEach(d => { flip(d.days,'00'); flip(d.hours,'00'); flip(d.mins,'00'); flip(d.secs,'00'); }); return; }
    const tot = Math.floor(diff / 1000);
    const d = Math.floor(tot / 86400), h = Math.floor(tot % 86400 / 3600), m = Math.floor(tot % 3600 / 60), s = tot % 60;
    displays.forEach(({ days, hours, mins, secs }) => { flip(days,pad(d)); flip(hours,pad(h)); flip(mins,pad(m)); flip(secs,pad(s)); });
    // SR update each minute
    const sr = $('#countdown-sr-text');
    if (sr && s === 0) sr.textContent = `${d} days, ${h} hours, and ${m} minutes remaining`;
  };

  tick();
  setInterval(tick, 1000);
}

/* 
   Scroll reveal — IntersectionObserver, once
 */
function initScrollReveal() {
  const items = $$('.reveal-item');
  if (!items.length) return;
  if (prefersReducedMotion()) { items.forEach(el => el.classList.add('is-visible')); return; }
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-visible'); obs.unobserve(e.target); } });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  items.forEach(el => obs.observe(el));
}

/* 
   Count-up — stats section numbers
 */
function initCountUp() {
  const els = $$('.stat-number[data-count]');
  if (!els.length) return;
  const ease = t => 1 - Math.pow(1 - t, 4);

  const animate = (el, to) => {
    if (prefersReducedMotion()) { el.textContent = to; return; }
    const start = performance.now();
    const step = now => {
      const p = Math.min((now - start) / 1500, 1);
      el.textContent = Math.round(ease(p) * to);
      if (p < 1) requestAnimationFrame(step); else el.textContent = to;
    };
    requestAnimationFrame(step);
  };

  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { animate(e.target, parseInt(e.target.dataset.count, 10)); obs.unobserve(e.target); }
    });
  }, { threshold: 0.3 });
  els.forEach(el => obs.observe(el));
}

/* 
   Curriculum tabs — ARIA tablist pattern
 */
function initCurriculumTabs() {
  const list   = $('.curriculum-tabs');
  const tabs   = $$('.month-tab');
  const panels = $$('.month-panel');
  if (!list || !tabs.length) return;

  const activate = idx => {
    tabs.forEach((t, i) => {
      const on = i === idx;
      t.classList.toggle('active', on);
      t.setAttribute('aria-selected', on);
      t.setAttribute('tabindex', on ? '0' : '-1');
    });
    panels.forEach((p, i) => {
      const on = i === idx;
      p.classList.toggle('active', on);
      on ? p.removeAttribute('hidden') : p.setAttribute('hidden', '');
    });
  };

  tabs.forEach((t, i) => on(t, 'click', () => activate(i)));

  on(list, 'keydown', e => {
    const cur = [...tabs].findIndex(t => t.getAttribute('aria-selected') === 'true');
    let next;
    if      (e.key === 'ArrowRight' || e.key === 'ArrowDown')  { e.preventDefault(); next = (cur + 1) % tabs.length; }
    else if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')    { e.preventDefault(); next = (cur - 1 + tabs.length) % tabs.length; }
    else if (e.key === 'Home')                                  { e.preventDefault(); next = 0; }
    else if (e.key === 'End')                                   { e.preventDefault(); next = tabs.length - 1; }
    if (next !== undefined) { activate(next); tabs[next].focus(); }
  });

  activate(0);
}

/* 
   Faculty carousel — responsive
 */
function initFacultyCarousel() {
  const carousel  = $('#faculty-carousel');
  const track     = $('#faculty-track');
  const dotsWrap  = $('#faculty-dots');
  const prevBtn   = $('#faculty-prev');
  const nextBtn   = $('#faculty-next');
  if (!track || !carousel) return;

  const slides   = [...$$('.faculty-slide', track)];
  const total    = slides.length;
  let perPage    = getPerPage();
  let pages      = Math.ceil(total / perPage);
  let current    = 0;
  let touchStart = 0;

  function getPerPage() {
    return window.innerWidth < 768 ? 1 : 2;
  }

  function buildDots() {
    if (!dotsWrap) return;
    dotsWrap.innerHTML = '';
    for (let i = 0; i < pages; i++) {
      const btn = document.createElement('button');
      btn.className = 'faculty-dot';
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-label', `Page ${i + 1} of ${pages}`);
      btn.setAttribute('aria-selected', i === current ? 'true' : 'false');
      if (i === current) btn.classList.add('active');
      on(btn, 'click', () => goTo(i));
      dotsWrap.appendChild(btn);
    }
  }

  function updateSlideWidths() {
    const gap = 24;
    const wrapWidth = track.parentElement.offsetWidth;
    const slideW = perPage === 1 ? wrapWidth : (wrapWidth - gap) / 2;
    slides.forEach(s => { s.style.flex = `0 0 ${slideW}px`; });
    track.style.gap = `${gap}px`;
  }

  function updateTrack() {
    const gap      = 24;
    const wrapWidth = track.parentElement.offsetWidth;
    const slideW   = perPage === 1 ? wrapWidth : (wrapWidth - gap) / 2;
    const offset   = current * (slideW + gap) * perPage;
    track.style.transform = `translateX(-${offset}px)`;
  }

  function updateButtons() {
    if (prevBtn) prevBtn.disabled = current === 0;
    if (nextBtn) nextBtn.disabled = current >= pages - 1;
  }

  function updateDots() {
    if (!dotsWrap) return;
    [...dotsWrap.children].forEach((dot, i) => {
      const active = i === current;
      dot.classList.toggle('active', active);
      dot.setAttribute('aria-selected', active);
    });
  }

  function goTo(idx) {
    current = Math.max(0, Math.min(idx, pages - 1));
    updateTrack();
    updateButtons();
    updateDots();
  }

  function init() {
    perPage = getPerPage();
    pages   = Math.ceil(total / perPage);
    current = Math.min(current, pages - 1);
    updateSlideWidths();
    updateTrack();
    buildDots();
    updateButtons();
  }

  // Buttons
  on(prevBtn, 'click', () => goTo(current - 1));
  on(nextBtn, 'click', () => goTo(current + 1));

  // Touch swipe
  on(track, 'touchstart', e => { touchStart = e.changedTouches[0].clientX; }, { passive: true });
  on(track, 'touchend',   e => {
    const diff = touchStart - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) goTo(diff > 0 ? current + 1 : current - 1);
  }, { passive: true });

  // Keyboard
  on(carousel, 'keydown', e => {
    if (e.key === 'ArrowLeft')  goTo(current - 1);
    if (e.key === 'ArrowRight') goTo(current + 1);
  });

  // Resize — recalculate per-page
  on(window, 'resize', debounce(init, 200), { passive: true });

  init();
}

/* 
   Testimonial carousel — mobile swipe carousel
 */
function initTestimonialCarousel() {
  const track  = $('#carousel-track');
  const slides = $$('.carousel-slide');
  const dots   = $$('.carousel-dot');
  const prev   = $('#carousel-prev');
  const next   = $('#carousel-next');
  if (!track || !slides.length) return;

  let cur = 0;
  let touchStart = 0;
  const total = slides.length;

  const go = idx => {
    cur = (idx + total) % total;
    track.style.transform = `translateX(-${cur * 100}%)`;
    dots.forEach((d, i) => { const a = i === cur; d.classList.toggle('active', a); d.setAttribute('aria-selected', a); });
  };

  on(prev, 'click', () => go(cur - 1));
  on(next, 'click', () => go(cur + 1));
  dots.forEach((d, i) => on(d, 'click', () => go(i)));

  on(track, 'touchstart', e => { touchStart = e.changedTouches[0].clientX; }, { passive: true });
  on(track, 'touchend',   e => {
    const diff = touchStart - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) go(diff > 0 ? cur + 1 : cur - 1);
  }, { passive: true });

  const wrap = track.closest('[id]');
  on(wrap, 'keydown', e => { if (e.key === 'ArrowLeft') go(cur - 1); if (e.key === 'ArrowRight') go(cur + 1); });

  go(0);
}

/* 
   FAQ accordion — single-open, animated max-height
 */
function initFAQ() {
  const questions = $$('.faq-question');
  if (!questions.length) return;

  questions.forEach(q => {
    const answerId = q.getAttribute('aria-controls');
    const answer   = document.getElementById(answerId);
    if (!answer) return;
    answer.setAttribute('hidden', '');

    on(q, 'click', () => {
      const isOpen = q.getAttribute('aria-expanded') === 'true';

      // Close all
      questions.forEach(other => {
        const otherId = other.getAttribute('aria-controls');
        const otherA  = document.getElementById(otherId);
        other.setAttribute('aria-expanded', 'false');
        if (otherA) { otherA.style.maxHeight = '0'; otherA.setAttribute('hidden', ''); }
      });

      if (!isOpen) {
        q.setAttribute('aria-expanded', 'true');
        answer.removeAttribute('hidden');
        // next tick so browser paints the unhidden element first
        requestAnimationFrame(() => { answer.style.maxHeight = answer.scrollHeight + 'px'; });
      }
    });
  });
}

/* 
   Mobile sticky CTA — show after hero leaves viewport
 */
function initMobileStickyBar() {
  const bar    = $('#mobile-sticky-cta');
  const hero   = $('#hero');
  const footer = $('#site-footer');
  if (!bar || !hero) return;

  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.target === hero)   bar.classList.toggle('is-visible', !e.isIntersecting);
      if (e.target === footer && e.isIntersecting) bar.classList.remove('is-visible');
    });
  }, { threshold: 0 });

  obs.observe(hero);
  if (footer) obs.observe(footer);
}

/* 
   Smooth scroll — anchor links, offset for sticky nav
 */
function initSmoothScroll() {
  const NAV_H = 76;
  on(document, 'click', e => {
    const link = e.target.closest('a[href^="#"]');
    if (!link) return;
    const href = link.getAttribute('href');
    if (href === '#') return;
    const target = document.querySelector(href);
    if (!target) return;
    e.preventDefault();
    window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - NAV_H, behavior: 'smooth' });
  });
}

/* 
   Timeline circle entrance
 */
function initTimelineAnimation() {
  const circles = $$('.node-circle, .tl-dot');
  if (!circles.length || prefersReducedMotion()) return;

  const obs = new IntersectionObserver(entries => {
    entries.forEach((e, i) => {
      if (e.isIntersecting) {
        setTimeout(() => { e.target.style.transform = 'scale(1)'; e.target.style.opacity = '1'; }, i * 100);
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.3 });

  circles.forEach(c => {
    c.style.cssText = 'transform:scale(0);opacity:0;transition:transform 350ms cubic-bezier(.34,1.56,.64,1),opacity 250ms ease';
    obs.observe(c);
  });
}

/* 
   Active nav link — highlight on scroll
 */
function initActiveNavLinks() {
  const sections = $$('section[id]');
  const links    = $$('#navbarContent .nav-link');
  if (!sections.length || !links.length) return;

  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        const id = e.target.id;
        links.forEach(l => l.classList.toggle('active', l.getAttribute('href') === `#${id}`));
      }
    });
  }, { rootMargin: '-50% 0px -50% 0px', threshold: 0 });

  sections.forEach(s => obs.observe(s));
}

/* 
   Boot
 */
document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initMobileDrawer();
  initSmoothScroll();
  initActiveNavLinks();
  initHeroAnimations();
  initCountdown();
  initScrollReveal();
  initCountUp();
  initTimelineAnimation();
  initCurriculumTabs();
  initFacultyCarousel();
  initTestimonialCarousel();
  initFAQ();
  initMobileStickyBar();
});
