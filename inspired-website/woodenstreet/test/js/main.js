/**
 * WoodenStreet — Main JavaScript
 * Handles: Hero slider, mega menu, mobile drawer, category tabs,
 *          product carousel, wishlist toggle, search, toast, scroll events
 */

"use strict";

/* ============================================================
   HERO SLIDER
   ============================================================ */

const HeroSlider = (() => {
  let slides = [];
  let indicators = [];
  let current = 0;
  let timer = null;
  const DURATION = 5000;

  function init() {
    slides = [...document.querySelectorAll('.hero-slide')];
    indicators = [...document.querySelectorAll('.hero-indicator')];
    if (!slides.length) return;

    document.querySelector('.hero-arrow--prev')?.addEventListener('click', () => go(current - 1));
    document.querySelector('.hero-arrow--next')?.addEventListener('click', () => go(current + 1));
    indicators.forEach((ind, i) => ind.addEventListener('click', () => go(i)));

    go(0);
  }

  function go(index) {
    if (!slides.length) return;
    clearTimeout(timer);

    const next = ((index % slides.length) + slides.length) % slides.length;

    slides[current].classList.remove('active');
    indicators[current]?.classList.remove('active');

    // reset progress
    const oldProg = indicators[current]?.querySelector('.hero-indicator__progress');
    if (oldProg) { oldProg.style.animation = 'none'; oldProg.offsetHeight; }

    current = next;
    slides[current].classList.add('active');
    indicators[current]?.classList.add('active');

    // restart progress animation
    const newProg = indicators[current]?.querySelector('.hero-indicator__progress');
    if (newProg) {
      newProg.style.animation = 'none';
      newProg.offsetHeight;
      newProg.style.animation = `progressAnimation ${DURATION}ms linear forwards`;
    }

    timer = setTimeout(() => go(current + 1), DURATION);
  }

  return { init };
})();

/* ============================================================
   MEGA MENU — position dropdown below trigger
   ============================================================ */

const MegaMenu = (() => {
  function init() {
    const items = document.querySelectorAll('.mega-menu-item');
    items.forEach(item => {
      const dropdown = item.querySelector('.mega-dropdown');
      if (!dropdown) return;

      item.addEventListener('mouseenter', () => positionDropdown(item, dropdown));
    });
  }

  function positionDropdown(item, dropdown) {
    const bar = item.closest('.mega-menu-bar');
    if (!bar) return;
    const rect = bar.getBoundingClientRect();
    dropdown.style.top = (rect.bottom + window.scrollY) + 'px';
    dropdown.style.left = '0';
  }

  return { init };
})();

/* ============================================================
   MOBILE DRAWER
   ============================================================ */

const MobileDrawer = (() => {
  function init() {
    const openBtn = document.getElementById('mobileMenuBtn');
    const drawer  = document.getElementById('mobileDrawer');
    const overlay = document.getElementById('mobileDrawerOverlay');
    const closeBtn = document.getElementById('mobileDrawerClose');
    if (!drawer) return;

    openBtn?.addEventListener('click', open);
    closeBtn?.addEventListener('click', close);
    overlay?.addEventListener('click', close);
  }

  function open() {
    document.getElementById('mobileDrawer')?.classList.add('open');
    document.getElementById('mobileDrawerOverlay')?.classList.add('visible');
    document.body.style.overflow = 'hidden';
  }

  function close() {
    document.getElementById('mobileDrawer')?.classList.remove('open');
    document.getElementById('mobileDrawerOverlay')?.classList.remove('visible');
    document.body.style.overflow = '';
  }

  return { init };
})();

/* ============================================================
   CATEGORY TABS
   ============================================================ */

const CategoryTabs = (() => {
  function init() {
    const tabs    = document.querySelectorAll('.category-tab');
    const grids   = document.querySelectorAll('.category-tab-content');
    if (!tabs.length) return;

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        const target = tab.dataset.tab;
        grids.forEach(g => {
          g.hidden = g.dataset.tabContent !== target;
        });
      });
    });
  }

  return { init };
})();

/* ============================================================
   PRODUCT CAROUSEL — scroll left/right
   ============================================================ */

const ProductCarousel = (() => {
  function init() {
    document.querySelectorAll('.product-carousel-wrap').forEach(wrap => {
      const carousel = wrap.querySelector('.product-carousel');
      const prev = wrap.querySelector('.carousel-arrow--prev');
      const next = wrap.querySelector('.carousel-arrow--next');
      if (!carousel) return;

      const scrollBy = () => carousel.clientWidth * 0.75;

      prev?.addEventListener('click', () => {
        carousel.scrollBy({ left: -scrollBy(), behavior: 'smooth' });
      });

      next?.addEventListener('click', () => {
        carousel.scrollBy({ left: scrollBy(), behavior: 'smooth' });
      });

      // Update arrow visibility
      const updateArrows = () => {
        if (prev) prev.style.opacity = carousel.scrollLeft <= 0 ? '0.4' : '1';
        if (next) next.style.opacity = carousel.scrollLeft + carousel.clientWidth >= carousel.scrollWidth - 2 ? '0.4' : '1';
      };

      carousel.addEventListener('scroll', updateArrows, { passive: true });
      updateArrows();
    });
  }

  return { init };
})();

