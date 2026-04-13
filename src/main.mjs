import { WIDTH, HEIGHT, TILE_SIZE, TILE_GAP, BOARD_PADDING, ROOM_ATTEMPTS, MIN_ROOM_SIZE, MAX_ROOM_SIZE, LOG_LIMIT, HIGHSCORE_KEY, HIGHSCORE_STORAGE_VERSION, HIGHSCORE_VERSION_KEY, VISION_RADIUS, BASE_HIT_CHANCE, MIN_HIT_CHANCE, MAX_HIT_CHANCE, MIN_CRIT_CHANCE, MAX_CRIT_CHANCE, TILE, MONSTER_CATALOG, WEAPON_CATALOG, OFFHAND_CATALOG } from './data.mjs';
import { boardElement, gameShellElement, startModalElement, startFormElement, classOptionsElement, heroNameInputElement, saveHeroNameButtonElement, loadGameFromStartButtonElement, heroIdentityStatusElement, startSavegameStatusElement, messageLogElement, inventoryListElement, playerSheetElement, playerPanelTitleElement, enemySheetElement, highscoreListElement, runStatsSummaryElement, runStatsKillsElement, depthTitleElement, topbarHpCardElement, topbarHpElement, topbarLevelCardElement, topbarLevelElement, topbarDamageCardElement, topbarDamageElement, topbarHitCardElement, topbarHitElement, topbarCritCardElement, topbarCritElement, topbarBlockCardElement, topbarBlockElement, topbarFoodCardElement, topbarFoodElement, xpLabelElement, xpFillElement, nutritionLabelElement, nutritionFillElement, nutritionStateElement, choiceModalElement, choiceTitleElement, choiceTextElement, choiceDrinkButton, choiceStoreButton, choiceLeaveButton, stairsModalElement, stairsTitleElement, stairsTextElement, stairsConfirmButton, stairsStayButton, inventoryModalElement, runStatsModalElement, openRunStatsButton, closeRunStatsButton, openInventoryButton, closeInventoryButton, startFreshRunButton, inventoryFilterButtons, optionsModalElement, openOptionsButton, closeOptionsButton, saveGameButtonElement, loadGameButtonElement, savegameStatusElement, helpModalElement, openHelpButton, closeHelpButton, highscoresModalElement, openHighscoresButton, closeHighscoresButton, toggleStepSoundElement, toggleDeathSoundElement, deathModalElement, deathSummaryElement, deathKillsElement, deathKillsModalElement, restartFromDeathButton, openDeathKillsButton, closeDeathKillsButton, closeDeathButton, hoverTooltipElement, collapsibleCards } from './dom.mjs';
import { DOOR_TYPE, LOCK_COLORS, PROP_CATALOG, DISPLAY_CASE_AMBIENCE } from './data.mjs';
import { HERO_CLASSES, getHeroClassAssets, getUnlockedMonsterRank, getEnemyCountForFloor, getPotionCountForFloor, shouldSpawnFloorWeapon, shouldSpawnChest, getChestCountForFloor, getLockedDoorCountForFloor, shouldPlaceLockedRoomChest, getLevelUpRewards, NON_ICONIC_MONSTER_WEIGHT_BONUS, ICONIC_MONSTER_WEIGHT_PENALTY, ITEM_RARITY_MODIFIER_COUNTS, getEquipmentRarityWeights } from './balance.mjs';
import { getNutritionMax, getNutritionStart, clampNutritionValue, getHungerState, getHungerStateLabel, getHungerStateMessage, HUNGER_STATE, NUTRITION_COST_PER_ACTION, DAMAGE_PER_ACTION_WHILE_DYING } from './nutrition.mjs';
import { buildFoodItemsForBudget, rollFoodBudget, splitFoodBudget, rollMonsterPlannedDrop } from './loot.mjs';
import { ITEM_DEFS } from './item-defs.mjs';
import { createItemizationApi } from './itemization.mjs';
import { createTrapsApi } from './traps.mjs';
import { createDungeonApi } from './dungeon.mjs';
import { createStateApi } from './state.mjs';
import { createRenderApi } from './render.mjs';
import { createCombatApi } from './combat.mjs';
import { createAiApi } from './ai.mjs';
import { createItemsApi } from './items.mjs';
import { createTestApi } from './test-api.mjs';
import { createAudioService } from './application/audio-service.mjs';
import { createDoorService } from './application/door-service.mjs';
import { createFloorTransitionService } from './application/floor-transition-service.mjs';
import { createInputController } from './application/input-controller.mjs';
import { createInventoryStatsApi } from './application/inventory-stats.mjs';
import { createSavegameService } from './application/savegame-service.mjs';
import { createVisibilityService } from './application/visibility-service.mjs';
import { createModalController } from './application/modal-controller.mjs';
import { createPlayerTurnController } from './application/player-turn-controller.mjs';
import { createUiBindingsApi } from './application/ui-bindings.mjs';
import { createBareHandsWeapon, cloneOffHandItem, getMainHand, getOffHand, getCombatWeapon, createEquipmentPresentationHelpers } from './equipment-helpers.mjs';
import { clamp, randomInt, createGrid, carveRoom, carveTunnel, roomsOverlap } from './utils.mjs';
import { formatArchetypeLabel, formatStudioLabel, formatStudioWithArchetype } from './studio-theme.mjs';

