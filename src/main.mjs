import { WIDTH, HEIGHT, TILE_SIZE, TILE_GAP, BOARD_PADDING, ROOM_ATTEMPTS, MIN_ROOM_SIZE, MAX_ROOM_SIZE, LOG_LIMIT, HIGHSCORE_KEY, HIGHSCORE_STORAGE_VERSION, HIGHSCORE_VERSION_KEY, VISION_RADIUS, BASE_HIT_CHANCE, MIN_HIT_CHANCE, MAX_HIT_CHANCE, MIN_CRIT_CHANCE, MAX_CRIT_CHANCE, TILE, MONSTER_CATALOG, WEAPON_CATALOG, OFFHAND_CATALOG } from './data.mjs';
import { boardElement, startModalElement, startFormElement, classOptionsElement, heroNameInputElement, saveHeroNameButtonElement, loadGameFromStartButtonElement, heroIdentityStatusElement, startSavegameStatusElement, messageLogElement, inventoryListElement, playerSheetElement, playerPanelTitleElement, enemySheetElement, highscoreListElement, runStatsSummaryElement, runStatsKillsElement, depthTitleElement, topbarHpCardElement, topbarHpElement, topbarLevelCardElement, topbarLevelElement, topbarDamageCardElement, topbarDamageElement, topbarHitCardElement, topbarHitElement, topbarCritCardElement, topbarCritElement, topbarBlockCardElement, topbarBlockElement, topbarFoodCardElement, topbarFoodElement, xpLabelElement, xpFillElement, nutritionLabelElement, nutritionFillElement, nutritionStateElement, choiceModalElement, choiceTitleElement, choiceTextElement, choiceDrinkButton, choiceStoreButton, choiceLeaveButton, stairsModalElement, stairsTitleElement, stairsTextElement, stairsConfirmButton, stairsStayButton, inventoryModalElement, runStatsModalElement, openRunStatsButton, closeRunStatsButton, openInventoryButton, closeInventoryButton, startFreshRunButton, inventoryFilterButtons, optionsModalElement, openOptionsButton, closeOptionsButton, saveGameButtonElement, loadGameButtonElement, savegameStatusElement, helpModalElement, openHelpButton, closeHelpButton, highscoresModalElement, openHighscoresButton, closeHighscoresButton, toggleStepSoundElement, toggleDeathSoundElement, deathModalElement, deathSummaryElement, deathKillsElement, deathKillsModalElement, restartFromDeathButton, openDeathKillsButton, closeDeathKillsButton, closeDeathButton, hoverTooltipElement, collapsibleCards } from './dom.mjs';
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
import { createInputController } from './application/input-controller.mjs';
import { createSavegameService } from './application/savegame-service.mjs';
import { createVisibilityService } from './application/visibility-service.mjs';
import { createModalController } from './application/modal-controller.mjs';
import { createBareHandsWeapon, cloneOffHandItem, getMainHand, getOffHand, getCombatWeapon, createEquipmentPresentationHelpers } from './equipment-helpers.mjs';
import { clamp, randomInt, createGrid, carveRoom, carveTunnel, roomsOverlap } from './utils.mjs';

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
const resolvePotionChoiceAction = createDeferredAction("resolvePotionChoice");
const useInventoryItemAction = createDeferredAction("useInventoryItem");
const quickUsePotionAction = createDeferredAction("quickUsePotion");

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
    getDoorAt,
    isDoorClosed,
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
    moveToFloor: (...args) => moveToFloor(...args),
    endTurn: (...args) => endTurn(...args),
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
    movePlayer: (...args) => movePlayer(...args),
    handleWait: () => handleWait(),
    tryCloseAdjacentDoor: () => tryCloseAdjacentDoor(),
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
    endTurn,
    healPlayer: combatApi.healPlayer,
    restoreNutrition,
    refreshNutritionState,
    renderSelf: () => render(),
  });
  resolvePotionChoiceAction.set(itemsApi.resolvePotionChoice);
  useInventoryItemAction.set(itemsApi.useInventoryItem);
  quickUsePotionAction.set(itemsApi.quickUsePotion);

  const testApi = createTestApi({
    WIDTH,
    HEIGHT,
    TILE,
    getState: () => state,
    getCurrentFloorState,
    getMainHand,
    getOffHand,
    countPotionsInInventory,
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
    tryUseStairs,
    renderSelf: () => render(),
  });

  return {
    ...combatApi,
    ...aiApi,
    ...itemsApi,
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
  openChest,
  resolvePotionChoice,
  useInventoryItem,
  quickUsePotion,
  syncTestApi,
} = assembleGameplayModules();

