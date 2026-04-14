import { xpForNextLevel, resolveHeroClassId } from './balance.mjs';
import { createBrowserStorageApi } from './application/browser-storage.mjs';
import { createStateBlueprintApi } from './application/state-blueprint.mjs';
import { createStatePersistenceApi } from './application/state-persistence.mjs';
import { getNutritionMax, getNutritionStart, getHungerState } from './nutrition.mjs';
import { createRunArchetypeSequence, getArchetypeForFloor } from './studio-theme.mjs';
import { formatMonsterKillerLabel, formatWeaponDativePhrase } from './text/combat-phrasing.mjs';

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
    generateEquipmentItem,
    createDungeonLevel,
    updateVisibility,
    addMessage,
    formatStudioLabel,
    formatArchetypeLabel,
    buildStudioAnnouncement,
    playStudioAnnouncement,
    renderSelf,
    randomInt,
    createRuntimeId,
  } = context;
  const HIGHSCORE_LAST_ENTRY_KEY = "dungeon-rogue-highscores-last-entry";
  const SAVEGAME_KEY = "dungeon-rogue-savegame";
  const SAVEGAME_VERSION = 3;
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

  const {
    DEFAULT_OPTIONS,
    normalizeHeroName,
    loadHeroName,
    saveHeroName,
    loadHeroClassId,
    saveHeroClassId,
    createDefaultModals,
    createDefaultCollapsedCards,
    createDefaultPreferences,
    createFreshState,
  } = createStateBlueprintApi({
    HERO_NAME_KEY,
    HERO_CLASS_KEY,
    DEFAULT_HERO_NAME,
    DEFAULT_HERO_CLASS,
    HERO_CLASSES,
    readStorage,
    writeStorage,
    resolveHeroClassId,
    createBareHandsWeapon,
    generateEquipmentItem,
    xpForNextLevel,
    getNutritionMax,
    getNutritionStart,
    getHungerState,
    createRunArchetypeSequence,
    randomInt,
  });

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
    createHighscoreMarker: () => createRuntimeId('run'),
    createRunArchetypeSequence,
    getArchetypeForFloor,
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

  function deleteSavedGame(entryId) {
    return persistenceApi.deleteSavedGame(entryId);
  }

  function getSavedGameMetadata() {
    return persistenceApi.getSavedGameMetadata();
  }

  function listSavedGames() {
    return persistenceApi.listSavedGames();
  }

  function saveGame(entryId = null) {
    return persistenceApi.saveGame(entryId);
  }

  function loadSavedGame(entryId = null) {
    return persistenceApi.loadSavedGame(entryId);
  }

  function loadLastHighscoreMarker() {
    return persistenceApi.loadLastHighscoreMarker();
  }

  function saveHighscoreIfNeeded() {
    return persistenceApi.saveHighscoreIfNeeded();
  }

  function createDeathCause(enemy, options = {}) {
    const enemyName = enemy?.baseName ?? enemy?.name ?? "etwas Unbekanntem";
    const victimName = options.victimName ?? 'die Hauptrolle';
    const weapon = options.weapon ?? enemy?.mainHand ?? enemy?.weapon ?? null;
    const rangedSuffix = options.ranged ? " aus der Distanz" : "";
    const criticalSuffix = options.critical ? " mit einem kritischen Treffer" : "";

    if (weapon) {
      return `schaffte es nicht durch den letzten Akt: ${formatMonsterKillerLabel(enemy)} beendete die Szene und traf ${victimName}${rangedSuffix} mit ${formatWeaponDativePhrase(weapon)}.${options.critical ? " Der letzte Treffer war kritisch." : ""}`;
    }

    const quips = [
      `wurde im letzten Akt von ${enemyName}${rangedSuffix}${criticalSuffix} zu Fall gebracht.`,
      `schaffte es nicht durch den letzten Akt: ${enemyName}${rangedSuffix}${criticalSuffix} beendete die Szene.`,
      `verlor im letzten Akt gegen ${enemyName}${rangedSuffix}${criticalSuffix}.`,
      `kam im letzten Akt gegen ${enemyName}${rangedSuffix}${criticalSuffix} nicht mehr zurück ins Bild.`,
      `wurde im letzten Akt von ${enemyName}${rangedSuffix} aus der Szene genommen${options.critical ? " - kritisch und endgültig." : "."}`,
    ];

    return quips[randomInt(0, quips.length - 1)];
  }

  function initializeGame(profile = {}, options = {}) {
    const currentState = getState();
    const heroName = profile.heroName ? saveHeroName(profile.heroName) : loadHeroName();
    const heroClassId = profile.heroClassId ? saveHeroClassId(profile.heroClassId) : loadHeroClassId();
    const nextView = options.view ?? (options.openStartModal ? "start" : "game");
    const nextState = createFreshState(heroName, heroClassId, {
      ...options,
      view: nextView,
      initialOptions: loadOptions(),
    });
    const reusableInitialStudio = Boolean(
      options.reuseExistingFloor &&
      currentState &&
      currentState.view === "start" &&
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
      nextState.runArchetypeSequence = [...(currentState.runArchetypeSequence ?? nextState.runArchetypeSequence)];
      nextState.floors[1] = currentState.floors[1];
      nextState.player.x = currentState.player.x;
      nextState.player.y = currentState.player.y;
    } else {
      nextState.floors[1] = createDungeonLevel(1, {
        stairsUp: null,
        studioArchetypeId: getArchetypeForFloor(nextState.runArchetypeSequence, 1),
        runArchetypeSequence: nextState.runArchetypeSequence,
      });
      nextState.player.x = nextState.floors[1].startPosition.x;
      nextState.player.y = nextState.floors[1].startPosition.y;
    }
    if (options.clearSavedGame) {
      clearSavedGame();
    }
    setState(nextState);
    updateVisibility();
    addMessage(`${heroName} steht als ${nextState.player.classLabel} im Scheinwerferlicht.`, "important");
    if (nextView === "game") {
      const initialArchetypeId = nextState.floors[1]?.studioArchetypeId ?? null;
      if (!nextState.visitedFloors.includes(1)) {
        nextState.visitedFloors.push(1);
      }
      addMessage(`Du betrittst ${formatStudioLabel(1)}. ${formatArchetypeLabel(initialArchetypeId)}`, "important");
      const announcement = buildStudioAnnouncement(1, initialArchetypeId);
      addMessage(announcement, "important");
      playStudioAnnouncement(announcement);
    }
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
    listSavedGames,
    saveGame,
    loadSavedGame,
    clearSavedGame,
    deleteSavedGame,
    loadLastHighscoreMarker,
    saveHighscoreIfNeeded,
    createDeathCause,
    xpForNextLevel,
    initializeGame,
  };
}
