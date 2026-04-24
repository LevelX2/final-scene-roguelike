function createDeferredAction(name) {
  let implementation = null;

  return {
    call(...args) {
      if (typeof implementation !== "function") {
        throw new Error(`${name} wurde vor der Initialisierung aufgerufen.`);
      }
      return implementation(...args);
    },
    set(nextImplementation) {
      implementation = nextImplementation;
    },
  };
}

export function createRuntimeActionsApi() {
  const actions = {
    showFloatingText: createDeferredAction("showFloatingText"),
    showDeathModal: createDeferredAction("showDeathModal"),
    showChoiceModal: createDeferredAction("showChoiceModal"),
    hideChoiceModal: createDeferredAction("hideChoiceModal"),
    moveToFloor: createDeferredAction("moveToFloor"),
    tryUseStairs: createDeferredAction("tryUseStairs"),
    endTurn: createDeferredAction("endTurn"),
    tryCloseAdjacentDoor: createDeferredAction("tryCloseAdjacentDoor"),
    movePlayer: createDeferredAction("movePlayer"),
    handleWait: createDeferredAction("handleWait"),
    debugRevealOrAdvanceStudio: createDeferredAction("debugRevealOrAdvanceStudio"),
    debugReturnToPreviousStudio: createDeferredAction("debugReturnToPreviousStudio"),
    debugAdvanceTimeline: createDeferredAction("debugAdvanceTimeline"),
    cycleTargetMode: createDeferredAction("cycleTargetMode"),
    enterTargetMode: createDeferredAction("enterTargetMode"),
    cancelTargetMode: createDeferredAction("cancelTargetMode"),
    moveTargetCursor: createDeferredAction("moveTargetCursor"),
    selectTargetTile: createDeferredAction("selectTargetTile"),
    confirmTargetAttack: createDeferredAction("confirmTargetAttack"),
    resolvePotionChoice: createDeferredAction("resolvePotionChoice"),
    useInventoryItem: createDeferredAction("useInventoryItem"),
    quickUsePotion: createDeferredAction("quickUsePotion"),
    closeContainerLoot: createDeferredAction("closeContainerLoot"),
    cycleContainerLootAction: createDeferredAction("cycleContainerLootAction"),
    moveContainerLootFocus: createDeferredAction("moveContainerLootFocus"),
    confirmContainerLootFocus: createDeferredAction("confirmContainerLootFocus"),
    takeSelectedContainerLoot: createDeferredAction("takeSelectedContainerLoot"),
    takeAllContainerLoot: createDeferredAction("takeAllContainerLoot"),
    cycleHealingOverlay: createDeferredAction("cycleHealingOverlay"),
    closeHealingOverlay: createDeferredAction("closeHealingOverlay"),
    useSelectedHealingConsumable: createDeferredAction("useSelectedHealingConsumable"),
    render: createDeferredAction("render"),
    getShowcaseAt: createDeferredAction("getShowcaseAt"),
    maybeTriggerShowcaseAmbience: createDeferredAction("maybeTriggerShowcaseAmbience"),
  };

  return {
    runtimeBindings: {
      showFloatingText: (...args) => actions.showFloatingText.call(...args),
      showDeathModal: (...args) => actions.showDeathModal.call(...args),
      showChoiceModal: (...args) => actions.showChoiceModal.call(...args),
      hideChoiceModal: (...args) => actions.hideChoiceModal.call(...args),
      moveToFloor: (...args) => actions.moveToFloor.call(...args),
      tryUseStairs: (...args) => actions.tryUseStairs.call(...args),
      endTurn: (...args) => actions.endTurn.call(...args),
      tryCloseAdjacentDoor: (...args) => actions.tryCloseAdjacentDoor.call(...args),
      movePlayer: (...args) => actions.movePlayer.call(...args),
      handleWait: (...args) => actions.handleWait.call(...args),
      debugRevealOrAdvanceStudio: (...args) => actions.debugRevealOrAdvanceStudio.call(...args),
      debugReturnToPreviousStudio: (...args) => actions.debugReturnToPreviousStudio.call(...args),
      debugAdvanceTimeline: (...args) => actions.debugAdvanceTimeline.call(...args),
      cycleTargetMode: (...args) => actions.cycleTargetMode.call(...args),
      enterTargetMode: (...args) => actions.enterTargetMode.call(...args),
      cancelTargetMode: (...args) => actions.cancelTargetMode.call(...args),
      moveTargetCursor: (...args) => actions.moveTargetCursor.call(...args),
      selectTargetTile: (...args) => actions.selectTargetTile.call(...args),
      confirmTargetAttack: (...args) => actions.confirmTargetAttack.call(...args),
      resolvePotionChoice: (...args) => actions.resolvePotionChoice.call(...args),
      useInventoryItem: (...args) => actions.useInventoryItem.call(...args),
      quickUsePotion: (...args) => actions.quickUsePotion.call(...args),
      closeContainerLoot: (...args) => actions.closeContainerLoot.call(...args),
      cycleContainerLootAction: (...args) => actions.cycleContainerLootAction.call(...args),
      moveContainerLootFocus: (...args) => actions.moveContainerLootFocus.call(...args),
      confirmContainerLootFocus: (...args) => actions.confirmContainerLootFocus.call(...args),
      takeSelectedContainerLoot: (...args) => actions.takeSelectedContainerLoot.call(...args),
      takeAllContainerLoot: (...args) => actions.takeAllContainerLoot.call(...args),
      cycleHealingOverlay: (...args) => actions.cycleHealingOverlay.call(...args),
      closeHealingOverlay: (...args) => actions.closeHealingOverlay.call(...args),
      useSelectedHealingConsumable: (...args) => actions.useSelectedHealingConsumable.call(...args),
      setShowFloatingText: (implementation) => actions.showFloatingText.set(implementation),
      setShowDeathModal: (implementation) => actions.showDeathModal.set(implementation),
      setShowChoiceModal: (implementation) => actions.showChoiceModal.set(implementation),
      setHideChoiceModal: (implementation) => actions.hideChoiceModal.set(implementation),
      setResolvePotionChoice: (implementation) => actions.resolvePotionChoice.set(implementation),
      setUseInventoryItem: (implementation) => actions.useInventoryItem.set(implementation),
      setQuickUsePotion: (implementation) => actions.quickUsePotion.set(implementation),
      setCloseContainerLoot: (implementation) => actions.closeContainerLoot.set(implementation),
      setCycleContainerLootAction: (implementation) => actions.cycleContainerLootAction.set(implementation),
      setMoveContainerLootFocus: (implementation) => actions.moveContainerLootFocus.set(implementation),
      setConfirmContainerLootFocus: (implementation) => actions.confirmContainerLootFocus.set(implementation),
      setTakeSelectedContainerLoot: (implementation) => actions.takeSelectedContainerLoot.set(implementation),
      setTakeAllContainerLoot: (implementation) => actions.takeAllContainerLoot.set(implementation),
      setCycleHealingOverlay: (implementation) => actions.cycleHealingOverlay.set(implementation),
      setCloseHealingOverlay: (implementation) => actions.closeHealingOverlay.set(implementation),
      setUseSelectedHealingConsumable: (implementation) => actions.useSelectedHealingConsumable.set(implementation),
      setMoveToFloor: (implementation) => actions.moveToFloor.set(implementation),
      setTryUseStairs: (implementation) => actions.tryUseStairs.set(implementation),
      setEndTurn: (implementation) => actions.endTurn.set(implementation),
      setTryCloseAdjacentDoor: (implementation) => actions.tryCloseAdjacentDoor.set(implementation),
      setMovePlayer: (implementation) => actions.movePlayer.set(implementation),
      setHandleWait: (implementation) => actions.handleWait.set(implementation),
      setDebugRevealOrAdvanceStudio: (implementation) => actions.debugRevealOrAdvanceStudio.set(implementation),
      setDebugReturnToPreviousStudio: (implementation) => actions.debugReturnToPreviousStudio.set(implementation),
      setDebugAdvanceTimeline: (implementation) => actions.debugAdvanceTimeline.set(implementation),
      setCycleTargetMode: (implementation) => actions.cycleTargetMode.set(implementation),
      setEnterTargetMode: (implementation) => actions.enterTargetMode.set(implementation),
      setCancelTargetMode: (implementation) => actions.cancelTargetMode.set(implementation),
      setMoveTargetCursor: (implementation) => actions.moveTargetCursor.set(implementation),
      setSelectTargetTile: (implementation) => actions.selectTargetTile.set(implementation),
      setConfirmTargetAttack: (implementation) => actions.confirmTargetAttack.set(implementation),
    },
    render: (...args) => actions.render.call(...args),
    setRender: (implementation) => actions.render.set(implementation),
    getShowcaseAt: (...args) => actions.getShowcaseAt.call(...args),
    maybeTriggerShowcaseAmbience: (...args) => actions.maybeTriggerShowcaseAmbience.call(...args),
    bindShowcaseAmbienceApi(api) {
      actions.getShowcaseAt.set(api.getShowcaseAt);
      actions.maybeTriggerShowcaseAmbience.set(api.maybeTriggerShowcaseAmbience);
    },
  };
}
