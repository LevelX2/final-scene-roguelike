export function createInputController(context) {
  const {
    getState,
    addMessage,
    confirmRestartRun,
    resolveStairChoice,
    cycleStairChoice,
    resolvePotionChoice,
    cyclePotionChoice,
    toggleInventory,
    toggleStudioTopology,
    toggleRunStats,
    toggleOptions,
    toggleSavegames,
    toggleHelp,
    toggleHighscores,
    toggleDebugInfo,
    triggerDebugAdvance,
    closeStartModal,
    movePlayer,
    handleWait,
    debugRevealOrAdvanceStudio,
    debugReturnToPreviousStudio,
    tryCloseAdjacentDoor,
    quickUsePotion,
    closeContainerLoot,
    takeSelectedContainerLoot,
    takeAllContainerLoot,
    cycleHealingOverlay,
    closeHealingOverlay,
    useSelectedHealingConsumable,
    cycleTargetMode,
    cancelTargetMode,
    moveTargetCursor,
    confirmTargetAttack,
  } = context;

  let lastHealingOverlayHintAt = 0;

  function getMovementFromShortcut(matchesShortcut) {
    return matchesShortcut(["q"], ["KeyQ", "Numpad7"])
      ? [-1, -1]
      : matchesShortcut(["w", "arrowup"], ["KeyW", "ArrowUp", "Numpad8"])
        ? [0, -1]
        : matchesShortcut(["e"], ["KeyE", "Numpad9"])
          ? [1, -1]
          : matchesShortcut(["a", "arrowleft"], ["KeyA", "ArrowLeft", "Numpad4"])
            ? [-1, 0]
            : matchesShortcut(["d", "arrowright"], ["KeyD", "ArrowRight", "Numpad6"])
              ? [1, 0]
              : matchesShortcut(["y", "z", "numpad1"], ["KeyY", "KeyZ", "Numpad1"])
                ? [-1, 1]
                : matchesShortcut(["x", "s", "arrowdown"], ["KeyX", "KeyS", "ArrowDown", "Numpad2"])
                  ? [0, 1]
                  : matchesShortcut(["c"], ["KeyC", "Numpad3"])
                    ? [1, 1]
                    : null;
  }

  function handleInput(event) {
    if (event.__rogueHandled) {
      return;
    }
    event.__rogueHandled = true;

    const state = getState();
    const key = typeof event.key === "string" ? event.key.toLowerCase() : "";
    const code = typeof event.code === "string" ? event.code : "";
    const matchesShortcut = (keys = [], codes = []) => keys.includes(key) || codes.includes(code);
    const debugRevealActive = Boolean(state.floors?.[state.floor]?.debugReveal);

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

    if (state.pendingContainerLoot) {
      if (matchesShortcut(["enter"], ["Enter"])) {
        event.preventDefault();
        if (Array.isArray(state.pendingContainerLoot.selectedItemIndices) && state.pendingContainerLoot.selectedItemIndices.length > 0) {
          takeSelectedContainerLoot();
        } else {
          takeAllContainerLoot();
        }
        return;
      }

      if (matchesShortcut(["escape"], ["Escape"])) {
        event.preventDefault();
        closeContainerLoot();
        return;
      }

      return;
    }

    if (state.healOverlay?.open) {
      if (matchesShortcut(["enter"], ["Enter"])) {
        event.preventDefault();
        useSelectedHealingConsumable();
        return;
      }

      if (matchesShortcut(["escape", "h"], ["Escape", "KeyH"])) {
        event.preventDefault();
        closeHealingOverlay();
        return;
      }

      if (matchesShortcut(["arrowleft", "a", "4"], ["ArrowLeft", "KeyA", "Digit4", "Numpad4"])) {
        event.preventDefault();
        cycleHealingOverlay(-1);
        return;
      }

      if (matchesShortcut(["arrowright", "d", "6"], ["ArrowRight", "KeyD", "Digit6", "Numpad6"])) {
        event.preventDefault();
        cycleHealingOverlay(1);
        return;
      }

      const ignoredKeys = new Set([
        "",
        "shift",
        "control",
        "alt",
        "meta",
        "capslock",
        "tab",
        "dead",
        "altgraph",
      ]);
      if (!(event.ctrlKey || event.altKey || event.metaKey) && !ignoredKeys.has(key)) {
        event.preventDefault();
        const now = Date.now();
        if (now - lastHealingOverlayHintAt >= 700) {
          lastHealingOverlayHintAt = now;
          addMessage?.("Heilauswahl aktiv: Wähle zuerst ein Heilmittel mit A/D, 4/6 oder den Pfeiltasten, dann nutze Enter.", "important");
        }
      }

      return;
    }

    if (state.targeting?.active) {
      if (matchesShortcut(["enter", "f"], ["Enter", "KeyF"])) {
        event.preventDefault();
        confirmTargetAttack();
        return;
      }

      if (matchesShortcut(["t"], ["KeyT"])) {
        event.preventDefault();
        cycleTargetMode();
        return;
      }

      if (matchesShortcut(["escape", "q"], ["Escape", "KeyQ"])) {
        event.preventDefault();
        cancelTargetMode();
        return;
      }

      const targetingMovement = getMovementFromShortcut(matchesShortcut);

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

    if (debugRevealActive && matchesShortcut([], ["F7"])) {
      event.preventDefault();
      debugReturnToPreviousStudio?.();
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

    if (debugRevealActive && !(event.ctrlKey || event.altKey || event.metaKey) && matchesShortcut(["n"], ["KeyN"])) {
      event.preventDefault();
      triggerDebugAdvance?.();
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

    if (state.modals.inventoryOpen || state.modals.studioTopologyOpen || state.modals.runStatsOpen || state.modals.optionsOpen || state.modals.savegamesOpen || state.modals.helpOpen || state.modals.highscoresOpen || state.modals.debugInfoOpen) {
      if (matchesShortcut(["escape"], ["Escape"])) {
        toggleInventory(false);
        toggleStudioTopology(false);
        toggleRunStats(false);
        toggleOptions(false);
        toggleSavegames(false);
        toggleHelp(false);
        toggleHighscores(false);
        toggleDebugInfo(false);
      }
      return;
    }

    const movement = getMovementFromShortcut(matchesShortcut);

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

    if (matchesShortcut(["v"], ["KeyV"])) {
      event.preventDefault();
      tryCloseAdjacentDoor();
      return;
    }

    if (matchesShortcut(["t"], ["KeyT"])) {
      event.preventDefault();
      cycleTargetMode();
      return;
    }

    if (matchesShortcut(["f"], ["KeyF"])) {
      event.preventDefault();
      cycleTargetMode();
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
