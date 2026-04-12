import { xpForNextLevel } from './balance.mjs';
import { getNutritionMax, getNutritionStart, getHungerState } from './nutrition.mjs';

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

  function readStorage(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  function writeStorage(key, value) {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  }

  function removeStorage(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
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
    return HERO_CLASSES[saved] ? saved : DEFAULT_HERO_CLASS;
  }

  function saveHeroClassId(classId) {
    const nextClassId = HERO_CLASSES[classId] ? classId : DEFAULT_HERO_CLASS;
    writeStorage(HERO_CLASS_KEY, nextClassId);
    return nextClassId;
  }

  function createPlayerFromProfile(heroName, heroClassId) {
    const heroClass = HERO_CLASSES[heroClassId] ?? HERO_CLASSES[DEFAULT_HERO_CLASS];
    return {
      name: heroName,
      classId: heroClassId,
      classLabel: heroClass.label,
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

  function loadHighscores() {
    const savedVersion = readStorage(HIGHSCORE_VERSION_KEY);
    if (savedVersion !== HIGHSCORE_STORAGE_VERSION) {
      removeStorage(HIGHSCORE_KEY);
      removeStorage(HIGHSCORE_LAST_ENTRY_KEY);
      writeStorage(HIGHSCORE_VERSION_KEY, HIGHSCORE_STORAGE_VERSION);
      return [];
    }

    try {
      return JSON.parse(readStorage(HIGHSCORE_KEY) ?? "[]");
    } catch {
      return [];
    }
  }

  function loadOptions() {
    try {
      return {
        ...DEFAULT_OPTIONS,
        ...JSON.parse(readStorage(OPTIONS_KEY) ?? "{}"),
      };
    } catch {
      return { ...DEFAULT_OPTIONS };
    }
  }

  function saveOptions() {
    const state = getState();
    writeStorage(OPTIONS_KEY, JSON.stringify(state.options));
  }

  function hasSavedGame() {
    return Boolean(readStorage(SAVEGAME_KEY));
  }

  function clearSavedGame() {
    removeStorage(SAVEGAME_KEY);
  }

  function getSavedGameMetadata() {
    const rawSave = readStorage(SAVEGAME_KEY);
    if (!rawSave) {
      return null;
    }

    try {
      const parsed = JSON.parse(rawSave);
      return {
        version: parsed.version ?? null,
        savedAt: parsed.savedAt ?? null,
        heroName: parsed.state?.player?.name ?? null,
        floor: parsed.state?.floor ?? null,
      };
    } catch {
      return null;
    }
  }

  function saveGame() {
    const state = getState();
    const snapshot = {
      ...state,
      floatingTexts: [],
      modals: {
        ...createDefaultModals(false),
        ...(state.modals ?? {}),
        inventoryOpen: false,
        runStatsOpen: false,
        optionsOpen: false,
        helpOpen: false,
        highscoresOpen: false,
        deathKillsOpen: false,
        startOpen: false,
      },
    };

    return writeStorage(SAVEGAME_KEY, JSON.stringify({
      version: SAVEGAME_VERSION,
      savedAt: Date.now(),
      state: snapshot,
    }));
  }

  function normalizeSavedState(savedState) {
    if (!savedState || typeof savedState !== "object") {
      return null;
    }

    const heroName = normalizeHeroName(savedState.player?.name);
    const heroClassId = HERO_CLASSES[savedState.player?.classId] ? savedState.player.classId : loadHeroClassId();
    const normalizedState = createFreshState(heroName, heroClassId, { openStartModal: false });

    normalizedState.floor = Math.max(1, Number(savedState.floor) || 1);
    normalizedState.deepestFloor = Math.max(normalizedState.floor, Number(savedState.deepestFloor) || normalizedState.floor);
    normalizedState.turn = Math.max(0, Number(savedState.turn) || 0);
    normalizedState.messages = Array.isArray(savedState.messages) ? savedState.messages : [];
    normalizedState.inventory = Array.isArray(savedState.inventory) ? savedState.inventory : [];
    normalizedState.gameOver = false;
    normalizedState.safeRestTurns = Math.max(0, Number(savedState.safeRestTurns) || 0);
    normalizedState.pendingChoice = null;
    normalizedState.pendingStairChoice = null;
    normalizedState.deathCause = savedState.deathCause ?? null;
    normalizedState.scoreSaved = Boolean(savedState.scoreSaved);
    normalizedState.kills = Math.max(0, Number(savedState.kills) || 0);
    normalizedState.killStats = savedState.killStats ?? {};
    normalizedState.damageDealt = Math.max(0, Number(savedState.damageDealt) || 0);
    normalizedState.damageTaken = Math.max(0, Number(savedState.damageTaken) || 0);
    normalizedState.xpGained = Math.max(0, Number(savedState.xpGained) || 0);
    normalizedState.openedChests = Math.max(0, Number(savedState.openedChests) || 0);
    normalizedState.consumedPotions = Math.max(0, Number(savedState.consumedPotions) || 0);
    normalizedState.consumedFoods = Math.max(0, Number(savedState.consumedFoods) || 0);
    normalizedState.knownMonsterTypes = savedState.knownMonsterTypes ?? {};
    normalizedState.seenMonsterCounts = savedState.seenMonsterCounts ?? {};
    normalizedState.lastScoreRank = savedState.lastScoreRank ?? null;
    normalizedState.modals = {
      ...createDefaultModals(false),
      ...(savedState.modals ?? {}),
      inventoryOpen: false,
      runStatsOpen: false,
      optionsOpen: false,
      helpOpen: false,
      highscoresOpen: false,
      deathKillsOpen: false,
      startOpen: false,
    };
    normalizedState.collapsedCards = {
      ...createDefaultCollapsedCards(),
      ...(savedState.collapsedCards ?? {}),
    };
    normalizedState.options = {
      ...loadOptions(),
      ...(savedState.options ?? {}),
    };
    normalizedState.preferences = {
      ...createDefaultPreferences(),
      ...(savedState.preferences ?? {}),
    };
    normalizedState.floors = savedState.floors ?? {};

    normalizedState.player = {
      ...normalizedState.player,
      ...(savedState.player ?? {}),
      name: heroName,
      classId: heroClassId,
      classLabel: HERO_CLASSES[heroClassId]?.label ?? normalizedState.player.classLabel,
    };
    normalizedState.player.mainHand = savedState.player?.mainHand ?? normalizedState.player.mainHand;
    normalizedState.player.offHand = savedState.player?.offHand ?? normalizedState.player.offHand;
    normalizedState.player.xpToNext = Number(savedState.player?.xpToNext) || xpForNextLevel(normalizedState.player.level);
    normalizedState.player.nutritionMax = getNutritionMax(normalizedState.player);
    normalizedState.player.nutrition = typeof savedState.player?.nutrition === "number"
      ? savedState.player.nutrition
      : getNutritionStart(normalizedState.player);
    normalizedState.player.hungerState = getHungerState(normalizedState.player);

    if (!normalizedState.floors[normalizedState.floor]) {
      return null;
    }

    return normalizedState;
  }

  function loadSavedGame() {
    const rawSave = readStorage(SAVEGAME_KEY);
    if (!rawSave) {
      return {
        ok: false,
        reason: "missing",
      };
    }

    try {
      const parsed = JSON.parse(rawSave);
      if (parsed?.version !== SAVEGAME_VERSION) {
        return {
          ok: false,
          reason: "incompatible",
          foundVersion: parsed?.version ?? null,
          expectedVersion: SAVEGAME_VERSION,
        };
      }

      const normalizedState = normalizeSavedState(parsed.state);
      if (!normalizedState) {
        return {
          ok: false,
          reason: "invalid",
        };
      }

      setState(normalizedState);
      updateVisibility();
      renderSelf();
      return {
        ok: true,
        state: normalizedState,
        savedAt: parsed.savedAt ?? null,
      };
    } catch {
      return {
        ok: false,
        reason: "invalid",
      };
    }
  }

  function loadLastHighscoreMarker() {
    return readStorage(HIGHSCORE_LAST_ENTRY_KEY);
  }

  function saveHighscoreIfNeeded() {
    const state = getState();
    if (state.scoreSaved) {
      return state.lastScoreRank ?? null;
    }

    const scores = loadHighscores();
    const entry = {
      marker: `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      heroName: state.player.name,
      heroClass: state.player.classLabel,
      date: new Date().toLocaleString("de-DE"),
      deathFloor: state.floor,
      deepestFloor: state.deepestFloor,
      level: state.player.level,
      hp: state.player.hp,
      maxHp: state.player.maxHp,
      turns: state.turn,
      kills: state.kills,
      deathCause: state.deathCause ?? "Verschwand auf mysterioese Weise im Schneideraum.",
    };
    scores.push(entry);
    scores.sort((a, b) =>
      b.deepestFloor - a.deepestFloor ||
      b.level - a.level ||
      b.kills - a.kills ||
      b.hp - a.hp ||
      a.turns - b.turns
    );

    const trimmedScores = scores.slice(0, 100);
    const rankIndex = trimmedScores.findIndex((score) => score.marker === entry.marker);
    const rank = rankIndex >= 0 ? rankIndex + 1 : null;

    writeStorage(HIGHSCORE_KEY, JSON.stringify(trimmedScores));
    if (rank) {
      writeStorage(HIGHSCORE_LAST_ENTRY_KEY, entry.marker);
    } else {
      removeStorage(HIGHSCORE_LAST_ENTRY_KEY);
    }
    state.scoreSaved = true;
    state.lastScoreRank = rank;
    return rank;
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
    const heroName = profile.heroName ? saveHeroName(profile.heroName) : loadHeroName();
    const heroClassId = profile.heroClassId ? saveHeroClassId(profile.heroClassId) : loadHeroClassId();
    const nextState = createFreshState(heroName, heroClassId, options);

    nextState.player.nutritionMax = getNutritionMax(nextState.player);
    nextState.player.nutrition = getNutritionStart(nextState.player);
    nextState.player.hungerState = getHungerState(nextState.player);

    nextState.floors[1] = createDungeonLevel(1, { stairsUp: null });
    nextState.player.x = nextState.floors[1].startPosition.x;
    nextState.player.y = nextState.floors[1].startPosition.y;
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
