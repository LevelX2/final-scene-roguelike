import { formatStudioLabel } from '../studio-theme.mjs';

export function createSavegameService(context) {
  const {
    getState,
    hasSavedGame,
    getSavedGameMetadata,
    listSavedGames,
    saveGame,
    loadSavedGame,
    deleteSavedGame,
    setSavegameStatus,
    setLoadButtonsDisabled,
    setSaveButtonDisabled,
    savegameListElement,
    detectNearbyTraps,
    addMessage,
    returnToStartScreen,
    renderSelf,
    focusGameSurface,
  } = context;

  function canSaveCurrentGame() {
    const state = getState();
    return Boolean(state && !state.gameOver && state.view === "game" && !state.modals.startOpen);
  }

  function formatSavegameTimestamp(timestamp) {
    if (!timestamp) {
      return "Unbekannter Zeitpunkt";
    }

    try {
      return new Date(timestamp).toLocaleString("de-DE");
    } catch {
      return "Unbekannter Zeitpunkt";
    }
  }

  function formatSavegameSummary() {
    const entries = listSavedGames();
    const latestEntry = entries[0] ?? getSavedGameMetadata();
    if (!latestEntry) {
      return hasSavedGame()
        ? "Vorhandene Save-Daten sind nicht kompatibel mit dieser Version."
        : "Kein Spielstand gefunden.";
    }

    if (latestEntry.compatible === false) {
      return "Mindestens ein Spielstand ist nicht kompatibel und kann nur geloescht werden.";
    }

    const heroName = latestEntry.heroName ?? "Unbekannt";
    const floor = latestEntry.floor ? formatStudioLabel(latestEntry.floor) : "unbekanntem Studio";
    return entries.length > 1
      ? `${entries.length} Spielst\u00e4nde verf\u00fcgbar. Zuletzt: ${heroName} in ${floor}.`
      : `Gespeichert: ${heroName} in ${floor}.`;
  }

  function appendNewSaveAction() {
    if (!savegameListElement || !canSaveCurrentGame()) {
      return;
    }

    const createItem = document.createElement("div");
    createItem.className = "savegame-item";
    createItem.innerHTML = `
      <div class="savegame-meta">
        <span class="savegame-tag">Neuer Slot</span>
        <strong>Aktuellen Run als neuen Spielstand sichern</strong>
        <span>Lege einen zus\u00e4tzlichen Save-Slot an, ohne bestehende Spielst\u00e4nde zu \u00fcberschreiben.</span>
      </div>
      <div class="savegame-actions"></div>
    `;

    const createActions = createItem.querySelector(".savegame-actions");
    const createButton = document.createElement("button");
    createButton.className = "choice-btn accent";
    createButton.type = "button";
    createButton.textContent = "Neu speichern";
    createButton.addEventListener("click", () => saveCurrentGame());
    createActions?.appendChild(createButton);
    savegameListElement.appendChild(createItem);
  }

  function renderSavegameList() {
    if (!savegameListElement) {
      return;
    }

    const entries = listSavedGames();
    const canSave = canSaveCurrentGame();
    savegameListElement.innerHTML = "";
    appendNewSaveAction();

    if (!entries.length) {
      const emptyState = document.createElement("div");
      emptyState.className = "inventory-empty";
      emptyState.textContent = hasSavedGame()
        ? "Vorhandene Save-Daten sind nicht kompatibel oder besch\u00e4digt."
        : canSave
          ? "Noch keine Spielst\u00e4nde vorhanden. Du kannst oben direkt einen neuen Slot anlegen."
          : "Keine gespeicherten Runs verf\u00fcgbar.";
      savegameListElement.appendChild(emptyState);
      return;
    }

    entries.forEach((entry, index) => {
      const item = document.createElement("div");
      item.className = "savegame-item";
      const compatible = entry.compatible !== false;
      const floorLabel = entry.floor ? formatStudioLabel(entry.floor) : "Unbekanntes Studio";
      const tagLabel = compatible
        ? (index === 0 ? "Neuester Slot" : "Save-Slot")
        : "Nicht kompatibel";
      const headline = compatible
        ? `${entry.heroName ?? "Unbekannt"} | ${floorLabel}`
        : `${entry.heroName ?? "Unbekannt"} | nicht kompatibel`;
      const detailLine = compatible
        ? `${entry.heroClass ?? "Unbekannter Beruf"} | Level ${entry.level ?? "?"} | Zug ${entry.turn ?? "?"}`
        : `Version ${entry.version ?? "?"} | Dieser Spielstand kann nicht geladen werden.`;
      item.innerHTML = `
        <div class="savegame-meta">
          <span class="savegame-tag">${tagLabel}</span>
          <strong>${headline}</strong>
          <span>${detailLine}</span>
          <span>${formatSavegameTimestamp(entry.savedAt)}</span>
        </div>
        <div class="savegame-actions"></div>
      `;

      const actions = item.querySelector(".savegame-actions");

      if (entry.canLoad !== false) {
        const loadButton = document.createElement("button");
        loadButton.className = "choice-btn accent";
        loadButton.type = "button";
        loadButton.textContent = "Laden";
        loadButton.addEventListener("click", () => loadCurrentGame(entry.id));
        actions?.appendChild(loadButton);
      }

      if (canSave && entry.canOverwrite !== false) {
        const saveButton = document.createElement("button");
        saveButton.className = "choice-btn";
        saveButton.type = "button";
        saveButton.textContent = "\u00dcberschreiben";
        saveButton.addEventListener("click", () => saveCurrentGame(entry.id));
        actions?.appendChild(saveButton);
      }

      if (entry.canDelete !== false) {
        const deleteButton = document.createElement("button");
        deleteButton.className = "choice-btn ghost";
        deleteButton.type = "button";
        deleteButton.textContent = "L\u00f6schen";
        deleteButton.addEventListener("click", () => removeSavegame(entry.id));
        actions?.appendChild(deleteButton);
      }

      savegameListElement.appendChild(item);
    });
  }

  function updateSavegameControls(statusText = formatSavegameSummary()) {
    const savedGameExists = hasSavedGame();
    setLoadButtonsDisabled(!savedGameExists);
    setSaveButtonDisabled(!canSaveCurrentGame());
    setSavegameStatus(statusText);
    renderSavegameList();
  }

  function saveCurrentGame(entryId = null) {
    if (!canSaveCurrentGame()) {
      updateSavegameControls("Speichern ist erst w\u00e4hrend eines Spiels m\u00f6glich.");
      return;
    }

    const result = saveGame(entryId);
    if (!result?.ok) {
      updateSavegameControls("Speichern fehlgeschlagen.");
      return;
    }

    addMessage("Spielstand gespeichert.", "important");
    updateSavegameControls(formatSavegameSummary());
    renderSelf();
    returnToStartScreen?.({ openStartModal: false, clearSavedGame: false });
  }

  function removeSavegame(entryId) {
    const deleted = deleteSavedGame?.(entryId);
    if (!deleted) {
      updateSavegameControls("Spielstand konnte nicht gel\u00f6scht werden.");
      return;
    }

    updateSavegameControls(formatSavegameSummary());
    renderSelf();
  }

  function loadCurrentGame(entryId = null) {
    const result = loadSavedGame(entryId);
    if (!result.ok) {
      if (result.reason === "incompatible") {
        updateSavegameControls(`Spielstand-Version ${result.foundVersion ?? "?"} ist nicht kompatibel mit Version ${result.expectedVersion}.`);
        return;
      }

      if (result.reason === "consumed") {
        updateSavegameControls("Dieser Spielstand wurde bereits geladen und ist verbraucht.");
        renderSelf();
        return;
      }

      if (result.reason === "invalid") {
        updateSavegameControls("Der Spielstand ist besch\u00e4digt und konnte nicht geladen werden.");
        return;
      }

      updateSavegameControls("Kein Spielstand gefunden.");
      return;
    }

    detectNearbyTraps();
    addMessage("Spielstand geladen.", "important");
    getState().modals.savegamesOpen = false;
    updateSavegameControls(formatSavegameSummary());
    renderSelf();
    window.setTimeout(() => focusGameSurface?.(), 0);
  }

  return {
    formatSavegameSummary,
    renderSavegameList,
    updateSavegameControls,
    saveCurrentGame,
    loadCurrentGame,
    removeSavegame,
  };
}