function addMessage(text, tone = "") {
  state.messages.unshift({ text, tone });
  state.messages = state.messages.slice(0, LOG_LIMIT);
}

function countPotionsInInventory() {
  return state.inventory.filter((item) => item.type === "potion").length;
}

function countFoodInInventory() {
  return state.inventory.filter((item) => item.type === "food").length;
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
    state.deathCause = "verhungerte in den Kulissen des Dungeons.";
    playDeathSound();
    const rank = saveHighscoreIfNeeded();
    addMessage("Du bist verhungert. Drücke R für einen neuen Versuch.", "danger");
    showDeathModal(rank);
  }
}

function getCurrentFloorState() {
  return state.floors[state.floor];
}

function getDoorAt(x, y, floorState = getCurrentFloorState()) {
  return floorState?.doors?.find((door) => door.x === x && door.y === y) ?? null;
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

function isDoorClosed(door) {
  return Boolean(door) && !door.isOpen;
}

function hasKeyForDoor(door, entity = state.player) {
  if (!door) {
    return false;
  }

  return entity === state.player && state.inventory.some((item) =>
    item.type === "key" &&
    item.keyColor === door.lockColor &&
    item.keyFloor === state.floor
  );
}

function consumeKeyForDoor(door, entity = state.player) {
  if (entity !== state.player || !door) {
    return null;
  }

  const keyIndex = state.inventory.findIndex((item) =>
    item.type === "key" &&
    item.keyColor === door.lockColor &&
    item.keyFloor === state.floor
  );

  if (keyIndex === -1) {
    return null;
  }

  const [usedKey] = state.inventory.splice(keyIndex, 1);
  return usedKey ?? null;
}

function getDoorColorLabels(color) {
  if (color === "green") {
    return { adjective: "grüne", adjectiveDative: "grüne", key: "grüner" };
  }

  if (color === "blue") {
    return { adjective: "blaue", adjectiveDative: "blauen", key: "blauer" };
  }

  return { adjective: color, adjectiveDative: color, key: color };
}

function canPlayerOpenDoor(door) {
  if (!door) {
    return true;
  }

  if (door.isOpen) {
    return true;
  }

  if (door.doorType === DOOR_TYPE.LOCKED) {
    return hasKeyForDoor(door);
  }

  return true;
}

function openDoor(door, actor = "player") {
  if (!door || door.isOpen) {
    return true;
  }

  let usedKey = null;
  if (door.doorType === DOOR_TYPE.LOCKED) {
    usedKey = consumeKeyForDoor(door);
    if (!usedKey) {
      return false;
    }
  }

  if (door.doorType === DOOR_TYPE.LOCKED && !usedKey) {
    return false;
  }

  door.isOpen = true;
  playDoorOpenSound();
  if (actor === "player") {
    const colorLabels = getDoorColorLabels(door.lockColor);
    addMessage(
      door.doorType === DOOR_TYPE.LOCKED
        ? `Der ${colorLabels.key} Schlüssel von Ebene ${usedKey.keyFloor} entriegelt die Tür und wird verbraucht.`
        : "Die Tür schwingt auf.",
      "important",
    );
  } else {
    addMessage(`${actor.name} drückt eine Tür auf.`, "danger");
  }
  if (door.doorType === DOOR_TYPE.LOCKED) {
    door.doorType = DOOR_TYPE.NORMAL;
    door.lockColor = null;
  }
  return true;
}

function closeDoor(door) {
  if (!door || !door.isOpen) {
    return false;
  }

  const floorState = getCurrentFloorState();
  const occupiedByEnemy = floorState.enemies.some((enemy) => enemy.x === door.x && enemy.y === door.y);
  const occupiedByPlayer = state.player.x === door.x && state.player.y === door.y;
  if (occupiedByEnemy || occupiedByPlayer) {
    return false;
  }

  door.isOpen = false;
  playDoorCloseSound();
  return true;
}

function render() {
  syncTestApi();
  const combatSummary = getPlayerCombatSummary();
  const hungerClass = `state-${String(state.player.hungerState ?? HUNGER_STATE.NORMAL).toLowerCase()}`;
  updateVisibility();
  renderBoard();
  depthTitleElement.textContent = `Dungeon-Ebene ${state.floor}`;
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

function ensureFloorExists(floorNumber) {
  if (!state.floors[floorNumber]) {
    state.floors[floorNumber] = createDungeonLevel(floorNumber);
  }
}

function transferFloorFollower(fromFloor, targetFloor, sourceStair, targetStair) {
  const sourceFloor = state.floors[fromFloor];
  const destinationFloor = state.floors[targetFloor];
  if (!sourceFloor || !destinationFloor || !sourceStair || !targetStair) {
    return null;
  }

  const follower = sourceFloor.enemies.find((enemy) =>
    enemy.canChangeFloors &&
    enemy.aggro &&
    manhattanDistance(enemy, sourceStair) <= 2
  );

  if (!follower) {
    return null;
  }

  const occupied = destinationFloor.enemies.some((enemy) => enemy.x === targetStair.x && enemy.y === targetStair.y) ||
    (state.player.x === targetStair.x && state.player.y === targetStair.y);
  if (occupied) {
    return null;
  }

  sourceFloor.enemies = sourceFloor.enemies.filter((enemy) => enemy !== follower);
  follower.x = targetStair.x;
  follower.y = targetStair.y;
  follower.originX = targetStair.x;
  follower.originY = targetStair.y;
  destinationFloor.enemies.push(follower);
  return follower;
}

function moveToFloor(direction) {
  const currentFloorState = getCurrentFloorState();
  const targetFloor = state.floor + direction;
  state.safeRestTurns = 0;
  const sourceStair = direction > 0 ? currentFloorState.stairsDown : currentFloorState.stairsUp;

  if (direction > 0) {
    ensureFloorExists(targetFloor);
    state.floor = targetFloor;
    state.deepestFloor = Math.max(state.deepestFloor, state.floor);
    const targetStair = state.floors[targetFloor].stairsUp
      ? state.floors[targetFloor].stairsUp
      : state.floors[targetFloor].startPosition;
    state.player.x = targetStair.x;
    state.player.y = targetStair.y;
    detectNearbyTraps();
    maybeTriggerShowcaseAmbience();
    const follower = transferFloorFollower(targetFloor - 1, targetFloor, sourceStair, targetStair);
    addMessage(`Du steigst tiefer hinab. Dungeon-Ebene ${state.floor} beginnt.`, "important");
    if (follower) {
      addMessage(`${follower.name} folgt dir über die Treppe.`, "danger");
    }
    return true;
  }

  if (direction < 0 && currentFloorState.stairsUp && state.floor > 1) {
    state.floor = targetFloor;
    const targetStair = state.floors[targetFloor].stairsDown;
    state.player.x = targetStair.x;
    state.player.y = targetStair.y;
    detectNearbyTraps();
    maybeTriggerShowcaseAmbience();
    const follower = transferFloorFollower(targetFloor + 1, targetFloor, sourceStair, targetStair);
    addMessage(`Du steigst vorsichtig wieder auf Ebene ${state.floor}.`, "important");
    if (follower) {
      addMessage(`${follower.name} setzt dir weiter nach.`, "danger");
    }
    return true;
  }

  return false;
}

function tryUseStairs() {
  const floorState = getCurrentFloorState();

  if (floorState.stairsDown && floorState.stairsDown.x === state.player.x && floorState.stairsDown.y === state.player.y) {
    showStairChoice({
      direction: 1,
      title: "Abwärtstreppe",
      text: `Du stehst auf einer Treppe nach unten. Möchtest du auf Ebene ${state.floor + 1} hinabsteigen oder hier bleiben?`,
      confirmLabel: "Hinabsteigen",
      stayLabel: "Hier bleiben",
    });
    render();
    return true;
  }

  if (floorState.stairsUp && floorState.stairsUp.x === state.player.x && floorState.stairsUp.y === state.player.y) {
    showStairChoice({
      direction: -1,
      title: "Aufwärtstreppe",
      text: `Du stehst auf einer Treppe nach oben. Möchtest du auf Ebene ${state.floor - 1} hinaufsteigen oder hier bleiben?`,
      confirmLabel: "Hinaufsteigen",
      stayLabel: "Hier bleiben",
    });
    render();
    return true;
  }

  return false;
}

function endTurn({ skipEnemyMove = false, actionType = "other" } = {}) {
  state.turn += 1;
  if (!state.gameOver) {
    applyPlayerNutritionTurnCost();
  }
  if (!state.gameOver && !skipEnemyMove) {
    moveEnemies();
  }
  if (!state.gameOver) {
    processContinuousTraps();
  }
  if (!state.gameOver) {
    processSafeRegeneration(actionType);
  }
  render();
}

function tryCloseAdjacentDoor() {
  if (state.gameOver || state.modals.startOpen || state.pendingChoice || state.pendingStairChoice || state.modals.inventoryOpen || state.modals.runStatsOpen || state.modals.optionsOpen || state.modals.helpOpen || state.modals.highscoresOpen || state.modals.deathKillsOpen) {
    return;
  }

  const floorState = getCurrentFloorState();
  const adjacentDoors = (floorState.doors ?? []).filter((door) =>
    door.isOpen &&
    manhattanDistance(door, state.player) === 1
  );

  if (adjacentDoors.length === 0) {
    addMessage("Keine offene Tür direkt neben dir.");
    render();
    return;
  }

  const targetDoor = adjacentDoors[0];
  if (!closeDoor(targetDoor)) {
    addMessage("Die Tür lässt sich gerade nicht schließen.");
    render();
    return;
  }

  addMessage("Du ziehst die Tür wieder zu.", "important");
  endTurn({ actionType: "other" });
}

function movePlayer(dx, dy) {
  if (state.gameOver || state.modals.startOpen || state.pendingChoice || state.pendingStairChoice || state.modals.inventoryOpen || state.modals.runStatsOpen || state.modals.helpOpen || state.modals.highscoresOpen || state.modals.deathKillsOpen) {
    return;
  }

  const floorState = getCurrentFloorState();
  const targetX = state.player.x + dx;
  const targetY = state.player.y + dy;

  if (targetX < 0 || targetX >= WIDTH || targetY < 0 || targetY >= HEIGHT) {
    return;
  }

  if (floorState.grid[targetY][targetX] === TILE.WALL) {
    addMessage("Nur kalter Stein. Dort kommst du nicht durch.");
    render();
    return;
  }

  const door = getDoorAt(targetX, targetY, floorState);
  if (door && !door.isOpen) {
    if (!canPlayerOpenDoor(door)) {
      playLockedDoorSound();
      const hasWrongFloorKey = state.inventory.some((item) =>
        item.type === "key" &&
        item.keyColor === door.lockColor &&
        item.keyFloor !== state.floor
      );
      addMessage(
        hasWrongFloorKey
          ? `Die ${getDoorColorLabels(door.lockColor).adjective} Tür reagiert nicht auf deinen Schlüssel von einer anderen Ebene.`
          : `Die ${getDoorColorLabels(door.lockColor).adjective} Tür bleibt verschlossen.`,
      );
      render();
      return;
    }

    openDoor(door, "player");
  }

  if (getShowcaseAt(targetX, targetY, floorState)) {
    addMessage("Eine Glasvitrine versperrt dir hier den Weg.");
    render();
    return;
  }

  const enemy = floorState.enemies.find((entry) => entry.x === targetX && entry.y === targetY);
  if (enemy) {
    attackEnemy(enemy);
    endTurn({ actionType: "other" });
    return;
  }

  state.player.x = targetX;
  state.player.y = targetY;
  playStepSound();

  handleActorEnterTile(state.player);
  if (state.gameOver) {
    render();
    return;
  }
  detectNearbyTraps();
  maybeTriggerShowcaseAmbience();

  if (tryPickupLoot()) {
    return;
  }

  const stairPromptShown = tryUseStairs();
  if (stairPromptShown) {
    return;
  }

  endTurn({ actionType: "move" });
}

function handleWait() {
  if (state.gameOver || state.modals.startOpen || state.pendingChoice || state.pendingStairChoice || state.modals.inventoryOpen || state.modals.runStatsOpen || state.modals.helpOpen || state.modals.highscoresOpen || state.modals.deathKillsOpen) {
    return;
  }

  if (hasNearbyEnemy()) {
    addMessage("Du wartest, aber in der Nähe ist noch Gefahr.");
  } else {
    addMessage("Du horchst in die Dunkelheit und sammelst langsam wieder Kraft.");
  }
  playStepSound();
  detectNearbyTraps();
  endTurn({ actionType: "wait" });
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
  saveHeroNameButtonElement.textContent = "Start";
  heroIdentityStatusElement.textContent = "Wird für den aktuellen und den nächsten Lauf gemerkt.";
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
    saveHeroNameButtonElement.textContent = "Start";
    heroIdentityStatusElement.textContent = "Wird für den aktuellen und den nächsten Lauf gemerkt.";
    heroIdentityStatusElement.classList.remove("success");
  }, 1400);

  initializeGame({ heroName: nextName, heroClassId: nextClassId }, { openStartModal: false, clearSavedGame: true });
}

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
  closeDeathButton.addEventListener("click", () => hideDeathModal());
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
    state.options.stepSound = toggleStepSoundElement.checked;
    saveOptions();
  });
  toggleDeathSoundElement.addEventListener("change", () => {
    state.options.deathSound = toggleDeathSoundElement.checked;
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

function bindAppControls() {
  bindChoiceControls();
  bindModalControls();
  bindInventoryControls();
  bindCollapsibleCardControls();
  bindTopbarTooltips();
  bindOptionControls();
  bindStartControls();
  bindKeyboardInput(document);
}

function bootstrapApp() {
  bindAppControls();
  initializeGame();
  detectNearbyTraps();
  render();
  syncStartModalControls();
}

bootstrapApp();
