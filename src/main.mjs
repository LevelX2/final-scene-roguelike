import { WIDTH, HEIGHT, TILE_SIZE, TILE_GAP, BOARD_PADDING, ROOM_ATTEMPTS, MIN_ROOM_SIZE, MAX_ROOM_SIZE, LOG_LIMIT, HIGHSCORE_KEY, HIGHSCORE_STORAGE_VERSION, HIGHSCORE_VERSION_KEY, VISION_RADIUS, BASE_HIT_CHANCE, MIN_HIT_CHANCE, MAX_HIT_CHANCE, MIN_CRIT_CHANCE, MAX_CRIT_CHANCE, TILE, MONSTER_CATALOG, WEAPON_CATALOG, OFFHAND_CATALOG } from './data.mjs';
import { startScreenElement, gameHeaderElement, boardElement, gameShellElement, startModalElement, startFormElement, classOptionsElement, heroNameInputElement, saveHeroNameButtonElement, heroIdentityStatusElement, startSavegameStatusElement, landingSavegameStatusElement, messageLogElement, inventoryListElement, playerSheetElement, playerPanelTitleElement, enemySheetElement, highscoreListElement, runStatsSummaryElement, runStatsKillsElement, depthTitleElement, topbarHpCardElement, topbarHpElement, topbarLevelCardElement, topbarLevelElement, topbarDamageCardElement, topbarDamageElement, topbarHitCardElement, topbarHitElement, topbarCritCardElement, topbarCritElement, topbarBlockCardElement, topbarBlockElement, topbarFoodCardElement, topbarFoodElement, topbarStatusSummaryElement, targetModeHintElement, xpLabelElement, xpFillElement, nutritionLabelElement, nutritionFillElement, nutritionStateElement, playerStatusSummaryElement, choiceModalElement, choiceTitleElement, choiceTextElement, choiceDrinkButton, choiceStoreButton, choiceLeaveButton, stairsModalElement, stairsTitleElement, stairsTextElement, stairsConfirmButton, stairsStayButton, inventoryModalElement, runStatsModalElement, startNewGameButton, loadGameFromLandingButtonElement, openHighscoresLandingButton, openHelpLandingButton, openRunStatsButton, closeRunStatsButton, openInventoryButton, closeInventoryButton, saveGameQuickButtonElement, startFreshRunButton, inventoryFilterButtons, optionsModalElement, openOptionsButton, closeOptionsButton, saveGameButtonElement, loadGameButtonElement, savegameStatusElement, helpModalElement, openHelpButton, closeHelpButton, highscoresModalElement, openHighscoresButton, closeHighscoresButton, toggleStepSoundElement, toggleDeathSoundElement, toggleVoiceAnnouncementsElement, deathModalElement, deathSummaryElement, openDeathKillsButton, closeDeathButton, hoverTooltipElement, collapsibleCards } from './dom.mjs';
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
import { createAppBootstrap } from './app/bootstrap.mjs';
import { assembleCoreModules } from './app/core-assembly.mjs';
import { assembleGameplayModules } from './app/gameplay-assembly.mjs';
import { assembleInterfaceModules } from './app/interface-assembly.mjs';
import { createRuntimeActionsApi } from './app/runtime-actions.mjs';
import { createRuntimeContext } from './app/runtime-context.mjs';
import { createRuntimeRandomApi } from './app/runtime-random.mjs';
import { createRenderCycleApi } from './app/render-cycle.mjs';
import { createShowcaseAmbienceApi } from './app/showcase-ambience.mjs';
import { createStartFlowApi } from './app/start-flow.mjs';
import { createRuntimeSupportApi } from './app/runtime-support.mjs';
import { createUiPreferencesApi } from './app/ui-preferences.mjs';
import { createBareHandsWeapon, cloneOffHandItem, getMainHand, getOffHand, getCombatWeapon, createEquipmentPresentationHelpers } from './equipment-helpers.mjs';
import { clamp, randomInt, createGrid, carveRoom, carveTunnel, roomsOverlap } from './utils.mjs';
import { buildStudioAnnouncement, formatArchetypeLabel, formatStudioLabel, formatStudioWithArchetype, getArchetypeForFloor } from './studio-theme.mjs';

let state;
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

const runtimeActionsApi = createRuntimeActionsApi();
const runtimeRandomApi = createRuntimeRandomApi();
let playDeathSound = null;
let saveHighscoreIfNeeded = null;
let showDeathModal = null;

