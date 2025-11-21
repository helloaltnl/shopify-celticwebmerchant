/**
 * Example: Cart Counter/Badge Update Script
 * This demonstrates how to use the CartEvents system to update cart counters
 * 
 * Usage:
 * Include this script in your theme and it will automatically update
 * any element with data-cart-count attribute when the cart changes.
 */

(function() {
  'use strict';

  /**
   * Cart Counter Manager
   * Updates cart count badges throughout the site
   */
  class CartCounterManager {
	constructor() {
	  this.counters = document.querySelectorAll('[data-cart-count]');
	  this.init();
	}

	init() {
	  if (!window.CartEvents) {
		console.warn('CartEvents not found. Make sure theme-cart.js is loaded.');
		return;
	  }

	  // Subscribe to cart update events
	  window.CartEvents.subscribe('cart:update', (data) => {
		this.updateCounters(data.cart.item_count);
	  });

	  window.CartEvents.subscribe('cart:add', (data) => {
		this.updateCounters(data.cart.item_count);
		this.showAddedFeedback();
	  });

	  window.CartEvents.subscribe('cart:remove', (data) => {
		this.updateCounters(data.cart.item_count);
	  });

	  // Initial update with current cart count
	  this.fetchCurrentCount();
	}

	/**
	 * Update all cart counter elements
	 */
	updateCounters(count) {
	  this.counters.forEach(counter => {
		counter.textContent = count;
		
		// Toggle visibility for counters that should hide when empty
		if (counter.hasAttribute('data-cart-count-hide-empty')) {
		  counter.style.display = count > 0 ? '' : 'none';
		}

		// Add animation class
		counter.classList.add('cart-count--updated');
		setTimeout(() => {
		  counter.classList.remove('cart-count--updated');
		}, 300);
	  });

	  // Update cart buttons disabled state
	  this.updateCartButtons(count);
	}

	/**
	 * Update cart buttons (enable/disable based on count)
	 */
	updateCartButtons(count) {
	  const cartButtons = document.querySelectorAll('[data-cart-button]');
	  cartButtons.forEach(button => {
		if (count === 0) {
		  button.disabled = true;
		  button.setAttribute('aria-disabled', 'true');
		} else {
		  button.disabled = false;
		  button.setAttribute('aria-disabled', 'false');
		}
	  });
	}

	/**
	 * Show visual feedback when item is added
	 */
	showAddedFeedback() {
	  // Find cart icon and add pulse animation
	  const cartIcons = document.querySelectorAll('[data-cart-icon]');
	  cartIcons.forEach(icon => {
		icon.classList.add('cart-icon--pulse');
		setTimeout(() => {
		  icon.classList.remove('cart-icon--pulse');
		}, 600);
	  });
	}

	/**
	 * Fetch current cart count on page load
	 */
	async fetchCurrentCount() {
	  try {
		if (window.CartAPI) {
		  const cart = await window.CartAPI.get();
		  this.updateCounters(cart.item_count);
		}
	  } catch (error) {
		console.error('Failed to fetch cart count:', error);
	  }
	}
  }

  /**
   * Example: Cart Drawer Trigger
   * Opens cart preview when items are added
   */
  class CartDrawerTrigger {
	constructor() {
	  this.init();
	}

	init() {
	  if (!window.CartEvents) return;

	  // Open drawer when item is added (optional)
	  window.CartEvents.subscribe('cart:add', (data) => {
		if (window.CartPreview) {
		  window.CartPreview.open();
		}
	  });
	}
  }

  /**
   * Example: Cart Error Handler
   * Shows error messages when cart operations fail
   */
  class CartErrorHandler {
	constructor() {
	  this.init();
	}

	init() {
	  if (!window.CartEvents) return;

	  window.CartEvents.subscribe('cart:error', (data) => {
		this.showError(data.error.message || 'An error occurred');
	  });
	}

	showError(message) {
	  // Create or update error notification
	  let errorNotification = document.getElementById('cart-error-notification');
	  
	  if (!errorNotification) {
		errorNotification = document.createElement('div');
		errorNotification.id = 'cart-error-notification';
		errorNotification.className = 'cart-error-notification';
		document.body.appendChild(errorNotification);
	  }

	  errorNotification.textContent = message;
	  errorNotification.classList.add('cart-error-notification--visible');

	  setTimeout(() => {
		errorNotification.classList.remove('cart-error-notification--visible');
	  }, 4000);
	}
  }

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', init);
  } else {
	init();
  }

  function init() {
	new CartCounterManager();
	new CartDrawerTrigger();
	new CartErrorHandler();
  }
})();

/**
 * Example CSS for cart counter animations
 * Add this to your stylesheet:
 * 
 * [data-cart-count] {
 *   display: inline-block;
 *   min-width: 1.5rem;
 *   height: 1.5rem;
 *   padding: 0.25rem;
 *   text-align: center;
 *   font-size: 0.75rem;
 *   font-weight: 600;
 *   background: rgb(var(--color-button));
 *   color: rgb(var(--color-button-text));
 *   border-radius: 50%;
 *   transition: transform 0.3s ease;
 * }
 * 
 * .cart-count--updated {
 *   animation: cartCountPulse 0.3s ease;
 * }
 * 
 * @keyframes cartCountPulse {
 *   0%, 100% { transform: scale(1); }
 *   50% { transform: scale(1.2); }
 * }
 * 
 * .cart-icon--pulse {
 *   animation: cartIconPulse 0.6s ease;
 * }
 * 
 * @keyframes cartIconPulse {
 *   0%, 100% { transform: scale(1); }
 *   25% { transform: scale(1.1); }
 *   50% { transform: scale(0.95); }
 *   75% { transform: scale(1.05); }
 * }
 * 
 * .cart-error-notification {
 *   position: fixed;
 *   bottom: 2rem;
 *   left: 50%;
 *   transform: translateX(-50%) translateY(100px);
 *   padding: 1rem 1.5rem;
 *   background: rgb(var(--color-error));
 *   color: white;
 *   border-radius: var(--border-radius);
 *   box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
 *   opacity: 0;
 *   transition: all 0.3s ease;
 *   z-index: 9999;
 * }
 * 
 * .cart-error-notification--visible {
 *   opacity: 1;
 *   transform: translateX(-50%) translateY(0);
 * }
 */

/**
 * Example HTML for cart button with counter:
 * 
 * <button 
 *   type="button" 
 *   data-cart-button
 *   onclick="window.CartPreview?.open()"
 * >
 *   <span data-cart-icon>
 *     <svg>...</svg>
 *   </span>
 *   <span data-cart-count data-cart-count-hide-empty>0</span>
 * </button>
 */