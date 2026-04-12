// Legacy state module kept for reference. The active runtime uses src/state.mjs.
// Legacy state module kept for reference. The active runtime uses src/state.mjs.
export function createStateApi(context) {
  const {
    HIGHSCORE_KEY,
    HIGHSCORE_STORAGE_VERSION,
    HIGHSCORE_VERSION_KEY,
    OPTIONS_KEY,
    HERO_NAME_KEY,
    DEFAULT_HERO_NAME,
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

  function normalizeHeroName(name) {
    const trimmed = String(name ?? "").trim().replace(/\s+/g, " ");
    return trimmed.slice(0, 24) || DEFAULT_HERO_NAME;
  }

  function loadHeroName() {
    return normalizeHeroName(localStorage.getItem(HERO_NAME_KEY));
  }

  function saveHeroName(name) {
    const normalized = normalizeHeroName(name);
    localStorage.setItem(HERO_NAME_KEY, normalized);
    return normalized;
  }

  function loadHighscores() {
    const savedVersion = localStorage.getItem(HIGHSCORE_VERSION_KEY);
    if (savedVersion !== HIGHSCORE_STORAGE_VERSION) {
      localStorage.removeItem(HIGHSCORE_KEY);
      localStorage.removeItem(HIGHSCORE_LAST_ENTRY_KEY);
      localStorage.setItem(HIGHSCORE_VERSION_KEY, HIGHSCORE_STORAGE_VERSION);
      return [];
    }

    try {
      return JSON.parse(localStorage.getItem(HIGHSCORE_KEY) ?? "[]");
    } catch {
      return [];
    }
  }

  function loadOptions() {
    try {
      return {
        stepSound: true,
        deathSound: true,
        ...JSON.parse(localStorage.getItem(OPTIONS_KEY) ?? "{}"),
      };
    } catch {
      return {
        stepSound: true,
        deathSound: true,
      };
    }
  }

  function saveOptions() {
    const state = getState();
    localStorage.setItem(OPTIONS_KEY, JSON.stringify(state.options));
  }

  function loadLastHighscoreMarker() {
    return localStorage.getItem(HIGHSCORE_LAST_ENTRY_KEY);
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
      date: new Date().toLocaleString("de-DE"),
      deathFloor: state.floor,
      deepestFloor: state.deepestFloor,
      level: state.player.level,
      hp: state.player.hp,
      maxHp: state.player.maxHp,
      turns: state.turn,
      kills: state.kills,
      deathCause: state.deathCause ?? "Verschwand auf mysteriöse Weise im Schneideraum.",
    };
    scores.push(entry);
    scores.sort((a, b) =>
      b.deepestFloor - a.deepestFloor ||
      b.level - a.level ||
      b.kills - a.kills ||
      b.hp - a.hp ||
      a.turns - b.turns
    );

    const rank = scores.findIndex((score) => score.marker === entry.marker) + 1;
    const trimmedScores = scores.slice(0, 100);

    localStorage.setItem(HIGHSCORE_KEY, JSON.stringify(trimmedScores));
    localStorage.setItem(HIGHSCORE_LAST_ENTRY_KEY, entry.marker);
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
      `blieb im letzten Akt ${critPrefix ? `${critPrefix}` : ""}an ${enemy.name} hängen.`,
      `wurde ${critPrefix}von ${enemy.name} direkt aus dem Bild getragen.`,
    ];

    return quips[randomInt(0, quips.length - 1)];
  }

  function xpForNextLevel(level) {
    return 40 + (level - 1) * 28 + Math.floor((level - 1) * (level - 1) * 6);
  }

  function initializeGame() {
    const heroName = loadHeroName();
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
      xpGained: 0,
      openedChests: 0,
      seenMonsterCounts: {},
      lastScoreRank: null,
      modals: {
        inventoryOpen: false,
        optionsOpen: false,
      },
      collapsedCards: {
        player: false,
        enemy: false,
        log: false,
        inventory: false,
        scores: false,
      },
      options: loadOptions(),
      floors: {},
      preferences: {
        potionAction: "drink",
      },
      player: {
        name: heroName,
        x: 0,
        y: 0,
        maxHp: 20,
        hp: 20,
        level: 1,
        xp: 0,
        xpToNext: xpForNextLevel(1),
        strength: 4,
        precision: 3,
        reaction: 3,
        nerves: 2,
        intelligence: 2,
        mainHand: createBareHandsWeapon(),
        offHand: null,
      },
    };

    nextState.floors[1] = createDungeonLevel(1, { stairsUp: null });
    nextState.player.x = nextState.floors[1].startPosition.x;
    nextState.player.y = nextState.floors[1].startPosition.y;
    setState(nextState);
    updateVisibility();
    addMessage(`${heroName} erwacht in einer feuchten Krypta. Finde Beute und sichere deinen Rückweg.`, "important");
    renderSelf();
  }

    return {
      loadHighscores,
      loadHeroName,
      saveHeroName,
      saveOptions,
      loadLastHighscoreMarker,
      saveHighscoreIfNeeded,
      createDeathCause,
    xpForNextLevel,
    initializeGame,
  };
}
