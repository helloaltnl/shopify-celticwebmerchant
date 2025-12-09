/**
 * Unified Cart System with Event-Driven Architecture
 * Allows modular cart updates without page refresh
 * Other scripts can subscribe to cart events for custom functionality
 */

// Event system for cart updates
class CartEvents {
  constructor() {
    this.events = {};
  }

  /**
   * Subscribe to cart events
   * @param {string} eventName - Event to listen for
   * @param {function} callback - Function to call when event fires
   * @returns {function} Unsubscribe function
   */
  subscribe(eventName, callback) {
    if (!this.events[eventName]) {
      this.events[eventName] = [];
    }
    this.events[eventName].push(callback);
    
    // Return unsubscribe function
    return () => {
      this.events[eventName] = this.events[eventName].filter(cb => cb !== callback);
    };
  }

  /**
   * Publish cart event
   * @param {string} eventName - Event to fire
   * @param {object} data - Event data
   */
  publish(eventName, data) {
    if (!this.events[eventName]) return;
    this.events[eventName].forEach(callback => callback(data));
  }
}

// Global cart event system
window.CartEvents = new CartEvents();

// Available cart events:
// - 'cart:update' - Cart was updated (quantity change, add, remove)
// - 'cart:add' - Item was added to cart
// - 'cart:remove' - Item was removed from cart
// - 'cart:change' - Cart quantity changed
// - 'cart:error' - Cart operation failed
// - 'cart:note' - Cart note was updated
// - 'cart:loading' - Cart operation started
// - 'cart:loaded' - Cart operation completed

/**
 * Cart updater class - handles selective section updates
 */
class CartUpdater {
  constructor() {
    this.isUpdating = false;
  }

  /**
   * Get sections that need updating based on context
   * @param {string} context - 'page' | 'drawer' | 'preview'
   * @param {object} cartData - Current cart data (to detect empty state)
   * @returns {array} Sections to update
   */
  getSectionsToUpdate(context = 'page', cartData = null) {
    const sections = [];
    const sectionId = context === 'page' 
      ? document.querySelector('[data-cart-main-section]')?.dataset.cartMainSection
      : document.querySelector('[data-cart-preview-section]')?.dataset.cartPreviewSection;

    if (!sectionId) return sections;

    if (context === 'page') {
      const mainSection = document.querySelector('[data-cart-main-section]');
      
      // If cart is empty or becomes empty, update entire section to show/hide empty state
      if (cartData && cartData.item_count === 0 && mainSection) {
        sections.push({
          id: sectionId,
          selector: '[data-cart-main-section]',
          target: mainSection,
          replaceWhole: true
        });
        return sections;
      }
      
      // Full cart page updates (when cart has items)
      const itemsSection = document.querySelector('[data-cart-items-section]');
      const subtotalSection = document.querySelector('[data-cart-subtotal-section]');
      const paymentsSection = document.querySelector('[data-cart-payments-section]');

      if (itemsSection) {
        sections.push({
          id: sectionId,
          selector: '[data-cart-items-section]',
          target: itemsSection
        });
      }

      if (subtotalSection) {
        sections.push({
          id: sectionId,
          selector: '[data-cart-subtotal-section]',
          target: subtotalSection
        });
      }

      if (paymentsSection) {
        sections.push({
          id: sectionId,
          selector: '[data-cart-payments-section]',
          target: paymentsSection
        });
      }
    } else if (context === 'drawer' || context === 'preview') {
      // Drawer/preview updates - update subsections within the drawer
      const previewContainer = document.querySelector('[data-cart-preview-section]');
      if (!previewContainer) return sections;

      const itemsSection = previewContainer.querySelector('[data-cart-items-section]');
      const subtotalSection = previewContainer.querySelector('[data-cart-subtotal-section]');
      const paymentsSection = previewContainer.querySelector('[data-cart-payments-section]');

      if (itemsSection) {
        sections.push({
          id: sectionId,
          selector: '[data-cart-preview-section] [data-cart-items-section]',
          target: itemsSection
        });
      }

      if (subtotalSection) {
        sections.push({
          id: sectionId,
          selector: '[data-cart-preview-section] [data-cart-subtotal-section]',
          target: subtotalSection
        });
      }

      if (paymentsSection) {
        sections.push({
          id: sectionId,
          selector: '[data-cart-preview-section] [data-cart-payments-section]',
          target: paymentsSection
        });
      }
    }

    return sections;
  }

