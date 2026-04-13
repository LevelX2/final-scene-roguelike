export function createStatePersistenceApi(context) {
  const {
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
  } = context;

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

  function createSerializableSnapshot(state) {
    return {
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
  }

  function saveGame() {
    const state = getState();
    return writeStorage(SAVEGAME_KEY, JSON.stringify({
      version: SAVEGAME_VERSION,
      savedAt: Date.now(),
      state: createSerializableSnapshot(state),
    }));
  }

  function normalizeSavedState(savedState) {
    if (!savedState || typeof savedState !== "object") {
      return null;
    }

    const heroName = normalizeHeroName(savedState.player?.name);
    const heroClassId = resolveHeroClassId(savedState.player?.classId, loadHeroClassId());
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
    Object.values(normalizedState.floors).forEach((floorState) => {
      if (floorState && !floorState.studioArchetypeId) {
        floorState.studioArchetypeId = rollStudioArchetypeId(randomInt);
      }
    });

    normalizedState.player = {
      ...normalizedState.player,
      ...(savedState.player ?? {}),
      name: heroName,
      classId: heroClassId,
      classLabel: HERO_CLASSES[heroClassId]?.label ?? normalizedState.player.classLabel,
      classTagline: HERO_CLASSES[heroClassId]?.tagline ?? normalizedState.player.classTagline,
      classPassiveName: HERO_CLASSES[heroClassId]?.passiveName ?? normalizedState.player.classPassiveName,
      classPassiveSummary: HERO_CLASSES[heroClassId]?.passiveSummary ?? normalizedState.player.classPassiveSummary,
      classPassiveDescription: HERO_CLASSES[heroClassId]?.passiveDescription ?? normalizedState.player.classPassiveDescription,
      openingStrikeHitBonus: HERO_CLASSES[heroClassId]?.openingStrikeHitBonus ?? 0,
      openingStrikeCritBonus: HERO_CLASSES[heroClassId]?.openingStrikeCritBonus ?? 0,
      trapDamageReduction: HERO_CLASSES[heroClassId]?.trapDamageReduction ?? 0,
      trapDetectionBonus: HERO_CLASSES[heroClassId]?.trapDetectionBonus ?? 0,
      trapAvoidBonus: HERO_CLASSES[heroClassId]?.trapAvoidBonus ?? 0,
      shieldBlockBonus: HERO_CLASSES[heroClassId]?.shieldBlockBonus ?? 0,
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
      heroClassId: state.player.classId,
      heroClass: state.player.classLabel,
      date: new Date().toLocaleString("de-DE"),
      deathFloor: state.floor,
      deathStudioArchetypeId: state.floors[state.floor]?.studioArchetypeId ?? null,
      deepestFloor: state.deepestFloor,
      deepestStudioArchetypeId: state.floors[state.deepestFloor]?.studioArchetypeId ?? null,
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

  return {
    loadHighscores,
    loadOptions,
    saveOptions,
    hasSavedGame,
    clearSavedGame,
    getSavedGameMetadata,
    saveGame,
    loadSavedGame,
    loadLastHighscoreMarker,
    saveHighscoreIfNeeded,
  };
}
