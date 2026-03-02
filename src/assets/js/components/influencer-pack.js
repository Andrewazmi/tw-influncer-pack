/**
 * Influencer Pack component behavior
 * - One active reel at a time
 * - Muted first-reel autoplay fallback
 * - Keyboard and swipe-friendly controls
 */

salla.onReady(() => {
  const blocks = document.querySelectorAll('.s-block--influencer-pack');
  if (!blocks.length) {
    return;
  }

  blocks.forEach((block) => setupInfluencerPack(block));
});

function setupInfluencerPack(block) {
  const copyButtonColor = block.dataset.copyButtonColor;
  if (copyButtonColor) {
    block.style.setProperty('--influencer-copy-btn-bg', copyButtonColor);
  }

  bindCopyCodeButtons(block);

  const track = block.querySelector('.influencer-pack__reels-track');
  const reels = Array.from(block.querySelectorAll('.influencer-pack__reel-card'));
  if (!track || !reels.length) {
    return;
  }
  track.classList.toggle('is-single', reels.length === 1);

  const autoplayEnabled = block.dataset.autoplay === 'true';
  const mutedByDefault = block.dataset.muted !== 'false';
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const navPrev = block.querySelector('.influencer-pack__nav--prev');
  const navNext = block.querySelector('.influencer-pack__nav--next');

  let activeIndex = 0;
  let firstAutoplayDone = false;
  let sectionVisible = true;

  reels.forEach((reel, index) => {
    reel.dataset.index = String(index);

    const video = reel.querySelector('.influencer-pack__video');
    const toggle = reel.querySelector('.influencer-pack__play-toggle');
    const progressFill = reel.querySelector('.influencer-pack__progress-fill');

    if (video) {
      video.muted = mutedByDefault;
      video.playsInline = true;
      video.preload = index <= 1 ? 'metadata' : 'none';

      video.addEventListener('play', () => {
        reel.classList.add('is-playing');
        reel.classList.remove('is-manual-required');
        setToggleState(toggle, true);
      });

      video.addEventListener('pause', () => {
        reel.classList.remove('is-playing');
        setToggleState(toggle, false);
      });

      video.addEventListener('ended', () => {
        reel.classList.remove('is-playing');
        reel.classList.add('is-ended');
        setToggleState(toggle, false);
        if (progressFill) {
          progressFill.style.width = '100%';
        }
      });

      video.addEventListener('timeupdate', () => {
        if (!progressFill || !video.duration) {
          return;
        }
        const progress = Math.min((video.currentTime / video.duration) * 100, 100);
        progressFill.style.width = `${progress}%`;
      });
    }

    if (toggle) {
      toggle.addEventListener('click', () => {
        setActiveReel(index, true);
        handleToggle(reel, true);
      });
    }
  });

  if (navPrev) {
    navPrev.addEventListener('click', () => scrollToReel(activeIndex - 1));
  }

  if (navNext) {
    navNext.addEventListener('click', () => scrollToReel(activeIndex + 1));
  }

  track.addEventListener('keydown', (event) => {
    const isRtl = getComputedStyle(track).direction === 'rtl' || document.documentElement.dir === 'rtl';
    const nextKey = isRtl ? 'ArrowLeft' : 'ArrowRight';
    const prevKey = isRtl ? 'ArrowRight' : 'ArrowLeft';

    if (event.key === nextKey) {
      event.preventDefault();
      scrollToReel(activeIndex + 1);
      return;
    }

    if (event.key === prevKey) {
      event.preventDefault();
      scrollToReel(activeIndex - 1);
      return;
    }

    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      handleToggle(reels[activeIndex], true);
    }
  });

  if ('IntersectionObserver' in window) {
    const reelObserver = new IntersectionObserver(
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

        if (bestRatio >= 0.6) {
          setActiveReel(bestIndex, false);
        }
      },
      {
        root: track,
        threshold: [0.35, 0.6, 0.85],
      }
    );

    reels.forEach((reel) => reelObserver.observe(reel));

    const sectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          sectionVisible = entry.isIntersecting;
          if (!sectionVisible) {
            pauseAllMedia();
            return;
          }

          const activeReel = reels[activeIndex];
          if (!activeReel) {
            return;
          }

          maybeAutoplay(activeReel);
        });
      },
      { threshold: [0.15] }
    );

    sectionObserver.observe(block);
  }

  setActiveReel(0, false);

  function scrollToReel(index) {
    if (!reels.length) {
      return;
    }
    const nextIndex = clamp(index, 0, reels.length - 1);
    reels[nextIndex].scrollIntoView({
      behavior: reduceMotion ? 'auto' : 'smooth',
      inline: 'start',
      block: 'nearest',
    });
    setActiveReel(nextIndex, true);
  }

  function setActiveReel(index, isUserIntent) {
    const safeIndex = clamp(index, 0, reels.length - 1);
    if (safeIndex === activeIndex && reels[safeIndex].classList.contains('is-active')) {
      return;
    }

    activeIndex = safeIndex;

    reels.forEach((reel, reelIndex) => {
      const isActive = reelIndex === activeIndex;
      reel.classList.toggle('is-active', isActive);
      reel.setAttribute('aria-current', isActive ? 'true' : 'false');

      if (!isActive) {
        pauseReelMedia(reel);
        resetYoutube(reel);
      }
    });

    primeNeighborVideos(reels, activeIndex);
    const activeReel = reels[activeIndex];

    if (isUserIntent) {
      firstAutoplayDone = true;
    }

    maybeAutoplay(activeReel);
  }

  function maybeAutoplay(reel) {
    if (!reel || !sectionVisible || reduceMotion || !autoplayEnabled || !mutedByDefault || firstAutoplayDone) {
      return;
    }

    const video = reel.querySelector('.influencer-pack__video');
    if (!video) {
      return;
    }

    const playAttempt = video.play();
    if (playAttempt && typeof playAttempt.catch === 'function') {
      playAttempt
        .then(() => {
          firstAutoplayDone = true;
        })
        .catch(() => {
          reel.classList.add('is-manual-required');
          setToggleState(reel.querySelector('.influencer-pack__play-toggle'), false);
          firstAutoplayDone = true;
        });
    } else {
      firstAutoplayDone = true;
    }
  }

  function handleToggle(reel, isUserIntent) {
    if (!reel) {
      return;
    }

    if (isUserIntent) {
      firstAutoplayDone = true;
    }

    const video = reel.querySelector('.influencer-pack__video');
    const youtubeShell = reel.querySelector('.influencer-pack__youtube');
    const toggle = reel.querySelector('.influencer-pack__play-toggle');

    if (video) {
      if (video.paused) {
        const playAttempt = video.play();
        if (playAttempt && typeof playAttempt.catch === 'function') {
          playAttempt.catch(() => {
            reel.classList.add('is-manual-required');
            setToggleState(toggle, false);
          });
        }
      } else {
        video.pause();
      }
      return;
    }

    if (youtubeShell) {
      if (youtubeShell.hidden) {
        youtubeShell.hidden = false;
        reel.classList.add('is-youtube-open');
        setToggleState(toggle, true);
      } else {
        resetYoutube(reel);
        setToggleState(toggle, false);
      }
    }
  }

  function pauseAllMedia() {
    reels.forEach((reel) => {
      pauseReelMedia(reel);
      resetYoutube(reel);
      setToggleState(reel.querySelector('.influencer-pack__play-toggle'), false);
    });
  }
}

