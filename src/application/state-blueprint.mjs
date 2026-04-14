import { getWeaponTemplate } from '../content/catalogs/weapon-templates.mjs';

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
    generateEquipmentItem,
    xpForNextLevel,
    getNutritionMax,
    getNutritionStart,
    getHungerState,
    createRunArchetypeSequence,
    randomInt,
  } = context;

  const STARTING_WEAPON_POOLS = {
    lead: ["relic-dagger", "rune-sword", "service-pistol", "expedition-revolver"],
    stuntman: ["combat-knife", "woodcutter-axe", "breach-axe", "bowie-knife"],
    director: ["pocket-revolver", "cane-blade", "electro-scalpel", "serum-launcher"],
  };

  const DEFAULT_OPTIONS = {
    stepSound: true,
    deathSound: true,
    voiceAnnouncements: true,
    showcaseAnnouncementMode: "floating-text",
    uiScale: 1,
    studioZoom: 1,
    tooltipScale: 1,
    enemyPanelMode: "detailed",
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

  function createStartingWeapon(heroClass) {
    const templatePool = STARTING_WEAPON_POOLS[heroClass.id] ?? STARTING_WEAPON_POOLS[DEFAULT_HERO_CLASS];
    const templateId = templatePool[randomInt(0, templatePool.length - 1)];
    const template = getWeaponTemplate(templateId);
    if (!template || !generateEquipmentItem) {
      return createBareHandsWeapon();
    }

    const weapon = generateEquipmentItem(template, {
      floorNumber: 1,
      forceRarity: "common",
      dropSourceTag: "starting-loadout",
      sourceArchetypeId: template.archetypeId,
    });

    return {
      ...weapon,
      name: template.name,
      displayName: template.name,
      source: `Startausstattung | ${heroClass.label}`,
    };
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
      mainHand: createStartingWeapon(heroClass),
      offHand: null,
      statusEffects: [],
    };
  }

  function createDefaultModals(openStartModal = true) {
    return {
      inventoryOpen: false,
      runStatsOpen: false,
      optionsOpen: false,
      savegamesOpen: false,
      helpOpen: false,
      highscoresOpen: false,
      startOpen: openStartModal,
    };
  }

  function createDefaultCollapsedCards() {
    return {
      player: "summary",
      enemy: false,
      log: "visible",
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
    const view = options.view ?? (openStartModal ? "start" : "game");
    const initialOptions = options.initialOptions ?? DEFAULT_OPTIONS;
    const player = createPlayerFromProfile(heroName, heroClassId);
    player.nutritionMax = getNutritionMax(player);
    player.nutrition = getNutritionStart(player);
    player.hungerState = getHungerState(player);

    return {
      floor: 1,
      deepestFloor: 1,
      view,
      turn: 0,
      messages: [],
      inventory: [],
      floatingTexts: [],
      boardEffects: [],
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
      visitedFloors: [],
      lastScoreRank: null,
      runArchetypeSequence: createRunArchetypeSequence(randomInt),
      modals: createDefaultModals(openStartModal),
      collapsedCards: createDefaultCollapsedCards(),
      options: { ...initialOptions },
      floors: {},
      preferences: createDefaultPreferences(),
      targeting: {
        active: false,
        cursorX: 0,
        cursorY: 0,
      },
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
