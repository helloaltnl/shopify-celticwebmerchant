// Scroll detection
(() => {
	const scrollDetect = () => {
		let lastScrollY = window.scrollY;
		let scrollDirection = null;
		let ticking = false;
		let directionLocked = false;
		const SCROLL_THRESHOLD = 10;
		const DIRECTION_COOLDOWN = 100;

		function updateScrollClasses() {
			const body = document.body;
			const scrollY = window.scrollY;
			const windowHeight = window.innerHeight;
			const docHeight = document.documentElement.scrollHeight;
			const distanceFromBottom = docHeight - (scrollY + windowHeight);

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
				if (!directionLocked) {
					let newDirection = null;

					if (scrollDiff > SCROLL_THRESHOLD) {
						newDirection = 'down';
					} else if (scrollDiff < -SCROLL_THRESHOLD) {
						newDirection = 'up';
					}

					if (newDirection && newDirection !== scrollDirection) {
						scrollDirection = newDirection;

						if (scrollDirection === 'down') {
							body.classList.add('is-scrolled-down');
							body.classList.remove('is-scrolled-up');
						} else {
							body.classList.add('is-scrolled-up');
							body.classList.remove('is-scrolled-down');
						}

						directionLocked = true;
						setTimeout(() => {
							directionLocked = false;
						}, DIRECTION_COOLDOWN);
					}
				}
			} else {
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

		updateScrollClasses();
		window.addEventListener('scroll', onScroll, { passive: true });
	};

	scrollDetect();
})();

// ============================================================================
// THEME MEDIA SYSTEM
// ============================================================================
// Consolidated scripts for html-theme-media-* snippets
// Replaces inline <script> blocks for better performance
// ============================================================================
(() => {
	function initThemeMedia() {
		// Native video (interactive)
		document.querySelectorAll('[data-video-wrapper]:not([data-external-video])').forEach(wrapper => {
			if (wrapper.dataset.initialized) return;
			wrapper.dataset.initialized = 'true';
			
			const playBtn = wrapper.querySelector('[data-video-play]');
			const video = wrapper.querySelector('[data-video]');
			
			if (!playBtn || !video) return;
			
			playBtn.addEventListener('click', () => {
				wrapper.classList.add('is-playing');
				video.play();
			});
			
			video.addEventListener('ended', () => {
				wrapper.classList.remove('is-playing');
			});
			
			video.addEventListener('pause', () => {
				if (video.ended) wrapper.classList.remove('is-playing');
			});
		});
		
		// External video (YouTube/Vimeo - interactive)
		document.querySelectorAll('[data-external-video]').forEach(wrapper => {
			if (wrapper.dataset.initialized) return;
			wrapper.dataset.initialized = 'true';
			
			const playBtn = wrapper.querySelector('[data-video-play]');
			const iframeWrapper = wrapper.querySelector('[data-iframe-wrapper]');
			const host = wrapper.dataset.host;
			const videoId = wrapper.dataset.videoId;
			
			if (!playBtn || !iframeWrapper || !videoId) return;
			
			playBtn.addEventListener('click', () => {
				let iframeSrc = '';
				
				if (host === 'youtube') {
					iframeSrc = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`;
				} else if (host === 'vimeo') {
					iframeSrc = `https://player.vimeo.com/video/${videoId}?autoplay=1`;
				}
				
				if (iframeSrc) {
					iframeWrapper.innerHTML = `<iframe src="${iframeSrc}" allow="autoplay; encrypted-media; fullscreen" allowfullscreen loading="lazy"></iframe>`;
					wrapper.classList.add('is-playing');
				}
			});
		});
		
		// Background video (lazy load sources)
		document.querySelectorAll('[data-background-video]').forEach(video => {
			if (video.dataset.initialized) return;
			video.dataset.initialized = 'true';
			
			// Get parent container that should receive is-video-playing class
			const parentContainer = video.closest('.marketing-cover, .theme-media');
			
			// Helper to mark video as playing
			const markPlaying = () => {
				if (parentContainer) parentContainer.classList.add('is-video-playing');
			};
			
			// Native video element with data-src sources
			if (video.tagName === 'VIDEO') {
				const sources = video.querySelectorAll('source[data-src]');
				if (sources.length > 0) {
					sources.forEach(source => {
						source.src = source.dataset.src;
					});
					video.load();
					
					// Mark as playing when video actually starts
					video.addEventListener('playing', () => {
						video.classList.add('is-loaded');
						markPlaying();
					}, { once: true });
				}
			}
			
			// External video background (YouTube/Vimeo iframe)
			if (video.classList.contains('theme-media__iframe-wrapper--background')) {
				const host = video.dataset.host;
				const videoId = video.dataset.videoId;
				
				if (host && videoId) {
					let iframeSrc = '';
					
					if (host === 'youtube') {
						iframeSrc = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0&showinfo=0&rel=0&modestbranding=1&playsinline=1`;
					} else if (host === 'vimeo') {
						iframeSrc = `https://player.vimeo.com/video/${videoId}?autoplay=1&muted=1&loop=1&background=1`;
					}
					
					if (iframeSrc) {
						video.innerHTML = `<iframe src="${iframeSrc}" allow="autoplay; encrypted-media" loading="lazy"></iframe>`;
						setTimeout(markPlaying, 500);
					}
				}
			}
		});
		
		// 3D Model
		document.querySelectorAll('[data-model-wrapper]').forEach(wrapper => {
			if (wrapper.dataset.initialized) return;
			wrapper.dataset.initialized = 'true';
			
			const playBtn = wrapper.querySelector('[data-model-play]');
			const model = wrapper.querySelector('[data-model]');
			
			if (!playBtn) return;
			
			playBtn.addEventListener('click', () => {
				wrapper.classList.add('is-active');
				if (model) model.removeAttribute('reveal');
			});
		});
	}
	
	// Init on DOMContentLoaded
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', initThemeMedia);
	} else {
		initThemeMedia();
	}
	
	// Re-init on section render (for theme editor)
	document.addEventListener('shopify:section:load', initThemeMedia);
})();

