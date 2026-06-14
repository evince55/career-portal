// Mobile Hamburger Navigation with Keyboard Accessibility
// Exports initMobileNav() to be called on any page with #mobile-menu-btn + #mobile-nav

export function initMobileNav() {
  const menuBtn = document.getElementById('mobile-menu-btn');
  const mobileNav = document.getElementById('mobile-nav');

  if (!menuBtn || !mobileNav) return;

  const focusableSelectors = 'a[href], button:not([disabled]), input, select, textarea';

  function getFocusableElements() {
    return Array.from(mobileNav.querySelectorAll(focusableSelectors)).filter(el =>
      el.offsetParent !== null && !el.hasAttribute('aria-hidden')
    );
  }

  function closeMenu() {
    mobileNav.classList.remove('open');
    menuBtn.setAttribute('aria-expanded', 'false');
    menuBtn.classList.remove('active');
    // Reset hamburger icon to lines
    menuBtn.innerHTML = '';
    const bar1 = document.createElement('span');
    bar1.className = 'bar bar-1';
    const bar2 = document.createElement('span');
    bar2.className = 'bar bar-2';
    menuBtn.appendChild(bar1);
    menuBtn.appendChild(bar2);
  }

  function openMenu() {
    mobileNav.classList.add('open');
    menuBtn.setAttribute('aria-expanded', 'true');
    menuBtn.classList.add('active');
    // Change hamburger icon to X (close)
    menuBtn.innerHTML = '';
    const bar1 = document.createElement('span');
    bar1.className = 'bar bar-1';
    const bar2 = document.createElement('span');
    bar2.className = 'bar bar-2';
    menuBtn.appendChild(bar1);
    menuBtn.appendChild(bar2);
    // Animate to X shape
    requestAnimationFrame(() => {
      bar1.style.transform = 'rotate(45deg) translate(4px, 4px)';
      bar2.style.transform = 'rotate(-45deg) translate(4px, -4px)';
    });
    const firstFocusable = getFocusableElements()[0];
    if (firstFocusable) {
      setTimeout(() => firstFocusable.focus(), 50);
    }
  }

  function trapFocus(e) {
    if (!mobileNav.classList.contains('open')) return;
    const focusable = getFocusableElements();
    if (focusable.length === 0) return;

    if (e.key === 'Tab') {
      if (e.shiftKey) {
        if (document.activeElement === focusable[0]) {
          e.preventDefault();
          focusable[focusable.length - 1].focus();
        }
      } else {
        if (document.activeElement === focusable[focusable.length - 1]) {
          e.preventDefault();
          focusable[0].focus();
        }
      }
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      closeMenu();
      menuBtn.focus();
    }
  }

  document.addEventListener('keydown', trapFocus);

  mobileNav.querySelectorAll(focusableSelectors).forEach(link => {
    link.addEventListener('click', () => {
      document.removeEventListener('keydown', trapFocus);
      closeMenu();
    });
  });

  menuBtn.addEventListener('click', () => {
    const isOpen = mobileNav.classList.contains('open');
    if (isOpen) {
      document.removeEventListener('keydown', trapFocus);
      closeMenu();
    } else {
      openMenu();
    }
  });
}
