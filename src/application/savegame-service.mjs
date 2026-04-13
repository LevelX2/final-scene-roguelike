import { formatStudioLabel } from '../studio-theme.mjs';

export function createSavegameService(context) {
  const {
    getState,
    hasSavedGame,
    getSavedGameMetadata,
    saveGame,
    loadSavedGame,
    setSavegameStatus,
    setLoadButtonsDisabled,
    setSaveButtonDisabled,
    detectNearbyTraps,
    addMessage,
    renderSelf,
    focusGameSurface,
  } = context;

  function formatSavegameSummary() {
    const metadata = getSavedGameMetadata();
    if (!metadata) {
      return "Kein Spielstand gefunden.";
    }

    const heroName = metadata.heroName ?? "Unbekannt";
    const floor = metadata.floor ? formatStudioLabel(metadata.floor) : "unbekanntem Studio";
    return `Gespeichert: ${heroName} in ${floor}.`;
  }

  function updateSavegameControls(statusText = formatSavegameSummary()) {
    const state = getState();
    const savedGameExists = hasSavedGame();
    setLoadButtonsDisabled(!savedGameExists);
    setSaveButtonDisabled(!state || state.gameOver || state.view !== "game" || state.modals.startOpen);
    setSavegameStatus(statusText);
  }

  function saveCurrentGame() {
    const state = getState();
    if (state.gameOver || state.view !== "game" || state.modals.startOpen) {
      updateSavegameControls("Speichern ist erst während eines Spiels möglich.");
      return;
    }

    if (!saveGame()) {
      updateSavegameControls("Speichern fehlgeschlagen.");
      return;
    }

    addMessage("Spielstand gespeichert.", "important");
    updateSavegameControls(formatSavegameSummary());
    renderSelf();
  }

  function loadCurrentGame() {
    const result = loadSavedGame();
    if (!result.ok) {
      if (result.reason === "incompatible") {
        updateSavegameControls(`Spielstand-Version ${result.foundVersion ?? "?"} ist nicht kompatibel mit Version ${result.expectedVersion}.`);
        return;
      }

      if (result.reason === "invalid") {
        updateSavegameControls("Der Spielstand ist beschädigt und konnte nicht geladen werden.");
        return;
      }

      updateSavegameControls("Kein Spielstand gefunden.");
      return;
    }

    detectNearbyTraps();
    addMessage("Spielstand geladen.", "important");
    updateSavegameControls(formatSavegameSummary());
    renderSelf();
    window.setTimeout(() => focusGameSurface?.(), 0);
  }

  return {
    formatSavegameSummary,
    updateSavegameControls,
    saveCurrentGame,
    loadCurrentGame,
  };
}
