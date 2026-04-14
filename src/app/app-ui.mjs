import * as dom from '../dom.mjs';

function focusGameSurface(boardElement) {
  if (document.activeElement instanceof HTMLElement && document.activeElement !== document.body) {
    document.activeElement.blur();
  }
  boardElement.tabIndex = -1;
  boardElement.focus({ preventScroll: true });
}

export function createAppUi() {
  return {
    ...dom,
    focusGameSurface: () => focusGameSurface(dom.boardElement),
  };
}
