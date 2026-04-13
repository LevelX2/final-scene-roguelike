export function createUiBindingsApi(context) {
  const {
    choiceDrinkButton,
    choiceStoreButton,
    choiceLeaveButton,
    stairsConfirmButton,
    stairsStayButton,
    openInventoryButton,
    closeInventoryButton,
    openRunStatsButton,
    closeRunStatsButton,
    openOptionsButton,
    closeOptionsButton,
    openHighscoresButton,
    closeHighscoresButton,
    openHelpButton,
    closeHelpButton,
    restartFromDeathButton,
    openDeathKillsButton,
    closeDeathKillsButton,
    closeDeathButton,
    startFreshRunButton,
    inventoryFilterButtons,
    collapsibleCards,
    saveGameButtonElement,
    loadGameButtonElement,
    toggleStepSoundElement,
    toggleDeathSoundElement,
    startFormElement,
    loadGameFromStartButtonElement,
    bindTooltip,
    topbarHpCardElement,
    topbarLevelCardElement,
    topbarDamageCardElement,
    topbarHitCardElement,
    topbarCritCardElement,
    topbarBlockCardElement,
    getTopbarTooltipContent,
    resolveChoiceBySlot,
    resolveStairChoice,
    toggleInventory,
    toggleRunStats,
    toggleOptions,
    toggleHelp,
    toggleHighscores,
    restartRun,
    openRunStatsFromDeath,
    toggleDeathKills,
    toggleCardCollapse,
    setInventoryFilter,
    saveCurrentGame,
    loadCurrentGame,
    getState,
    saveOptions,
    applyStartProfile,
    bindKeyboardInput,
  } = context;

  function bindChoiceControls() {
    choiceDrinkButton.addEventListener("click", () => resolveChoiceBySlot(0));
    choiceStoreButton.addEventListener("click", () => resolveChoiceBySlot(1));
    choiceLeaveButton.addEventListener("click", () => resolveChoiceBySlot(2));
    stairsConfirmButton.addEventListener("click", () => resolveStairChoice("change-floor"));
    stairsStayButton.addEventListener("click", () => resolveStairChoice("stay"));
  }

  function bindModalControls() {
    openInventoryButton.addEventListener("click", () => toggleInventory(true));
    closeInventoryButton.addEventListener("click", () => toggleInventory(false));
    openRunStatsButton.addEventListener("click", () => toggleRunStats(true));
    closeRunStatsButton.addEventListener("click", () => toggleRunStats(false));
    openOptionsButton.addEventListener("click", () => toggleOptions(true));
    closeOptionsButton.addEventListener("click", () => toggleOptions(false));
    openHighscoresButton.addEventListener("click", () => toggleHighscores(true));
    closeHighscoresButton.addEventListener("click", () => toggleHighscores(false));
    openHelpButton.addEventListener("click", () => toggleHelp(true));
    closeHelpButton.addEventListener("click", () => toggleHelp(false));
    restartFromDeathButton.addEventListener("click", () => restartRun());
    openDeathKillsButton.addEventListener("click", () => openRunStatsFromDeath());
    closeDeathKillsButton.addEventListener("click", () => toggleDeathKills(false));
    closeDeathButton.addEventListener("click", () => context.hideDeathModal());
  }

  function bindInventoryControls() {
    startFreshRunButton.addEventListener("click", () => restartRun());
    inventoryFilterButtons.forEach((button) => {
      button.addEventListener("click", () => setInventoryFilter(button.dataset.filter ?? "all"));
    });
  }

  function bindCollapsibleCardControls() {
    collapsibleCards.forEach((card) => {
      const button = card.querySelector(".collapse-btn");
      button?.addEventListener("click", () => toggleCardCollapse(button.dataset.target));
    });
  }

  function bindTopbarTooltips() {
    bindTooltip(topbarHpCardElement, () => getTopbarTooltipContent().hp);
    bindTooltip(topbarLevelCardElement, () => getTopbarTooltipContent().level);
    bindTooltip(topbarDamageCardElement, () => getTopbarTooltipContent().damage);
    bindTooltip(topbarHitCardElement, () => getTopbarTooltipContent().hit);
    bindTooltip(topbarCritCardElement, () => getTopbarTooltipContent().crit);
    bindTooltip(topbarBlockCardElement, () => getTopbarTooltipContent().block);
  }

  function bindOptionControls() {
    saveGameButtonElement.addEventListener("click", () => saveCurrentGame());
    loadGameButtonElement.addEventListener("click", () => loadCurrentGame());
    toggleStepSoundElement.addEventListener("change", () => {
      getState().options.stepSound = toggleStepSoundElement.checked;
      saveOptions();
    });
    toggleDeathSoundElement.addEventListener("change", () => {
      getState().options.deathSound = toggleDeathSoundElement.checked;
      saveOptions();
    });
  }

  function bindStartControls() {
    startFormElement.addEventListener("submit", (event) => {
      event.preventDefault();
      applyStartProfile();
    });
    loadGameFromStartButtonElement.addEventListener("click", () => loadCurrentGame());
  }

  function bindAppControls(documentTarget = document) {
    bindChoiceControls();
    bindModalControls();
    bindInventoryControls();
    bindCollapsibleCardControls();
    bindTopbarTooltips();
    bindOptionControls();
    bindStartControls();
    bindKeyboardInput(documentTarget);
  }

  return {
    bindChoiceControls,
    bindModalControls,
    bindInventoryControls,
    bindCollapsibleCardControls,
    bindTopbarTooltips,
    bindOptionControls,
    bindStartControls,
    bindAppControls,
  };
}