function pauseReelMedia(reel) {
  const video = reel.querySelector('.influencer-pack__video');
  if (video && !video.paused) {
    video.pause();
  }
}

function primeNeighborVideos(reels, activeIndex) {
  reels.forEach((reel, index) => {
    const video = reel.querySelector('.influencer-pack__video');
    if (!video) {
      return;
    }
    const shouldPrime = Math.abs(index - activeIndex) <= 1;
    if (shouldPrime && video.preload === 'none') {
      video.preload = 'metadata';
      video.load();
    }
  });
}

function resetYoutube(reel) {
  const shell = reel.querySelector('.influencer-pack__youtube');
  const original = shell ? shell.querySelector('lite-youtube') : null;
  if (!shell || !original || shell.hidden) {
    return;
  }

  const next = document.createElement('lite-youtube');
  next.setAttribute('videoid', original.getAttribute('videoid') || '');
  next.setAttribute('params', original.getAttribute('params') || 'rel=0');
  shell.innerHTML = '';
  shell.appendChild(next);
  shell.hidden = true;
  reel.classList.remove('is-youtube-open');
}

function bindCopyCodeButtons(block) {
  block.addEventListener('click', (event) => {
    const button = event.target.closest('.influencer-pack__copy-code');
    if (!button || !block.contains(button)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const code = (button.dataset.code || '').trim();
    if (!code) {
      return;
    }

    const originalText = button.dataset.originalText || button.textContent || 'نسخ الكود';
    button.dataset.originalText = originalText;
    copyText(code).then((copied) => {
      if (!copied) {
        return;
      }

      button.textContent = 'تم النسخ';
      button.classList.add('is-copied');
      window.setTimeout(() => {
        button.classList.remove('is-copied');
        button.textContent = originalText;
      }, 1200);
    });
  });
}

function copyText(value) {
  // Keep a synchronous copy path for iframe/editor contexts.
  if (legacyCopy(value)) {
    return Promise.resolve(true);
  }

  if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    return navigator.clipboard
      .writeText(value)
      .then(() => true)
      .catch(() => false);
  }

  return Promise.resolve(false);
}

function legacyCopy(value) {
  const temp = document.createElement('textarea');
  temp.value = value;
  temp.setAttribute('readonly', '');
  temp.setAttribute('aria-hidden', 'true');
  temp.style.position = 'absolute';
  temp.style.opacity = '0';
  temp.style.left = '-9999px';
  temp.style.top = '0';
  temp.style.pointerEvents = 'none';
  document.body.appendChild(temp);

  const previousSelection = document.getSelection();
  const selectedRange = previousSelection && previousSelection.rangeCount ? previousSelection.getRangeAt(0) : null;

  temp.select();
  temp.setSelectionRange(0, temp.value.length);

  let success = false;
  try {
    success = document.execCommand('copy');
  } catch (error) {
    success = false;
  }

  document.body.removeChild(temp);
  if (selectedRange && previousSelection) {
    previousSelection.removeAllRanges();
    previousSelection.addRange(selectedRange);
  }

  return Boolean(success);
}

function setToggleState(toggle, isPlaying) {
  if (!toggle) {
    return;
  }

  const icon = toggle.querySelector('i');
  toggle.classList.toggle('is-playing', isPlaying);
  toggle.setAttribute('aria-label', isPlaying ? 'Pause reel' : 'Play reel');

  if (icon) {
    icon.classList.remove('sicon-play2', 'sicon-pause');
    icon.classList.add(isPlaying ? 'sicon-pause' : 'sicon-play2');
  }
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