let state;
let testRandomQueue = [];
let heroIdentityStatusTimeout;
const OPTIONS_KEY = "dungeon-rogue-options";
const HERO_NAME_KEY = "movieverse-hero-name";
const HERO_CLASS_KEY = "movieverse-hero-class";
const DEFAULT_HERO_NAME = "Final Girl";
const DEFAULT_HERO_CLASS = "lead";
const CHOICE_ACTIONS = {
  potion: ["drink", "store", "leave"],
  food: ["eat", "store", "leave"],
  weapon: ["equip", "store", "leave"],
  offhand: ["equip", "store", "leave"],
};
const STAIR_ACTIONS = ["change-floor", "stay"];

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

const showFloatingTextAction = createDeferredAction("showFloatingText");
const showDeathModalAction = createDeferredAction("showDeathModal");
const showChoiceModalAction = createDeferredAction("showChoiceModal");
const hideChoiceModalAction = createDeferredAction("hideChoiceModal");
const moveToFloorAction = createDeferredAction("moveToFloor");
const tryUseStairsAction = createDeferredAction("tryUseStairs");
const endTurnAction = createDeferredAction("endTurn");
const tryCloseAdjacentDoorAction = createDeferredAction("tryCloseAdjacentDoor");
const movePlayerAction = createDeferredAction("movePlayer");
const handleWaitAction = createDeferredAction("handleWait");
const resolvePotionChoiceAction = createDeferredAction("resolvePotionChoice");
const useInventoryItemAction = createDeferredAction("useInventoryItem");
const quickUsePotionAction = createDeferredAction("quickUsePotion");

const {
  countPotionsInInventory,
  countFoodInInventory,
} = createInventoryStatsApi({
  getState: () => state,
});

function rollPercent(chance) {
  return randomChance() * 100 < chance;
}

function randomChance() {
  if (testRandomQueue.length > 0) {
    return testRandomQueue.shift();
  }
  return Math.random();
}

function applyItemStatMods(entity, item, direction = 1) {
  if (!entity || !item?.statMods) {
    return;
  }

  Object.entries(item.statMods).forEach(([stat, value]) => {
    if (!value) {
      return;
    }
    const currentValue = typeof entity[stat] === "number" ? entity[stat] : 0;
    entity[stat] = currentValue + value * direction;
  });
}