const {
  countPotionsInInventory,
  countFoodInInventory,
} = createInventoryStatsApi({
  getState: () => state,
});

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

const runtimeSupportApi = createRuntimeSupportApi({
  getState: () => state,
  LOG_LIMIT,
  getNutritionMax,
  getNutritionStart,
  clampNutritionValue,
  getHungerState,
  getHungerStateMessage,
  HUNGER_STATE,
  NUTRITION_COST_PER_ACTION,
  DAMAGE_PER_ACTION_WHILE_DYING,
  showFloatingText: (...args) => runtimeActionsApi.runtimeBindings.showFloatingText(...args),
  getPlayDeathSound: () => playDeathSound,
  getSaveHighscoreIfNeeded: () => saveHighscoreIfNeeded,
  getShowDeathModal: () => showDeathModal,
});

function render(...args) {
  return runtimeActionsApi.render(...args);
}

function getShowcaseAt(...args) {
  return runtimeActionsApi.getShowcaseAt(...args);
}

function maybeTriggerShowcaseAmbience(...args) {
  return runtimeActionsApi.maybeTriggerShowcaseAmbience(...args);
}

function focusGameSurface() {
  if (document.activeElement instanceof HTMLElement && document.activeElement !== document.body) {
    document.activeElement.blur();
  }
  boardElement.tabIndex = -1;
  boardElement.focus({ preventScroll: true });
}

