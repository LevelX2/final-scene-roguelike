export function createUiPreferencesApi(context) {
  const {
    getState,
    renderSelf,
  } = context;

  function clampOption(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function toggleCardCollapse(key) {
    const state = getState();
    if (key === "player") {
      const currentMode = state.collapsedCards.player ?? "summary";
      state.collapsedCards.player = currentMode === "summary"
        ? "hidden"
        : "summary";
    } else if (key === "log") {
      const logIsHidden = state.collapsedCards.log === "hidden" || state.collapsedCards.log === true;
      state.collapsedCards.log = logIsHidden ? "visible" : "hidden";
    } else {
      state.collapsedCards[key] = !state.collapsedCards[key];
    }
    renderSelf();
  }

  function setInventoryFilter(filter) {
    const state = getState();
    state.preferences.inventoryFilter = filter;
    renderSelf();
  }

  function setUiScale(percent) {
    const state = getState();
    state.options.uiScale = clampOption(Number(percent) / 100, 0.85, 1.3);
    renderSelf();
  }

  function setStudioZoom(percent) {
    const state = getState();
    state.options.studioZoom = clampOption(Number(percent) / 100, 0.6, 2.4);
    renderSelf();
  }

  function adjustStudioZoom(deltaPercent) {
    const state = getState();
    const nextPercent = Math.round((state.options.studioZoom ?? 1) * 100) + deltaPercent;
    setStudioZoom(nextPercent);
  }

  function resetStudioZoom() {
    setStudioZoom(100);
  }

  function setTooltipScale(percent) {
    const state = getState();
    state.options.tooltipScale = clampOption(Number(percent) / 100, 0.85, 1.5);
    renderSelf();
  }

  function setEnemyPanelMode(mode) {
    const state = getState();
    state.options.enemyPanelMode = mode === "compact" ? "compact" : "detailed";
    renderSelf();
  }

  function toggleEnemyPanelMode() {
    const state = getState();
    state.options.enemyPanelMode = state.options.enemyPanelMode === "compact"
      ? "detailed"
      : "compact";
    renderSelf();
  }

  return {
    toggleCardCollapse,
    setInventoryFilter,
    setUiScale,
    setStudioZoom,
    adjustStudioZoom,
    resetStudioZoom,
    setTooltipScale,
    setEnemyPanelMode,
    toggleEnemyPanelMode,
  };
}