function assembleCoreModules() {
  const itemizationApi = createItemizationApi({
    ITEM_RARITY_MODIFIER_COUNTS,
    getEquipmentRarityWeights,
    randomChance,
  });

  const audioService = createAudioService({
    getState: () => state,
  });

  const doorService = createDoorService({
    DOOR_TYPE,
    getState: () => state,
    getCurrentFloorState,
    addMessage,
    playDoorOpenSound: () => audioService.playDoorOpenSound(),
    playDoorCloseSound: () => audioService.playDoorCloseSound(),
  });

  const trapsApi = createTrapsApi({
    randomInt,
    randomChance,
    getState: () => state,
    getCurrentFloorState,
    addMessage,
    showFloatingText: (...args) => showFloatingTextAction.call(...args),
    healPlayer: (...args) => healPlayer(...args),
    refreshNutritionState: (...args) => refreshNutritionState(...args),
    grantExperience: (...args) => grantExperience(...args),
    createDeathCause: (...args) => createDeathCause(...args),
    saveHighscoreIfNeeded: () => saveHighscoreIfNeeded(),
    showDeathModal: (...args) => showDeathModalAction.call(...args),
    playDeathSound: () => audioService.playDeathSound(),
  });

  const dungeonApi = createDungeonApi({
    WIDTH,
    HEIGHT,
    ROOM_ATTEMPTS,
    MIN_ROOM_SIZE,
    MAX_ROOM_SIZE,
    TILE,
    MONSTER_CATALOG,
    WEAPON_CATALOG,
    OFFHAND_CATALOG,
    PROP_CATALOG,
    DOOR_TYPE,
    LOCK_COLORS,
    buildFoodItemsForBudget,
    rollFoodBudget,
    splitFoodBudget,
    rollMonsterPlannedDrop,
    getUnlockedMonsterRank,
    getEnemyCountForFloor,
    getPotionCountForFloor,
    shouldSpawnFloorWeapon,
    shouldSpawnChest,
    getChestCountForFloor,
    getLockedDoorCountForFloor,
    shouldPlaceLockedRoomChest,
    NON_ICONIC_MONSTER_WEIGHT_BONUS,
    ICONIC_MONSTER_WEIGHT_PENALTY,
    buildTrapsForFloor: trapsApi.buildTrapsForFloor,
    generateEquipmentItem: itemizationApi.generateEquipmentItem,
    randomInt,
    createGrid: () => createGrid(WIDTH, HEIGHT, TILE.WALL),
    carveRoom: (grid, room) => carveRoom(grid, room, TILE.FLOOR),
    carveTunnel: (grid, start, end) => carveTunnel(grid, start, end, TILE.FLOOR),
    roomsOverlap,
    cloneOffHandItem,
    getState: () => state,
  });

  const visibilityService = createVisibilityService({
    WIDTH,
    HEIGHT,
    VISION_RADIUS,
    TILE,
    getState: () => state,
    getCurrentFloorState,
    getDoorAt: doorService.getDoorAt,
    isDoorClosed: doorService.isDoorClosed,
    createGrid,
  });

  const stateApi = createStateApi({
    HIGHSCORE_KEY,
    HIGHSCORE_STORAGE_VERSION,
    HIGHSCORE_VERSION_KEY,
    OPTIONS_KEY,
    HERO_NAME_KEY,
    HERO_CLASS_KEY,
    DEFAULT_HERO_NAME,
    DEFAULT_HERO_CLASS,
    HERO_CLASSES,
    getState: () => state,
    setState: (nextState) => {
      state = nextState;
    },
    createBareHandsWeapon,
    createDungeonLevel: dungeonApi.createDungeonLevel,
    updateVisibility: visibilityService.updateVisibility,
    addMessage,
    renderSelf: () => render(),
    randomInt,
  });

  const savegameService = createSavegameService({
    getState: () => state,
    hasSavedGame: stateApi.hasSavedGame,
    getSavedGameMetadata: stateApi.getSavedGameMetadata,
    saveGame: stateApi.saveGame,
    loadSavedGame: stateApi.loadSavedGame,
    setSavegameStatus: (text) => {
      savegameStatusElement.textContent = text;
      startSavegameStatusElement.textContent = text;
    },
    setLoadButtonsDisabled: (disabled) => {
      loadGameButtonElement.disabled = disabled;
      loadGameFromStartButtonElement.disabled = disabled;
    },
    setSaveButtonDisabled: (disabled) => {
      saveGameButtonElement.disabled = disabled;
    },
    detectNearbyTraps: trapsApi.detectNearbyTraps,
    addMessage,
    renderSelf: () => render(),
  });

  return {
    ...itemizationApi,
    ...audioService,
    ...doorService,
    ...trapsApi,
    ...dungeonApi,
    ...visibilityService,
    ...stateApi,
    ...savegameService,
  };
}

