import { createStatusEffectService } from '../application/status-effect-service.mjs';
import { createConsumableService } from '../application/consumable-service.mjs';
import { createActionScheduler } from '../application/action-scheduler.mjs';
import { recordDebugEnemyTrailStep } from '../application/debug-enemy-trails.mjs';
import { getEffectStateLabel } from '../content/catalogs/weapon-effects.mjs';

export function assembleGameplayModules(context) {
  const { factories, config, runtime, equipment, core, interface: interfaceApi, presentation } = context;
  const {
    createCombatApi,
    createAiApi,
    createItemsApi,
    createFloorTransitionService,
    createPlayerTurnController,
    createTestApi,
  } = factories;
  const {
    BASE_HIT_CHANCE,
    MIN_HIT_CHANCE,
    MAX_HIT_CHANCE,
    MIN_CRIT_CHANCE,
    MAX_CRIT_CHANCE,
    WIDTH,
    HEIGHT,
    TILE,
    DOOR_TYPE,
    getLevelUpRewards,
    formatStudioLabel,
    formatArchetypeLabel,
    buildStudioAnnouncement,
    getArchetypeForFloor,
  } = config;
  const {
    getState,
    getCurrentFloorState,
    clamp,
    randomChance,
    randomInt,
    rollPercent,
    renderSelf,
    noteMonsterEncounter,
    addMessage,
    showFloatingText,
    applyItemStatMods,
    restoreNutrition,
    refreshNutritionState,
    setResolvePotionChoice,
    setUseInventoryItem,
    setQuickUsePotion,
    setCloseContainerLoot,
    setCycleContainerLootAction,
    setMoveContainerLootFocus,
    setConfirmContainerLootFocus,
    setTakeSelectedContainerLoot,
    setTakeAllContainerLoot,
    setCycleHealingOverlay,
    setCloseHealingOverlay,
    setUseSelectedHealingConsumable,
    maybeTriggerShowcaseAmbience,
    getShowcaseAt,
    applyPlayerNutritionTurnCost,
    setRandomSequence,
    clearRandomSequence,
    tryUseStairs,
    endTurn,
    setMoveToFloor,
    setTryUseStairs,
    setEndTurn,
    setTryCloseAdjacentDoor,
    setMovePlayer,
    setHandleWait,
    setDebugRevealOrAdvanceStudio,
    setDebugReturnToPreviousStudio,
    setDebugAdvanceTimeline,
    setCycleTargetMode,
    setEnterTargetMode,
    setCancelTargetMode,
    setMoveTargetCursor,
    setSelectTargetTile,
    setConfirmTargetAttack,
    countPotionsInInventory,
    countFoodInInventory,
  } = runtime;
  const {
    getMainHand,
    getOffHand,
    getCombatWeapon,
    cloneOffHandItem,
  } = equipment;
  const {
    createWeaponPickup,
    createOffHandPickup,
    createPotionPickup,
    createFoodPickup,
    createDungeonLevel,
    detectNearbyTraps,
    getDoorAt,
    isDoorClosed,
    openDoor,
    closeDoor,
    canPlayerOpenDoor,
    getDoorColorLabels,
    createDeathCause,
    saveHighscoreIfNeeded,
    loadHighscores,
    createChestPickup,
    createDoor,
    createKeyPickup,
    generateEquipmentItem,
    playVictorySound,
    playLevelUpSound,
    playEnemyHitSound,
    playPlayerHitSound,
    playDodgeSound,
    playDeathSound,
    playDoorOpenSound,
    playLockedDoorSound,
    playStepSound,
    xpForNextLevel,
    formatRarityLabel,
    getItemModifierSummary,
    getWeaponConditionalDamageBonus,
    itemHasModifier,
    cloneWeapon,
    handleActorEnterTile,
  } = core;
  const {
    showDeathModal,
    showChoiceModal,
    hideChoiceModal,
    showStairChoice,
  } = interfaceApi;
  const {
    formatWeaponDisplayName,
    formatWeaponReference,
    formatWeaponStats,
    formatOffHandStats,
  } = presentation;

  let combatApi = null;

  const statusEffectService = createStatusEffectService({
    getEffectStateLabel,
    getState,
    getCurrentFloorState,
    addMessage,
    showFloatingText,
    noteMonsterEncounter,
    playEnemyHitSound,
    playPlayerHitSound,
    saveHighscoreIfNeeded,
    createDeathCause,
    showDeathModal,
    playDeathSound,
    grantExperience: (...args) => combatApi?.grantExperience?.(...args),
    randomChance,
  });

  combatApi = createCombatApi({
    TILE,
    BASE_HIT_CHANCE,
    MIN_HIT_CHANCE,
    MAX_HIT_CHANCE,
    MIN_CRIT_CHANCE,
    MAX_CRIT_CHANCE,
    clamp,
    randomChance,
    rollPercent,
    getState,
    getCombatWeapon,
    getOffHand,
    getCurrentFloorState,
    getDoorAt,
    isDoorClosed,
    createWeaponPickup,
    createOffHandPickup,
    createFoodPickup,
    showFloatingText,
    playVictorySound,
    playLevelUpSound,
    playEnemyHitSound,
    playDodgeSound,
    xpForNextLevel,
    getLevelUpRewards,
    getWeaponConditionalDamageBonus,
    itemHasModifier,
    getActorPrecisionModifier: statusEffectService.getActorPrecisionModifier,
    getActorReactionModifier: statusEffectService.getActorReactionModifier,
    tryApplyWeaponEffects: statusEffectService.tryApplyWeaponEffects,
    noteMonsterEncounter,
    formatWeaponReference,
    addMessage,
    renderSelf,
  });

  const aiApi = createAiApi({
    WIDTH,
    HEIGHT,
    TILE,
    DOOR_TYPE,
    getState,
    getCurrentFloorState,
    getDoorAt,
    getOffHand,
    createWeaponPickup,
    createOffHandPickup,
    createFoodPickup,
    resolveCombatAttack: combatApi.resolveCombatAttack,
    resolveBlock: combatApi.resolveBlock,
    healPlayer: combatApi.healPlayer,
    addMessage,
    showFloatingText,
    createDeathCause,
    playPlayerHitSound,
    playDodgeSound,
    playVictorySound,
    playDeathSound,
    playDoorOpenSound,
    saveHighscoreIfNeeded,
    showDeathModal,
    grantExperience: (...args) => combatApi?.grantExperience?.(...args),
    noteMonsterEncounter,
    recordDebugEnemyTrailStep,
    handleActorEnterTile,
    randomChance,
    canPerceive: core.canPerceive,
    hasProjectileLine: core.hasProjectileLine,
    hasLineOfSight: core.hasLineOfSight,
    isStraightShot: core.isStraightShot,
    canActorMove: statusEffectService.canActorMove,
    tryApplyWeaponEffects: statusEffectService.tryApplyWeaponEffects,
  });

  const floorTransitionService = createFloorTransitionService({
    getState,
    getCurrentFloorState,
    createDungeonLevel,
    randomInt,
    detectNearbyTraps,
    maybeTriggerShowcaseAmbience,
    manhattanDistance: aiApi.manhattanDistance,
    addMessage,
    formatStudioLabel,
    formatArchetypeLabel,
    buildStudioAnnouncement,
    getArchetypeForFloor,
    playStudioAnnouncement: core.playStudioAnnouncement,
    showStairChoice,
    renderSelf,
  });

  const consumableService = createConsumableService({
    getState,
    getCurrentFloorState,
    getDoorAt,
    getShowcaseAt,
    detectNearbyTraps,
    maybeTriggerShowcaseAmbience,
    handleActorEnterTile,
    moveToFloor: floorTransitionService.moveToFloor,
    addMessage,
    renderSelf,
    createRuntimeId: runtime.createRuntimeId,
    randomChance,
  });
  consumableService.ensureConsumableState();
  consumableService.rebuildPlayerConsumableState();

  const actionScheduler = createActionScheduler({
    getState,
    getCurrentFloorState,
  });

  const itemsApi = createItemsApi({
    getState,
    getCurrentFloorState,
    getMainHand,
    getOffHand,
    applyItemStatMods,
    cloneWeapon,
    cloneOffHandItem,
    createWeaponPickup,
    createOffHandPickup,
    createPotionPickup,
    createFoodPickup,
    formatWeaponDisplayName,
    formatWeaponReference,
    formatWeaponStats,
    formatOffHandStats,
    formatRarityLabel,
    getItemModifierSummary,
    addMessage,
    showChoiceModal,
    hideChoiceModal,
    endTurn,
    healPlayer: combatApi.healPlayer,
    restoreNutrition,
    useConsumable: consumableService.useConsumable,
    refreshNutritionState,
    renderSelf,
    applyStatusEffect: statusEffectService.applyStatusEffect,
    randomChance,
  });
  setResolvePotionChoice(itemsApi.resolvePotionChoice);
  setUseInventoryItem(itemsApi.useInventoryItem);
  setQuickUsePotion(itemsApi.quickUsePotion);
  setCloseContainerLoot(itemsApi.closeContainerLoot);
  setCycleContainerLootAction(itemsApi.cycleContainerLootAction);
  setMoveContainerLootFocus(itemsApi.moveContainerLootFocus);
  setConfirmContainerLootFocus(itemsApi.confirmContainerLootFocus);
  setTakeSelectedContainerLoot(itemsApi.takeSelectedContainerLoot);
  setTakeAllContainerLoot(itemsApi.takeAllContainerLoot);
  setCycleHealingOverlay(itemsApi.cycleHealingOverlay);
  setCloseHealingOverlay(itemsApi.closeHealingOverlay);
  setUseSelectedHealingConsumable(itemsApi.useSelectedHealingConsumable);

  const playerTurnController = createPlayerTurnController({
    WIDTH,
    HEIGHT,
    TILE,
    DOOR_TYPE,
    getState,
    getCurrentFloorState,
    getDoorAt,
    getShowcaseAt,
    openDoor,
    closeDoor,
    canPlayerOpenDoor,
    getDoorColorLabels,
    manhattanDistance: aiApi.manhattanDistance,
    chebyshevDistance: aiApi.chebyshevDistance,
    addMessage,
    attackEnemy: combatApi.attackEnemy,
    tryPickupLoot: itemsApi.tryPickupLoot,
    tryUseStairs: floorTransitionService.tryUseStairs,
    detectNearbyTraps,
    maybeTriggerShowcaseAmbience,
    handleActorEnterTile,
    playStepSound,
    playLockedDoorSound,
    hasNearbyEnemy: aiApi.hasNearbyEnemy,
    takeEnemyTurn: aiApi.takeEnemyTurn,
    canPerceive: core.canPerceive,
    hasProjectileLine: core.hasProjectileLine,
    hasLineOfSight: core.hasLineOfSight,
    isStraightShot: core.isStraightShot,
    getCombatWeapon,
    previewCombatAttack: combatApi.previewCombatAttack,
    canActorMove: statusEffectService.canActorMove,
    ...actionScheduler,
    processActorStatusEffects: statusEffectService.processActorStatusEffects,
    processActorContinuousTraps: core.processActorContinuousTraps,
    processActorSafeRegeneration: aiApi.processActorSafeRegeneration,
    processConsumableBuffs: consumableService.processConsumableBuffs,
    applyPlayerNutritionTurnCost,
    renderSelf,
  });

  const testApi = createTestApi({
    WIDTH,
    HEIGHT,
    TILE,
    getState,
    getCurrentFloorState,
    getMainHand,
    getOffHand,
    countPotionsInInventory,
    countFoodInInventory,
    loadHighscores,
    grantExperience: combatApi.grantExperience,
    cloneWeapon,
    cloneOffHandItem,
    createChestPickup,
    createPotionPickup,
    createFoodPickup,
    createDoor,
    createKeyPickup,
    generateEquipmentItem,
    ensureFloorExists: floorTransitionService.ensureFloorExists,
    updateVisibility: core.updateVisibility,
    enterTargetMode: playerTurnController.enterTargetMode,
    cancelTargetMode: playerTurnController.cancelTargetMode,
    moveTargetCursor: playerTurnController.moveTargetCursor,
    confirmTargetAttack: playerTurnController.confirmTargetAttack,
    applyStatusEffect: statusEffectService.applyStatusEffect,
    processRoundStatusEffects: statusEffectService.processRoundStatusEffects,
    setRandomSequence,
    clearRandomSequence,
    tryUseStairs,
    movePlayer: playerTurnController.movePlayer,
    openChest: itemsApi.openChest,
    renderSelf,
  });

  setMoveToFloor(floorTransitionService.moveToFloor);
  setTryUseStairs(floorTransitionService.tryUseStairs);
  setEndTurn(playerTurnController.endTurn);
  setTryCloseAdjacentDoor(playerTurnController.tryCloseAdjacentDoor);
  setMovePlayer(playerTurnController.movePlayer);
  setHandleWait(playerTurnController.handleWait);
  setDebugRevealOrAdvanceStudio(floorTransitionService.debugRevealOrAdvanceStudio);
  setDebugReturnToPreviousStudio(floorTransitionService.debugReturnToPreviousStudio);
  setDebugAdvanceTimeline(playerTurnController.debugAdvanceTimeline);
  setCycleTargetMode(playerTurnController.cycleTargetMode);
  setEnterTargetMode(playerTurnController.enterTargetMode);
  setCancelTargetMode(playerTurnController.cancelTargetMode);
  setMoveTargetCursor(playerTurnController.moveTargetCursor);
  setSelectTargetTile(playerTurnController.selectTargetTile);
  setConfirmTargetAttack(playerTurnController.confirmTargetAttack);

  return {
    ...combatApi,
    ...aiApi,
    ...itemsApi,
    ...floorTransitionService,
    ...playerTurnController,
    ...statusEffectService,
    ...consumableService,
    ...testApi,
  };
}
