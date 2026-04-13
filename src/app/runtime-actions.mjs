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
    resolvePotionChoice: createDeferredAction("resolvePotionChoice"),
    useInventoryItem: createDeferredAction("useInventoryItem"),
    quickUsePotion: createDeferredAction("quickUsePotion"),
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
      resolvePotionChoice: (...args) => actions.resolvePotionChoice.call(...args),
      useInventoryItem: (...args) => actions.useInventoryItem.call(...args),
      quickUsePotion: (...args) => actions.quickUsePotion.call(...args),
      setShowFloatingText: (implementation) => actions.showFloatingText.set(implementation),
      setShowDeathModal: (implementation) => actions.showDeathModal.set(implementation),
      setShowChoiceModal: (implementation) => actions.showChoiceModal.set(implementation),
      setHideChoiceModal: (implementation) => actions.hideChoiceModal.set(implementation),
      setResolvePotionChoice: (implementation) => actions.resolvePotionChoice.set(implementation),
      setUseInventoryItem: (implementation) => actions.useInventoryItem.set(implementation),
      setQuickUsePotion: (implementation) => actions.quickUsePotion.set(implementation),
      setMoveToFloor: (implementation) => actions.moveToFloor.set(implementation),
      setTryUseStairs: (implementation) => actions.tryUseStairs.set(implementation),
      setEndTurn: (implementation) => actions.endTurn.set(implementation),
      setTryCloseAdjacentDoor: (implementation) => actions.tryCloseAdjacentDoor.set(implementation),
      setMovePlayer: (implementation) => actions.movePlayer.set(implementation),
      setHandleWait: (implementation) => actions.handleWait.set(implementation),
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
