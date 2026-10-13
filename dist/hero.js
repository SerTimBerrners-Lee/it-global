const taglines = [
  'Ваши сервисы на вашем сервере',
  'Не платите за подписки',
  'Ваши данные только у вас',
  'Любое количество сотрудников без ограничений'
];

/** @returns {void} */
export function initializeHero() {
  const tagline = document.querySelector('#hero-tagline');

  if (!tagline) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let index = 0;
  let transitioning = false;
  /** @type {Animation | null} */
  let animation = null;

  tagline.textContent = taglines[index];

  /** @returns {Promise<void>} */
  async function rotateTagline() {
    if (document.hidden || transitioning) return;

    transitioning = true;

    try {
      if (!reducedMotion.matches) {
        animation = tagline.animate([{ opacity: 1 }, { opacity: 0 }], {
          duration: 300, easing: 'ease-in', fill: 'forwards'
        });
        await animation.finished;
      }

      if (document.hidden) return;

      index = (index + 1) % taglines.length;
      tagline.textContent = taglines[index];
      animation?.cancel();
      animation = null;

      if (!reducedMotion.matches) {
        animation = tagline.animate([{ opacity: 0 }, { opacity: 1 }], {
          duration: 500, easing: 'ease-out', fill: 'forwards'
        });
        await animation.finished;
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) throw error;
    } finally {
      animation?.cancel();
      animation = null;
      transitioning = false;
    }
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) animation?.cancel();
  });

  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) animation?.finish();
  });

  window.setInterval(rotateTagline, 5000);
}
