export function createInputController(context) {
  const {
    getState,
    confirmRestartRun,
    resolveStairChoice,
    cycleStairChoice,
    resolvePotionChoice,
    cyclePotionChoice,
    toggleInventory,
    toggleRunStats,
    toggleOptions,
    toggleHelp,
    toggleHighscores,
    toggleDeathKills,
    movePlayer,
    handleWait,
    tryCloseAdjacentDoor,
    quickUsePotion,
  } = context;

  function handleInput(event) {
    const state = getState();
    const key = event.key.toLowerCase();

    if (key === "r") {
      confirmRestartRun();
      return;
    }

    if (state.modals.startOpen) {
      return;
    }

    if (state.pendingStairChoice) {
      if (key === "enter") {
        event.preventDefault();
        resolveStairChoice(state.pendingStairChoice.selectedAction);
        return;
      }

      if (key === "escape") {
        event.preventDefault();
        resolveStairChoice("stay");
        return;
      }

      if (key === "arrowleft" || key === "a") {
        event.preventDefault();
        cycleStairChoice(-1);
        return;
      }

      if (key === "arrowright" || key === "d") {
        event.preventDefault();
        cycleStairChoice(1);
        return;
      }

      if (key === "w" || key === "arrowup" || key === "s" || key === "arrowdown") {
        event.preventDefault();
        cycleStairChoice(1);
        return;
      }

      return;
    }

    if (state.pendingChoice) {
      if (key === "enter") {
        event.preventDefault();
        resolvePotionChoice(state.pendingChoice.selectedAction);
        return;
      }

      if (key === "arrowleft" || key === "a") {
        event.preventDefault();
        cyclePotionChoice(-1);
        return;
      }

      if (key === "arrowright" || key === "d") {
        event.preventDefault();
        cyclePotionChoice(1);
        return;
      }

      return;
    }

    if (key === "i") {
      event.preventDefault();
      toggleInventory();
      return;
    }

    if (key === "l") {
      event.preventDefault();
      toggleRunStats();
      return;
    }

    if (key === "o") {
      event.preventDefault();
      toggleOptions();
      return;
    }

    if (key === "?") {
      event.preventDefault();
      toggleHelp();
      return;
    }

    if (state.modals.inventoryOpen || state.modals.runStatsOpen || state.modals.optionsOpen || state.modals.helpOpen || state.modals.highscoresOpen || state.modals.deathKillsOpen) {
      if (key === "escape") {
        toggleInventory(false);
        toggleRunStats(false);
        toggleOptions(false);
        toggleHelp(false);
        toggleHighscores(false);
        toggleDeathKills(false);
      }
      return;
    }

    const movement = {
      arrowup: [0, -1],
      w: [0, -1],
      arrowdown: [0, 1],
      s: [0, 1],
      arrowleft: [-1, 0],
      a: [-1, 0],
      arrowright: [1, 0],
      d: [1, 0],
    }[key];

    if (movement) {
      event.preventDefault();
      movePlayer(...movement);
      return;
    }

    if (key === " ") {
      event.preventDefault();
      handleWait();
      return;
    }

    if (key === "c") {
      event.preventDefault();
      tryCloseAdjacentDoor();
      return;
    }

    if (key === "h") {
      event.preventDefault();
      quickUsePotion();
    }
  }

  function bindKeyboardInput(target = document) {
    target.addEventListener("keydown", handleInput);
  }

  return {
    handleInput,
    bindKeyboardInput,
  };
}
