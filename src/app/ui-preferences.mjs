export function createUiPreferencesApi(context) {
  const {
    getState,
    renderSelf,
  } = context;

  function toggleCardCollapse(key) {
    const state = getState();
    if (key === "player") {
      const currentMode = state.collapsedCards.player ?? "summary";
      state.collapsedCards.player = currentMode === "summary"
        ? "full"
        : currentMode === "full"
          ? "hidden"
          : "summary";
    } else if (key === "log") {
      const currentMode = state.collapsedCards.log ?? "compact";
      state.collapsedCards.log = currentMode === "compact"
        ? "full"
        : currentMode === "full"
          ? "hidden"
          : "compact";
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

  return {
    toggleCardCollapse,
    setInventoryFilter,
  };
}
