// Motion layer — vanilla Web Animations API (no library). Loaded ONLY after the
// page's inline guard has confirmed the client is motion-safe and not saveData,
// so this module can assume motion is wanted. Zero added payload.
//
// Progressive-enhancement contract (same as scroll-reveal.js): hidden states are
// applied here, right before the animation that reveals them, so a failed import
// or an old browser simply shows the finished page. The hero entrance uses the
// html.anim class set by an inline <head> guard (with a 2.5s failsafe that removes
// it), so there is no flash-then-hide.

import { parseStatValue } from './utils/helpers.js';

const EASE = 'cubic-bezier(0.2, 0.7, 0.3, 1)'; // mirrors --ease in tokens.css
const ENTER = { threshold: 0.2, rootMargin: '0px 0px -40px 0px' };

function onEnter(el, run, options = ENTER) {
  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        io.unobserve(entry.target);
        run(entry.target);
      }
    }
  }, options);
  io.observe(el);
}

/* ---------- hero entrance (index) ---------- */
function initHeroEntrance(doc) {
  const hero = doc.querySelector('[data-hero-enter]');
  if (!hero || !doc.documentElement.classList.contains('anim')) return;

  const parts = hero.querySelectorAll('[data-enter]');
  if (!parts.length) { doc.documentElement.classList.remove('anim'); return; }

  let remaining = parts.length;
  parts.forEach((el, i) => {
    const anim = el.animate(
      [{ opacity: 0, transform: 'translateY(18px)' }, { opacity: 1, transform: 'none' }],
      { duration: 680, delay: i * 90, easing: EASE, fill: 'both' }
    );
    anim.onfinish = () => {
      try { anim.commitStyles(); anim.cancel(); } catch (e) { /* older engines */ }
      if (--remaining === 0) doc.documentElement.classList.remove('anim');
    };
  });
}

/* ---------- count-up stats ([data-count]) ---------- */
function animateCounter(el) {
  const parsed = parseStatValue(el.textContent.trim());
  if (!parsed || parsed.value === 0) return;
  const dur = 1300;
  const start = performance.now();
  function tick(now) {
    const t = Math.min((now - start) / dur, 1);
    const eased = 1 - Math.pow(1 - t, 4); // easeOutQuart
    const n = parsed.value * eased;
    el.textContent = `${parsed.prefix}${n.toFixed(parsed.decimals)}${parsed.suffix}`;
    if (t < 1) requestAnimationFrame(tick);
    else el.textContent = `${parsed.prefix}${parsed.value.toFixed(parsed.decimals)}${parsed.suffix}`;
  }
  requestAnimationFrame(tick);
}

function initCounters(doc) {
  const targets = doc.querySelectorAll('[data-count]');
  if (!targets.length) return;
  // index.html exposes the live-stats fetch promise so counters animate the final
  // numbers instead of racing the fetch that rewrites them.
  const ready = window.__liveReady && typeof window.__liveReady.finally === 'function'
    ? window.__liveReady
    : Promise.resolve();
  ready.finally(() => {
    for (const el of targets) onEnter(el, animateCounter, { threshold: 0.6 });
  });
}

/* ---------- staggered grid reveals ([data-stagger]) ---------- */
function initStaggerGrids(doc) {
  // No way to reveal without an observer, so don't hide anything in that case.
  if (typeof IntersectionObserver === 'undefined') return;
  const armed = [];
  for (const grid of doc.querySelectorAll('[data-stagger]')) {
    const children = Array.from(grid.children);
    if (!children.length) continue;
    for (const child of children) { child.classList.add('stagger-armed'); armed.push(child); }
    // Observe each child, not the grid. A single-column grid on mobile is far
    // taller than the viewport, so a grid-level intersection threshold can never
    // be reached and every card would stay hidden. Per-child observation reveals
    // each card as it scrolls in and fires reliably at any viewport width.
    children.forEach((child) => {
      onEnter(child, () => {
        child.classList.remove('stagger-armed');
        child.animate(
          [{ opacity: 0, transform: 'translateY(20px)' }, { opacity: 1, transform: 'none' }],
          { duration: 620, easing: EASE, fill: 'both' }
        ).onfinish = function () { try { this.commitStyles(); this.cancel(); } catch (e) {} };
      });
    });
  }
  // Failsafe: content must never stay hidden. If an observer never fires (odd
  // viewport, IO quirk), reveal anything still armed so cards can't be lost.
  if (armed.length) {
    setTimeout(() => {
      for (const child of armed) child.classList.remove('stagger-armed');
    }, 2500);
  }
}

/** Entry point — safe on any page; each feature no-ops without its hooks. */
export function initPageMotion(doc = typeof document === 'undefined' ? null : document) {
  if (!doc) return;
  if (typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  initHeroEntrance(doc);
  initCounters(doc);
  initStaggerGrids(doc);
}
