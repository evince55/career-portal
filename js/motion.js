// Motion layer — anime.js v4 (vendored, MIT), loaded ONLY when the page's
// loader script has already checked prefers-reduced-motion and saveData.
//
// Progressive-enhancement contract (same as scroll-reveal.js): this module
// never relies on CSS that hides content by default. Hidden states are applied
// here, immediately before an animation that reveals the element, so a failed
// import or an old browser simply shows the finished page. The hero entrance
// uses the html.anim class set by an inline guard in <head> (with a 2.5s
// failsafe that removes it), so there is no flash-then-hide.
//
// All durations/eases echo the tokens in css/tokens.css (fast/med/slow feel).

import { animate, createTimeline, stagger, svg } from '/js/vendor/anime.esm.min.js';
import { parseStatValue } from '/js/utils/helpers.js?v=7';

const ENTER = { threshold: 0.25, rootMargin: '0px 0px -40px 0px' };

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
  const hero = doc.querySelector('.hero__inner');
  if (!hero || !doc.documentElement.classList.contains('anim')) return;

  const parts = hero.querySelectorAll(
    '.kicker, .hero__title, .hero__tagline, .hero__sub, .hero__ctas, .hero__proof .chip'
  );
  const tl = createTimeline({
    defaults: { duration: 650, ease: 'out(3)' },
    onComplete: () => doc.documentElement.classList.remove('anim')
  });
  tl.add(parts, {
    opacity: [0, 1],
    translateY: [16, 0],
    delay: stagger(90)
  });
}

/* ---------- count-up stats ([data-count]) ---------- */

function animateCounter(el) {
  const parsed = parseStatValue(el.textContent.trim());
  if (!parsed || parsed.value === 0) return;
  const state = { n: 0 };
  animate(state, {
    n: parsed.value,
    duration: 1300,
    ease: 'out(4)',
    onUpdate: () => {
      el.textContent = `${parsed.prefix}${state.n.toFixed(parsed.decimals)}${parsed.suffix}`;
    },
    onComplete: () => {
      el.textContent = `${parsed.prefix}${parsed.value.toFixed(parsed.decimals)}${parsed.suffix}`;
    }
  });
}

function initCounters(doc) {
  const targets = doc.querySelectorAll('[data-count]');
  if (!targets.length) return;
  // index.html exposes the live-stats fetch promise so counters animate the
  // final numbers instead of racing the fetch that rewrites them
  const ready = window.__liveReady && typeof window.__liveReady.finally === 'function'
    ? window.__liveReady
    : Promise.resolve();
  ready.finally(() => {
    for (const el of targets) onEnter(el, animateCounter, { threshold: 0.6 });
  });
}

/* ---------- staggered grid reveals ([data-stagger]) ---------- */

function initStaggerGrids(doc) {
  for (const grid of doc.querySelectorAll('[data-stagger]')) {
    const children = Array.from(grid.children);
    if (!children.length) continue;
    for (const child of children) child.classList.add('stagger-armed');
    onEnter(grid, () => {
      animate(children, {
        opacity: [0, 1],
        translateY: [18, 0],
        duration: 600,
        ease: 'out(3)',
        delay: stagger(80),
        onComplete: () => children.forEach((c) => c.classList.remove('stagger-armed'))
      });
    });
  }
}

/* ---------- case-study diagram line drawing ---------- */

function initDiagramDraw(doc) {
  for (const fig of doc.querySelectorAll('.case-study__diagram')) {
    const strokes = fig.querySelectorAll('svg path:not([class*="head"]), svg line, svg polyline');
    if (!strokes.length) continue;
    let drawables;
    try {
      drawables = svg.createDrawable(strokes);
    } catch {
      continue; // malformed SVG — leave the static diagram untouched
    }
    onEnter(fig, () => {
      animate(drawables, {
        draw: ['0 0', '0 1'],
        duration: 900,
        ease: 'inOut(2)',
        delay: stagger(140)
      });
    });
  }
}

/** Entry point — safe to call on any page; each feature no-ops without its hooks. */
export function initPageMotion(doc = typeof document === 'undefined' ? null : document) {
  if (!doc) return;
  initHeroEntrance(doc);
  initCounters(doc);
  initStaggerGrids(doc);
  initDiagramDraw(doc);
}
