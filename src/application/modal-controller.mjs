import { formatStudioLabel, getStudioArchetypeLabel } from '../studio-theme.mjs';

export function createModalController(context) {
  const {
    CHOICE_ACTIONS,
    STAIR_ACTIONS,
    getState,
    clearSavedGame,
    createSheetRow,
    updateSavegameControls,
    returnToStartScreen,
    renderSelf,
    addMessage,
    moveToFloor,
    endTurn,
    resolvePotionChoice,
    choiceModalElement,
    choiceTitleElement,
    choiceTextElement,
    choiceDrinkButton,
    choiceStoreButton,
    choiceLeaveButton,
    stairsModalElement,
    stairsTitleElement,
    stairsTextElement,
    stairsConfirmButton,
    stairsStayButton,
    deathModalElement,
    deathSummaryElement,
  } = context;

  function setDeathModalVisibility(visible) {
    deathModalElement.classList.toggle("hidden", !visible);
    deathModalElement.setAttribute("aria-hidden", String(!visible));
  }

  function closeTransientModals() {
    toggleInventory(false);
    toggleRunStats(false);
    toggleOptions(false);
    toggleHelp(false);
    toggleHighscores(false);
  }

  function showDeathModal(rank) {
    const state = getState();
    const currentFloor = state.floors?.[state.floor];
    const deathCopyElement = deathModalElement.querySelector(".modal-copy");
    clearSavedGame();
    const deathLead = `Die Hauptrolle ${state.player.name} ${state.deathCause ?? "verschwand im letzten Akt aus dem Bild."}`;
    deathSummaryElement.innerHTML = [
      `<div class="death-highlight"><strong>${deathLead}</strong></div>`,
      createSheetRow("Hauptrolle", state.player.name),
      createSheetRow("Klasse", state.player.classLabel ?? "Unbekannt"),
      createSheetRow("Level", state.player.level),
      createSheetRow("Gestorben in", formatStudioLabel(state.floor)),
      createSheetRow("Archetyp", getStudioArchetypeLabel(currentFloor?.studioArchetypeId) ?? "Unbekannt"),
      createSheetRow("Erreichtes Studio", formatStudioLabel(state.deepestFloor)),
      createSheetRow("Gegner besiegt", state.kills),
      createSheetRow("Schritte", state.turn),
      createSheetRow("Platz in den Final Scenes", rank ? `#${rank}` : "Außer Wertung"),
    ].join("").replace("AuÃŸer Wertung", "Außer Wertung");
    if (deathCopyElement) {
      deathCopyElement.textContent = "Den vollständigen Spielverlauf kannst du separat ansehen. Dieses Ende-Fenster bleibt bewusst kompakt.";
    }
    setDeathModalVisibility(true);
    updateSavegameControls("Kein Spielstand gefunden.");
  }

  function hideDeathModal() {
    setDeathModalVisibility(false);
  }

  function toggleInventory(forceOpen) {
    const state = getState();
    state.modals.inventoryOpen = forceOpen ?? !state.modals.inventoryOpen;
    renderSelf();
  }

  function toggleRunStats(forceOpen) {
    const state = getState();
    state.modals.runStatsOpen = forceOpen ?? !state.modals.runStatsOpen;
    if (!state.modals.runStatsOpen && state.gameOver && deathModalElement.classList.contains("hidden")) {
      setDeathModalVisibility(true);
    }
    renderSelf();
  }

  function toggleOptions(forceOpen) {
    const state = getState();
    state.modals.optionsOpen = forceOpen ?? !state.modals.optionsOpen;
    renderSelf();
  }

  function toggleHelp(forceOpen) {
    const state = getState();
    state.modals.helpOpen = forceOpen ?? !state.modals.helpOpen;
    renderSelf();
  }

  function toggleHighscores(forceOpen) {
    const state = getState();
    state.modals.highscoresOpen = forceOpen ?? !state.modals.highscoresOpen;
    renderSelf();
  }

  function showChoiceModal(config) {
    const state = getState();
    const allowedActions = CHOICE_ACTIONS[config.kind] ?? [];
    const selectedAction = allowedActions.includes(config.selectedAction)
      ? config.selectedAction
      : allowedActions[0];
    state.pendingChoice = {
      ...config,
      selectedAction,
    };
    choiceTitleElement.textContent = config.title;
    if (config.htmlText) {
      choiceTextElement.innerHTML = config.htmlText;
    } else {
      choiceTextElement.textContent = config.text;
    }
    choiceDrinkButton.textContent = config.labels[0];
    choiceStoreButton.textContent = config.labels[1];
    choiceLeaveButton.textContent = config.labels[2];
    choiceModalElement.classList.remove("hidden");
    choiceModalElement.setAttribute("aria-hidden", "false");
    updatePotionChoiceSelection();
  }

  function hideChoiceModal() {
    const state = getState();
    state.pendingChoice = null;
    choiceModalElement.classList.add("hidden");
    choiceModalElement.setAttribute("aria-hidden", "true");
  }

  function showStairChoice(config) {
    const state = getState();
    state.pendingStairChoice = {
      ...config,
      selectedAction: config.selectedAction ?? "stay",
    };
    stairsTitleElement.textContent = config.title;
    stairsTextElement.textContent = config.text;
    stairsConfirmButton.textContent = config.confirmLabel ?? "Studio wechseln";
    stairsStayButton.textContent = config.stayLabel ?? "Hier bleiben";
    stairsModalElement.classList.remove("hidden");
    stairsModalElement.setAttribute("aria-hidden", "false");
    updateStairChoiceSelection();
  }

  function hideStairChoice() {
    const state = getState();
    state.pendingStairChoice = null;
    stairsModalElement.classList.add("hidden");
    stairsModalElement.setAttribute("aria-hidden", "true");
  }

  function updatePotionChoiceSelection() {
    const state = getState();
    const selected = state?.pendingChoice?.selectedAction;
    choiceDrinkButton.classList.toggle("selected", selected === "drink" || selected === "equip" || selected === "eat");
    choiceStoreButton.classList.toggle("selected", selected === "store");
    choiceLeaveButton.classList.toggle("selected", selected === "leave");
  }

  function updateStairChoiceSelection() {
    const state = getState();
    const selected = state?.pendingStairChoice?.selectedAction;
    stairsConfirmButton.classList.toggle("selected", selected === "change-floor");
    stairsStayButton.classList.toggle("selected", selected === "stay");
  }

  function cyclePotionChoice(direction) {
    const state = getState();
    if (!state.pendingChoice) {
      return;
    }

    const actions = CHOICE_ACTIONS[state.pendingChoice.kind];
    const currentIndex = actions.indexOf(state.pendingChoice.selectedAction);
    const nextIndex = (currentIndex + direction + actions.length) % actions.length;
    state.pendingChoice.selectedAction = actions[nextIndex];
    updatePotionChoiceSelection();
  }

  function cycleStairChoice(direction) {
    const state = getState();
    if (!state.pendingStairChoice) {
      return;
    }

    const currentIndex = STAIR_ACTIONS.indexOf(state.pendingStairChoice.selectedAction);
    const nextIndex = (currentIndex + direction + STAIR_ACTIONS.length) % STAIR_ACTIONS.length;
    state.pendingStairChoice.selectedAction = STAIR_ACTIONS[nextIndex];
    updateStairChoiceSelection();
  }

  function resolveChoiceBySlot(slotIndex) {
    const state = getState();
    if (!state.pendingChoice) {
      return;
    }

    const actions = CHOICE_ACTIONS[state.pendingChoice.kind];
    const action = actions?.[slotIndex];
    if (!action) {
      return;
    }

    resolvePotionChoice(action);
  }

  function resolveStairChoice(action) {
    const state = getState();
    if (!state.pendingStairChoice) {
      return;
    }

    const pending = state.pendingStairChoice;
    hideStairChoice();

    if (action === "change-floor") {
      const changedFloor = moveToFloor(pending.direction);
      if (changedFloor) {
        endTurn({ skipEnemyMove: true });
        return;
      }

      addMessage("Die Treppe führt hier gerade nirgendwohin.");
      renderSelf();
      return;
    }

    addMessage(
      pending.direction > 0
        ? "Du bleibst auf der Treppe stehen, ohne hinabzusteigen."
        : "Du bleibst auf der Treppe stehen, ohne hinaufzusteigen.",
    );
    renderSelf();
  }

  function restartRun() {
    hideChoiceModal();
    hideStairChoice();
    closeTransientModals();
    hideDeathModal();
    returnToStartScreen({ openStartModal: true, clearSavedGame: true });
  }

  function confirmRestartRun() {
    restartRun();
  }

  function leaveToStartScreen() {
    hideChoiceModal();
    hideStairChoice();
    closeTransientModals();
    hideDeathModal();
    returnToStartScreen({ openStartModal: false, clearSavedGame: false });
  }

  function openRunStatsFromDeath() {
    hideDeathModal();
    toggleRunStats(true);
  }

  return {
    showDeathModal,
    hideDeathModal,
    restartRun,
    confirmRestartRun,
    leaveToStartScreen,
    openRunStatsFromDeath,
    showChoiceModal,
    hideChoiceModal,
    showStairChoice,
    hideStairChoice,
    updatePotionChoiceSelection,
    cyclePotionChoice,
    cycleStairChoice,
    resolveChoiceBySlot,
    resolveStairChoice,
    toggleInventory,
    toggleRunStats,
    toggleOptions,
    toggleHelp,
    toggleHighscores,
  };
}
