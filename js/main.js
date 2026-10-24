/* DUPLICITY — cinematic interactions. Uses GSAP + ScrollTrigger from index.html. */
(() => {
  const nav = document.getElementById('primary-nav');
  const menuButton = document.getElementById('menu-toggle');
  const motionReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Mobile navigation still works when the GSAP CDN is offline.
  function closeMenu() {
    nav.classList.remove('is-open');
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', 'Open menu');
    document.body.classList.remove('menu-open');
  }
  menuButton.addEventListener('click', () => {
    const opening = menuButton.getAttribute('aria-expanded') !== 'true';
    nav.classList.toggle('is-open', opening);
    menuButton.setAttribute('aria-expanded', String(opening));
    menuButton.setAttribute('aria-label', opening ? 'Close menu' : 'Open menu');
    document.body.classList.toggle('menu-open', opening);
  });
  nav.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
  window.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeMenu();
  });

  // 4 / Ending glitch: trigger on the visible WORD, not 40% of a tall section.
  // This animation uses native browser APIs and DOES NOT depend on GSAP.
  const REPLACEMENT_WORD = 'lie'; // Change this to a different reveal if you like.
  const glitchWord = document.getElementById('glitch-word');
  const signalStatus = document.getElementById('signal-status');
  const demoSection = document.getElementById('demo');
  if (glitchWord) {
    let hasPlayed = false;
    let pendingFrame = false;
    const originalWord = glitchWord.textContent.trim();
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#?!';

    function completeGlitch() {
      glitchWord.textContent = REPLACEMENT_WORD;
      glitchWord.dataset.text = REPLACEMENT_WORD;
      glitchWord.classList.remove('is-glitching');
      glitchWord.classList.add('is-corrupted');
      demoSection?.classList.remove('is-glitching');
      demoSection?.classList.add('is-corrupted');
      if (signalStatus) signalStatus.textContent = 'COMPROMISED';
    }

    function playGlitch() {
      if (hasPlayed) return;
      hasPlayed = true;
      window.removeEventListener('scroll', checkGlitchPosition);
      window.removeEventListener('resize', checkGlitchPosition);

      if (motionReduced) {
        completeGlitch();
        return;
      }

      // Let the heading be seen as "ordinary" for a moment before it corrupts.
      window.setTimeout(() => {
        glitchWord.classList.add('is-glitching');
        demoSection?.classList.add('is-glitching');
        const statusLine = signalStatus?.closest('.demo__subline');
        statusLine?.classList.add('is-corrupted');
        if (signalStatus) signalStatus.textContent = 'ERROR / DESYNC';

        const started = performance.now();
        const duration = 1350;
        function tick(now) {
          const progress = Math.min((now - started) / duration, 1);
          const target = progress < 0.67 ? originalWord : REPLACEMENT_WORD;
          const locked = progress < 0.67
            ? 0
            : Math.floor(((progress - 0.67) / 0.33) * target.length);
          const scrambled = Array.from(target, (letter, index) => {
            if (letter === ' ' || index < locked) return letter;
            return alphabet[Math.floor(Math.random() * alphabet.length)];
          }).join('');
          glitchWord.textContent = scrambled;
          glitchWord.dataset.text = scrambled;
          if (progress < 1) window.requestAnimationFrame(tick);
          else completeGlitch();
        }
        window.requestAnimationFrame(tick);
      }, 450);
    }

    // Normal scrolling, anchor links, reloads at a restored scroll position,
    // and browsers with/without IntersectionObserver all use the same check.
    function checkGlitchPosition() {
      if (hasPlayed || pendingFrame) return;
      pendingFrame = true;
      window.requestAnimationFrame(() => {
        pendingFrame = false;
        const box = glitchWord.getBoundingClientRect();
        const viewport = window.innerHeight || document.documentElement.clientHeight;
        if (box.top < viewport * 0.97 && box.bottom > 0) {
          playGlitch();
        }
      });
    }

    // Observe the word itself: no section-height threshold to miss.
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        if (entries.some(entry => entry.isIntersecting)) {
          playGlitch();
          observer.disconnect();
        }
      }, { threshold: 0, rootMargin: '0px' });
      observer.observe(glitchWord);
    }
    window.addEventListener('scroll', checkGlitchPosition, { passive: true });
    window.addEventListener('resize', checkGlitchPosition, { passive: true });
    window.addEventListener('pageshow', checkGlitchPosition);
    window.addEventListener('load', checkGlitchPosition, { once: true });
    checkGlitchPosition();
  }

  // The CSS fallback automatically removes the opening veil if GSAP is absent.
  if (!window.gsap || !window.ScrollTrigger || motionReduced) return;
  gsap.registerPlugin(ScrollTrigger);

  // 1 / Opening film-like curtain, then logo and copy enter in stages.
  gsap.set('.intro-veil', { animation: 'none' });
  const intro = gsap.timeline({ defaults: { ease: 'power3.out' } });
  intro
    .to('.intro-veil > span', { autoAlpha: 0, y: -18, duration: 0.34 }, 0.55)
    .to('.intro-veil', { yPercent: -101, duration: 1.16, ease: 'expo.inOut' }, 0.65)
    .from('.hero__photo', { scale: 1.18, duration: 2.25, ease: 'power2.out' }, 0.8)
    .from('.hero__eyebrow', { autoAlpha: 0, y: 24, duration: 0.7 }, 1.05)
    .from('.hero__title', { autoAlpha: 0, y: 35, duration: 0.9 }, 1.16)
    .to('.hero__rule', { width: 116, duration: 0.7 }, 1.42)
    .from(['.hero__tagline', '.hero__cta'], { autoAlpha: 0, y: 16, duration: 0.75, stagger: 0.14 }, 1.55)
    .from('.site-header', { autoAlpha: 0, y: -16, duration: 0.6 }, 1.75)
    .set('.intro-veil', { display: 'none' });

  // Small image drift while leaving the first screen.
  gsap.to('.hero__photo', {
    yPercent: 13,
    ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
  });

  // 2 / Dorico-inspired behaviour: pin the scene and use a full-frame image wipe.
  // This is an original effect, not copied source code from Dorico.
  const storyTimeline = gsap.timeline({
    scrollTrigger: {
      trigger: '.story',
      start: 'top top',
      end: '+=110%',
      pin: true,
      scrub: 0.9,
      anticipatePin: 1,
      invalidateOnRefresh: true
    }
  });
  storyTimeline
    .fromTo('.story__picture',
      { clipPath: 'inset(0 100% 0 0)' },
      { clipPath: 'inset(0 0% 0 0)', ease: 'power2.inOut', duration: 1.5 }, 0)
    .fromTo('.story__picture img',
      { scale: 1.16 },
      { scale: 1, ease: 'none', duration: 2 }, 0)
    .fromTo('.story__shade', { opacity: 0 }, { opacity: 1, duration: 0.7 }, 0.8)
    .fromTo('.story__content',
      { y: 70, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out' }, 1.05)
    .fromTo('.story__serial', { opacity: 0 }, { opacity: 1, duration: 0.5 }, 1.25);

  // 3 / Reusable reveals for the remaining sections.
  gsap.utils.toArray('.reveal').forEach(element => {
    gsap.fromTo(element,
      { opacity: 0, y: 52 },
      {
        opacity: 1, y: 0, duration: 1.0, ease: 'power3.out',
        scrollTrigger: { trigger: element, start: 'top 86%', once: true }
      });
  });

  // Restore correct pin measurements once images and webfonts settle.
  window.addEventListener('load', () => ScrollTrigger.refresh(), { once: true });
})();
