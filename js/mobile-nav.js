// Mobile Hamburger Navigation with Keyboard Accessibility
// Exports initMobileNav() to be called on any page with #mobile-menu-btn + #mobile-nav

export function initMobileNav() {
  const menuBtn = document.getElementById('mobile-menu-btn');
  const mobileNav = document.getElementById('mobile-nav');
  const bottomNav = document.getElementById('bottom-nav');

  // Handle hamburger menu (desktop fallback)
  if (menuBtn && mobileNav) {
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
      menuBtn.innerHTML = '';
      const bar1 = document.createElement('span');
      bar1.className = 'bar bar-1';
      const bar2 = document.createElement('span');
      bar2.className = 'bar bar-2';
      menuBtn.appendChild(bar1);
      menuBtn.appendChild(bar2);
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

  // Handle bottom navigation bar (mobile)
  if (bottomNav) {
    const navItems = bottomNav.querySelectorAll('.bottom-nav-item');

    // Add touch feedback and scroll-to-top on active item tap
    navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        const href = item.getAttribute('href');
        const currentPath = window.location.pathname;

        // If clicking the active page, scroll to top
        if (href === currentPath || (href === '/' && currentPath === '/')) {
          e.preventDefault();
          window.scrollTo({ top: 0, behavior: 'smooth' });

          // Add a subtle pulse animation
          item.style.transform = 'scale(0.9)';
          setTimeout(() => {
            item.style.transform = '';
          }, 150);
        }
      });

      // Add haptic feedback simulation on touch
      item.addEventListener('touchstart', () => {
        if (navigator.vibrate) {
          navigator.vibrate(10); // Short vibration for feedback
        }
      }, { passive: true });
    });

    // Highlight current page in bottom nav
    function highlightCurrentPage() {
      const currentPath = window.location.pathname;
      navItems.forEach(item => {
        const href = item.getAttribute('href');
        if (href === currentPath || (href === '/' && currentPath === '/')) {
          item.classList.add('active');
          item.setAttribute('aria-current', 'page');
        } else {
          item.classList.remove('active');
          item.removeAttribute('aria-current');
        }
      });
    }

    highlightCurrentPage();

    // Update on popstate (back/forward navigation)
    window.addEventListener('popstate', highlightCurrentPage);
  }

  // Scroll-to-top indicator for mobile
  function initScrollIndicator() {
    if (window.innerWidth > 768) return;

    const indicator = document.createElement('div');
    indicator.className = 'scroll-indicator';
    indicator.innerHTML = '↑ Scroll to top';
    indicator.style.cssText = `
      display: none;
      position: fixed;
      bottom: 80px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(188, 19, 254, 0.15);
      border: 1px solid rgba(188, 19, 254, 0.25);
      color: #0ff0fc;
      font-size: 0.65rem;
      padding: 0.3rem 0.8rem;
      border-radius: 20px;
      z-index: 9989;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.3s;
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      font-family: 'JetBrains Mono', monospace;
    `;
    document.body.appendChild(indicator);

    let scrollTimeout;
    window.addEventListener('scroll', () => {
      if (window.scrollY > 300) {
        indicator.style.display = 'block';
        setTimeout(() => { indicator.style.opacity = '1'; }, 10);
      } else {
        indicator.style.opacity = '0';
        setTimeout(() => { indicator.style.display = 'none'; }, 300);
      }
    }, { passive: true });
  }

  initScrollIndicator();
}
