/**
 * ============================================================================
 * THEME-MODAL.JS
 * ============================================================================
 * 
 * Centralized modal management system.
 * 
 * USAGE:
 * 
 * HTML (declarative):
 *   <button data-modal-trigger="my-modal">Open Modal</button>
 *   
 *   <div data-modal="my-modal" hidden>
 *     <div data-modal-overlay></div>
 *     <div class="theme-modal__content">
 *       <button data-modal-close aria-label="Close">×</button>
 *       <!-- content -->
 *     </div>
 *   </div>
 * 
 * JavaScript (imperative):
 *   window.themeModal.open('my-modal');
 *   window.themeModal.close('my-modal');
 *   window.themeModal.closeAll();
 *   window.themeModal.isOpen('my-modal');
 * 
 * Events:
 *   document.addEventListener('modal:open', (e) => console.log(e.detail.id));
 *   document.addEventListener('modal:close', (e) => console.log(e.detail.id));
 * 
 * ============================================================================
 */

(function() {
  'use strict';

  const SELECTORS = {
    modal: '[data-modal]',
    trigger: '[data-modal-trigger]',
    close: '[data-modal-close]',
    overlay: '[data-modal-overlay]'
  };

  const CLASSES = {
    open: 'is-open',
    bodyLock: 'has-modal-open'
  };

  let activeModal = null;
  let previousFocus = null;

  /**
   * Open a modal by ID
   */
  function open(id) {
    const modal = document.querySelector(`[data-modal="${id}"]`);
    if (!modal) {
      console.warn(`[theme-modal] Modal "${id}" not found`);
      return false;
    }

    // Close any open drawer first (modals and drawers don't stack)
    if (window.themeDrawer && typeof window.themeDrawer.closeAll === 'function') {
      window.themeDrawer.closeAll();
    }

    // Close any other open modal
    if (activeModal && activeModal !== modal) {
      closeModal(activeModal);
    }

    // Store previous focus
    previousFocus = document.activeElement;

    // Open modal - show first, then animate
    modal.hidden = false;
    document.body.classList.add(CLASSES.bodyLock);
    activeModal = modal;

    // Add open class after a frame to trigger CSS transition
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        modal.classList.add(CLASSES.open);
      });
    });

    // Focus first focusable element
    requestAnimationFrame(() => {
      const focusable = getFocusableElements(modal);
      if (focusable.length) {
        focusable[0].focus();
      }
    });

    // Dispatch event
    document.dispatchEvent(new CustomEvent('modal:open', { 
      detail: { id, modal } 
    }));

    return true;
  }

  /**
   * Close a modal by ID or element
   */
  function close(idOrElement) {
    const modal = typeof idOrElement === 'string' 
      ? document.querySelector(`[data-modal="${idOrElement}"]`)
      : idOrElement;

    if (!modal) return false;

    return closeModal(modal);
  }

  /**
   * Close modal element
   */
  function closeModal(modal) {
    if (!modal || modal.hidden) return false;

    const id = modal.dataset.modal;

    // Start close animation
    modal.classList.remove(CLASSES.open);
    document.body.classList.remove(CLASSES.bodyLock);

    if (activeModal === modal) {
      activeModal = null;
    }

    // Restore focus
    if (previousFocus && typeof previousFocus.focus === 'function') {
      previousFocus.focus();
      previousFocus = null;
    }

    // Hide after transition completes (175ms snappy)
    setTimeout(() => {
      modal.hidden = true;
    }, 175);

    // Dispatch event
    document.dispatchEvent(new CustomEvent('modal:close', { 
      detail: { id, modal } 
    }));

    return true;
  }

  /**
   * Close all open modals
   */
  function closeAll() {
    const modals = document.querySelectorAll(SELECTORS.modal);
    modals.forEach(modal => {
      if (!modal.hidden) {
        closeModal(modal);
      }
    });
  }

  /**
   * Check if modal is open
   */
  function isOpen(id) {
    const modal = document.querySelector(`[data-modal="${id}"]`);
    return modal && !modal.hidden;
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
  function handleFocusTrap(e, modal) {
    if (e.key !== 'Tab') return;

    const focusable = getFocusableElements(modal);
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
   * Initialize event listeners
   */
  function init() {
    // Trigger clicks
    document.addEventListener('click', (e) => {
      const trigger = e.target.closest(SELECTORS.trigger);
      if (trigger) {
        e.preventDefault();
        const id = trigger.dataset.modalTrigger;
        open(id);
        return;
      }

      // Close button clicks
      const closeBtn = e.target.closest(SELECTORS.close);
      if (closeBtn) {
        e.preventDefault();
        const modal = closeBtn.closest(SELECTORS.modal);
        if (modal) {
          closeModal(modal);
        }
        return;
      }

      // Overlay clicks
      const overlay = e.target.closest(SELECTORS.overlay);
      if (overlay) {
        const modal = overlay.closest(SELECTORS.modal);
        if (modal) {
          closeModal(modal);
        }
      }
    });

    // Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && activeModal) {
        e.preventDefault();
        closeModal(activeModal);
        return;
      }

      // Focus trap
      if (activeModal) {
        handleFocusTrap(e, activeModal);
      }
    });

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
  window.themeModal = {
    open,
    close,
    closeAll,
    isOpen
  };

})();
