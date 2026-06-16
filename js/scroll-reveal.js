// Scroll-triggered reveal animations — IntersectionObserver-based
// Pattern: Motion-Driven (#15) from UI/UX Pro Max style database
// Micro-interactions (#16): 50-100ms staggered delays

export function initScrollReveal(root = document) {
  if (typeof IntersectionObserver === 'undefined') return;

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
    observer.observe(el);
  }

  return observer;
}