/* ============================================================
   WISHLIST TOGGLE
   ============================================================ */

const Wishlist = (() => {
  let count = 0;

  function init() {
    document.querySelectorAll('.product-card__wishlist').forEach(btn => {
      btn.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        const wasActive = btn.classList.toggle('active');

        // Animate heart
        btn.style.transform = 'scale(1.3)';
        setTimeout(() => { btn.style.transform = ''; }, 200);

        if (wasActive) {
          count++;
          Toast.show('Added to wishlist ♥', 'success');
        } else {
          count--;
          Toast.show('Removed from wishlist', '');
        }
      });
    });
  }

  return { init };
})();

/* ============================================================
   CART
   ============================================================ */

const Cart = (() => {
  let count = 0;

  function init() {
    document.querySelectorAll('.product-card__cart').forEach(btn => {
      btn.addEventListener('click', e => {
        e.preventDefault();
        count++;
        updateBadge();
        Toast.show('Added to cart!', 'success');
      });
    });
  }

  function updateBadge() {
    document.querySelectorAll('.cart-badge').forEach(badge => {
      badge.textContent = count;
    });
  }

  return { init };
})();

/* ============================================================
   SEARCH DROPDOWN
   ============================================================ */

const Search = (() => {
  function init() {
    const inputs = document.querySelectorAll('.header-search__input');
    inputs.forEach(input => {
      const dropdown = input.closest('.header-search')?.querySelector('.header-search__dropdown');
      if (!dropdown) return;

      input.addEventListener('focus', () => dropdown.classList.add('visible'));
      input.addEventListener('blur', () => setTimeout(() => dropdown.classList.remove('visible'), 200));

      // Tag click fills input
      dropdown.querySelectorAll('.search-tag').forEach(tag => {
        tag.addEventListener('click', () => {
          input.value = tag.textContent.trim();
          dropdown.classList.remove('visible');
        });
      });
    });
  }

  return { init };
})();

/* ============================================================
   TOAST NOTIFICATIONS
   ============================================================ */

const Toast = (() => {
  let container;

  function init() {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  function show(message, type = '', duration = 3000) {
    const toast = document.createElement('div');
    toast.className = `toast${type ? ` toast--${type}` : ''}`;

    const icon = type === 'success'
      ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>`
      : type === 'error'
      ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`
      : '';

    toast.innerHTML = `${icon}<span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(40px)';
      toast.style.transition = 'opacity 0.3s, transform 0.3s';
      setTimeout(() => toast.remove(), 350);
    }, duration);
  }

  return { init, show };
})();

/* ============================================================
   EXPANDABLE BRAND COPY
   ============================================================ */

const BrandCopy = (() => {
  function init() {
    document.querySelectorAll('.brand-copy__more').forEach(btn => {
      const content = btn.previousElementSibling;
      if (!content) return;

      btn.addEventListener('click', () => {
        const expanded = content.classList.toggle('expanded');
        btn.textContent = expanded ? 'Less' : 'More';
      });
    });
  }

  return { init };
})();

/* ============================================================
   SCROLL — Back to top + sticky header shadow
   ============================================================ */

const ScrollEffects = (() => {
  let backToTop;

  function init() {
    backToTop = document.querySelector('.back-to-top');
    backToTop?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  function onScroll() {
    const scrolled = window.scrollY;
    if (backToTop) backToTop.classList.toggle('visible', scrolled > 400);
  }

  return { init };
})();

/* ============================================================
   NEWSLETTER FORM
   ============================================================ */

const Newsletter = (() => {
  function init() {
    document.querySelectorAll('.newsletter-form').forEach(form => {
      form.addEventListener('submit', e => {
        e.preventDefault();
        const input = form.querySelector('input[type="email"]');
        if (!input?.value) return;
        Toast.show('Thank you for subscribing!', 'success');
        input.value = '';
      });
    });
  }

  return { init };
})();

/* ============================================================
   LAZY IMAGE LOADING — IntersectionObserver
   ============================================================ */

const LazyImages = (() => {
  function init() {
    if (!('IntersectionObserver' in window)) return;

    const obs = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const img = entry.target;
        if (img.dataset.src) {
          img.src = img.dataset.src;
          img.removeAttribute('data-src');
        }
        observer.unobserve(img);
      });
    }, { rootMargin: '200px' });

    document.querySelectorAll('img[data-src]').forEach(img => obs.observe(img));
  }

  return { init };
})();

/* ============================================================
   INIT — DOMContentLoaded
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  Toast.init();
  HeroSlider.init();
  MegaMenu.init();
  MobileDrawer.init();
  CategoryTabs.init();
  ProductCarousel.init();
  Wishlist.init();
  Cart.init();
  Search.init();
  BrandCopy.init();
  ScrollEffects.init();
  Newsletter.init();
  LazyImages.init();
});
