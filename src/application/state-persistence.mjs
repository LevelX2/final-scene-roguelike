import { getShieldTemplate } from '../content/catalogs/shields.mjs';
import { getWeaponTemplate } from '../content/catalogs/weapon-templates.mjs';
import { normalizeKillStats } from '../kill-stats.mjs';
import { createTimestampedId } from '../utils/id-tools.mjs';

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
    createHighscoreMarker = () => createTimestampedId('run'),
    createRunArchetypeSequence,
    createRunStudioTopology = (randomInt, minimumFloor = 10) => ({
      nodes: { 1: { floorNumber: 1, position: { x: 0, y: 0, z: 0 }, entryDirection: "front", entryTransitionStyle: "passage", exitDirection: null, exitTransitionStyle: null } },
      occupied: { "0,0,0": 1 },
      generatedToFloor: Math.max(1, Number(minimumFloor) || 1),
    }),
    ensureRunStudioTopology = (topology) => topology,
    getArchetypeForFloor,
    xpForNextLevel,
    getNutritionMax,
    getNutritionStart,
    getHungerState,
    updateVisibility,
    renderSelf,
  } = context;
  const SAVEGAME_STORE_VERSION = SAVEGAME_VERSION;
  const MAX_SAVE_ENTRIES = 24;
  const INCOMPATIBLE_SAVE_ENTRY_ID = "__incompatible_savegame_store__";

  function normalizeShowcaseAnnouncementMode(value) {
    return ["off", "floating-text", "voice"].includes(value)
      ? value
      : DEFAULT_OPTIONS.showcaseAnnouncementMode;
  }

  function normalizeScale(value, fallback, min, max) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return fallback;
    }

    return Math.min(max, Math.max(min, numeric));
  }

  function normalizeEnemyPanelMode(value) {
    return value === "compact" || value === "detailed"
      ? value
      : DEFAULT_OPTIONS.enemyPanelMode;
  }

  function normalizeOptions(options) {
    const nextOptions = {
      ...DEFAULT_OPTIONS,
      ...(options ?? {}),
    };
    nextOptions.stepSound = Boolean(nextOptions.stepSound);
    nextOptions.deathSound = Boolean(nextOptions.deathSound);
    nextOptions.voiceAnnouncements = Boolean(nextOptions.voiceAnnouncements);
    nextOptions.showcaseAnnouncementMode = normalizeShowcaseAnnouncementMode(nextOptions.showcaseAnnouncementMode);
    nextOptions.uiScale = normalizeScale(nextOptions.uiScale, DEFAULT_OPTIONS.uiScale, 0.85, 1.3);
    nextOptions.studioZoom = normalizeScale(nextOptions.studioZoom, DEFAULT_OPTIONS.studioZoom, 0.6, 2.4);
    nextOptions.tooltipScale = normalizeScale(nextOptions.tooltipScale, DEFAULT_OPTIONS.tooltipScale, 0.85, 1.5);
    nextOptions.enemyPanelMode = normalizeEnemyPanelMode(nextOptions.enemyPanelMode);
    return nextOptions;
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
      return normalizeOptions(JSON.parse(readStorage(OPTIONS_KEY) ?? "{}"));
    } catch {
      return { ...DEFAULT_OPTIONS };
    }
  }

  function saveOptions() {
    const state = getState();
    writeStorage(OPTIONS_KEY, JSON.stringify(state.options));
  }

  function createSaveMetadata(entry) {
    return {
      id: entry.id ?? null,
      version: entry.snapshotVersion ?? null,
      compatible: true,
      canLoad: true,
      canOverwrite: true,
      canDelete: true,
      savedAt: entry.savedAt ?? null,
      heroName: entry.state?.player?.name ?? null,
      heroClass: entry.state?.player?.classLabel ?? null,
      floor: entry.state?.floor ?? null,
      level: entry.state?.player?.level ?? null,
      turn: entry.state?.turn ?? null,
    };
  }

  function createIncompatibleSaveMetadata() {
    const rawSave = readStorage(SAVEGAME_KEY);
    if (!rawSave) {
      return null;
    }

    let parsed = null;
    try {
      parsed = JSON.parse(rawSave);
    } catch {
      parsed = null;
    }

    return {
      id: INCOMPATIBLE_SAVE_ENTRY_ID,
      version: parsed?.version ?? null,
      compatible: false,
      canLoad: false,
      canOverwrite: false,
      canDelete: true,
      savedAt: parsed?.savedAt ?? null,
      heroName: parsed?.state?.player?.name ?? "Unbekannt",
      heroClass: parsed?.state?.player?.classLabel ?? null,
      floor: parsed?.state?.floor ?? null,
      level: parsed?.state?.player?.level ?? null,
      turn: parsed?.state?.turn ?? null,
    };
  }

  function normalizeSaveEntry(entry) {
    if (!entry || typeof entry !== "object" || !entry.state || typeof entry.state !== "object") {
      return null;
    }

    return {
      id: entry.id ?? createTimestampedId("save"),
      savedAt: Number(entry.savedAt) || Date.now(),
      snapshotVersion: SAVEGAME_VERSION,
      state: entry.state,
    };
  }

  function readSavegameStore() {
    const rawSave = readStorage(SAVEGAME_KEY);
    if (!rawSave) {
      return {
        version: SAVEGAME_STORE_VERSION,
        entries: [],
        consumedIds: {},
      };
    }

    const parsed = JSON.parse(rawSave);
    if (parsed?.version === SAVEGAME_STORE_VERSION && Array.isArray(parsed.entries)) {
      return {
        version: SAVEGAME_STORE_VERSION,
        entries: parsed.entries
          .map(normalizeSaveEntry)
          .filter(Boolean)
          .sort((left, right) => (right.savedAt ?? 0) - (left.savedAt ?? 0)),
        consumedIds: parsed.consumedIds && typeof parsed.consumedIds === "object"
          ? { ...parsed.consumedIds }
          : {},
      };
    }

    throw new Error("incompatible-savegame-store");
  }

  function writeSavegameStore(store) {
    return writeStorage(SAVEGAME_KEY, JSON.stringify({
      version: SAVEGAME_STORE_VERSION,
      entries: (store.entries ?? []).slice(0, MAX_SAVE_ENTRIES),
      consumedIds: store.consumedIds ?? {},
    }));
  }

  function hasSavedGame() {
    try {
      return readSavegameStore().entries.length > 0;
    } catch {
      return Boolean(readStorage(SAVEGAME_KEY));
    }
  }

  function clearSavedGame() {
    removeStorage(SAVEGAME_KEY);
  }

  function deleteSavedGame(targetEntryId) {
    if (!targetEntryId) {
      return false;
    }

    if (targetEntryId === INCOMPATIBLE_SAVE_ENTRY_ID) {
      if (!readStorage(SAVEGAME_KEY)) {
        return false;
      }
      removeStorage(SAVEGAME_KEY);
      return true;
    }

    const store = readSavegameStore();
    const nextEntries = (store.entries ?? []).filter((entry) => entry?.id !== targetEntryId);
    if (nextEntries.length === (store.entries ?? []).length) {
      return false;
    }

    if (!nextEntries.length) {
      removeStorage(SAVEGAME_KEY);
      return true;
    }

    if (store.consumedIds && typeof store.consumedIds === "object") {
      delete store.consumedIds[targetEntryId];
    }
    store.entries = nextEntries;
    return writeSavegameStore(store);
  }

  function getSavedGameMetadata() {
    try {
      return readSavegameStore().entries[0]
        ? createSaveMetadata(readSavegameStore().entries[0])
        : null;
    } catch {
      return createIncompatibleSaveMetadata();
    }
  }

  function listSavedGames() {
    try {
      return readSavegameStore().entries.map(createSaveMetadata);
    } catch {
      const incompatibleEntry = createIncompatibleSaveMetadata();
      return incompatibleEntry ? [incompatibleEntry] : [];
    }
  }

  function createSerializableSnapshot(state) {
    return {
      ...state,
      view: "game",
      floatingTexts: [],
      boardEffects: [],
      targeting: {
        active: false,
        cursorX: Number(state.targeting?.cursorX) || 0,
        cursorY: Number(state.targeting?.cursorY) || 0,
      },
      modals: {
        ...createDefaultModals(false),
        ...(state.modals ?? {}),
        inventoryOpen: false,
        runStatsOpen: false,
        optionsOpen: false,
        savegamesOpen: false,
        helpOpen: false,
        highscoresOpen: false,
        startOpen: false,
      },
    };
  }

  function resolveWeaponTemplateForItem(item) {
    if (!item || typeof item !== "object") {
      return null;
    }

    const templateId = item.templateId ?? item.baseItemId ?? item.id ?? null;
    return templateId ? getWeaponTemplate(templateId) : null;
  }

  function normalizeWeaponItem(item) {
    if (!item || typeof item !== "object") {
      return item ?? null;
    }

    const template = resolveWeaponTemplateForItem(item);
    return {
      ...item,
      type: "weapon",
      itemType: item.itemType ?? "weapon",
      templateId: item.templateId ?? template?.id ?? item.id ?? null,
      baseItemId: item.baseItemId ?? template?.id ?? item.id ?? null,
      handedness: item.handedness ?? template?.handedness ?? "one-handed",
      attackMode: item.attackMode ?? template?.attackMode ?? "melee",
      range: item.range ?? template?.range ?? 1,
      meleePenaltyHit: item.meleePenaltyHit ?? template?.meleePenaltyHit ?? 0,
      archetypeId: item.archetypeId ?? template?.archetypeId ?? null,
      weaponRole: item.weaponRole ?? template?.weaponRole ?? null,
      profileId: item.profileId ?? template?.profileId ?? null,
      iconAsset: item.iconAsset ?? template?.iconAsset ?? null,
      lightBonus: item.lightBonus ?? 0,
      effects: Array.isArray(item.effects) ? item.effects : [],
      numericMods: Array.isArray(item.numericMods) ? item.numericMods : [],
      modifiers: Array.isArray(item.modifiers) ? item.modifiers : [],
      modifierIds: Array.isArray(item.modifierIds) ? item.modifierIds : [],
    };
  }

  function normalizeWeaponPickup(entry) {
    if (!entry || typeof entry !== "object") {
      return entry;
    }

    return {
      ...entry,
      item: normalizeWeaponItem(entry.item),
    };
  }

  function resolveOffHandTemplateForItem(item) {
    if (!item || typeof item !== "object") {
      return null;
    }

    const templateId = item.templateId ?? item.baseItemId ?? item.id ?? null;
    return templateId ? getShieldTemplate(templateId) : null;
  }

  function normalizeOffHandItem(item) {
    if (!item || typeof item !== "object") {
      return item ?? null;
    }

    const template = resolveOffHandTemplateForItem(item);
    return {
      ...item,
      type: "offhand",
      itemType: "shield",
      subtype: "shield",
      templateId: item.templateId ?? template?.id ?? item.id ?? null,
      baseItemId: item.baseItemId ?? template?.id ?? item.id ?? null,
      archetypeId: item.archetypeId ?? template?.archetypeId ?? null,
      iconAssetId: item.iconAssetId ?? template?.iconAssetId ?? template?.id ?? item.baseItemId ?? item.id ?? null,
      blockChance: item.blockChance ?? template?.blockChance ?? 0,
      blockValue: item.blockValue ?? template?.blockValue ?? 0,
      statMods: { ...(item.statMods ?? template?.statMods ?? {}) },
      modifiers: Array.isArray(item.modifiers)
        ? item.modifiers.map((modifier) => ({ ...modifier }))
        : [],
      modifierIds: Array.isArray(item.modifierIds) ? [...item.modifierIds] : [],
    };
  }

  function normalizeOffHandPickup(entry) {
    if (!entry || typeof entry !== "object") {
      return entry;
    }

    return {
      ...entry,
      item: normalizeOffHandItem(entry.item),
    };
  }

  function normalizeInventoryItem(item) {
    if (!item || typeof item !== "object") {
      return item;
    }

    if (item.type === "weapon" || item.itemType === "weapon") {
      return normalizeWeaponItem(item);
    }

    if (item.type === "offhand" || item.itemType === "shield" || item.subtype === "shield") {
      return normalizeOffHandItem(item);
    }

    return { ...item };
  }

  function normalizeLogMessageEntry(entry) {
    if (typeof entry === "string") {
      const text = entry.trim();
      return text ? { text, tone: "" } : null;
    }

    if (!entry || typeof entry !== "object") {
      return null;
    }

    const text = typeof entry.text === "string" ? entry.text.trim() : "";
    if (!text) {
      return null;
    }

    return {
      text,
      tone: typeof entry.tone === "string" ? entry.tone : "",
    };
  }

  function normalizeFloorStateWeapons(floorState) {
    if (!floorState || typeof floorState !== "object") {
      return floorState;
    }

    floorState.weapons = Array.isArray(floorState.weapons)
      ? floorState.weapons.map(normalizeWeaponPickup)
      : [];
    floorState.offHands = Array.isArray(floorState.offHands)
      ? floorState.offHands.map(normalizeOffHandPickup)
      : [];
    floorState.enemies = Array.isArray(floorState.enemies)
      ? floorState.enemies.map((enemy) => ({
          ...enemy,
          mainHand: normalizeWeaponItem(enemy.mainHand),
          weapon: normalizeWeaponItem(enemy.weapon),
          lootWeapon: normalizeWeaponItem(enemy.lootWeapon),
          offHand: normalizeOffHandItem(enemy.offHand),
          lootOffHand: normalizeOffHandItem(enemy.lootOffHand),
        }))
      : [];
    return floorState;
  }

  function saveGame(targetEntryId = null) {
    const state = getState();
    const store = readSavegameStore();
    const entry = {
      id: targetEntryId ?? createTimestampedId("save"),
      savedAt: Date.now(),
      snapshotVersion: SAVEGAME_VERSION,
      state: createSerializableSnapshot(state),
    };
    store.entries = [
      entry,
      ...(store.entries ?? []).filter((saveEntry) => saveEntry?.id !== entry.id),
    ].sort((left, right) => (right.savedAt ?? 0) - (left.savedAt ?? 0));

    return writeSavegameStore(store)
      ? { ok: true, entry: createSaveMetadata(entry) }
      : { ok: false };
  }

  function normalizeSavedState(savedState) {
    if (!savedState || typeof savedState !== "object") {
      return null;
    }

    const heroName = normalizeHeroName(savedState.player?.name);
    const heroClassId = resolveHeroClassId(savedState.player?.classId, loadHeroClassId());
    const normalizedState = createFreshState(heroName, heroClassId, { openStartModal: false });

    normalizedState.view = "game";
    normalizedState.floor = Math.max(1, Number(savedState.floor) || 1);
    normalizedState.deepestFloor = Math.max(normalizedState.floor, Number(savedState.deepestFloor) || normalizedState.floor);
    normalizedState.turn = Math.max(0, Number(savedState.turn) || 0);
    normalizedState.messages = Array.isArray(savedState.messages)
      ? savedState.messages.map(normalizeLogMessageEntry).filter(Boolean)
      : [];
    normalizedState.inventory = Array.isArray(savedState.inventory)
      ? savedState.inventory.map(normalizeInventoryItem)
      : [];
    normalizedState.gameOver = false;
    normalizedState.safeRestTurns = Math.max(0, Number(savedState.safeRestTurns) || 0);
    normalizedState.pendingChoice = null;
    normalizedState.pendingStairChoice = null;
    normalizedState.deathCause = savedState.deathCause ?? null;
    normalizedState.scoreSaved = Boolean(savedState.scoreSaved);
    normalizedState.kills = Math.max(0, Number(savedState.kills) || 0);
    normalizedState.killStats = normalizeKillStats(savedState.killStats);
    normalizedState.damageDealt = Math.max(0, Number(savedState.damageDealt) || 0);
    normalizedState.damageTaken = Math.max(0, Number(savedState.damageTaken) || 0);
    normalizedState.xpGained = Math.max(0, Number(savedState.xpGained) || 0);
    normalizedState.openedChests = Math.max(0, Number(savedState.openedChests) || 0);
    normalizedState.consumedPotions = Math.max(0, Number(savedState.consumedPotions) || 0);
    normalizedState.consumedFoods = Math.max(0, Number(savedState.consumedFoods) || 0);
    normalizedState.knownMonsterTypes = savedState.knownMonsterTypes ?? {};
    normalizedState.seenMonsterCounts = savedState.seenMonsterCounts ?? {};
    normalizedState.lastScoreRank = savedState.lastScoreRank ?? null;
    normalizedState.runArchetypeSequence = Array.isArray(savedState.runArchetypeSequence) && savedState.runArchetypeSequence.length > 0
      ? savedState.runArchetypeSequence
      : createRunArchetypeSequence(randomInt);
    normalizedState.runStudioTopology = ensureRunStudioTopology(
      savedState.runStudioTopology
        ? savedState.runStudioTopology
        : createRunStudioTopology(randomInt, Math.max(10, normalizedState.deepestFloor)),
      Math.max(10, normalizedState.deepestFloor),
      randomInt,
    );
    normalizedState.modals = {
      ...createDefaultModals(false),
      ...(savedState.modals ?? {}),
      inventoryOpen: false,
      runStatsOpen: false,
      optionsOpen: false,
      savegamesOpen: false,
      helpOpen: false,
      highscoresOpen: false,
      startOpen: false,
    };
    normalizedState.collapsedCards = {
      ...createDefaultCollapsedCards(),
      ...(savedState.collapsedCards ?? {}),
    };
    normalizedState.options = normalizeOptions({
      ...loadOptions(),
      ...(savedState.options ?? {}),
    });
    normalizedState.preferences = {
      ...createDefaultPreferences(),
      ...(savedState.preferences ?? {}),
    };
    normalizedState.targeting = {
      active: false,
      cursorX: Number(savedState.targeting?.cursorX) || 0,
      cursorY: Number(savedState.targeting?.cursorY) || 0,
    };
    normalizedState.floors = savedState.floors ?? {};
    normalizedState.visitedFloors = Array.from(new Set(
      Array.isArray(savedState.visitedFloors)
        ? savedState.visitedFloors.map((entry) => Math.max(1, Number(entry) || 1))
        : Object.keys(normalizedState.floors).map((entry) => Math.max(1, Number(entry) || 1)),
    )).sort((left, right) => left - right);
    Object.values(normalizedState.floors).forEach((floorState) => {
      if (floorState && !floorState.studioArchetypeId) {
        floorState.studioArchetypeId = getArchetypeForFloor(normalizedState.runArchetypeSequence, floorState.floorNumber ?? 1);
      }
      normalizeFloorStateWeapons(floorState);
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
    normalizedState.player.mainHand = normalizeWeaponItem(savedState.player?.mainHand ?? normalizedState.player.mainHand);
    normalizedState.player.offHand = normalizeOffHandItem(savedState.player?.offHand ?? normalizedState.player.offHand);
    normalizedState.player.statusEffects = Array.isArray(savedState.player?.statusEffects)
      ? savedState.player.statusEffects
      : [];
    normalizedState.player.xpToNext = Number(savedState.player?.xpToNext) || xpForNextLevel(normalizedState.player.level);
    normalizedState.player.nutritionMax = getNutritionMax(normalizedState.player);
    normalizedState.player.nutrition = typeof savedState.player?.nutrition === "number"
      ? savedState.player.nutrition
      : getNutritionStart(normalizedState.player);
    normalizedState.player.hungerState = getHungerState(normalizedState.player);

    if (!normalizedState.floors[normalizedState.floor]) {
      return null;
    }

    if (!normalizedState.visitedFloors.includes(normalizedState.floor)) {
      normalizedState.visitedFloors.push(normalizedState.floor);
      normalizedState.visitedFloors.sort((left, right) => left - right);
    }

    return normalizedState;
  }

  function loadSavedGame(targetEntryId = null) {
    let store;
    try {
      store = readSavegameStore();
    } catch {
      return {
        ok: false,
        reason: "incompatible",
        foundVersion: "unknown",
        expectedVersion: SAVEGAME_VERSION,
      };
    }

    if (!store.entries.length) {
      return {
        ok: false,
        reason: "missing",
      };
    }

    try {
      const entry = targetEntryId
        ? store.entries.find((candidate) => candidate.id === targetEntryId)
        : store.entries[0];
      if (!entry) {
        return {
          ok: false,
          reason: "missing",
        };
      }

      if (store.consumedIds?.[entry.id]) {
        store.entries = store.entries.filter((candidate) => candidate.id !== entry.id);
        writeSavegameStore(store);
        return {
          ok: false,
          reason: "consumed",
        };
      }

      const normalizedState = normalizeSavedState(entry.state);
      if (!normalizedState) {
        return {
          ok: false,
          reason: "invalid",
        };
      }

      setState(normalizedState);
      updateVisibility();
      renderSelf();
      store.entries = store.entries.filter((candidate) => candidate.id !== entry.id);
      store.consumedIds = {
        ...(store.consumedIds ?? {}),
        [entry.id]: {
          loadedAt: Date.now(),
        },
      };
      writeSavegameStore(store);
      return {
        ok: true,
        state: normalizedState,
        savedAt: entry.savedAt ?? null,
        metadata: createSaveMetadata(entry),
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
      marker: createHighscoreMarker(),
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
    deleteSavedGame,
    getSavedGameMetadata,
    listSavedGames,
    saveGame,
    loadSavedGame,
    loadLastHighscoreMarker,
    saveHighscoreIfNeeded,
  };
}
