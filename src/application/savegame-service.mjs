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
  } = context;

  function formatSavegameSummary() {
    const metadata = getSavedGameMetadata();
    if (!metadata) {
      return "Kein gespeicherter Lauf gefunden.";
    }

    const heroName = metadata.heroName ?? "Unbekannt";
    const floor = metadata.floor ? `Ebene ${metadata.floor}` : "unbekannter Ebene";
    return `Gespeichert: ${heroName} auf ${floor}.`;
  }

  function updateSavegameControls(statusText = formatSavegameSummary()) {
    const state = getState();
    const savedGameExists = hasSavedGame();
    setLoadButtonsDisabled(!savedGameExists);
    setSaveButtonDisabled(!state || state.gameOver || state.modals.startOpen);
    setSavegameStatus(statusText);
  }

  function saveCurrentGame() {
    const state = getState();
    if (state.gameOver || state.modals.startOpen) {
      updateSavegameControls("Speichern ist erst in einem laufenden Spiel moeglich.");
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
        updateSavegameControls("Der gespeicherte Lauf ist beschaedigt und konnte nicht geladen werden.");
        return;
      }

      updateSavegameControls("Kein gespeicherter Lauf gefunden.");
      return;
    }

    detectNearbyTraps();
    addMessage("Gespeicherter Lauf geladen.", "important");
    updateSavegameControls(formatSavegameSummary());
    renderSelf();
  }

  return {
    formatSavegameSummary,
    updateSavegameControls,
    saveCurrentGame,
    loadCurrentGame,
  };
}
