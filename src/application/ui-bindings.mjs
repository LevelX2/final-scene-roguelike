export function createUiBindingsApi(context) {
  const {
    choiceDrinkButton,
    choiceStoreButton,
    choiceLeaveButton,
    stairsConfirmButton,
    stairsStayButton,
    openInventoryButton,
    openTargetModeButton,
    confirmTargetModeButton,
    closeInventoryButton,
    openRunStatsButton,
    closeRunStatsButton,
    saveGameQuickButtonElement,
    openOptionsButton,
    closeOptionsButton,
    openHighscoresButton,
    closeHighscoresButton,
    openHelpButton,
    closeHelpButton,
    openDeathKillsButton,
    closeDeathButton,
    startNewGameButton,
    loadGameFromLandingButtonElement,
    openHighscoresLandingButton,
    openHelpLandingButton,
    startFreshRunButton,
    inventoryFilterButtons,
    collapsibleCards,
    saveGameButtonElement,
    loadGameButtonElement,
    toggleStepSoundElement,
    toggleDeathSoundElement,
    toggleVoiceAnnouncementsElement,
    showcaseAnnouncementModeElement,
    startFormElement,
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
    leaveToStartScreen,
    openRunStatsFromDeath,
    toggleCardCollapse,
    setInventoryFilter,
    saveCurrentGame,
    loadCurrentGame,
    getState,
    saveOptions,
    openStartModal,
    applyStartProfile,
    enterTargetMode,
    cancelTargetMode,
    confirmTargetAttack,
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
    openTargetModeButton.addEventListener("click", () => {
      if (getState().targeting?.active) {
        cancelTargetMode();
        return;
      }
      enterTargetMode();
    });
    confirmTargetModeButton.addEventListener("click", () => confirmTargetAttack());
    closeInventoryButton.addEventListener("click", () => toggleInventory(false));
    openRunStatsButton.addEventListener("click", () => toggleRunStats(true));
    closeRunStatsButton.addEventListener("click", () => toggleRunStats(false));
    saveGameQuickButtonElement.addEventListener("click", () => saveCurrentGame());
    openOptionsButton.addEventListener("click", () => toggleOptions(true));
    closeOptionsButton.addEventListener("click", () => toggleOptions(false));
    openHighscoresButton.addEventListener("click", () => toggleHighscores(true));
    closeHighscoresButton.addEventListener("click", () => toggleHighscores(false));
    openHelpButton.addEventListener("click", () => toggleHelp(true));
    closeHelpButton.addEventListener("click", () => toggleHelp(false));
    openDeathKillsButton.addEventListener("click", () => openRunStatsFromDeath());
    closeDeathButton.addEventListener("click", () => leaveToStartScreen());
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
    toggleVoiceAnnouncementsElement.addEventListener("change", () => {
      getState().options.voiceAnnouncements = toggleVoiceAnnouncementsElement.checked;
      saveOptions();
    });
    showcaseAnnouncementModeElement.addEventListener("change", () => {
      getState().options.showcaseAnnouncementMode = showcaseAnnouncementModeElement.value;
      saveOptions();
    });
  }

  function bindStartControls() {
    startNewGameButton.addEventListener("click", () => openStartModal());
    loadGameFromLandingButtonElement.addEventListener("click", () => loadCurrentGame());
    openHighscoresLandingButton.addEventListener("click", () => toggleHighscores(true));
    openHelpLandingButton.addEventListener("click", () => toggleHelp(true));
    startFormElement.addEventListener("submit", (event) => {
      event.preventDefault();
      applyStartProfile();
    });
  }

  function bindAppControls(documentTarget = window) {
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