const {
  formatRarityLabel,
  generateEquipmentItem,
  getItemModifierSummary,
  getWeaponConditionalDamageBonus,
  itemHasModifier,
  playDeathSound,
  playVictorySound,
  playLevelUpSound,
  playEnemyHitSound,
  playPlayerHitSound,
  playDodgeSound,
  playDoorOpenSound,
  playDoorCloseSound,
  playLockedDoorSound,
  playShowcaseAmbienceSound,
  playStepSound,
  buildTrapsForFloor,
  detectNearbyTraps,
  handleActorEnterTile,
  processContinuousTraps,
  createEnemy,
  createWeaponPickup,
  createOffHandPickup,
  createChestPickup,
  createFoodPickup,
  createKeyPickup,
  createDoor,
  rollChestContent,
  cloneWeapon,
  createDungeonLevel,
  updateVisibility,
  getDoorAt,
  isDoorClosed,
  getDoorColorLabels,
  canPlayerOpenDoor,
  openDoor,
  closeDoor,
  loadHighscores,
  loadHeroName,
  saveHeroName,
  loadHeroClassId,
  saveHeroClassId,
  saveOptions,
  hasSavedGame,
  getSavedGameMetadata,
  saveGame,
  loadSavedGame,
  clearSavedGame,
  loadLastHighscoreMarker,
  saveHighscoreIfNeeded,
  createDeathCause,
  xpForNextLevel,
  initializeGame,
  formatSavegameSummary,
  updateSavegameControls,
  saveCurrentGame,
  loadCurrentGame,
} = assembleCoreModules();

const {
  formatWeaponStats,
  formatOffHandStats,
  getOffHandTooltipLines,
} = createEquipmentPresentationHelpers({
  formatRarityLabel,
  getItemModifierSummary,
});

function assembleInterfaceModules() {
  const renderApi = createRenderApi({
    MIN_CRIT_CHANCE,
    MAX_CRIT_CHANCE,
    WIDTH,
    HEIGHT,
    TILE_SIZE,
    TILE_GAP,
    BOARD_PADDING,
    TILE,
    boardElement,
    messageLogElement,
    inventoryListElement,
    inventoryFilterButtons,
    playerSheetElement,
    enemySheetElement,
    highscoreListElement,
    runStatsSummaryElement,
    runStatsKillsElement,
    hoverTooltipElement,
    monsterNames: MONSTER_CATALOG.map((monster) => monster.name),
    itemNames: [
      "Heiltrank",
      ...Object.values(WEAPON_CATALOG).map((item) => item.name),
      ...Object.values(OFFHAND_CATALOG).map((item) => item.name),
      ...Object.values(ITEM_DEFS).map((item) => item.name),
    ],
    getState: () => state,
    getCurrentFloorState,
    getMainHand,
    getOffHand,
    getCombatWeapon,
    formatWeaponStats,
    formatOffHandStats,
    getOffHandTooltipLines,
    formatRarityLabel,
    getItemModifierSummary,
    getHungerStateLabel,
    clamp,
    loadHighscores,
    loadLastHighscoreMarker,
    countPotionsInInventory,
    countFoodInInventory,
    useInventoryItem: (...args) => useInventoryItemAction.call(...args),
    renderSelf: () => render(),
  });
  showFloatingTextAction.set(renderApi.showFloatingText);

  const modalController = createModalController({
    CHOICE_ACTIONS,
    STAIR_ACTIONS,
    getState: () => state,
    clearSavedGame,
    createSheetRow: renderApi.createSheetRow,
    updateSavegameControls,
    initializeGame,
    syncStartModalControls,
    renderSelf: () => render(),
    addMessage,
    moveToFloor: (...args) => moveToFloorAction.call(...args),
    endTurn: (...args) => endTurnAction.call(...args),
    resolvePotionChoice: (...args) => resolvePotionChoiceAction.call(...args),
    choiceModalElement,
    choiceTitleElement,
    choiceTextElement,
    choiceDrinkButton,
    choiceStoreButton,
    choiceLeaveButton,
    stairsModalElement,
    stairsTitleElement,
    stairsTextElement,
    stairsConfirmButton,
    stairsStayButton,
    deathModalElement,
    deathSummaryElement,
    deathKillsElement,
  });
  showDeathModalAction.set(modalController.showDeathModal);
  showChoiceModalAction.set(modalController.showChoiceModal);
  hideChoiceModalAction.set(modalController.hideChoiceModal);

  const inputController = createInputController({
    getState: () => state,
    confirmRestartRun: modalController.confirmRestartRun,
    resolveStairChoice: modalController.resolveStairChoice,
    cycleStairChoice: modalController.cycleStairChoice,
    resolvePotionChoice: (...args) => resolvePotionChoiceAction.call(...args),
    cyclePotionChoice: modalController.cyclePotionChoice,
    toggleInventory: modalController.toggleInventory,
    toggleRunStats: modalController.toggleRunStats,
    toggleOptions: modalController.toggleOptions,
    toggleHelp: modalController.toggleHelp,
    toggleHighscores: modalController.toggleHighscores,
    toggleDeathKills: modalController.toggleDeathKills,
    movePlayer: (...args) => movePlayerAction.call(...args),
    handleWait: () => handleWaitAction.call(),
    tryCloseAdjacentDoor: () => tryCloseAdjacentDoorAction.call(),
    quickUsePotion: (...args) => quickUsePotionAction.call(...args),
  });

  return {
    ...renderApi,
    ...modalController,
    ...inputController,
  };
}

