// Scroll-triggered reveal animations — IntersectionObserver-based.
// Progressive enhancement: elements are visible by default; this module adds
// .reveal-armed (the hidden state) only when it can also guarantee the reveal,
// so content never stays invisible if JS fails or IO is unsupported.

export function initScrollReveal(root = document) {
  if (typeof IntersectionObserver === 'undefined') return;
  if (typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target); // Animate once
      }
    }
  }, {
    threshold: 0.15,
    rootMargin: '0px 0px -40px 0px'
  });

  const elements = root.querySelectorAll('.reveal');
  for (const el of elements) {
    el.classList.add('reveal-armed');
    observer.observe(el);
  }

  return observer;
}
