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