const runtimeContext = createRuntimeContext({
  factories: {
    createItemizationApi,
    createAudioService,
    createDoorService,
    createTrapsApi,
    createDungeonApi,
    createVisibilityService,
    createStateApi,
    createSavegameService,
    createRenderApi,
    createModalController,
    createInputController,
    createCombatApi,
    createAiApi,
    createItemsApi,
    createFloorTransitionService,
    createPlayerTurnController,
    createTestApi,
  },
  config: {
    WIDTH,
    HEIGHT,
    TILE_SIZE,
    TILE_GAP,
    BOARD_PADDING,
    ROOM_ATTEMPTS,
    MIN_ROOM_SIZE,
    MAX_ROOM_SIZE,
    HIGHSCORE_KEY,
    HIGHSCORE_STORAGE_VERSION,
    HIGHSCORE_VERSION_KEY,
    VISION_RADIUS,
    BASE_HIT_CHANCE,
    MIN_HIT_CHANCE,
    MAX_HIT_CHANCE,
    MIN_CRIT_CHANCE,
    MAX_CRIT_CHANCE,
    TILE,
    MONSTER_CATALOG,
    WEAPON_CATALOG,
    OFFHAND_CATALOG,
    DOOR_TYPE,
    LOCK_COLORS,
    PROP_CATALOG,
    DISPLAY_CASE_AMBIENCE,
    HERO_CLASSES,
    getUnlockedMonsterRank,
    getEnemyCountForFloor,
    getPotionCountForFloor,
    shouldSpawnFloorWeapon,
    shouldSpawnChest,
    getChestCountForFloor,
    getLockedDoorCountForFloor,
    shouldPlaceLockedRoomChest,
    getLevelUpRewards,
    NON_ICONIC_MONSTER_WEIGHT_BONUS,
    ICONIC_MONSTER_WEIGHT_PENALTY,
    ITEM_RARITY_MODIFIER_COUNTS,
    getEquipmentRarityWeights,
    buildFoodItemsForBudget,
    rollFoodBudget,
    splitFoodBudget,
    rollMonsterPlannedDrop,
    ITEM_DEFS,
    OPTIONS_KEY,
    HERO_NAME_KEY,
    HERO_CLASS_KEY,
    DEFAULT_HERO_NAME,
    DEFAULT_HERO_CLASS,
    CHOICE_ACTIONS,
    STAIR_ACTIONS,
    formatStudioLabel,
    formatArchetypeLabel,
    buildStudioAnnouncement,
    getArchetypeForFloor,
  },
  ui: {
    startScreenElement,
    gameHeaderElement,
    boardElement,
    gameShellElement,
    startModalElement,
    startFormElement,
    classOptionsElement,
    heroNameInputElement,
    saveHeroNameButtonElement,
    heroIdentityStatusElement,
    startSavegameStatusElement,
    landingSavegameStatusElement,
    messageLogElement,
    inventoryListElement,
    playerSheetElement,
    playerPanelTitleElement,
    enemySheetElement,
    highscoreListElement,
    runStatsSummaryElement,
    runStatsKillsElement,
    depthTitleElement,
    topbarHpCardElement,
    topbarHpElement,
    topbarLevelCardElement,
    topbarLevelElement,
    topbarDamageCardElement,
    topbarDamageElement,
    topbarHitCardElement,
    topbarHitElement,
    topbarCritCardElement,
    topbarCritElement,
    topbarBlockCardElement,
    topbarBlockElement,
    topbarFoodCardElement,
    topbarFoodElement,
    topbarStatusSummaryElement,
    targetModeHintElement,
    xpLabelElement,
    xpFillElement,
    nutritionLabelElement,
    nutritionFillElement,
    nutritionStateElement,
    playerStatusSummaryElement,
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
    inventoryModalElement,
    runStatsModalElement,
    startNewGameButton,
    loadGameFromLandingButtonElement,
    openHighscoresLandingButton,
    openHelpLandingButton,
    openRunStatsButton,
    closeRunStatsButton,
    openInventoryButton,
    closeInventoryButton,
    saveGameQuickButtonElement,
    startFreshRunButton,
    inventoryFilterButtons,
    optionsModalElement,
    openOptionsButton,
    closeOptionsButton,
    saveGameButtonElement,
    loadGameButtonElement,
    savegameStatusElement,
    helpModalElement,
    openHelpButton,
    closeHelpButton,
    highscoresModalElement,
    openHighscoresButton,
    closeHighscoresButton,
    toggleStepSoundElement,
    toggleDeathSoundElement,
    toggleVoiceAnnouncementsElement,
    deathModalElement,
    deathSummaryElement,
    openDeathKillsButton,
    closeDeathButton,
    hoverTooltipElement,
    collapsibleCards,
    focusGameSurface,
  },
  runtime: {
    getState: () => state,
    setState: (nextState) => {
      state = nextState;
    },
    getCurrentFloorState: runtimeSupportApi.getCurrentFloorState,
    addMessage: runtimeSupportApi.addMessage,
    renderSelf: () => render(),
    randomChance: runtimeRandomApi.randomChance,
    randomInt,
    createGrid,
    carveRoom,
    carveTunnel,
    roomsOverlap,
    clamp,
    rollPercent: runtimeRandomApi.rollPercent,
    getHungerStateLabel,
    ...runtimeActionsApi.runtimeBindings,
    getShowcaseAt,
    maybeTriggerShowcaseAmbience,
    healPlayer: (...args) => healPlayer(...args),
    refreshNutritionState: (...args) => runtimeSupportApi.refreshNutritionState(...args),
    grantExperience: (...args) => grantExperience(...args),
    createDeathCause: (...args) => createDeathCause(...args),
    saveHighscoreIfNeeded: () => saveHighscoreIfNeeded(),
    noteMonsterEncounter: runtimeSupportApi.noteMonsterEncounter,
    restoreNutrition: runtimeSupportApi.restoreNutrition,
    applyItemStatMods,
    applyPlayerNutritionTurnCost: runtimeSupportApi.applyPlayerNutritionTurnCost,
    countPotionsInInventory,
    countFoodInInventory,
    setRandomSequence: runtimeRandomApi.setRandomSequence,
    clearRandomSequence: runtimeRandomApi.clearRandomSequence,
    syncStartModalControls: (...args) => syncStartModalControls(...args),
    closeStartModal: (...args) => closeStartModal(...args),
    returnToStartScreen: (...args) => returnToStartScreen(...args),
  },
  equipment: {
    createBareHandsWeapon,
    cloneOffHandItem,
    getMainHand,
    getOffHand,
    getCombatWeapon,
  },
});

Object.assign(runtimeContext.core, assembleCoreModules(runtimeContext));
playDeathSound = runtimeContext.core.playDeathSound;
saveHighscoreIfNeeded = runtimeContext.core.saveHighscoreIfNeeded;

const {
  formatRarityLabel,
  generateEquipmentItem,
  getItemModifierSummary,
  getWeaponConditionalDamageBonus,
  itemHasModifier,
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
  createDeathCause,
  xpForNextLevel,
  initializeGame,
  formatSavegameSummary,
  updateSavegameControls,
  saveCurrentGame,
  loadCurrentGame,
} = runtimeContext.core;