const {
  getPlayerCombatSummary,
  getTopbarTooltipContent,
  bindTooltip,
  createSheetRow,
  renderPlayerSheet,
  renderEnemySheet,
  renderInventory,
  renderHighscores,
  renderRunStats,
  renderLog,
  renderBoard,
  showFloatingText,
  showTooltip,
  moveTooltip,
  hideTooltip,
  tileAt,
  showDeathModal,
  hideDeathModal,
  restartRun,
  confirmRestartRun,
  openRunStatsFromDeath,
  showChoiceModal,
  hideChoiceModal,
  showStairChoice,
  hideStairChoice,
  updatePotionChoiceSelection,
  cyclePotionChoice,
  cycleStairChoice,
  resolveChoiceBySlot,
  resolveStairChoice,
  toggleInventory,
  toggleRunStats,
  toggleOptions,
  toggleHelp,
  toggleHighscores,
  toggleDeathKills,
  bindKeyboardInput,
} = assembleInterfaceModules();

function assembleGameplayModules() {
  const combatApi = createCombatApi({
    BASE_HIT_CHANCE,
    MIN_HIT_CHANCE,
    MAX_HIT_CHANCE,
    MIN_CRIT_CHANCE,
    MAX_CRIT_CHANCE,
    clamp,
    rollPercent,
    getState: () => state,
    getCombatWeapon,
    getOffHand,
    getCurrentFloorState,
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
    noteMonsterEncounter,
    addMessage,
    renderSelf: () => render(),
  });

  const aiApi = createAiApi({
    WIDTH,
    HEIGHT,
    TILE,
    DOOR_TYPE,
    getState: () => state,
    getCurrentFloorState,
    getDoorAt,
    getOffHand,
    resolveCombatAttack: combatApi.resolveCombatAttack,
    resolveBlock: combatApi.resolveBlock,
    healPlayer: combatApi.healPlayer,
    addMessage,
    showFloatingText: (...args) => showFloatingTextAction.call(...args),
    createDeathCause,
    playPlayerHitSound,
    playDodgeSound,
    playDeathSound,
    playDoorOpenSound,
    saveHighscoreIfNeeded,
    showDeathModal: (...args) => showDeathModalAction.call(...args),
    noteMonsterEncounter,
    handleActorEnterTile,
  });

  const itemsApi = createItemsApi({
    getState: () => state,
    getCurrentFloorState,
    getMainHand,
    getOffHand,
    applyItemStatMods,
    cloneWeapon,
    cloneOffHandItem,
    createWeaponPickup,
    createOffHandPickup,
    createFoodPickup,
    formatWeaponStats,
    formatOffHandStats,
    formatRarityLabel,
    addMessage,
    showChoiceModal: (...args) => showChoiceModalAction.call(...args),
    hideChoiceModal: (...args) => hideChoiceModalAction.call(...args),
    endTurn: (...args) => endTurnAction.call(...args),
    healPlayer: combatApi.healPlayer,
    restoreNutrition,
    refreshNutritionState,
    renderSelf: () => render(),
  });
  resolvePotionChoiceAction.set(itemsApi.resolvePotionChoice);
  useInventoryItemAction.set(itemsApi.useInventoryItem);
  quickUsePotionAction.set(itemsApi.quickUsePotion);

  const floorTransitionService = createFloorTransitionService({
    getState: () => state,
    getCurrentFloorState,
    createDungeonLevel,
    detectNearbyTraps,
    maybeTriggerShowcaseAmbience,
    manhattanDistance: aiApi.manhattanDistance,
    addMessage,
    formatStudioLabel,
    formatArchetypeLabel,
    showStairChoice,
    renderSelf: () => render(),
  });

  const playerTurnController = createPlayerTurnController({
    WIDTH,
    HEIGHT,
    TILE,
    DOOR_TYPE,
    getState: () => state,
    getCurrentFloorState,
    getDoorAt,
    getShowcaseAt,
    openDoor,
    closeDoor,
    canPlayerOpenDoor,
    getDoorColorLabels,
    manhattanDistance: aiApi.manhattanDistance,
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
    moveEnemies: aiApi.moveEnemies,
    processContinuousTraps,
    processSafeRegeneration: aiApi.processSafeRegeneration,
    applyPlayerNutritionTurnCost,
    renderSelf: () => render(),
  });

  const testApi = createTestApi({
    WIDTH,
    HEIGHT,
    TILE,
    getState: () => state,
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
    createFoodPickup,
    createDoor,
    createKeyPickup,
    generateEquipmentItem,
    setRandomSequence: (values) => {
      testRandomQueue = [...values];
    },
    clearRandomSequence: () => {
      testRandomQueue = [];
    },
    tryUseStairs: (...args) => tryUseStairsAction.call(...args),
    renderSelf: () => render(),
  });

  moveToFloorAction.set(floorTransitionService.moveToFloor);
  tryUseStairsAction.set(floorTransitionService.tryUseStairs);
  endTurnAction.set(playerTurnController.endTurn);
  tryCloseAdjacentDoorAction.set(playerTurnController.tryCloseAdjacentDoor);
  movePlayerAction.set(playerTurnController.movePlayer);
  handleWaitAction.set(playerTurnController.handleWait);

  return {
    ...combatApi,
    ...aiApi,
    ...itemsApi,
    ...floorTransitionService,
    ...playerTurnController,
    ...testApi,
  };
}

