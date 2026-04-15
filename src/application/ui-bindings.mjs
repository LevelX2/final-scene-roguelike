export function createUiBindingsApi(context) {
  const {
    choiceDrinkButton,
    choiceStoreButton,
    choiceLeaveButton,
    stairsConfirmButton,
    stairsStayButton,
    openInventoryButton,
    openStudioTopologyButton,
    openTargetModeButton,
    confirmTargetModeButton,
    zoomOutBoardButtonElement,
    zoomResetBoardButtonElement,
    zoomInBoardButtonElement,
    closeInventoryButton,
    openRunStatsButton,
    closeRunStatsButton,
    closeStudioTopologyButton,
    saveGameQuickButtonElement,
    loadGameQuickButtonElement,
    openOptionsButton,
    closeOptionsButton,
    closeSavegamesButtonElement,
    openHighscoresButton,
    closeHighscoresButton,
    openHelpButton,
    closeHelpButton,
    helpOverviewTabButtonElement,
    helpControlsTabButtonElement,
    showControlsHelpButtonElement,
    showOverviewHelpButtonElement,
    openDeathKillsButton,
    closeDeathButton,
    startNewGameButton,
    loadGameFromLandingButtonElement,
    openHighscoresLandingButton,
    openHelpLandingButton,
    startFreshRunButton,
    inventoryFilterButtons,
    collapsibleCards,
    cancelStartModalButtonElement,
    uiScaleRangeElement,
    studioZoomRangeElement,
    tooltipScaleRangeElement,
    toggleStepSoundElement,
    toggleDeathSoundElement,
    toggleVoiceAnnouncementsElement,
    showcaseAnnouncementModeElement,
    enemyPanelModeElement,
    toggleEnemyPanelModeButtonElement,
    viewDeathStudioButton,
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
    toggleStudioTopology,
    toggleRunStats,
    toggleOptions,
    toggleSavegames,
    toggleHelp,
    toggleHighscores,
    restartRun,
    leaveToStartScreen,
    openRunStatsFromDeath,
    hideDeathModal,
    toggleCardCollapse,
    setInventoryFilter,
    setUiScale,
    setStudioZoom,
    adjustStudioZoom,
    resetStudioZoom,
    setTooltipScale,
    setEnemyPanelMode,
    toggleEnemyPanelMode,
    saveCurrentGame,
    getState,
    saveOptions,
    openStartModal,
    closeStartModal,
    applyStartProfile,
    cycleTargetMode,
    enterTargetMode,
    cancelTargetMode,
    confirmTargetAttack,
    bindKeyboardInput,
    helpOverviewPanelElement,
    helpControlsPanelElement,
  } = context;

  function showHelpSection(section = "overview") {
    const showOverview = section !== "controls";
    helpOverviewPanelElement?.classList.toggle("ui-hidden", !showOverview);
    helpControlsPanelElement?.classList.toggle("ui-hidden", showOverview);
    helpOverviewPanelElement?.setAttribute("aria-hidden", String(!showOverview));
    helpControlsPanelElement?.setAttribute("aria-hidden", String(showOverview));
    helpOverviewTabButtonElement?.classList.toggle("active", showOverview);
    helpControlsTabButtonElement?.classList.toggle("active", !showOverview);
    helpOverviewTabButtonElement?.setAttribute("aria-selected", String(showOverview));
    helpControlsTabButtonElement?.setAttribute("aria-selected", String(!showOverview));
  }

  function bindChoiceControls() {
    choiceDrinkButton.addEventListener("click", () => resolveChoiceBySlot(0));
    choiceStoreButton.addEventListener("click", () => resolveChoiceBySlot(1));
    choiceLeaveButton.addEventListener("click", () => resolveChoiceBySlot(2));
    stairsConfirmButton.addEventListener("click", () => resolveStairChoice("change-floor"));
    stairsStayButton.addEventListener("click", () => resolveStairChoice("stay"));
  }

  function bindModalControls() {
    const openSavegames = () => toggleSavegames(true);
    openInventoryButton.addEventListener("click", () => toggleInventory(true));
    openStudioTopologyButton.addEventListener("click", () => toggleStudioTopology(true));
    openTargetModeButton.addEventListener("click", () => cycleTargetMode());
    confirmTargetModeButton.addEventListener("click", () => confirmTargetAttack());
    closeInventoryButton.addEventListener("click", () => toggleInventory(false));
    openRunStatsButton.addEventListener("click", () => toggleRunStats(true));
    closeRunStatsButton.addEventListener("click", () => toggleRunStats(false));
    closeStudioTopologyButton.addEventListener("click", () => toggleStudioTopology(false));
    saveGameQuickButtonElement.addEventListener("click", () => saveCurrentGame());
    loadGameQuickButtonElement.addEventListener("click", openSavegames);
    openOptionsButton.addEventListener("click", () => toggleOptions(true));
    closeOptionsButton.addEventListener("click", () => toggleOptions(false));
    closeSavegamesButtonElement.addEventListener("click", () => toggleSavegames(false));
    openHighscoresButton.addEventListener("click", () => toggleHighscores(true));
    closeHighscoresButton.addEventListener("click", () => toggleHighscores(false));
    openHelpButton.addEventListener("click", () => {
      showHelpSection("overview");
      toggleHelp(true);
    });
    closeHelpButton.addEventListener("click", () => toggleHelp(false));
    helpOverviewTabButtonElement?.addEventListener("click", () => showHelpSection("overview"));
    helpControlsTabButtonElement?.addEventListener("click", () => showHelpSection("controls"));
    showControlsHelpButtonElement?.addEventListener("click", () => showHelpSection("controls"));
    showOverviewHelpButtonElement?.addEventListener("click", () => showHelpSection("overview"));
    viewDeathStudioButton.addEventListener("click", () => hideDeathModal());
    openDeathKillsButton.addEventListener("click", () => openRunStatsFromDeath());
    closeDeathButton.addEventListener("click", () => leaveToStartScreen());
    zoomOutBoardButtonElement.addEventListener("click", () => {
      adjustStudioZoom(-10);
      saveOptions();
    });
    zoomResetBoardButtonElement.addEventListener("click", () => {
      resetStudioZoom();
      saveOptions();
    });
    zoomInBoardButtonElement.addEventListener("click", () => {
      adjustStudioZoom(10);
      saveOptions();
    });
    toggleEnemyPanelModeButtonElement.addEventListener("click", () => {
      toggleEnemyPanelMode();
      saveOptions();
    });
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
    uiScaleRangeElement.addEventListener("input", () => {
      setUiScale(uiScaleRangeElement.value);
      saveOptions();
    });
    studioZoomRangeElement.addEventListener("input", () => {
      setStudioZoom(studioZoomRangeElement.value);
      saveOptions();
    });
    tooltipScaleRangeElement.addEventListener("input", () => {
      setTooltipScale(tooltipScaleRangeElement.value);
      saveOptions();
    });
    enemyPanelModeElement.addEventListener("change", () => {
      setEnemyPanelMode(enemyPanelModeElement.value);
      saveOptions();
    });
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
    loadGameFromLandingButtonElement.addEventListener("click", () => toggleSavegames(true));
    openHighscoresLandingButton.addEventListener("click", () => toggleHighscores(true));
    openHelpLandingButton.addEventListener("click", () => {
      showHelpSection("overview");
      toggleHelp(true);
    });
    cancelStartModalButtonElement.addEventListener("click", () => closeStartModal());
    startFormElement.addEventListener("submit", (event) => {
      event.preventDefault();
      applyStartProfile();
    });
  }

  function bindAppControls(documentTarget = window) {
    showHelpSection("overview");
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
    showHelpSection,
  };
}
