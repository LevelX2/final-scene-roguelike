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
    const occupiedEntries = entries.filter((entry) => entry?.empty === false);
    const latestEntry = getSavedGameMetadata();
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
    return occupiedEntries.length > 1
      ? `${occupiedEntries.length} belegte Slots. Zuletzt gespeichert: ${heroName} in ${floor}. Geladene Slots werden verbraucht.`
      : `1 belegter Slot. Zuletzt gespeichert: ${heroName} in ${floor}. Geladene Slots werden verbraucht.`;
  }

  function renderSavegameList() {
    if (!savegameListElement) {
      return;
    }

    const entries = listSavedGames();
    const canSave = canSaveCurrentGame();
    savegameListElement.innerHTML = "";

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

    entries.forEach((entry) => {
      const item = document.createElement("div");
      item.className = `savegame-item${entry.empty ? " savegame-item-empty" : ""}`;
      const compatible = entry.compatible !== false;
      const floorLabel = entry.floor ? formatStudioLabel(entry.floor) : "Unbekanntes Studio";
      const tagLabel = compatible
        ? entry.slotLabel ?? "Save-Slot"
        : "Nicht kompatibel";
      const headline = !compatible
        ? `${entry.heroName ?? "Unbekannt"} | nicht kompatibel`
        : entry.empty
          ? "Leer"
          : `${entry.heroName ?? "Unbekannt"} | ${floorLabel}`;
      const detailLine = !compatible
        ? `Version ${entry.version ?? "?"} | Dieser Spielstand kann nicht geladen werden.`
        : entry.empty
          ? (canSave
              ? "Dieser Slot ist frei. Du kannst den aktuellen Run hier sichern."
              : "Dieser Slot ist frei.")
          : `${entry.heroClass ?? "Unbekannter Beruf"} | Level ${entry.level ?? "?"} | Zug ${entry.turn ?? "?"}${entry.isLatest ? " | Zuletzt gespeichert" : ""}`;
      const footerLine = entry.empty || !compatible
        ? ""
        : `${formatSavegameTimestamp(entry.savedAt)} | Wird beim Laden verbraucht.`;
      item.innerHTML = `
        <div class="savegame-meta">
          <span class="savegame-tag">${tagLabel}</span>
          <strong>${headline}</strong>
          <span>${detailLine}</span>
          ${footerLine ? `<span>${footerLine}</span>` : ""}
        </div>
        <div class="savegame-actions"></div>
      `;

      const actions = item.querySelector(".savegame-actions");

      if (entry.empty) {
        if (canSave) {
          const saveButton = document.createElement("button");
          saveButton.className = "choice-btn accent";
          saveButton.type = "button";
          saveButton.textContent = "In Slot speichern";
          saveButton.addEventListener("click", () => saveCurrentGame(entry.slotIndex));
          actions?.appendChild(saveButton);
        }
      } else if (entry.canLoad !== false) {
        const loadButton = document.createElement("button");
        loadButton.className = "choice-btn accent";
        loadButton.type = "button";
        loadButton.textContent = "Laden";
        loadButton.addEventListener("click", () => loadCurrentGame(entry.slotIndex));
        actions?.appendChild(loadButton);

        if (canSave && entry.canOverwrite !== false) {
          const saveButton = document.createElement("button");
          saveButton.className = "choice-btn";
          saveButton.type = "button";
          saveButton.textContent = "\u00dcberschreiben";
          saveButton.addEventListener("click", () => saveCurrentGame(entry.slotIndex));
          actions?.appendChild(saveButton);
        }

        if (entry.canDelete !== false) {
          const deleteButton = document.createElement("button");
          deleteButton.className = "choice-btn ghost";
          deleteButton.type = "button";
          deleteButton.textContent = "L\u00f6schen";
          deleteButton.addEventListener("click", () => removeSavegame(entry.slotIndex));
          actions?.appendChild(deleteButton);
        }
      } else if (entry.canDelete !== false) {
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

    const state = getState();
    state.view = "start";
    state.modals.startOpen = false;
    state.modals.savegamesOpen = false;
    addMessage("Spielstand gespeichert. Der aktuelle Run wurde beendet.", "important");
    renderSelf();
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

      if (result.reason === "invalid") {
        updateSavegameControls("Der Spielstand ist besch\u00e4digt und konnte nicht geladen werden.");
        return;
      }

      updateSavegameControls("Kein Spielstand gefunden.");
      return;
    }

    detectNearbyTraps();
    addMessage("Spielstand geladen. Der gew\u00e4hlte Slot wurde dabei verbraucht.", "important");
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
