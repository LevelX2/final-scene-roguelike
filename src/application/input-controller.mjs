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
    toggleSavegames,
    toggleHelp,
    toggleHighscores,
    closeStartModal,
    movePlayer,
    handleWait,
    debugRevealOrAdvanceStudio,
    tryCloseAdjacentDoor,
    quickUsePotion,
    enterTargetMode,
    cancelTargetMode,
    moveTargetCursor,
    confirmTargetAttack,
  } = context;

  function handleInput(event) {
    if (event.__rogueHandled) {
      return;
    }
    event.__rogueHandled = true;

    const state = getState();
    const key = typeof event.key === "string" ? event.key.toLowerCase() : "";
    const code = typeof event.code === "string" ? event.code : "";
    const matchesShortcut = (keys = [], codes = []) => keys.includes(key) || codes.includes(code);

    if (matchesShortcut(["r"], ["KeyR"]) && state.view === "game" && state.gameOver) {
      confirmRestartRun();
      return;
    }

    if (matchesShortcut(["r"], ["KeyR"]) && state.view === "game" && event.shiftKey) {
      event.preventDefault();
      confirmRestartRun();
      return;
    }

    if (state.modals.startOpen) {
      if (matchesShortcut(["escape"], ["Escape"])) {
        event.preventDefault();
        closeStartModal();
      }
      return;
    }

    if (state.view !== "game") {
      if (matchesShortcut(["escape"], ["Escape"]) && (state.modals.helpOpen || state.modals.highscoresOpen)) {
        toggleHelp(false);
        toggleHighscores(false);
      }
      return;
    }

    if (state.pendingStairChoice) {
      if (matchesShortcut(["enter"], ["Enter"])) {
        event.preventDefault();
        resolveStairChoice(state.pendingStairChoice.selectedAction);
        return;
      }

      if (matchesShortcut(["escape"], ["Escape"])) {
        event.preventDefault();
        resolveStairChoice("stay");
        return;
      }

      if (matchesShortcut(["arrowleft", "a"], ["ArrowLeft", "KeyA"])) {
        event.preventDefault();
        cycleStairChoice(-1);
        return;
      }

      if (matchesShortcut(["arrowright", "d"], ["ArrowRight", "KeyD"])) {
        event.preventDefault();
        cycleStairChoice(1);
        return;
      }

      if (matchesShortcut(["w", "arrowup", "s", "arrowdown"], ["KeyW", "ArrowUp", "KeyS", "ArrowDown"])) {
        event.preventDefault();
        cycleStairChoice(1);
        return;
      }

      return;
    }

    if (state.pendingChoice) {
      if (matchesShortcut(["enter"], ["Enter"])) {
        event.preventDefault();
        resolvePotionChoice(state.pendingChoice.selectedAction);
        return;
      }

      if (matchesShortcut(["arrowleft", "a"], ["ArrowLeft", "KeyA"])) {
        event.preventDefault();
        cyclePotionChoice(-1);
        return;
      }

      if (matchesShortcut(["arrowright", "d"], ["ArrowRight", "KeyD"])) {
        event.preventDefault();
        cyclePotionChoice(1);
        return;
      }

      return;
    }

    if (state.targeting?.active) {
      if (matchesShortcut(["enter"], ["Enter"])) {
        event.preventDefault();
        confirmTargetAttack();
        return;
      }

      if (matchesShortcut(["escape", "t", "q"], ["Escape", "KeyT", "KeyQ"])) {
        event.preventDefault();
        cancelTargetMode();
        return;
      }

      const targetingMovement = matchesShortcut(["arrowup", "w"], ["ArrowUp", "KeyW"])
        ? [0, -1]
        : matchesShortcut(["arrowdown", "s"], ["ArrowDown", "KeyS"])
          ? [0, 1]
          : matchesShortcut(["arrowleft", "a"], ["ArrowLeft", "KeyA"])
            ? [-1, 0]
            : matchesShortcut(["arrowright", "d"], ["ArrowRight", "KeyD"])
              ? [1, 0]
              : null;

      if (targetingMovement) {
        event.preventDefault();
        moveTargetCursor(...targetingMovement);
      }
      return;
    }

    if (matchesShortcut(["i"], ["KeyI"])) {
      event.preventDefault();
      toggleInventory();
      return;
    }

    if (matchesShortcut([], ["F8"])) {
      event.preventDefault();
      debugRevealOrAdvanceStudio?.();
      return;
    }

    if (matchesShortcut(["l"], ["KeyL"])) {
      event.preventDefault();
      toggleRunStats();
      return;
    }

    if (matchesShortcut(["o"], ["KeyO"])) {
      event.preventDefault();
      toggleOptions();
      return;
    }

    if (matchesShortcut(["k"], ["KeyK"])) {
      event.preventDefault();
      toggleSavegames();
      return;
    }

    if (matchesShortcut(["?"], ["Slash"])) {
      event.preventDefault();
      toggleHelp();
      return;
    }

    if (state.modals.inventoryOpen || state.modals.runStatsOpen || state.modals.optionsOpen || state.modals.savegamesOpen || state.modals.helpOpen || state.modals.highscoresOpen) {
      if (matchesShortcut(["escape"], ["Escape"])) {
        toggleInventory(false);
        toggleRunStats(false);
        toggleOptions(false);
        toggleSavegames(false);
        toggleHelp(false);
        toggleHighscores(false);
      }
      return;
    }

    const movement = matchesShortcut(["arrowup", "w"], ["ArrowUp", "KeyW"])
      ? [0, -1]
      : matchesShortcut(["arrowdown", "s"], ["ArrowDown", "KeyS"])
        ? [0, 1]
        : matchesShortcut(["arrowleft", "a"], ["ArrowLeft", "KeyA"])
          ? [-1, 0]
          : matchesShortcut(["arrowright", "d"], ["ArrowRight", "KeyD"])
            ? [1, 0]
            : null;

    if (movement) {
      event.preventDefault();
      movePlayer(...movement);
      return;
    }

    if (matchesShortcut([" "], ["Space"])) {
      event.preventDefault();
      handleWait();
      return;
    }

    if (matchesShortcut(["c"], ["KeyC"])) {
      event.preventDefault();
      tryCloseAdjacentDoor();
      return;
    }

    if (matchesShortcut(["f", "t"], ["KeyF", "KeyT"])) {
      event.preventDefault();
      enterTargetMode();
      return;
    }

    if (matchesShortcut(["h"], ["KeyH"])) {
      event.preventDefault();
      quickUsePotion();
    }
  }

  function bindKeyboardInput(target = window) {
    target.addEventListener("keydown", handleInput, { capture: true });
    if (target === window && typeof document !== "undefined") {
      document.addEventListener("keydown", handleInput, { capture: true });
    }
  }

  return {
    handleInput,
    bindKeyboardInput,
  };
}