  /**
   * Update specific cart sections
   * @param {array} sections - Sections to update
   * @param {object} cartData - Updated cart data from API
   */
  async updateSections(sections, cartData) {
    if (!sections || sections.length === 0) return;
    const sectionIds = sections.map(s => s.id).filter(Boolean);
    if (sectionIds.length === 0) return;
    
    try {
      const params = new URLSearchParams({
        sections: sectionIds.join(',')
      });
      
      const response = await fetch(`${window.Shopify.routes.root}?${params}`);
      const sectionsData = await response.json();
      
      sections.forEach(section => {
        if (!section.target || !section.selector || !section.id) return;
        
        // Get the HTML from the JSON response
        const htmlString = sectionsData[section.id];
        if (!htmlString) return;
        
        // Parse the HTML string to DOM
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlString, 'text/html');
        
        // Find the specific selector in the parsed HTML
        const newContent = doc.querySelector(section.selector);
        if (newContent) {
          // If replaceWhole flag is set, replace entire element
          if (section.replaceWhole) {
            section.target.outerHTML = newContent.outerHTML;
          } else {
            // Otherwise just replace innerHTML
            section.target.innerHTML = newContent.innerHTML;
          }
        }
      });
      
      return true;
    } catch (error) {
      console.error('Cart section update failed:', error);
      return false;
    }
  }

  /**
   * Update cart by re-fetching specific sections
   * @param {object} options - Update options
   */
  async update(options = {}) {
    const {
      context = 'page',
      cartData = null,
      skipSections = []
    } = options;

    if (this.isUpdating) return;
    this.isUpdating = true;

    window.CartEvents.publish('cart:loading', { context });

    try {
      let sections = this.getSectionsToUpdate(context, cartData);
      
      // Filter out skipped sections
      sections = sections.filter(s => !skipSections.includes(s.id));

      await this.updateSections(sections, cartData);

      window.CartEvents.publish('cart:loaded', { context, cartData });
      
      return true;
    } catch (error) {
      console.error('Cart update failed:', error);
      window.CartEvents.publish('cart:error', { error, context });
      return false;
    } finally {
      this.isUpdating = false;
    }
  }
}

// Global cart updater
window.CartUpdater = new CartUpdater();

/**
 * Cart API wrapper - handles all cart operations
 */
class CartAPI {
  /**
   * Add item to cart
   * @param {object} data - Item data (id, quantity, properties, etc.)
   * @returns {object} Updated cart data
   */
  async add(data) {
    window.CartEvents.publish('cart:loading', { action: 'add' });

    try {
      const response = await fetch(window.Shopify.routes.root + 'cart/add.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.description || 'Failed to add item to cart');
      }

      const result = await response.json();
      
      // Get updated cart data
      const cartData = await this.get();
      
      window.CartEvents.publish('cart:add', { item: result, cart: cartData });
      window.CartEvents.publish('cart:update', { cart: cartData, action: 'add' });

      return cartData;
    } catch (error) {
      console.error('Add to cart failed:', error);
      window.CartEvents.publish('cart:error', { error, action: 'add' });
      throw error;
    }
  }

  /**
   * Update cart item quantity
   * @param {object} data - Update data (line, quantity)
   * @returns {object} Updated cart data
   */
  async change(data) {
    window.CartEvents.publish('cart:loading', { action: 'change' });

    try {
      const response = await fetch(window.Shopify.routes.root + 'cart/change.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.description || 'Failed to update cart');
      }

      const cartData = await response.json();
      
      window.CartEvents.publish('cart:change', { cart: cartData, line: data.line, quantity: data.quantity });
      window.CartEvents.publish('cart:update', { cart: cartData, action: 'change' });

      return cartData;
    } catch (error) {
      console.error('Cart change failed:', error);
      window.CartEvents.publish('cart:error', { error, action: 'change' });
      throw error;
    }
  }

  /**
   * Update multiple cart items at once
   * @param {object} updates - Updates object with line numbers as keys
   * @returns {object} Updated cart data
   */
  async update(updates) {
    window.CartEvents.publish('cart:loading', { action: 'update' });

    try {
      const response = await fetch(window.Shopify.routes.root + 'cart/update.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({ updates })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.description || 'Failed to update cart');
      }

      const cartData = await response.json();
      
      window.CartEvents.publish('cart:update', { cart: cartData, action: 'update' });

      return cartData;
    } catch (error) {
      console.error('Cart update failed:', error);
      window.CartEvents.publish('cart:error', { error, action: 'update' });
      throw error;
    }
  }