const {
  resolveBlock,
  resolveCombatAttack,
  healPlayer,
  gainLevel,
  grantExperience,
  attackEnemy,
  manhattanDistance,
  hasNearbyEnemy,
  processSafeRegeneration,
  moveEnemies,
  tryPickupLoot,
  equipWeapon,
  canEquipOffHand,
  equipOffHand,
  moveToFloor,
  tryUseStairs,
  endTurn,
  tryCloseAdjacentDoor,
  movePlayer,
  handleWait,
  resolvePotionChoice,
  useInventoryItem,
  quickUsePotion,
  syncTestApi,
} = assembleGameplayModules();

function addMessage(text, tone = "") {
  state.messages.unshift({ text, tone });
  state.messages = state.messages.slice(0, LOG_LIMIT);
}

function refreshNutritionState(previousState = null) {
  state.player.nutritionMax = getNutritionMax(state.player);
  state.player.nutrition = clampNutritionValue(state.player.nutrition ?? getNutritionStart(state.player), state.player);
  const nextState = getHungerState(state.player);
  state.player.hungerState = nextState;

  if (previousState && previousState !== nextState) {
    const message = getHungerStateMessage(nextState);
    if (message) {
      addMessage(message, nextState === HUNGER_STATE.DYING ? "danger" : "important");
    }
  }

  return nextState;
}

