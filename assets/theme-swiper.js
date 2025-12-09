// Theme Swiper - Simplified
// Handles product gallery with thumbs sync and responsive direction changes
(() => {
  const BREAKPOINT = 960;
  const instances = new Map();

  const parseJSON = (str, fallback = {}) => {
    try { return str ? JSON.parse(str) : fallback; } 
    catch { return fallback; }
  };

  const getDirection = () => window.innerWidth >= BREAKPOINT ? 'vertical' : 'horizontal';

  // Ensure Swiper structure
  function prepareHost(host) {
    host.classList.add('swiper');
    const wrapper = host.querySelector('[data-swiper-wrapper]') || host.querySelector('ul,ol');
    if (!wrapper) return null;
    wrapper.classList.add('swiper-wrapper');
    wrapper.querySelectorAll(':scope > *').forEach((el, i) => {
      el.classList.add('swiper-slide');
      if (!el.hasAttribute('data-swiper-slide-index')) {
        el.setAttribute('data-swiper-slide-index', i);
      }
    });
    return wrapper;
  }

  // Create a single Swiper instance
  function createSwiper(host, extraOpts = {}) {
    if (!prepareHost(host)) return null;

    const baseOpts = parseJSON(host.getAttribute('data-swiper-options'));
    const direction = getDirection();
    const isVertical = direction === 'vertical';
    const isThumbs = host.hasAttribute('data-swiper-slave');
    
    // Merge options, override direction
    const opts = {
      ...baseOpts,
      ...extraOpts,
      direction,
      watchSlidesProgress: true,
      resistanceRatio: 0,
      observer: true,
      observeParents: true,
    };
    
    // Main gallery: 1 slide on vertical, auto on horizontal
    // Thumbs: always use baseOpts
    if (!isThumbs) {
      opts.slidesPerView = isVertical ? 1 : (baseOpts.slidesPerView || 'auto');
      opts.spaceBetween = isVertical ? 0 : (baseOpts.spaceBetween || 0);
    }

    // Remove breakpoints - we handle direction manually
    delete opts.breakpoints;

    // Navigation
    const prevEl = host.querySelector('[data-swiper-prev]');
    const nextEl = host.querySelector('[data-swiper-next]');
    if (prevEl && nextEl) {
      opts.navigation = { prevEl, nextEl };
    }

    const sw = new Swiper(host, opts);
    
    // Force update after init
    requestAnimationFrame(() => {
      if (sw && !sw.destroyed) {
        sw.update();
      }
    });

    return sw;
  }

  // Initialize a gallery pair (main + thumbs)
  function initGallery(mainHost) {
    const id = mainHost.getAttribute('data-swiper-id');
    if (!id || instances.has(id)) return;

    // Find thumbs by data-swiper-slave attribute
    const thumbsHost = document.querySelector(`[data-swiper-slave="${id}"]`);
    
    // Create thumbs first (if exists)
    let thumbsSwiper = null;
    if (thumbsHost) {
      thumbsSwiper = createSwiper(thumbsHost, {
        freeMode: true,
        watchSlidesProgress: true,
        slideToClickedSlide: true,
      });
    }

    // Create main with thumbs reference
    const mainOpts = thumbsSwiper ? { thumbs: { swiper: thumbsSwiper } } : {};
    const mainSwiper = createSwiper(mainHost, mainOpts);

    if (!mainSwiper) return;

    // Store instances
    instances.set(id, { main: mainSwiper, thumbs: thumbsSwiper, mainHost, thumbsHost });

    // Force update both after a short delay (images may still be loading)
    setTimeout(() => {
      if (mainSwiper && !mainSwiper.destroyed) mainSwiper.update();
      if (thumbsSwiper && !thumbsSwiper.destroyed) thumbsSwiper.update();
    }, 100);

    return { main: mainSwiper, thumbs: thumbsSwiper };
  }

  // Destroy and reinit on direction change
  function reinitGallery(id) {
    const record = instances.get(id);
    if (!record) return;

    const { main, thumbs, mainHost, thumbsHost } = record;
    const currentDirection = main?.params?.direction;
    const newDirection = getDirection();

    // Only reinit if direction actually changed
    if (currentDirection === newDirection) return;

    // Preserve active index
    const activeIndex = main?.activeIndex || 0;

    // Destroy old instances
    if (thumbs && !thumbs.destroyed) thumbs.destroy(true, true);
    if (main && !main.destroyed) main.destroy(true, true);

    // Remove Swiper classes for clean reinit
    [mainHost, thumbsHost].forEach(host => {
      if (!host) return;
      host.classList.remove('swiper-initialized', 'swiper-horizontal', 'swiper-vertical');
      const wrapper = host.querySelector('.swiper-wrapper');
      if (wrapper) {
        wrapper.removeAttribute('style');
        wrapper.querySelectorAll('.swiper-slide').forEach(sl => sl.removeAttribute('style'));
      }
    });

    // Small delay for DOM cleanup
    requestAnimationFrame(() => {
      // Recreate thumbs
      let newThumbs = null;
      if (thumbsHost) {
        newThumbs = createSwiper(thumbsHost, {
          freeMode: true,
          watchSlidesProgress: true,
          slideToClickedSlide: true,
        });
      }

      // Recreate main with thumbs
      const mainOpts = newThumbs ? { thumbs: { swiper: newThumbs } } : {};
      const newMain = createSwiper(mainHost, mainOpts);

      // Restore active slide
      if (newMain && activeIndex > 0) {
        newMain.slideTo(activeIndex, 0);
      }

      // Update record
      instances.set(id, { main: newMain, thumbs: newThumbs, mainHost, thumbsHost });
    });
  }

  // Initialize all galleries
  function initAll(root = document) {
    root.querySelectorAll('[data-swiper-id]').forEach(host => {
      // Skip if it's a slave (thumbs) - we init from main
      if (host.hasAttribute('data-swiper-slave')) return;
      initGallery(host);
    });
  }

  // Handle resize with debounce
  let resizeTimer;
  let lastDirection = getDirection();
  
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const newDirection = getDirection();
      if (newDirection !== lastDirection) {
        lastDirection = newDirection;
        instances.forEach((_, id) => reinitGallery(id));
      }
    }, 150);
  }, { passive: true });

  // Wait for Swiper library
  function whenReady(cb, tries = 0) {
    if (window.Swiper) return cb();
    if (tries > 100) return console.warn('[ThemeSwiper] Swiper not found');
    setTimeout(() => whenReady(cb, tries + 1), 50);
  }

  // Init on ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => whenReady(initAll));
  } else {
    whenReady(initAll);
  }

  // Shopify Theme Editor support
  document.addEventListener('shopify:section:load', (e) => whenReady(() => initAll(e.target)));

  // Public API
  window.ThemeSwiper = {
    init: initAll,
    get: (id) => instances.get(id),
    reinit: reinitGallery,
    instances
  };
})();