// Read more grid
(() => {
	const SEL = 'ul[data-readmore="grid"]';
	const ROW_TOL = 1;

	function groupRows(items) {
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

	function placeMore(grid) {
		if (grid.classList.contains('is-expanded')) return;

		const more = grid.querySelector('.is-grid__item-more');
		if (!more) return;

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

	function settleAndPlace(grid) {
		cancelAnimationFrame(grid.__rmRAF);
		grid.__rmRAF = requestAnimationFrame(() => placeMore(grid));
	}

	function toggle(grid) {
		const more = grid.querySelector('.is-grid__item-more');
		const btn = more?.querySelector('button[data-show-more]');
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

	function initOne(grid) {
		if (grid.__rmInited) return;
		grid.__rmInited = true;

		const btn = grid.querySelector('.is-grid__item-more button[data-show-more]');
		if (btn) btn.addEventListener('click', () => toggle(grid));

		settleAndPlace(grid);

		const onResize = () => {
			if (!grid.classList.contains('is-expanded')) settleAndPlace(grid);
		};
		const debounced = (() => {
			let t;
			return () => {
				clearTimeout(t);
				t = setTimeout(onResize, 100);
			};
		})();
		window.addEventListener('resize', debounced, { passive: true });
	}

	function initAll(scope = document) {
		scope.querySelectorAll(SEL).forEach(initOne);
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', () => initAll());
	} else {
		initAll();
	}

	document.addEventListener('shopify:section:load', e => initAll(e.target));
	document.addEventListener('shopify:section:select', e => initAll(e.target));
	document.addEventListener('shopify:section:reorder', e => initAll(e.target));
})();

// Smooth scroll
(() => {
	document.addEventListener("DOMContentLoaded", () => {
		const DEFAULT_DURATION = 400;
		const DEFAULT_OFFSET = 100;

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
				const dist = y - startY;
				const t0 = performance.now();

				const easeInOutCubic = (t) => (t < 0.5)
					? 4 * t * t * t
					: 1 - Math.pow(-2 * t + 2, 3) / 2;

				const step = (now) => {
					const elapsed = now - t0;
					const progress = Math.min(elapsed / duration, 1);
					const eased = easeInOutCubic(progress);
					window.scrollTo(0, startY + dist * eased);
					if (progress < 1) requestAnimationFrame(step);
					else resolve();
				};
				requestAnimationFrame(step);
			});
		};

		const scrollToEl = (el, {
			duration = DEFAULT_DURATION,
			offset = DEFAULT_OFFSET,
			updateHash = true
		} = {}) => {
			if (!el) return;

			const rect = el.getBoundingClientRect();
			const absoluteY = rect.top + window.pageYOffset - offset;

			return smoothScrollToY(absoluteY, duration).then(() => {
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

		document.addEventListener('click', (e) => {
			const a = e.target.closest('a[href*="#"]');
			if (!a) return;

			const hash = getHashFromHref(a.href);
			if (!hash) return;

			if (!samePage(a)) return;

			const target = document.getElementById(hash);
			if (!target) return;

			e.preventDefault();

			const offset = resolveOffsetForLink(a);
			const duration = resolveDurationForLink(a);

			scrollToEl(target, { duration, offset, updateHash: true });
		});

		const initialHashScroll = () => {
			if (!window.location.hash) return;
			const id = window.location.hash.slice(1);
			const target = document.getElementById(id);
			if (!target) return;

			setTimeout(() => {
				const offset = getGlobalOffset();
				scrollToEl(target, { duration: DEFAULT_DURATION, offset, updateHash: false });
			}, 100);
		};
		initialHashScroll();

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
