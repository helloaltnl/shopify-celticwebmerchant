/**
 * Theme Lazyload
 * Lightweight lazy loading for background images and videos
 * Native browser lazy loading handles <img loading="lazy"> automatically
 * 
 * Usage:
 * - Images: Use native <img src="..." loading="lazy" />
 * - Background images: <div loading="lazy" data-bg="image.jpg"></div>
 * - Background srcset: <div loading="lazy" data-bg="1x.jpg" data-bg-2x="2x.jpg"></div>
 * - Videos: <video loading="lazy" data-src="video.mp4" poster="poster.jpg"></video>
 * - Video sources: <video loading="lazy"><source data-src="video.mp4" type="video/mp4"></video>
 * 
 * Classes applied:
 * - .is-loading - While loading
 * - .is-loaded - After successful load
 * - .is-error - On load failure
 * 
 * Public API:
 * - window.themeLazy.scan(root) - Scan for new lazy elements
 * - window.themeLazy.load(element) - Force load a specific element
 * - window.lazyload - Alias for themeLazy
 */
(()=>{
  const SELECTOR = '[loading="lazy"][data-bg], [loading="lazy"][data-src], video[loading="lazy"], [data-lazy]';
  const ROOT_MARGIN = '300px';
  const isHiDPI = window.devicePixelRatio > 1;

  // Load background image
  const loadBg = (el) => {
    const bg = isHiDPI && el.dataset.bg2x ? el.dataset.bg2x : el.dataset.bg;
    if (!bg) return;
    
    el.classList.add('is-loading');
    
    const img = new Image();
    img.onload = () => {
      el.style.backgroundImage = `url("${bg}")`;
      el.classList.remove('is-loading');
      el.classList.add('is-loaded');
      cleanup(el);
    };
    img.onerror = () => {
      el.classList.remove('is-loading');
      el.classList.add('is-error');
      cleanup(el);
    };
    img.src = bg;
  };

  // Load video
  const loadVideo = (el) => {
    if (el.tagName !== 'VIDEO') return;
    
    el.classList.add('is-loading');
    
    // Handle data-src on video element
    const videoSrc = el.dataset.src;
    if (videoSrc) {
      el.src = videoSrc;
      delete el.dataset.src;
    }
    
    // Handle data-src on source children
    const sources = el.querySelectorAll('source[data-src]');
    sources.forEach(source => {
      source.src = source.dataset.src;
      delete source.dataset.src;
    });
    
    // Load if we added sources
    if (videoSrc || sources.length) {
      el.load();
    }
    
    // Handle load events
    const onLoaded = () => {
      el.classList.remove('is-loading');
      el.classList.add('is-loaded');
      cleanup(el);
      el.removeEventListener('loadeddata', onLoaded);
      el.removeEventListener('error', onError);
    };
    
    const onError = () => {
      el.classList.remove('is-loading');
      el.classList.add('is-error');
      cleanup(el);
      el.removeEventListener('loadeddata', onLoaded);
      el.removeEventListener('error', onError);
    };
    
    el.addEventListener('loadeddata', onLoaded, { once: true });
    el.addEventListener('error', onError, { once: true });
    
    // If already loaded (cached)
    if (el.readyState >= 3) {
      onLoaded();
    }
  };

  // Clean up data attributes after loading
  const cleanup = (el) => {
    delete el.dataset.bg;
    delete el.dataset.bg2x;
    delete el.dataset.lazy;
    el.removeAttribute('loading');
  };

  // Determine load type and execute
  const load = (el) => {
    if (el.classList.contains('is-loaded') || el.classList.contains('is-loading')) return;
    
    if (el.tagName === 'VIDEO') {
      loadVideo(el);
    } else if (el.dataset.bg) {
      loadBg(el);
    }
  };

  // Intersection Observer
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        load(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { 
    rootMargin: ROOT_MARGIN,
    threshold: 0
  });

  // Scan for lazy elements
  const scan = (root = document) => {
    const elements = root.querySelectorAll ? root.querySelectorAll(SELECTOR) : [];
    elements.forEach(el => {
      if (!el.classList.contains('is-loaded') && !el.classList.contains('is-loading')) {
        observer.observe(el);
      }
    });
  };

  // Initialize
  const init = () => {
    scan();
    
    // Watch for DOM changes (AJAX, Shopify sections, etc.)
    const mo = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.addedNodes.length) {
          // Scan the parent of added nodes
          scan(m.target);
          break;
        }
      }
    });
    mo.observe(document.documentElement, { childList: true, subtree: true });
    
    // Shopify Theme Editor events
    const onSection = (e) => scan(e.target);
    document.addEventListener('shopify:section:load', onSection, { passive: true });
    document.addEventListener('shopify:section:reorder', onSection, { passive: true });
    document.addEventListener('shopify:block:select', onSection, { passive: true });
  };

  // Start when ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Public API
  const api = { scan, load, observer };
  window.lazyload = api;
  window.themeLazy = api;
})();
