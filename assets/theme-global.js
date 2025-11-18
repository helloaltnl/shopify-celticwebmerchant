// assets/lazyload-init.js
(() => {
  const opts = {
	elements_selector: ".lazy",
	threshold: 300,
	data_src: "src",
	data_srcset: "srcset",
	data_sizes: "sizes",
	data_bg: "bg",
	data_bg_hidpi: "bg-hidpi",
	data_bg_multi: "bg-multi",
	data_bg_multi_hidpi: "bg-multi-hidpi",
	data_bg_set: "bg-set",
	data_poster: "poster",
	class_loading: "is-loading",
	class_loaded: "is-loaded",
	class_error: "is-error",
	unobserve_completed: true,
	cancel_on_exit: true,
	use_native: true,
	restore_on_error: true,
	callback_loaded: (el) => { if (el?.dataset) delete el.dataset.bg; }
  };

  // Create/reuse singleton
  const inst = window.altLazy || new LazyLoad(opts);
  window.altLazy = inst;

  // --- Add quality-of-life helpers ON the instance ---

  // 1) Normalizer: accepts nothing, an Element, a Node, a NodeList, or Array<El>
  const toNodes = (input) => {
	if (!input) return undefined; // let LL rescan default
	if (NodeList.prototype.isPrototypeOf(input) || Array.isArray(input)) return input;
	if (input.nodeType === 1) return input.querySelectorAll?.(opts.elements_selector) || undefined;
	return undefined;
  };

  // 2) Patch update so it accepts Element/NodeList/undefined
  const _origUpdate = inst.update.bind(inst);
  inst.update = (input) => _origUpdate(toNodes(input));

  // 3) Convenience alias
  inst.scan = (root) => inst.update(root);

  // 4) Auto-scan on DOM injections (AJAX, variant swaps, section reloads, etc.)
  //    This lives INSIDE the instance lifecycle.
  if (!inst.__mo) {
	const mo = new MutationObserver((muts) => {
	  for (const m of muts) {
		if (m.addedNodes && m.addedNodes.length) {
		  inst.update(m.target); // accepts Element (normalized above)
		  break;
		}
	  }
	});
	mo.observe(document.documentElement, { childList: true, subtree: true });
	inst.__mo = mo;
  }

  // 5) Shopify Theme Editor hooks (work even if LL loads later)
  const onSec = (e) => inst.update(e.target);
  document.addEventListener("shopify:section:load", onSec, { passive: true });
  document.addEventListener("shopify:section:reorder", onSec, { passive: true });
  document.addEventListener("shopify:block:select", onSec, { passive: true });
  document.addEventListener("shopify:block:deselect", onSec, { passive: true });

  // 6) Also react to LazyLoad’s own “Initialized” event (if init order varies)
  window.addEventListener("LazyLoad::Initialized", (ev) => {
	try { ev.detail.instance.update(); } catch (_) {}
  }, { once: true });
})();
(() => {
	const invertColor = (hex, bw) => {
		function padZero(str, len) {
			len = len || 2;
			var zeros = new Array(len).join('0');
			return (zeros + str).slice(-len);
		}
		
		if (hex.indexOf('#') === 0) {
			hex = hex.slice(1);
		}
		// convert 3-digit hex to 6-digits.
		if (hex.length === 3) {
			hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
		}
		if (hex.length !== 6) {
			throw new Error('Invalid HEX color.');
		}
		var r = parseInt(hex.slice(0, 2), 16),
			g = parseInt(hex.slice(2, 4), 16),
			b = parseInt(hex.slice(4, 6), 16);
		if (bw) {
			// https://stackoverflow.com/a/3943023/112731
			return (r * 0.299 + g * 0.587 + b * 0.114) > 186
				? '#000000'
				: '#FFFFFF';
		}
		// invert color components
		r = (255 - r).toString(16);
		g = (255 - g).toString(16);
		b = (255 - b).toString(16);
		// pad each with zeros and return
		return "#" + padZero(r) + padZero(g) + padZero(b);
	};
	const scrollDetect = () => {
	  let lastScrollY = window.scrollY;
	  let scrollDirection = null;
	  let ticking = false;
	  let directionLocked = false; // Nieuwe lock
	  const SCROLL_THRESHOLD = 10;
	  const DIRECTION_COOLDOWN = 100; // 100ms lock na richting verandering
	
	  function updateScrollClasses() {
		const body = document.body;
		const scrollY = window.scrollY;
		const windowHeight = window.innerHeight;
		const docHeight = document.documentElement.scrollHeight;
		const distanceFromBottom = docHeight - (scrollY + windowHeight);
		
		// Product bar
		const distanceProductTarget = document.querySelector('.product-order-content');
		if (distanceProductTarget) {
		  const distanceProductElem = distanceProductTarget.getBoundingClientRect();
		  const distanceProductBottom = distanceProductElem.bottom + scrollY;
		  const shouldShow = scrollY > distanceProductBottom;
		  if (shouldShow !== body.classList.contains('show-product-bar')) {
			body.classList.toggle('show-product-bar', shouldShow);
		  }
		}
	  
		// is-scrolled
		const isScrolled = scrollY > 0;
		if (isScrolled !== body.classList.contains('is-scrolled')) {
		  body.classList.toggle('is-scrolled', isScrolled);
		}
	  
		// is-scrolled-top
		const isScrolledTop = scrollY <= 96;
		if (isScrolledTop !== body.classList.contains('is-scrolled-top')) {
		  body.classList.toggle('is-scrolled-top', isScrolledTop);
		}
	  
		// is-scrolled-bottom
		const isScrolledBottom = Math.ceil(scrollY + windowHeight) >= docHeight - 96;
		if (isScrolledBottom !== body.classList.contains('is-scrolled-bottom')) {
		  body.classList.toggle('is-scrolled-bottom', isScrolledBottom);
		}
	  
		// is-scrolled-halfway
		const isScrolledHalfway = scrollY >= (docHeight - windowHeight) / 2;
		if (isScrolledHalfway !== body.classList.contains('is-scrolled-halfway')) {
		  body.classList.toggle('is-scrolled-halfway', isScrolledHalfway);
		}
	  
		// is-scrolled-up / is-scrolled-down met cooldown
		const scrollDiff = scrollY - lastScrollY;
		
		if (scrollY >= 96 && distanceFromBottom >= 96) {
		  // Alleen richting detecteren als er GEEN lock is
		  if (!directionLocked) {
			let newDirection = null;
			
			if (scrollDiff > SCROLL_THRESHOLD) {
			  newDirection = 'down';
			} else if (scrollDiff < -SCROLL_THRESHOLD) {
			  newDirection = 'up';
			}
			
			// Alleen updaten als richting verandert
			if (newDirection && newDirection !== scrollDirection) {
			  scrollDirection = newDirection;
			  
			  if (scrollDirection === 'down') {
				body.classList.add('is-scrolled-down');
				body.classList.remove('is-scrolled-up');
			  } else {
				body.classList.add('is-scrolled-up');
				body.classList.remove('is-scrolled-down');
			  }
			  
			  // Lock de richting voor X ms
			  directionLocked = true;
			  setTimeout(() => {
				directionLocked = false;
			  }, DIRECTION_COOLDOWN);
			}
		  }
		} else {
		  // Alleen verwijderen als ze er nog op staan
		  if (scrollDirection !== null) {
			scrollDirection = null;
			body.classList.remove('is-scrolled-up', 'is-scrolled-down');
		  }
		}
	  
		lastScrollY = scrollY;
		ticking = false;
	  }
	
	  function onScroll() {
		if (!ticking) {
		  requestAnimationFrame(updateScrollClasses);
		  ticking = true;
		}
	  }
	
	  // Initial state
	  updateScrollClasses();
	  
	  window.addEventListener('scroll', onScroll, { passive: true });
	};
	
	scrollDetect();
})();
(() => {
  const SEL = 'ul[data-readmore="grid"]';
  const ROW_TOL = 1; // px tolerance for grouping rows by offsetTop
  function groupRows(items){
	const rows = [];
	let top = null;
	for (const el of items) {
	  const t = el.offsetTop;
	  if (top === null || Math.abs(t - top) > ROW_TOL) {
		rows.push([]);
		top = t;
	  }
	  rows[rows.length - 1].push(el);
	}
	return rows;
  }
  function placeMore(grid){
	if (grid.classList.contains('is-expanded')) return;

	const more = grid.querySelector('.is-grid__item-more');
	if (!more) return;

	// temporarily remove "more" so it doesn't affect row measurement
	const ph = document.createComment('readmore-placeholder');
	if (more.parentNode === grid) grid.replaceChild(ph, more);

	const items = Array.from(grid.querySelectorAll('.is-grid__item:not(.is-grid__item-more)'));
	if (!items.length) {
	  ph.replaceWith(more);
	  grid.appendChild(more);
	  return;
	}

	const rows = groupRows(items);
	const rowsToShow = Math.max(1, parseInt(grid.dataset.readmoreRows, 10) || 1);
	const insertIndex = Math.min(
	  rows.slice(0, rowsToShow).reduce((n, r) => n + r.length, 0),
	  items.length
	);

	grid.insertBefore(more, items[insertIndex] || null);
	ph.remove();
  }
  function settleAndPlace(grid){
	// single rAF to keep it snappy; no image waits
	cancelAnimationFrame(grid.__rmRAF);
	grid.__rmRAF = requestAnimationFrame(() => placeMore(grid));
  }
  function toggle(grid){
	const more = grid.querySelector('.is-grid__item-more');
	const btn  = more?.querySelector('button[data-show-more]');
	const span = btn?.querySelector('span');
	const moreLabel = btn?.dataset.moreLabel || 'Show more';
	const lessLabel = btn?.dataset.lessLabel || 'Show less';
  
	const expanded = grid.classList.toggle('is-expanded');
	if (expanded) {
	  grid.appendChild(more);
	  if (span) span.textContent = lessLabel;
	} else {
	  if (span) span.textContent = moreLabel;
	  settleAndPlace(grid);
	}
  }
  function initOne(grid){
	if (grid.__rmInited) return;
	grid.__rmInited = true;

	const btn = grid.querySelector('.is-grid__item-more button[data-show-more]');
	if (btn) btn.addEventListener('click', () => toggle(grid));

	// initial placement
	settleAndPlace(grid);

	// light resize handling (tiny debounce)
	const onResize = () => { if (!grid.classList.contains('is-expanded')) settleAndPlace(grid); };
	const debounced = (() => { let t; return () => { clearTimeout(t); t=setTimeout(onResize, 100); }; })();
	window.addEventListener('resize', debounced, { passive: true });
  }
  function initAll(scope = document){
	scope.querySelectorAll(SEL).forEach(initOne);
  }
  if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', () => initAll());
  } else {
	initAll();
  }
  // optional: for Shopify Theme Editor live reloads
  document.addEventListener('shopify:section:load',   e => initAll(e.target));
  document.addEventListener('shopify:section:select', e => initAll(e.target));
  document.addEventListener('shopify:section:reorder',e => initAll(e.target));
})();
(() => {
	document.addEventListener("DOMContentLoaded", () => {
	  const DEFAULT_DURATION = 400;   // ms
	  const DEFAULT_OFFSET   = 100;     // px (e.g. height of sticky header)
	
	  // Prefer a CSS variable or per-link data attribute for offset if you like:
	  // :root { --scroll-offset: 80px; }
	  const getGlobalOffset = () => {
		const v = getComputedStyle(document.documentElement).getPropertyValue('--scroll-offset').trim();
		if (!v) return DEFAULT_OFFSET;
		const px = parseInt(v, 10);
		return isNaN(px) ? DEFAULT_OFFSET : px;
	  };
	
	  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	
	  const smoothScrollToY = (y, duration = DEFAULT_DURATION) => {
		if (prefersReduced || duration <= 0) {
		  window.scrollTo(0, y);
		  return Promise.resolve();
		}
		return new Promise(resolve => {
		  const startY = window.pageYOffset;
		  const dist   = y - startY;
		  const t0     = performance.now();
	
		  const easeInOutCubic = (t) => (t < 0.5)
			? 4 * t * t * t
			: 1 - Math.pow(-2 * t + 2, 3) / 2;
	
		  const step = (now) => {
			const elapsed  = now - t0;
			const progress = Math.min(elapsed / duration, 1);
			const eased    = easeInOutCubic(progress);
			window.scrollTo(0, startY + dist * eased);
			if (progress < 1) requestAnimationFrame(step);
			else resolve();
		  };
		  requestAnimationFrame(step);
		});
	  };
	
	  const scrollToEl = (el, {
		duration = DEFAULT_DURATION,
		offset   = DEFAULT_OFFSET,
		updateHash = true
	  } = {}) => {
		if (!el) return;
	
		// Compute target Y minus offset (accounts for sticky headers)
		const rect = el.getBoundingClientRect();
		const absoluteY = rect.top + window.pageYOffset - offset;
	
		return smoothScrollToY(absoluteY, duration).then(() => {
		  // Accessibility: move focus to target without altering tab order
		  if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
		  el.focus({ preventScroll: true });
	
		  if (updateHash) {
			const id = el.id || '';
			if (id) history.pushState(null, '', '#' + id);
		  }
		});
	  };
	
	  const samePage = (link) => {
		try {
		  const u = new URL(link.href, window.location.href);
		  return u.origin === window.location.origin && u.pathname === window.location.pathname;
		} catch { return false; }
	  };
	
	  const getHashFromHref = (href) => {
		try {
		  const u = new URL(href, window.location.href);
		  return u.hash ? u.hash.slice(1) : '';
		} catch {
		  return href.startsWith('#') ? href.slice(1) : '';
		}
	  };
	
	  const resolveOffsetForLink = (link) => {
		const attr = link.getAttribute('data-offset');
		if (attr !== null) {
		  const n = parseInt(attr, 10);
		  if (!isNaN(n)) return n;
		}
		return getGlobalOffset();
	  };
	
	  const resolveDurationForLink = (link) => {
		const attr = link.getAttribute('data-duration');
		if (attr !== null) {
		  const n = parseInt(attr, 10);
		  if (!isNaN(n)) return n;
		}
		return DEFAULT_DURATION;
	  };
	
	  // Delegate clicks on any <a> that contains a hash
	  document.addEventListener('click', (e) => {
		const a = e.target.closest('a[href*="#"]');
		if (!a) return;
	
		const hash = getHashFromHref(a.href);
		if (!hash) return;
	
		// Only intercept if the link keeps us on the same page.
		if (!samePage(a)) return; // allow normal navigation to other pages
	
		const target = document.getElementById(hash);
		if (!target) return; // no element? let default happen (or do nothing)
	
		e.preventDefault();
	
		const offset   = resolveOffsetForLink(a);
		const duration = resolveDurationForLink(a);
	
		scrollToEl(target, { duration, offset, updateHash: true });
	  });
	
	  // Handle arriving with a hash (e.g., coming from another page)
	  const initialHashScroll = () => {
		if (!window.location.hash) return;
		const id = window.location.hash.slice(1);
		const target = document.getElementById(id);
		if (!target) return;
	
		// Wait a tick so layout/images/fonts can settle
		setTimeout(() => {
		  const offset = getGlobalOffset();
		  scrollToEl(target, { duration: DEFAULT_DURATION, offset, updateHash: false });
		}, 100);
	  };
	  initialHashScroll();
	
	  // Handle back/forward between hashes
	  window.addEventListener('hashchange', () => {
		const id = window.location.hash.slice(1);
		const target = id ? document.getElementById(id) : null;
		if (target) {
		  const offset = getGlobalOffset();
		  scrollToEl(target, { duration: DEFAULT_DURATION, offset, updateHash: false });
		}
	  });
	});
})();
(() => {
  const INST = new Map(), MASTERS = new Map(), SLAVES = new Map(), PAIRED = new Set();
  const SYNCING = new WeakSet();

  const j  = (s, f={}) => { try { return s ? JSON.parse(s) : f; } catch { return f; } };
  const q  = (r, sel) => (r && sel) ? r.querySelector(sel) : null;
  const qq = (r, sel) => (r && sel) ? Array.from(r.querySelectorAll(sel)) : [];
  const raf = () => new Promise(r => requestAnimationFrame(r));
  const throttle = (fn, wait=100) => { let t=0, to=null, last; return (...a)=>{ const n=performance.now(); last=a; if(n-t>=wait){t=n;fn(...a);} else { clearTimeout(to); to=setTimeout(()=>{t=performance.now();fn(...(last||[]));}, wait-(n-t)); } }; };
  const whenSwiperReady = (cb, tries=0) => { if (window.Swiper) return cb(); if (tries>200) { console.warn('[ThemeSwiper] Swiper not found.'); return; } setTimeout(()=>whenSwiperReady(cb,tries+1),25); };

  function ensureStructure(host){
	host.classList.add('swiper');
	const wrapper = q(host,'[data-swiper-wrapper]') || q(host,'.swiper-wrapper') || q(host,'ul,ol');
	if(!wrapper) return null;
	wrapper.classList.add('swiper-wrapper');
	const slideSel = host.getAttribute('data-swiper-slide-selector') || ':scope > *';
	const slides = qq(wrapper, slideSel);
	slides.forEach((el,i)=>{ el.classList.add('swiper-slide'); if(!el.hasAttribute('data-swiper-slide-index')) el.setAttribute('data-swiper-slide-index', i); });
	host.style.overflow='hidden'; wrapper.style.width='100%';
	return { wrapper, slides };
  }

  function touchLazy(sw, scope='visible'){
	const LL = window.altLazy; if(!LL||!sw||sw.destroyed) return;
	const root = sw.el;
	const nodes = scope==='visible'
	  ? root.querySelectorAll('.swiper-slide.swiper-slide-visible, .swiper-slide.swiper-slide-active, .swiper-slide.swiper-slide-next, .swiper-slide.swiper-slide-prev')
	  : root.querySelectorAll('.swiper-slide');
	nodes.forEach(sl=>LL.update(sl));
  }

  function stableUpdate(sw, delay=140, { touch=false } = {}){
	clearTimeout(sw._updTimer);
	sw._updTimer=setTimeout(()=>{ if(!sw||sw.destroyed) return;
	  if(touch) touchLazy(sw,'visible');
	  sw.updateSlides(); sw.updateSize(); sw.update(); sw.updateProgress(); sw.updateSlidesClasses();
	  if (sw.params?.autoHeight) { try { sw.updateAutoHeight(0); } catch{} }
	}, delay);
  }

  function watchSlides(sw){
	if(!sw) return;
	if(sw._slideRO){ try{ sw._slideRO.disconnect(); }catch{} }
	sw._slideRO = new ResizeObserver(()=>stableUpdate(sw,80,{touch:true}));
	sw.slides.forEach(sl=>{
	  try{ sw._slideRO.observe(sl); }catch{}
	  qq(sl,'img').forEach(img=>{
		if(!img.complete){
		  img.addEventListener('load', ()=>stableUpdate(sw,60,{touch:true}), {once:true, passive:true});
		  img.addEventListener('error',()=>stableUpdate(sw,60,{touch:true}), {once:true, passive:true});
		}
	  });
	});
  }

  // ---------- relation-aware helpers (axis-agnostic) ----------
  function logicalFromSlideEl(slideEl, fallback=-1){
	const v = slideEl?.getAttribute?.('data-swiper-slide-index');
	if (v != null) return parseInt(v,10);
	if (typeof slideEl?.swiperSlideIndex === 'number') return slideEl.swiperSlideIndex;
	return fallback;
  }

  function findIndexByLogical(sw, logicalIdx) {
	const slides = sw?.slides || [];
	for (let i=0; i<slides.length; i++) {
	  const li = logicalFromSlideEl(slides[i], i);
	  if (li === logicalIdx) return i;
	}
	return -1;
  }

  // Alle LOGISCHE indices die in de MAIN viewport overlappen
  function logicalIndexSet(sw){
	if (!sw || sw.destroyed) return [];
	const grid = sw.slidesGrid || [];
	const sizes = sw.slidesSizesGrid || [];
	const viewStart = -sw.translate;         // as-onafhankelijk
	const viewEnd   = viewStart + sw.size;   // width/height afhankelijk van richting

	const set = new Set();
	for (let i=0; i<grid.length; i++) {
	  const s0 = grid[i];
	  const s1 = s0 + (sizes[i] ?? 0);
	  if (s1 > viewStart && s0 < viewEnd) {
		const li = logicalFromSlideEl(sw.slides[i], i);
		set.add(li >= 0 ? li : i);
	  }
	}
	return Array.from(set).sort((a,b)=>a-b);
  }

  // Primaire logische index: loop→realIndex, anders dichtstbij slidesGrid
  function primaryLogicalIndex(sw){
	if(!sw||sw.destroyed) return 0;
	if (sw.params?.loop) return sw.realIndex ?? 0;

	const grid = sw.slidesGrid || [];
	const t = Math.abs(sw.translate || 0);
	let best=0, d=Infinity;
	for (let i=0;i<grid.length;i++){ const di=Math.abs(grid[i]-t); if(di<d){d=di;best=i;} }
	const el = sw.slides[best];
	const li = logicalFromSlideEl(el, best);
	return (li>=0)?li:(sw.activeIndex??0);
  }

  // Markeer op SLAVES: alle visible + de primaire active vanuit MAIN
  function markRelation(main, slaves, {visibleCls='swiper-main-visible', activeCls='swiper-main-active'} = {}){
	if(!main||!slaves||!slaves.length) return;
	const visibles = logicalIndexSet(main);
	const primary  = primaryLogicalIndex(main);
	slaves.forEach(sl=>{
	  if(!sl||sl.destroyed) return;
	  sl.slides.forEach((el,i)=>{
		const li = logicalFromSlideEl(el,i);
		el.classList.toggle(visibleCls, visibles.includes(li));
		el.classList.toggle(activeCls,  li===primary);
	  });
	});
  }

  // Zorg dat een slave tenminste één "main-visible" logical in beeld heeft
  function ensureSlaveShows(main, slave, speed=220) {
	if (!main || !slave || main.destroyed || slave.destroyed) return;
	const visibles = logicalIndexSet(main);
	if (!visibles.length) return;
	const targetLogical = visibles[0];
	const targetIdx = findIndexByLogical(slave, targetLogical);
	if (targetIdx < 0) return;

	const visIdxs = slave.visibleSlidesIndexes || [];
	if (Array.isArray(visIdxs) && visIdxs.includes(targetIdx)) return;

	try {
	  SYNCING.add(slave);
	  if (slave.params?.loop) slave.slideToLoop(targetIdx, speed, false);
	  else slave.slideTo(targetIdx, speed, false);
	} finally {
	  setTimeout(()=> SYNCING.delete(slave), speed+20);
	}
  }

  // ---------- fullscreen ----------
  async function toggleFullscreen(sw, action = 'toggle') {
	if (!sw || sw.destroyed) return;

	const host = sw.el.closest('[data-swiper], .swiper');
	if (!host) return;

	const id = host.dataset.swiperId || ('swiper-' + Math.random().toString(36).slice(2, 8));
	host.dataset.swiperId = id;

	const rec = ThemeSwiper.get?.(host) || { main: sw, slaves: [] };
	const isOpen = host.classList.contains('is-fullscreen');
	const wantOpen = action === 'open' || (action === 'toggle' && !isOpen);
	const wantClose = action === 'close' || (action === 'toggle' && isOpen);

	const removeEsc = () => {
	  if (!document._swiperEscHandler) return;
	  document.removeEventListener('keydown', document._swiperEscHandler, { passive: true });
	  document._swiperEscHandler = null;
	};

	if (wantOpen) {
	  if (isOpen) return;
	  if (document.body.classList.contains(`is-swiper-${id}-fullscreen`)) return;

	  let overlay = document.querySelector(`.swiper-overlay[data-swiper-id="${id}"]`);
	  if (!overlay) {
		overlay = document.createElement('div');
		overlay.className = 'swiper-overlay';
		overlay.setAttribute('data-swiper-overlay', '');
		overlay.dataset.swiperId = id;
		overlay.classList.remove('swiper');
		overlay.innerHTML = `
		  <div class="swiper-dialog" role="dialog" aria-modal="true">
			<div class="swiper-dialog__head"></div>
			<div class="swiper-dialog__main"></div>
			<div class="swiper-dialog__foot"></div>
		  </div>
		`;
		Object.assign(overlay.style, {
		  position: 'fixed', inset: 0, zIndex: 9999,
		  background: 'rgba(0,0,0,.9)',
		  display: 'flex', alignItems: 'center', justifyContent: 'center',
		  opacity: '0', transition: 'opacity .2s ease'
		});
		overlay.classList.remove('swiper', 'swiper-initialized');
		document.body.appendChild(overlay);
	  }

	  const mainRegion = overlay.querySelector('.swiper-dialog__main');
	  const all = [rec.main, ...(rec.slaves || [])].filter(Boolean);

	  all.forEach(sl => {
		const el = sl.el;
		if (!el) return;
		if (!el.__origParent) {
		  el.__origParent = el.parentElement;
		  el.__origNext = el.nextSibling;
		}
		mainRegion.appendChild(el);
		el.classList.add('is-fullscreen');
		stableUpdate(sl, 80, { touch: true });
	  });

	  host.classList.add('is-fullscreen');
	  document.body.classList.add('is-swiper-fullscreen', `is-swiper-${id}-fullscreen`);
	  requestAnimationFrame(() => (overlay.style.opacity = '1'));

	  document._swiperEscHandler = (e) => {
		if (e.key === 'Escape' || e.key === 'Esc') {
		  toggleFullscreen(sw, 'close');
		  removeEsc();
		}
	  };
	  document.addEventListener('keydown', document._swiperEscHandler, { passive: true });
	  return;
	}

	if (wantClose) {
	  removeEsc();

	  const overlay = document.querySelector(`.swiper-overlay[data-swiper-id="${id}"]`);
	  const all = [rec.main, ...(rec.slaves || [])].filter(Boolean);

	  all.forEach(sl => {
		const el = sl.el;
		if (!el) return;
		el.classList.remove('is-fullscreen');
		if (el.__origParent) {
		  try { el.__origParent.insertBefore(el, el.__origNext); }
		  catch { el.__origParent.appendChild(el); }
		}
		stableUpdate(sl, 80, { touch: true });
	  });

	  all.forEach(sl => {
		const el = sl.el;
		if (!el) return;
		delete el.__origParent;
		delete el.__origNext;
	  });

	  if (overlay) overlay.remove();
	  host.classList.remove('is-fullscreen');
	  document.body.classList.remove('is-swiper-fullscreen', `is-swiper-${id}-fullscreen`);
	  return;
	}
  }

  document.addEventListener('click', (e) => {
	const btn = e.target.closest('[data-swiper-fullscreen]');
	if (!btn) return;

	const act = btn.getAttribute('data-swiper-fullscreen') || 'toggle';
	const targetSel =
	  btn.getAttribute('data-swiper-target') ||
	  btn.closest('[data-swiper-id]')?.getAttribute('data-swiper-id');
	if (!targetSel) return;

	const host =
	  document.querySelector(`[data-swiper-id="${targetSel}"]`) ||
	  document.querySelector(targetSel);
	const sw = host && (host.swiper || ThemeSwiper.get?.(host)?.main);
	if (sw) toggleFullscreen(sw, act);
  }, { passive: true });

  // ---------- wiring ----------
  function wirePair(master, slaves){
	if (!master || master.destroyed || !slaves.length) return;

	// slave click → master goto
	slaves.forEach(sl => {
	  sl.on('click', (e) => {
		if (SYNCING.has(sl)) return;
		let idx = sl.clickedIndex;
		if (typeof idx !== 'number') {
		  const el = e?.target?.closest?.('.swiper-slide');
		  if (el) idx = sl.slides.indexOf(el);
		}
		if (typeof idx === 'number' && idx > -1) {
		  master.params?.loop ? master.slideToLoop(idx, 300, false)
							  : master.slideTo(idx, 300, false);
		}
	  });

	  const markSelf = throttle(() => markRelation(master, [sl]), 80);
	  sl.on('setTranslate', markSelf);
	  sl.on('slideChange',  markSelf);
	  sl.on('resize',       markSelf);
	  sl.on('imagesReady',  markSelf);
	  sl.on('update',       markSelf);
	});

	// master → slaves
	const drive = () => {
	  markRelation(master, slaves);
	  slaves.forEach(sl => ensureSlaveShows(master, sl, 200));
	};

	master.on('slideChange',   drive);
	master.on('transitionEnd', drive);

	const fm = master.params?.freeMode;
	const fmEnabled = (fm && typeof fm==='object') ? !!fm.enabled : !!fm;
	const fmSticky  = (fm && typeof fm==='object') ? !!fm.sticky  : false;
	const live = throttle(drive, 90);
	master.on('setTranslate', live);
	if (fmEnabled && !fmSticky) master.on('touchEnd', drive);

	const settle = throttle(drive, 120);
	master.on('resize',      settle);
	master.on('imagesReady', settle);
	master.on('update',      settle);

	(async () => {
	  await raf();
	  stableUpdate(master, 60, { touch:true });
	  slaves.forEach(sl => stableUpdate(sl, 60, { touch:true }));
	  setTimeout(drive, 90);
	})();
  }

  function tryWire(id){
	if(!id||PAIRED.has(id)) return;
	const m = MASTERS.get(id), s = SLAVES.get(id)||[];
	if(m && s.length){ wirePair(m,s); PAIRED.add(id); }
  }

  // ---------- init host ----------
  function initOne(host){
	if(INST.has(host)) return INST.get(host);
	if(!ensureStructure(host)) return;

	const id = host.getAttribute('data-swiper-id')||'';
	const slaveOf = host.getAttribute('data-swiper-slave')||'';
	const opts = j(host.getAttribute('data-swiper-options'))||{};
	const isMaster = !slaveOf;

	if (isMaster) {
	  if (opts.watchSlidesProgress == null) opts.watchSlidesProgress = true;
	  if (opts.slideVisibleClass == null)   opts.slideVisibleClass   = 'swiper-slide-visible';
	}

	if (opts.resistanceRatio==null) opts.resistanceRatio=0;
	if (opts.touchReleaseOnEdges==null) opts.touchReleaseOnEdges=false;

	const prevEl=q(host,'[data-swiper-prev]'); const nextEl=q(host,'[data-swiper-next]');
	if(prevEl&&nextEl) opts.navigation={ prevEl, nextEl, ...(opts.navigation||{}) };

	const userOn = opts.on || {};
	opts.on = {
	  ...userOn,
	  init(sw){
		INST.set(host, sw);
		watchSlides(sw);
		touchLazy(sw,'visible');
		stableUpdate(sw,120,{touch:false});

		if (slaveOf) {
		  const list=SLAVES.get(slaveOf)||[]; if(!list.includes(sw)) list.push(sw); SLAVES.set(slaveOf, list);
		  tryWire(slaveOf);
		} else if (id) {
		  MASTERS.set(id, sw);
		  tryWire(id);
		}

		if (slaveOf) {
		  const m = MASTERS.get(slaveOf);
		  if (m) markRelation(m, [sw]);
		}

		userOn.init?.(sw);
	  },
	  slideChange(sw){ touchLazy(sw,'visible'); stableUpdate(sw,150,{touch:false}); userOn.slideChange?.(sw); },
	  breakpoint(sw,bp){ touchLazy(sw,'visible'); stableUpdate(sw,180,{touch:false}); userOn.breakpoint?.(sw,bp); },
	  resize(sw){ touchLazy(sw,'visible'); stableUpdate(sw,150,{touch:false}); userOn.resize?.(sw); },
	  imagesReady(sw){ stableUpdate(sw,80,{touch:true}); userOn.imagesReady?.(sw); },
	  fullscreen(sw,action){ touchLazy(sw,'visible'); stableUpdate(sw,120,{touch:false}); userOn.fullscreen?.(sw,action); }
	};

	const sw = new Swiper(host, opts);

	const fsOpen=q(host,'[data-swiper-fullscreen="open"], [data-swiper-fullscreen="toggle"]');
	const fsClose=q(host,'[data-swiper-fullscreen="close"]');
	if(fsOpen)  fsOpen.addEventListener('click', ()=>toggleFullscreen(sw, fsOpen.getAttribute('data-swiper-fullscreen')||'toggle'), {passive:true});
	if(fsClose) fsClose.addEventListener('click', ()=>toggleFullscreen(sw,'close'), {passive:true});

	return sw;
  }

  function getRecord(hostOrId){
	const host = typeof hostOrId==='string'
	  ? document.querySelector(`[data-swiper-id="${hostOrId}"], ${hostOrId}`)
	  : hostOrId;
	if(!host) return null;
	const id = host.dataset.swiperId || host.getAttribute('data-swiper-id');
	const main = id ? MASTERS.get(id) : (host.swiper || INST.get(host));
	const slaves = (id && SLAVES.get(id)) || [];
	return { main, slaves, id, host };
  }

  function init(root=document){
	qq(root, '[data-swiper], [data-swiper-options], [data-swiper-id], [data-swiper-slave]')
	.forEach(el => {
	  if (el.closest('[data-swiper-overlay]')) return; // negeer overlay
	  initOne(el);
	});
  }

  const mo = new MutationObserver(muts => {
	for (const m of muts) {
	  if (!m.addedNodes || !m.addedNodes.length) continue;

	  const inOverlay = m.target?.closest?.('[data-swiper-overlay]');

	  if (inOverlay) {
		document.querySelectorAll('[data-swiper-overlay] [data-swiper-id]').forEach(el => {
		  const rec = ThemeSwiper.get?.(el);
		  if (rec && rec.main) {
			stableUpdate(rec.main, 80, { touch: true });
			(rec.slaves || []).forEach(sl => stableUpdate(sl, 80, { touch: true }));
		  }
		});
	  } else {
		whenSwiperReady(() => init(document));
	  }
	  break;
	}
  });
  mo.observe(document.documentElement,{childList:true,subtree:true});

  if(document.readyState!=='loading') whenSwiperReady(()=>init());
  else document.addEventListener('DOMContentLoaded',()=>whenSwiperReady(()=>init()));

  window.ThemeSwiper = {
	init,
	get:getRecord,
	toggleFullscreen,
	// helpers (optioneel publiek):
	logicalIndexSet,
	primaryLogicalIndex,
	markRelation
  };
})();