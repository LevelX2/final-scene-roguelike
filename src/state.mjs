import { xpForNextLevel, resolveHeroClassId } from './balance.mjs';
import { createBrowserStorageApi } from './application/browser-storage.mjs';
import { createStatePersistenceApi } from './application/state-persistence.mjs';
import { getNutritionMax, getNutritionStart, getHungerState } from './nutrition.mjs';
import { rollStudioArchetypeId } from './studio-theme.mjs';

export function createStateApi(context) {
  const {
    HIGHSCORE_KEY,
    HIGHSCORE_STORAGE_VERSION,
    HIGHSCORE_VERSION_KEY,
    OPTIONS_KEY,
    HERO_NAME_KEY,
    HERO_CLASS_KEY,
    DEFAULT_HERO_NAME,
    DEFAULT_HERO_CLASS,
    HERO_CLASSES,
    getState,
    setState,
    createBareHandsWeapon,
    createDungeonLevel,
    updateVisibility,
    addMessage,
    renderSelf,
    randomInt,
  } = context;
  const HIGHSCORE_LAST_ENTRY_KEY = "dungeon-rogue-highscores-last-entry";
  const SAVEGAME_KEY = "dungeon-rogue-savegame";
  const SAVEGAME_VERSION = 1;
  const DEFAULT_OPTIONS = {
    stepSound: true,
    deathSound: true,
  };
  const storageApi = createBrowserStorageApi();

  function readStorage(key) {
    return storageApi.readStorage(key);
  }

  function writeStorage(key, value) {
    return storageApi.writeStorage(key, value);
  }

  function removeStorage(key) {
    return storageApi.removeStorage(key);
  }

  function normalizeHeroName(name) {
    const trimmed = String(name ?? "").trim().replace(/\s+/g, " ");
    return trimmed.slice(0, 24) || DEFAULT_HERO_NAME;
  }

  function loadHeroName() {
    return normalizeHeroName(readStorage(HERO_NAME_KEY));
  }

  function saveHeroName(name) {
    const normalized = normalizeHeroName(name);
    writeStorage(HERO_NAME_KEY, normalized);
    return normalized;
  }

  function loadHeroClassId() {
    const saved = readStorage(HERO_CLASS_KEY);
    return resolveHeroClassId(saved, DEFAULT_HERO_CLASS);
  }

  function saveHeroClassId(classId) {
    const nextClassId = resolveHeroClassId(classId, DEFAULT_HERO_CLASS);
    writeStorage(HERO_CLASS_KEY, nextClassId);
    return nextClassId;
  }

  function createPlayerFromProfile(heroName, heroClassId) {
    const resolvedClassId = resolveHeroClassId(heroClassId, DEFAULT_HERO_CLASS);
    const heroClass = HERO_CLASSES[resolvedClassId] ?? HERO_CLASSES[DEFAULT_HERO_CLASS];
    return {
      name: heroName,
      classId: resolvedClassId,
      classLabel: heroClass.label,
      classTagline: heroClass.tagline,
      classPassiveName: heroClass.passiveName,
      classPassiveSummary: heroClass.passiveSummary,
      classPassiveDescription: heroClass.passiveDescription,
      x: 0,
      y: 0,
      maxHp: heroClass.maxHp,
      hp: heroClass.maxHp,
      level: 1,
      xp: 0,
      xpToNext: xpForNextLevel(1),
      strength: heroClass.strength,
      precision: heroClass.precision,
      reaction: heroClass.reaction,
      nerves: heroClass.nerves,
      intelligence: heroClass.intelligence,
      endurance: heroClass.endurance ?? 0,
      openingStrikeHitBonus: heroClass.openingStrikeHitBonus ?? 0,
      openingStrikeCritBonus: heroClass.openingStrikeCritBonus ?? 0,
      trapDamageReduction: heroClass.trapDamageReduction ?? 0,
      trapDetectionBonus: heroClass.trapDetectionBonus ?? 0,
      trapAvoidBonus: heroClass.trapAvoidBonus ?? 0,
      shieldBlockBonus: heroClass.shieldBlockBonus ?? 0,
      mainHand: createBareHandsWeapon(),
      offHand: null,
    };
  }

  function createDefaultModals(openStartModal = true) {
    return {
      inventoryOpen: false,
      runStatsOpen: false,
      optionsOpen: false,
      helpOpen: false,
      highscoresOpen: false,
      deathKillsOpen: false,
      startOpen: openStartModal,
    };
  }

  function createDefaultCollapsedCards() {
    return {
      player: "summary",
      enemy: false,
      log: "compact",
    };
  }

  function createDefaultPreferences() {
    return {
      potionAction: "drink",
      foodAction: "eat",
      inventoryFilter: "all",
    };
  }

  function createFreshState(heroName, heroClassId, options = {}) {
    const openStartModal = options.openStartModal ?? true;
    return {
      floor: 1,
      deepestFloor: 1,
      turn: 0,
      messages: [],
      inventory: [],
      floatingTexts: [],
      gameOver: false,
      safeRestTurns: 0,
      pendingChoice: null,
      pendingStairChoice: null,
      deathCause: null,
      scoreSaved: false,
      kills: 0,
      killStats: {},
      damageDealt: 0,
      damageTaken: 0,
      xpGained: 0,
      openedChests: 0,
      consumedPotions: 0,
      consumedFoods: 0,
      knownMonsterTypes: {},
      seenMonsterCounts: {},
      lastScoreRank: null,
      modals: createDefaultModals(openStartModal),
      collapsedCards: createDefaultCollapsedCards(),
      options: loadOptions(),
      floors: {},
      preferences: createDefaultPreferences(),
      player: createPlayerFromProfile(heroName, heroClassId),
    };
  }

  const persistenceApi = createStatePersistenceApi({
    HIGHSCORE_KEY,
    HIGHSCORE_STORAGE_VERSION,
    HIGHSCORE_VERSION_KEY,
    HIGHSCORE_LAST_ENTRY_KEY,
    OPTIONS_KEY,
    SAVEGAME_KEY,
    SAVEGAME_VERSION,
    DEFAULT_OPTIONS,
    readStorage,
    writeStorage,
    removeStorage,
    getState,
    setState,
    loadHeroClassId,
    createFreshState,
    createDefaultModals,
    createDefaultCollapsedCards,
    createDefaultPreferences,
    normalizeHeroName,
    resolveHeroClassId,
    HERO_CLASSES,
    randomInt,
    rollStudioArchetypeId,
    xpForNextLevel,
    getNutritionMax,
    getNutritionStart,
    getHungerState,
    updateVisibility,
    renderSelf,
  });

  function loadHighscores() {
    return persistenceApi.loadHighscores();
  }

  function loadOptions() {
    return persistenceApi.loadOptions();
  }

  function saveOptions() {
    return persistenceApi.saveOptions();
  }

  function hasSavedGame() {
    return persistenceApi.hasSavedGame();
  }

  function clearSavedGame() {
    return persistenceApi.clearSavedGame();
  }

  function getSavedGameMetadata() {
    return persistenceApi.getSavedGameMetadata();
  }

  function saveGame() {
    return persistenceApi.saveGame();
  }

  function loadSavedGame() {
    return persistenceApi.loadSavedGame();
  }

  function loadLastHighscoreMarker() {
    return persistenceApi.loadLastHighscoreMarker();
  }

  function saveHighscoreIfNeeded() {
    return persistenceApi.saveHighscoreIfNeeded();
  }

  function createDeathCause(enemy, options = {}) {
    const critPrefix = options.critical ? "durch einen kritischen Treffer " : "";
    const quips = [
      `wurde ${critPrefix}von ${enemy.name} unsanft aus dem Abspann gekickt.`,
      `verlor den finalen Schnitt ${critPrefix ? `${critPrefix}` : ""}gegen ${enemy.name}.`,
      `bekam ${critPrefix}von ${enemy.name} eine sehr persoenliche Schluss-Szene verpasst.`,
      `blieb im letzten Akt ${critPrefix ? `${critPrefix}` : ""}an ${enemy.name} haengen.`,
      `wurde ${critPrefix}von ${enemy.name} direkt aus dem Bild getragen.`,
    ];

    return quips[randomInt(0, quips.length - 1)];
  }

  function initializeGame(profile = {}, options = {}) {
    const currentState = getState();
    const heroName = profile.heroName ? saveHeroName(profile.heroName) : loadHeroName();
    const heroClassId = profile.heroClassId ? saveHeroClassId(profile.heroClassId) : loadHeroClassId();
    const nextState = createFreshState(heroName, heroClassId, options);
    const reusableInitialStudio = Boolean(
      options.reuseExistingFloor &&
      currentState &&
      currentState.modals?.startOpen &&
      !currentState.gameOver &&
      currentState.turn === 0 &&
      currentState.floor === 1 &&
      currentState.deepestFloor === 1 &&
      (currentState.inventory?.length ?? 0) === 0 &&
      !currentState.pendingChoice &&
      !currentState.pendingStairChoice &&
      currentState.floors?.[1]
    );

    nextState.player.nutritionMax = getNutritionMax(nextState.player);
    nextState.player.nutrition = getNutritionStart(nextState.player);
    nextState.player.hungerState = getHungerState(nextState.player);

    if (reusableInitialStudio) {
      nextState.floors[1] = currentState.floors[1];
      nextState.player.x = currentState.player.x;
      nextState.player.y = currentState.player.y;
    } else {
      nextState.floors[1] = createDungeonLevel(1, { stairsUp: null });
      nextState.player.x = nextState.floors[1].startPosition.x;
      nextState.player.y = nextState.floors[1].startPosition.y;
    }
    if (options.clearSavedGame) {
      clearSavedGame();
    }
    setState(nextState);
    updateVisibility();
    addMessage(`${heroName} steht als ${nextState.player.classLabel} im Scheinwerferlicht.`, "important");
    renderSelf();
  }

  return {
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
  };
}
