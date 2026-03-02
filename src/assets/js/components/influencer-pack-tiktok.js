salla.onReady(() => {
  const blocks = document.querySelectorAll('.s-block--influencer-pack-tiktok');
  if (!blocks.length) {
    return;
  }

  ensureTikTokEmbedScript();
  blocks.forEach((block) => setupTikTokPack(block));
});

function setupTikTokPack(block) {
  const bgColor = block.dataset.bgColor;
  if (bgColor) {
    block.style.setProperty('--tiktok-section-bg', bgColor);
  }
  const navBgColor = block.dataset.navBgColor;
  if (navBgColor) {
    block.style.setProperty('--tiktok-nav-bg', navBgColor);
  }
  const navIconColor = block.dataset.navIconColor;
  if (navIconColor) {
    block.style.setProperty('--tiktok-nav-icon', navIconColor);
    block.style.setProperty('--tiktok-nav-border', navIconColor);
  }

  const track = block.querySelector('.influencer-pack-tiktok__track');
  const cards = Array.from(block.querySelectorAll('.influencer-pack-tiktok__card'));
  if (!track || !cards.length) {
    return;
  }

  const navPrev = block.querySelector('.influencer-pack-tiktok__nav--prev');
  const navNext = block.querySelector('.influencer-pack-tiktok__nav--next');
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isRtl = getComputedStyle(track).direction === 'rtl' || document.documentElement.dir === 'rtl';

  syncNavIcons(navPrev, navNext, isRtl);

  let activeIndex = 0;
  setActiveCard(0);

  if (navPrev) {
    navPrev.addEventListener('click', () => scrollToCard(activeIndex - 1));
  }

  if (navNext) {
    navNext.addEventListener('click', () => scrollToCard(activeIndex + 1));
  }

  track.addEventListener('keydown', (event) => {
    const nextKey = isRtl ? 'ArrowLeft' : 'ArrowRight';
    const prevKey = isRtl ? 'ArrowRight' : 'ArrowLeft';

    if (event.key === nextKey) {
      event.preventDefault();
      scrollToCard(activeIndex + 1);
      return;
    }

    if (event.key === prevKey) {
      event.preventDefault();
      scrollToCard(activeIndex - 1);
    }
  });

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        let bestIndex = activeIndex;
        let bestRatio = 0;

        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }

          const index = Number(entry.target.dataset.index || 0);
          if (entry.intersectionRatio > bestRatio) {
            bestRatio = entry.intersectionRatio;
            bestIndex = index;
          }
        });

        if (bestRatio >= 0.55) {
          setActiveCard(bestIndex);
        }
      },
      {
        root: track,
        threshold: [0.35, 0.55, 0.8],
      }
    );

    cards.forEach((card) => observer.observe(card));
  }

  function scrollToCard(index) {
    const safeIndex = clamp(index, 0, cards.length - 1);
    cards[safeIndex].scrollIntoView({
      behavior: reduceMotion ? 'auto' : 'smooth',
      inline: 'center',
      block: 'nearest',
    });
    setActiveCard(safeIndex);
  }

  function setActiveCard(index) {
    activeIndex = clamp(index, 0, cards.length - 1);

    cards.forEach((card, reelIndex) => {
      const isActive = reelIndex === activeIndex;
      card.classList.toggle('is-active', isActive);
      card.setAttribute('aria-current', isActive ? 'true' : 'false');
    });

    syncNavDisabledState(navPrev, navNext, activeIndex, cards.length);
  }
}

function ensureTikTokEmbedScript() {
  const scriptSrc = 'https://www.tiktok.com/embed.js';
  if (document.querySelector(`script[src="${scriptSrc}"]`)) {
    return;
  }

  const script = document.createElement('script');
  script.src = scriptSrc;
  script.async = true;
  document.head.appendChild(script);
}

function syncNavIcons(navPrev, navNext, isRtl) {
  if (!navPrev || !navNext) {
    return;
  }

  const prevIcon = navPrev.querySelector('i');
  const nextIcon = navNext.querySelector('i');

  if (!prevIcon || !nextIcon) {
    return;
  }

  // Salla icon names are visually inverted for these arrows.
  // Keep fixed visual direction: prev as "<" and next as ">".
  prevIcon.className = 'sicon-keyboard_arrow_right';
  nextIcon.className = 'sicon-keyboard_arrow_left';
}

function syncNavDisabledState(prevButton, nextButton, activeIndex, total) {
  if (prevButton) {
    const isDisabled = activeIndex <= 0;
    prevButton.disabled = isDisabled;
    prevButton.setAttribute('aria-disabled', isDisabled ? 'true' : 'false');
  }

  if (nextButton) {
    const isDisabled = activeIndex >= total - 1;
    nextButton.disabled = isDisabled;
    nextButton.setAttribute('aria-disabled', isDisabled ? 'true' : 'false');
  }
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
