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
    const openStartModal = options.openStartModal ?? true;

    const nextState = {
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
      modals: {
        inventoryOpen: false,
        runStatsOpen: false,
        optionsOpen: false,
        helpOpen: false,
        highscoresOpen: false,
        deathKillsOpen: false,
        startOpen: openStartModal,
      },
        collapsedCards: {
          player: "summary",
          enemy: false,
          log: "compact",
        },
      options: loadOptions(),
      floors: {},
      preferences: {
        potionAction: "drink",
        foodAction: "eat",
        inventoryFilter: "all",
      },
      player: createPlayerFromProfile(heroName, heroClassId),
    };

    nextState.player.nutritionMax = getNutritionMax(nextState.player);
    nextState.player.nutrition = getNutritionStart(nextState.player);
    nextState.player.hungerState = getHungerState(nextState.player);

    nextState.floors[1] = createDungeonLevel(1, { stairsUp: null });
    nextState.player.x = nextState.floors[1].startPosition.x;
    nextState.player.y = nextState.floors[1].startPosition.y;
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
    loadLastHighscoreMarker,
    saveHighscoreIfNeeded,
    createDeathCause,
    xpForNextLevel,
    initializeGame,
  };
}