Object.assign(runtimeContext.presentation, createEquipmentPresentationHelpers({
  formatRarityLabel,
  getItemModifierSummary,
}));

const {
  formatWeaponStats,
  formatOffHandStats,
  getOffHandTooltipLines,
} = runtimeContext.presentation;

Object.assign(runtimeContext.interface, assembleInterfaceModules(runtimeContext));

const interfaceApi = runtimeContext.interface;
showDeathModal = interfaceApi.showDeathModal;

const {
  getPlayerCombatSummary,
  getActorStatusDisplay,
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
  hideDeathModal,
  restartRun,
  confirmRestartRun,
  leaveToStartScreen,
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
  bindKeyboardInput,
} = interfaceApi;

Object.assign(runtimeContext.gameplay, assembleGameplayModules(runtimeContext));

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
} = runtimeContext.gameplay;

const showcaseAmbienceApi = createShowcaseAmbienceApi({
  getState: () => state,
  getCurrentFloorState: runtimeSupportApi.getCurrentFloorState,
  DISPLAY_CASE_AMBIENCE,
  randomInt,
  addMessage: runtimeSupportApi.addMessage,
  showFloatingText: (...args) => runtimeActionsApi.runtimeBindings.showFloatingText(...args),
  playShowcaseAmbienceSound,
});
runtimeActionsApi.bindShowcaseAmbienceApi(showcaseAmbienceApi);

const renderCycleApi = createRenderCycleApi({
  getState: () => state,
  syncTestApi,
  getPlayerCombatSummary,
  getCurrentStudioArchetypeId: runtimeSupportApi.getCurrentStudioArchetypeId,
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
  topbarStatusSummaryElement,
  targetModeHintElement,
  xpLabelElement,
  xpFillElement,
  nutritionLabelElement,
  nutritionFillElement,
  nutritionStateElement,
  playerStatusSummaryElement,
  topbarFoodCardElement,
  getActorStatusDisplay,
  getHungerStateLabel,
  HUNGER_STATE,
  renderPlayerSheet,
  renderEnemySheet,
  renderInventory,
  renderHighscores,
  renderRunStats,
  renderLog,
  startScreenElement,
  gameHeaderElement,
  startFreshRunButton,
  inventoryModalElement,
  runStatsModalElement,
  optionsModalElement,
  helpModalElement,
  highscoresModalElement,
  startModalElement,
  gameShellElement,
  stairsModalElement,
  deathModalElement,
  toggleStepSoundElement,
  toggleDeathSoundElement,
  toggleVoiceAnnouncementsElement,
  updateSavegameControls,
  collapsibleCards,
  updatePotionChoiceSelection,
});
runtimeActionsApi.setRender(renderCycleApi.render);

const { toggleCardCollapse, setInventoryFilter } = createUiPreferencesApi({
  getState: () => state,
  renderSelf: () => render(),
});

const { syncStartModalControls, openStartModal, closeStartModal, returnToStartScreen, applyStartProfile } = createStartFlowApi({
  HERO_CLASSES,
  getHeroClassAssets,
  classOptionsElement,
  heroNameInputElement,
  saveHeroNameButtonElement,
  heroIdentityStatusElement,
  loadHeroName,
  loadHeroClassId,
  saveHeroName,
  saveHeroClassId,
  initializeGame,
  getState: () => state,
  renderSelf: () => render(),
  focusGameSurface,
});

const { bindAppControls } = createUiBindingsApi({
  choiceDrinkButton,
  choiceStoreButton,
  choiceLeaveButton,
  stairsConfirmButton,
  stairsStayButton,
  openInventoryButton,
  closeInventoryButton,
  saveGameQuickButtonElement,
  openRunStatsButton,
  closeRunStatsButton,
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
  hideDeathModal,
  toggleCardCollapse,
  setInventoryFilter,
  saveCurrentGame,
  loadCurrentGame,
  getState: () => state,
  saveOptions,
  openStartModal,
  applyStartProfile,
  bindKeyboardInput,
});

const { bootstrapApp } = createAppBootstrap({
  bindAppControls,
  initializeGame,
  detectNearbyTraps,
  renderSelf: () => render(),
  syncStartModalControls,
});

bootstrapApp();