  /**
   * Get current cart data
   * @returns {object} Cart data
   */
  async get() {
    try {
      const response = await fetch(window.Shopify.routes.root + 'cart.js', {
        headers: {
          'X-Requested-With': 'XMLHttpRequest'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch cart data');
      }

      return await response.json();
    } catch (error) {
      console.error('Get cart failed:', error);
      throw error;
    }
  }

  /**
   * Update cart note
   * @param {string} note - Cart note text
   * @returns {object} Updated cart data
   */
  async updateNote(note) {
    window.CartEvents.publish('cart:loading', { action: 'note' });

    try {
      const response = await fetch(window.Shopify.routes.root + 'cart/update.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({ note })
      });

      if (!response.ok) {
        throw new Error('Failed to update cart note');
      }

      const cartData = await response.json();
      
      window.CartEvents.publish('cart:note', { cart: cartData, note });
      window.CartEvents.publish('cart:update', { cart: cartData, action: 'note' });

      return cartData;
    } catch (error) {
      console.error('Update cart note failed:', error);
      window.CartEvents.publish('cart:error', { error, action: 'note' });
      throw error;
    }
  }

  /**
   * Clear cart (set all quantities to 0)
   * @returns {object} Updated cart data
   */
  async clear() {
    window.CartEvents.publish('cart:loading', { action: 'clear' });

    try {
      const response = await fetch(window.Shopify.routes.root + 'cart/clear.js', {
        method: 'POST',
        headers: {
          'X-Requested-With': 'XMLHttpRequest'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to clear cart');
      }

      const cartData = await this.get();
      
      window.CartEvents.publish('cart:update', { cart: cartData, action: 'clear' });

      return cartData;
    } catch (error) {
      console.error('Clear cart failed:', error);
      window.CartEvents.publish('cart:error', { error, action: 'clear' });
      throw error;
    }
  }
}

// Global cart API
window.CartAPI = new CartAPI();

/**
 * Cart Remove Button Component
 */
class CartRemoveButton extends HTMLElement {
  constructor() {
    super();
    this.addEventListener('click', this.handleClick.bind(this));
  }

  async handleClick(event) {
    event.preventDefault();
    
    const line = parseInt(this.dataset.line);
    const context = this.closest('[data-cart-context]')?.dataset.cartContext || 'page';
    
    this.enableLoading();

    try {
      const cartData = await window.CartAPI.change({
        line: line,
        quantity: 0
      });

      // Update UI
      await window.CartUpdater.update({ context, cartData });

      window.CartEvents.publish('cart:remove', { line, cart: cartData });
    } catch (error) {
      this.showError(error.message);
    } finally {
      this.disableLoading();
    }
  }

  enableLoading() {
    this.classList.add('loading');
    this.disabled = true;
  }

  disableLoading() {
    this.classList.remove('loading');
    this.disabled = false;
  }

  showError(message) {
    // Error handling can be customized
    console.error('Remove failed:', message);
  }
}

customElements.define('cart-remove-button', CartRemoveButton);

/**
 * Cart Quantity Input Component
 */
class CartQuantityInput extends HTMLElement {
  constructor() {
    super();
    this.input = this.querySelector('input[type="number"]');
    this.minusBtn = this.querySelector('[name="minus"]');
    this.plusBtn = this.querySelector('[name="plus"]');
    
    this.debounceTimer = null;
    
    if (this.input) {
      this.input.addEventListener('change', this.handleChange.bind(this));
    }
    
    if (this.minusBtn) {
      this.minusBtn.addEventListener('click', this.handleMinus.bind(this));
    }
    
    if (this.plusBtn) {
      this.plusBtn.addEventListener('click', this.handlePlus.bind(this));
    }
  }

  async handleChange(event) {
    clearTimeout(this.debounceTimer);
    
    this.debounceTimer = setTimeout(async () => {
      let newQuantity = parseInt(this.input.value);
      const line = parseInt(this.input.dataset.line);
      const context = this.closest('[data-cart-context]')?.dataset.cartContext || 'page';
      
      // Validate quantity
      const min = parseInt(this.input.dataset.min || 1);
      const max = this.input.max ? parseInt(this.input.max) : null;
      const step = parseInt(this.input.step || 1);

      // If empty or invalid, default to min
      if (isNaN(newQuantity) || newQuantity < min) {
        newQuantity = min;
        this.input.value = min;
      }

      if (max && newQuantity > max) {
        newQuantity = max;
        this.input.value = max;
        this.showError(`Maximum quantity is ${max}`);
      }

      this.enableLoading();

      try {
        const cartData = await window.CartAPI.change({
          line: line,
          quantity: newQuantity
        });

        // Update UI
        await window.CartUpdater.update({ context, cartData });
      } catch (error) {
        this.showError(error.message);
        this.input.value = this.input.dataset.previousValue || min;
      } finally {
        this.disableLoading();
      }
    }, 500);
  }

  handleMinus(event) {
    event.preventDefault();
    const currentValue = parseInt(this.input.value);
    const min = parseInt(this.input.dataset.min || 0);
    const step = parseInt(this.input.step || 1);
    
    if (currentValue - step >= min) {
      this.input.value = currentValue - step;
      this.input.dispatchEvent(new Event('change'));
    }
  }

  handlePlus(event) {
    event.preventDefault();
    const currentValue = parseInt(this.input.value);
    const max = this.input.max ? parseInt(this.input.max) : null;
    const step = parseInt(this.input.step || 1);
    
    if (!max || currentValue + step <= max) {
      this.input.value = currentValue + step;
      this.input.dispatchEvent(new Event('change'));
    }
  }

  enableLoading() {
    this.classList.add('loading');
    this.input.disabled = true;
    if (this.minusBtn) this.minusBtn.disabled = true;
    if (this.plusBtn) this.plusBtn.disabled = true;
  }

  disableLoading() {
    this.classList.remove('loading');
    this.input.disabled = false;
    if (this.minusBtn) this.minusBtn.disabled = false;
    if (this.plusBtn) this.plusBtn.disabled = false;
  }

  showError(message) {
    const errorElement = this.closest('[data-cart-item]')?.querySelector('[data-cart-item-error]');
    if (errorElement) {
      errorElement.textContent = message;
      errorElement.style.display = 'block';
      
      setTimeout(() => {
        errorElement.style.display = 'none';
      }, 3000);
    }
  }
}

customElements.define('cart-quantity-input', CartQuantityInput);

/**
 * Cart Note Component
 */
class CartNote extends HTMLElement {
  constructor() {
    super();
    this.textarea = this.querySelector('textarea');
    this.debounceTimer = null;
    
    if (this.textarea) {
      this.textarea.addEventListener('input', this.handleInput.bind(this));
    }
  }

  handleInput(event) {
    clearTimeout(this.debounceTimer);
    
    this.debounceTimer = setTimeout(async () => {
      const note = this.textarea.value;
      
      try {
        await window.CartAPI.updateNote(note);
      } catch (error) {
        console.error('Update note failed:', error);
      }
    }, 1000);
  }
}

customElements.define('cart-note', CartNote);

/**
 * Cart Add Button Component
 * Simple add-to-cart button for quick add scenarios (e.g., recommended products)
 */
class CartAddButton extends HTMLElement {
  constructor() {
    super();
    this.button = this.querySelector('button');
    
    if (this.button) {
      this.button.addEventListener('click', this.handleClick.bind(this));
    }
  }

  async handleClick(event) {
    event.preventDefault();
    
    const variantId = this.dataset.variantId;
    const quantity = parseInt(this.dataset.quantity || 1);
    
    if (!variantId || this.classList.contains('loading')) return;
    
    this.enableLoading();

    try {
      await window.CartAPI.add({
        id: parseInt(variantId),
        quantity: quantity
      });
    } catch (error) {
      console.error('Add to cart failed:', error);
    } finally {
      this.disableLoading();
    }
  }

  enableLoading() {
    this.classList.add('loading');
    if (this.button) this.button.disabled = true;
  }

  disableLoading() {
    this.classList.remove('loading');
    if (this.button) this.button.disabled = false;
  }
}

customElements.define('cart-add-button', CartAddButton);

/**
 * Initialize cart system on DOM ready
 */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeCart);
} else {
  initializeCart();
}

function initializeCart() {
  console.log('Cart system initialized');
  
  // Auto-update cart sections on any cart update
  window.CartEvents.subscribe('cart:update', async (data) => {
    console.log('Cart updated:', data);
    
    // Check which cart contexts exist on the page
    const cartPage = document.querySelector('[data-cart-main-section]');
    const cartPreview = document.querySelector('[data-cart-preview-section]');
    
    // Update cart page if present
    if (cartPage) {
      await window.CartUpdater.update({ 
        context: 'page', 
        cartData: data.cart 
      });
    }
    
    // Update cart preview/drawer if present
    if (cartPreview) {
      await window.CartUpdater.update({ 
        context: 'preview', 
        cartData: data.cart 
      });
    }
    
    // Update cart counter badge if exists
    updateCartCount(data.cart.item_count);
  });

  // Auto-open cart preview when item is added (outside cart page)
  window.CartEvents.subscribe('cart:add', (data) => {
    const isCartPage = window.location.pathname === '/cart' || window.location.pathname.includes('/cart');
    
    // Open cart preview if not on cart page and CartPreview is available
    if (!isCartPage && window.CartPreview && typeof window.CartPreview.open === 'function') {
      // Small delay to ensure cart has updated
      setTimeout(() => {
        window.CartPreview.open();
      }, 300);
    }
  });
  
  // Helper function to update cart count badges
  function updateCartCount(count) {
    const badges = document.querySelectorAll('[data-cart-count]');
    badges.forEach(badge => {
      badge.textContent = count;
      badge.style.display = count > 0 ? '' : 'none';
    });
  }
}