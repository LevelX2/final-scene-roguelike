export function createRenderCycleApi(context) {
  const {
    getState,
    syncTestApi,
    getPlayerCombatSummary,
    getCurrentStudioArchetypeId,
    updateVisibility,
    renderBoard,
    formatStudioWithArchetype,
    depthTitleElement,
    playerPanelTitleElement,
    getHeroClassAssets,
    topbarHpElement,
    topbarLevelElement,
    topbarDamageElement,
    topbarHitElement,
    topbarCritElement,
    topbarBlockElement,
    topbarFoodElement,
    xpLabelElement,
    xpFillElement,
    nutritionLabelElement,
    nutritionFillElement,
    nutritionStateElement,
    topbarFoodCardElement,
    getHungerStateLabel,
    HUNGER_STATE,
    renderPlayerSheet,
    renderEnemySheet,
    renderInventory,
    renderHighscores,
    renderRunStats,
    renderLog,
    startFreshRunButton,
    inventoryModalElement,
    runStatsModalElement,
    optionsModalElement,
    helpModalElement,
    highscoresModalElement,
    startModalElement,
    gameShellElement,
    stairsModalElement,
    deathKillsModalElement,
    deathModalElement,
    toggleStepSoundElement,
    toggleDeathSoundElement,
    updateSavegameControls,
    collapsibleCards,
    updatePotionChoiceSelection,
  } = context;

  function render() {
    const state = getState();
    syncTestApi();
    const combatSummary = getPlayerCombatSummary();
    const hungerClass = `state-${String(state.player.hungerState ?? HUNGER_STATE.NORMAL).toLowerCase()}`;
    const currentStudioArchetypeId = getCurrentStudioArchetypeId();
    updateVisibility();
    renderBoard();
    depthTitleElement.textContent = formatStudioWithArchetype(state.floor, currentStudioArchetypeId);
    playerPanelTitleElement.textContent = state.player.name;
    playerPanelTitleElement.style.setProperty("--hero-class-icon", `url("${getHeroClassAssets(state.player.classId).iconUrl}")`);
    topbarHpElement.textContent = combatSummary.hp;
    topbarLevelElement.textContent = combatSummary.level;
    topbarDamageElement.textContent = combatSummary.damage;
    topbarHitElement.textContent = combatSummary.hit;
    topbarCritElement.textContent = combatSummary.crit;
    topbarBlockElement.textContent = combatSummary.block;
    topbarFoodElement.textContent = getHungerStateLabel(state.player.hungerState);
    xpLabelElement.textContent = `${state.player.xp} / ${state.player.xpToNext} XP`;
    xpFillElement.style.width = `${Math.max(0, Math.min(100, (state.player.xp / state.player.xpToNext) * 100))}%`;
    nutritionLabelElement.textContent = `${state.player.nutrition} / ${state.player.nutritionMax}`;
    nutritionFillElement.style.width = `${Math.max(0, Math.min(100, (state.player.nutrition / state.player.nutritionMax) * 100))}%`;
    nutritionStateElement.textContent = getHungerStateLabel(state.player.hungerState);
    nutritionStateElement.className = `nutrition-state ${hungerClass}`;
    topbarFoodCardElement.className = `board-stat-pill ${hungerClass}`;
    renderPlayerSheet();
    renderEnemySheet();
    renderInventory();
    renderHighscores();
    renderRunStats();
    renderLog();
    startFreshRunButton.classList.toggle("ui-hidden", !state.gameOver);
    inventoryModalElement.classList.toggle("hidden", !state.modals.inventoryOpen);
    inventoryModalElement.setAttribute("aria-hidden", String(!state.modals.inventoryOpen));
    runStatsModalElement.classList.toggle("hidden", !state.modals.runStatsOpen);
    runStatsModalElement.setAttribute("aria-hidden", String(!state.modals.runStatsOpen));
    optionsModalElement.classList.toggle("hidden", !state.modals.optionsOpen);
    optionsModalElement.setAttribute("aria-hidden", String(!state.modals.optionsOpen));
    helpModalElement.classList.toggle("hidden", !state.modals.helpOpen);
    helpModalElement.setAttribute("aria-hidden", String(!state.modals.helpOpen));
    highscoresModalElement.classList.toggle("hidden", !state.modals.highscoresOpen);
    highscoresModalElement.setAttribute("aria-hidden", String(!state.modals.highscoresOpen));
    startModalElement.classList.toggle("hidden", !state.modals.startOpen);
    startModalElement.setAttribute("aria-hidden", String(!state.modals.startOpen));
    gameShellElement.classList.toggle("prestart-hidden", state.modals.startOpen);
    stairsModalElement.classList.toggle("hidden", !state.pendingStairChoice);
    stairsModalElement.setAttribute("aria-hidden", String(!state.pendingStairChoice));
    deathKillsModalElement.classList.toggle("hidden", !state.modals.deathKillsOpen);
    deathKillsModalElement.setAttribute("aria-hidden", String(!state.modals.deathKillsOpen));
    deathModalElement.classList.contains("hidden")
      ? deathModalElement.setAttribute("aria-hidden", "true")
      : deathModalElement.setAttribute("aria-hidden", "false");
    toggleStepSoundElement.checked = state.options.stepSound;
    toggleDeathSoundElement.checked = state.options.deathSound;
    updateSavegameControls();
    collapsibleCards.forEach((card) => {
      const key = card.dataset.collapsible;
      if (key === "player") {
        const mode = state.collapsedCards.player ?? "summary";
        card.classList.toggle("collapsed", mode === "hidden");
        card.classList.toggle("player-summary", mode === "summary");
        card.classList.toggle("player-full", mode === "full");
        card.classList.toggle("player-hidden", mode === "hidden");
      } else {
        const collapsed = key === "log"
          ? (state.collapsedCards.log ?? "compact") === "hidden"
          : Boolean(state.collapsedCards[key]);
        card.classList.toggle("collapsed", collapsed);
        if (key === "log") {
          const mode = state.collapsedCards.log ?? "compact";
          card.classList.toggle("log-compact", mode === "compact");
          card.classList.toggle("log-full", mode === "full");
          card.classList.toggle("log-hidden", mode === "hidden");
        }
      }
      const button = card.querySelector(".collapse-btn");
      if (button) {
        if (key === "player") {
          const mode = state.collapsedCards.player ?? "summary";
          button.textContent = mode === "summary"
            ? "Alle Werte"
            : mode === "full"
              ? "Einklappen"
              : "Kompakt";
        } else if (key === "log") {
          const mode = state.collapsedCards.log ?? "compact";
          button.textContent = mode === "compact"
            ? "Mehr"
            : mode === "full"
              ? "Einklappen"
              : "Kompakt";
        } else {
          const collapsed = Boolean(state.collapsedCards[key]);
          button.textContent = collapsed ? "Ausklappen" : "Einklappen";
        }
      }
    });
    updatePotionChoiceSelection();
  }

  return {
    render,
  };
}