function restoreNutrition(amount) {
  const previous = state.player.nutrition ?? getNutritionStart(state.player);
  const previousState = state.player.hungerState;
  state.player.nutrition = previous + amount;
  refreshNutritionState(previousState);
  return Math.max(0, state.player.nutrition - previous);
}

function noteMonsterEncounter(enemy) {
  if (!enemy?.id) {
    return;
  }

  state.knownMonsterTypes[enemy.id] = true;
}

function applyPlayerNutritionTurnCost() {
  const previousState = state.player.hungerState;
  state.player.nutrition = (state.player.nutrition ?? getNutritionStart(state.player)) - NUTRITION_COST_PER_ACTION;
  const nextState = refreshNutritionState(previousState);

  if (nextState !== HUNGER_STATE.DYING) {
    return;
  }

  state.player.hp = Math.max(0, state.player.hp - DAMAGE_PER_ACTION_WHILE_DYING);
  state.damageTaken = (state.damageTaken ?? 0) + DAMAGE_PER_ACTION_WHILE_DYING;
  showFloatingText(state.player.x, state.player.y, `-${DAMAGE_PER_ACTION_WHILE_DYING}`, "taken");
  addMessage("Der Hunger zerfrisst dich.", "danger");
  if (state.player.hp <= 0) {
    state.gameOver = true;
    state.deathCause = "verhungerte hinter den Kulissen des Studiokomplexes.";
    playDeathSound();
    const rank = saveHighscoreIfNeeded();
    addMessage("Du bist verhungert. Drücke R für einen neuen Versuch.", "danger");
    showDeathModal(rank);
  }
}

function getCurrentFloorState() {
  return state.floors[state.floor];
}

function getCurrentStudioArchetypeId() {
  return getCurrentFloorState()?.studioArchetypeId ?? null;
}

function getShowcaseAt(x, y, floorState = getCurrentFloorState()) {
  return floorState?.showcases?.find((showcase) => showcase.x === x && showcase.y === y) ?? null;
}

function getRoomIndexAtPosition(position, floorState = getCurrentFloorState()) {
  return floorState?.rooms?.findIndex((room) =>
    position.x >= room.x &&
    position.x < room.x + room.width &&
    position.y >= room.y &&
    position.y < room.y + room.height
  ) ?? -1;
}

function maybeTriggerShowcaseAmbience() {
  const floorState = getCurrentFloorState();
  if (!floorState?.rooms?.length || !floorState?.showcases?.length) {
    return;
  }

  floorState.showcaseAmbienceSeen = floorState.showcaseAmbienceSeen ?? {};
  const roomIndex = getRoomIndexAtPosition(state.player, floorState);
  if (roomIndex < 0 || floorState.showcaseAmbienceSeen[roomIndex]) {
    return;
  }

  const showcasesInRoom = floorState.showcases.filter((showcase) => {
    const room = floorState.rooms[roomIndex];
    return showcase.x >= room.x &&
      showcase.x < room.x + room.width &&
      showcase.y >= room.y &&
      showcase.y < room.y + room.height;
  });
  if (!showcasesInRoom.length) {
    return;
  }

  const selectedShowcase = showcasesInRoom[randomInt(0, showcasesInRoom.length - 1)];
  const lines = DISPLAY_CASE_AMBIENCE[selectedShowcase.item.ambienceId] ?? [];
  if (!lines.length) {
    floorState.showcaseAmbienceSeen[roomIndex] = true;
    return;
  }

  const line = lines[randomInt(0, lines.length - 1)];
  addMessage(line);
  playShowcaseAmbienceSound();
  floorState.showcaseAmbienceSeen[roomIndex] = true;
}

