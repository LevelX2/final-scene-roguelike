export function createStateBlueprintApi(context) {
  const {
    HERO_NAME_KEY,
    HERO_CLASS_KEY,
    DEFAULT_HERO_NAME,
    DEFAULT_HERO_CLASS,
    HERO_CLASSES,
    readStorage,
    writeStorage,
    resolveHeroClassId,
    createBareHandsWeapon,
    xpForNextLevel,
    getNutritionMax,
    getNutritionStart,
    getHungerState,
  } = context;

  const DEFAULT_OPTIONS = {
    stepSound: true,
    deathSound: true,
  };

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
    const initialOptions = options.initialOptions ?? DEFAULT_OPTIONS;
    const player = createPlayerFromProfile(heroName, heroClassId);
    player.nutritionMax = getNutritionMax(player);
    player.nutrition = getNutritionStart(player);
    player.hungerState = getHungerState(player);

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
      options: { ...initialOptions },
      floors: {},
      preferences: createDefaultPreferences(),
      player,
    };
  }

  return {
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
  };
}
