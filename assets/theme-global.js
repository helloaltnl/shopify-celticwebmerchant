(function() {
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
	const scrollDetect = ()=>{
	  let lastScrollY = window.scrollY;
	  let ticking = false;
	  const randomClasses = [
		'is-scrolled-random-default',
		'is-scrolled-random-one',
		'is-scrolled-random-two',
		'is-scrolled-random-three',
		'is-scrolled-random-four'
		];
	  function removeRandomClasses(body) {
		randomClasses.forEach(cls => body.classList.remove(cls));
	  }
	  function updateScrollClasses() {
		const body = document.body;
		const scrollY = window.scrollY;
		const windowHeight = window.innerHeight;
		const docHeight = document.documentElement.scrollHeight;
		const distanceFromBottom = docHeight - (scrollY + windowHeight);
	  
		// is-scrolled
		body.classList.toggle('is-scrolled', scrollY > 0);
	  
		// is-scrolled-top (within 96px from top)
		body.classList.toggle('is-scrolled-top', scrollY <= 96);
	  
		// is-scrolled-bottom
		body.classList.toggle('is-scrolled-bottom', Math.ceil(scrollY + windowHeight) >= docHeight);
	  
		// is-scrolled-halfway
		body.classList.toggle('is-scrolled-halfway', scrollY >= (docHeight - windowHeight) / 2);
	  
		// is-scrolled-up / is-scrolled-down
		if (scrollY > lastScrollY) {
		  body.classList.add('is-scrolled-down');
		  body.classList.remove('is-scrolled-up');
		} else if (scrollY < lastScrollY) {
		  body.classList.add('is-scrolled-up');
		  body.classList.remove('is-scrolled-down');
		}
	  
		// random class when within 100px from bottom
		if (distanceFromBottom <= 96) {
		  removeRandomClasses(body);
		  const randomClass = randomClasses[Math.floor(Math.random() * randomClasses.length)];
		  body.classList.add(randomClass);
		} else {
		  removeRandomClasses(body);
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