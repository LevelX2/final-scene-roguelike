const INLINE_LORE_SELECTOR = '[data-lore-term]';
const TOUCH_LONG_PRESS_MS = 420;

export function createInlineLoreTooltipBinder(context) {
  const {
    bindTooltip,
    showTooltip,
    hideTooltip,
    getLoreTooltip,
  } = context;

  let activeInlineTooltipElement = null;
  let dismissListenersBound = false;

  function buildAnchorEvent(element, sourceEvent) {
    if (sourceEvent && typeof sourceEvent.clientX === 'number' && typeof sourceEvent.clientY === 'number') {
      return sourceEvent;
    }

    const rect = element.getBoundingClientRect();
    return {
      clientX: rect.left + Math.min(rect.width / 2, Math.max(18, rect.width - 12)),
      clientY: rect.bottom,
    };
  }

  function clearActiveInlineTooltip() {
    activeInlineTooltipElement = null;
    hideTooltip();
  }

  function showInlineTooltip(element, event) {
    const tooltip = getLoreTooltip(element.dataset.loreTerm);
    if (!tooltip) {
      clearActiveInlineTooltip();
      return;
    }

    activeInlineTooltipElement = element;
    showTooltip(tooltip, buildAnchorEvent(element, event), { anchorElement: element });
  }

  function toggleInlineTooltip(element, event) {
    if (activeInlineTooltipElement === element) {
      clearActiveInlineTooltip();
      return;
    }

    showInlineTooltip(element, event);
  }

  function bindDismissListeners() {
    if (dismissListenersBound) {
      return;
    }

    dismissListenersBound = true;

    document.addEventListener('pointerdown', (event) => {
      const trigger = event.target instanceof Element
        ? event.target.closest(INLINE_LORE_SELECTOR)
        : null;
      if (!trigger) {
        clearActiveInlineTooltip();
      }
    }, true);

    window.addEventListener('resize', () => {
      if (activeInlineTooltipElement) {
        clearActiveInlineTooltip();
      }
    });

    window.addEventListener('scroll', () => {
      if (activeInlineTooltipElement) {
        clearActiveInlineTooltip();
      }
    }, true);
  }

  function bindElement(element) {
    if (!element || element.dataset.loreTooltipBound === 'true') {
      return;
    }

    element.dataset.loreTooltipBound = 'true';

    bindTooltip(element, () => getLoreTooltip(element.dataset.loreTerm));

    let touchPressTimer = null;
    let suppressNextClick = false;

    const clearTouchPressTimer = () => {
      if (touchPressTimer !== null) {
        window.clearTimeout(touchPressTimer);
        touchPressTimer = null;
      }
    };

    element.addEventListener('focus', () => {
      showInlineTooltip(element);
    });

    element.addEventListener('blur', () => {
      if (activeInlineTooltipElement === element) {
        clearActiveInlineTooltip();
      }
    });

    element.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        clearActiveInlineTooltip();
        element.blur();
        return;
      }

      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        toggleInlineTooltip(element);
      }
    });

    element.addEventListener('pointerdown', (event) => {
      if (event.pointerType !== 'touch') {
        return;
      }

      clearTouchPressTimer();
      touchPressTimer = window.setTimeout(() => {
        suppressNextClick = true;
        showInlineTooltip(element, event);
      }, TOUCH_LONG_PRESS_MS);
    });

    element.addEventListener('pointerup', clearTouchPressTimer);
    element.addEventListener('pointercancel', clearTouchPressTimer);
    element.addEventListener('pointerleave', clearTouchPressTimer);
    element.addEventListener('mouseleave', () => {
      if (activeInlineTooltipElement === element) {
        activeInlineTooltipElement = null;
      }
    });

    element.addEventListener('click', (event) => {
      if (suppressNextClick) {
        suppressNextClick = false;
        event.preventDefault();
        return;
      }

      event.preventDefault();
      toggleInlineTooltip(element, event);
    });
  }

  function bindInlineLoreTooltips(root = document) {
    bindDismissListeners();
    root.querySelectorAll(INLINE_LORE_SELECTOR).forEach((element) => bindElement(element));
  }

  return {
    bindInlineLoreTooltips,
  };
}