function render() {
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

function toggleCardCollapse(key) {
  if (key === "player") {
    const currentMode = state.collapsedCards.player ?? "summary";
    state.collapsedCards.player = currentMode === "summary"
        ? "full"
        : currentMode === "full"
          ? "hidden"
          : "summary";
    } else if (key === "log") {
      const currentMode = state.collapsedCards.log ?? "compact";
      state.collapsedCards.log = currentMode === "compact"
        ? "full"
        : currentMode === "full"
          ? "hidden"
          : "compact";
    } else {
      state.collapsedCards[key] = !state.collapsedCards[key];
  }
  render();
}

function setInventoryFilter(filter) {
  state.preferences.inventoryFilter = filter;
  render();
}

function renderClassOptions(selectedClassId) {
  classOptionsElement.innerHTML = "";

  Object.values(HERO_CLASSES).forEach((heroClass) => {
    const label = document.createElement("label");
    label.className = `class-option${heroClass.id === selectedClassId ? " selected" : ""}`;
    label.tabIndex = 0;
    const classIconUrl = getHeroClassAssets(heroClass.id).iconUrl;
    label.innerHTML = `
      <input type="radio" name="heroClass" value="${heroClass.id}" ${heroClass.id === selectedClassId ? "checked" : ""}>
      <div class="class-option-art" aria-hidden="true"${classIconUrl ? ` style="--class-icon: url('${classIconUrl}')"` : ""}></div>
      <div class="class-option-copy">
        <strong>${heroClass.label}</strong>
        <span>${heroClass.tagline}</span>
        <span>${heroClass.passiveName}: ${heroClass.passiveSummary}</span>
      </div>
    `;
    const input = label.querySelector('input[name="heroClass"]');
    const applySelection = () => {
      if (!input) {
        return;
      }

      input.checked = true;
      classOptionsElement.querySelectorAll(".class-option").forEach((option) => {
        option.classList.toggle("selected", option === label);
      });
    };
    label.addEventListener("click", applySelection);
    label.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        applySelection();
      }
    });
    input?.addEventListener("change", applySelection);
    classOptionsElement.appendChild(label);
  });
}

function syncStartModalControls() {
  const fallbackName = state?.player?.name ?? loadHeroName();
  const fallbackClassId = state?.player?.classId ?? loadHeroClassId();
  heroNameInputElement.value = fallbackName;
  saveHeroNameButtonElement.textContent = "Betrete den Studiokomplex";
  heroIdentityStatusElement.textContent = "Wird für dieses und das nächste Spiel gemerkt.";
  heroIdentityStatusElement.classList.remove("success");
  renderClassOptions(fallbackClassId);
}

function applyStartProfile() {
  const selectedClass = classOptionsElement.querySelector('input[name="heroClass"]:checked')?.value ?? loadHeroClassId();
  const nextName = saveHeroName(heroNameInputElement.value);
  const nextClassId = saveHeroClassId(selectedClass);

  saveHeroNameButtonElement.textContent = "Gespeichert";
  heroIdentityStatusElement.textContent = `${nextName} startet als ${HERO_CLASSES[nextClassId].label}.`;
  heroIdentityStatusElement.classList.add("success");
  window.clearTimeout(heroIdentityStatusTimeout);
  heroIdentityStatusTimeout = window.setTimeout(() => {
    saveHeroNameButtonElement.textContent = "Betrete den Studiokomplex";
    heroIdentityStatusElement.textContent = "Wird für dieses und das nächste Spiel gemerkt.";
    heroIdentityStatusElement.classList.remove("success");
  }, 1400);

  initializeGame(
    { heroName: nextName, heroClassId: nextClassId },
    { openStartModal: false, clearSavedGame: true, reuseExistingFloor: true },
  );
}

const { bindAppControls } = createUiBindingsApi({
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
  hideDeathModal,
  toggleCardCollapse,
  setInventoryFilter,
  saveCurrentGame,
  loadCurrentGame,
  getState: () => state,
  saveOptions,
  applyStartProfile,
  bindKeyboardInput,
});

function bootstrapApp() {
  bindAppControls();
  initializeGame();
  detectNearbyTraps();
  render();
  syncStartModalControls();
}

bootstrapApp();
