/**
 * ============================================================================
 * THEME-DRAWER.JS
 * ============================================================================
 * 
 * Centralized drawer management system.
 * 
 * USAGE:
 * 
 * HTML (declarative):
 *   <button data-drawer-trigger="my-drawer">Open Drawer</button>
 *   
 *   <div data-drawer="my-drawer" data-drawer-position="right" hidden>
 *     <div data-drawer-overlay></div>
 *     <div class="theme-drawer__content">
 *       <button data-drawer-close aria-label="Close">×</button>
 *       <!-- content -->
 *     </div>
 *   </div>
 * 
 * Data attributes:
 *   data-drawer="id"              - Drawer identifier
 *   data-drawer-position="left"   - Slide from left (default)
 *   data-drawer-position="right"  - Slide from right
 * 
 * JavaScript (imperative):
 *   window.themeDrawer.open('my-drawer');
 *   window.themeDrawer.close('my-drawer');
 *   window.themeDrawer.closeAll();
 *   window.themeDrawer.isOpen('my-drawer');
 * 
 * Events:
 *   document.addEventListener('drawer:open', (e) => console.log(e.detail.id));
 *   document.addEventListener('drawer:close', (e) => console.log(e.detail.id));
 * 
 * ============================================================================
 */

(function() {
  'use strict';

  const SELECTORS = {
    drawer: '[data-drawer]',
    trigger: '[data-drawer-trigger]',
    close: '[data-drawer-close]',
    overlay: '[data-drawer-overlay]'
  };

  const CLASSES = {
    open: 'is-open',
    bodyLock: 'has-drawer-open',
    left: 'is-position-left',
    right: 'is-position-right'
  };

  let activeDrawer = null;
  let previousFocus = null;
  let touchStartX = null;

  /**
   * Open a drawer by ID
   */
  function open(id) {
    const drawer = document.querySelector(`[data-drawer="${id}"]`);
    if (!drawer) {
      console.warn(`[theme-drawer] Drawer "${id}" not found`);
      return false;
    }

    // Close any open modal first (modals and drawers don't stack)
    if (window.themeModal && typeof window.themeModal.closeAll === 'function') {
      window.themeModal.closeAll();
    }

    // Close any other open drawer
    if (activeDrawer && activeDrawer !== drawer) {
      closeDrawer(activeDrawer);
    }

    // Store previous focus
    previousFocus = document.activeElement;

    // Apply position class
    const position = drawer.dataset.drawerPosition || 'left';
    drawer.classList.remove(CLASSES.left, CLASSES.right);
    drawer.classList.add(position === 'right' ? CLASSES.right : CLASSES.left);

    // Open drawer
    drawer.hidden = false;
    
    // Force reflow for animation
    drawer.offsetHeight;
    
    drawer.classList.add(CLASSES.open);
    document.body.classList.add(CLASSES.bodyLock);
    activeDrawer = drawer;

    // Focus first focusable element
    requestAnimationFrame(() => {
      const focusable = getFocusableElements(drawer);
      if (focusable.length) {
        focusable[0].focus();
      }
    });

    // Dispatch event
    document.dispatchEvent(new CustomEvent('drawer:open', { 
      detail: { id, drawer, position } 
    }));

    return true;
  }

  /**
   * Close a drawer by ID or element
   */
  function close(idOrElement) {
    const drawer = typeof idOrElement === 'string' 
      ? document.querySelector(`[data-drawer="${idOrElement}"]`)
      : idOrElement;

    if (!drawer) return false;

    return closeDrawer(drawer);
  }

  /**
   * Close drawer element
   */
  function closeDrawer(drawer) {
    if (!drawer || drawer.hidden) return false;

    const id = drawer.dataset.drawer;

    drawer.classList.remove(CLASSES.open);
    document.body.classList.remove(CLASSES.bodyLock);

    // Wait for animation to complete
    const handleTransitionEnd = () => {
      drawer.hidden = true;
      drawer.removeEventListener('transitionend', handleTransitionEnd);
    };
    
    drawer.addEventListener('transitionend', handleTransitionEnd);
    
    // Fallback if no transition
    setTimeout(() => {
      if (!drawer.hidden) {
        drawer.hidden = true;
      }
    }, 350);

    if (activeDrawer === drawer) {
      activeDrawer = null;
    }

    // Restore focus
    if (previousFocus && typeof previousFocus.focus === 'function') {
      previousFocus.focus();
      previousFocus = null;
    }

    // Dispatch event
    document.dispatchEvent(new CustomEvent('drawer:close', { 
      detail: { id, drawer } 
    }));

    return true;
  }

  /**
   * Close all open drawers
   */
  function closeAll() {
    const drawers = document.querySelectorAll(SELECTORS.drawer);
    drawers.forEach(drawer => {
      if (!drawer.hidden) {
        closeDrawer(drawer);
      }
    });
  }

  /**
   * Check if drawer is open
   */
  function isOpen(id) {
    const drawer = document.querySelector(`[data-drawer="${id}"]`);
    return drawer && !drawer.hidden;
  }

  /**
   * Get focusable elements within container
   */
  function getFocusableElements(container) {
    const elements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    return Array.from(elements).filter(el => !el.disabled && el.offsetParent !== null);
  }

  /**
   * Handle focus trap
   */
  function handleFocusTrap(e, drawer) {
    if (e.key !== 'Tab') return;

    const focusable = getFocusableElements(drawer);
    if (!focusable.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  /**
   * Handle swipe to close
   */
  function handleTouchStart(e) {
    if (!activeDrawer) return;
    touchStartX = e.touches[0].clientX;
  }

  function handleTouchEnd(e) {
    if (!activeDrawer || touchStartX === null) return;

    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchEndX - touchStartX;
    const position = activeDrawer.dataset.drawerPosition || 'left';
    const threshold = 80;

    // Swipe left to close left drawer, swipe right to close right drawer
    if (position === 'left' && diff < -threshold) {
      closeDrawer(activeDrawer);
    } else if (position === 'right' && diff > threshold) {
      closeDrawer(activeDrawer);
    }

    touchStartX = null;
  }

  /**
   * Initialize event listeners
   */
  function init() {
    // Trigger clicks
    document.addEventListener('click', (e) => {
      const trigger = e.target.closest(SELECTORS.trigger);
      if (trigger) {
        e.preventDefault();
        const id = trigger.dataset.drawerTrigger;
        open(id);
        return;
      }

      // Close button clicks
      const closeBtn = e.target.closest(SELECTORS.close);
      if (closeBtn) {
        e.preventDefault();
        const drawer = closeBtn.closest(SELECTORS.drawer);
        if (drawer) {
          closeDrawer(drawer);
        }
        return;
      }

      // Overlay clicks
      const overlay = e.target.closest(SELECTORS.overlay);
      if (overlay) {
        const drawer = overlay.closest(SELECTORS.drawer);
        if (drawer) {
          closeDrawer(drawer);
        }
      }
    });

    // Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && activeDrawer) {
        e.preventDefault();
        closeDrawer(activeDrawer);
        return;
      }

      // Focus trap
      if (activeDrawer) {
        handleFocusTrap(e, activeDrawer);
      }
    });

    // Touch events for swipe-to-close
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    // Shopify section events
    document.addEventListener('shopify:section:unload', () => {
      closeAll();
    });
  }

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose API
  window.themeDrawer = {
    open,
    close,
    closeAll,
    isOpen
  };

})();
