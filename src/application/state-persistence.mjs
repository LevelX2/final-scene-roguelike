import { getShieldTemplate } from '../content/catalogs/shields.mjs';
import { getWeaponTemplate } from '../content/catalogs/weapon-templates.mjs';
import { cloneConsumableDefinition, normalizeLegacyConsumableItem } from '../content/catalogs/consumables.mjs';
import { getItemBalanceGroups } from '../item-balance-groups.mjs';
import { createKeyItem } from '../item-defs.mjs';
import { normalizeKillStats } from '../kill-stats.mjs';
import { createTimestampedId } from '../utils/id-tools.mjs';
import { normalizeSeed } from '../utils/seeded-random.mjs';
import { cloneItemModifierRuntime, cloneWeaponRuntimeEffect } from '../weapon-runtime-effects.mjs';
import { createEmptyProgressionBonuses, getActorDerivedMaxHp } from './derived-actor-stats.mjs';
import { areVoiceAnnouncementsForcedOff } from './test-mode.mjs';

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
  const SAVEGAME_STORE_VERSION = 2;
  const MAX_SAVE_SLOTS = 10;
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
    nextOptions.decorativeOverlaysEnabled = Boolean(nextOptions.decorativeOverlaysEnabled);
    nextOptions.decorativeOverlayDebugLog = Boolean(nextOptions.decorativeOverlayDebugLog);
    nextOptions.decorativeOverlayDebugMask = Boolean(nextOptions.decorativeOverlayDebugMask);
    nextOptions.showcaseAnnouncementMode = normalizeShowcaseAnnouncementMode(nextOptions.showcaseAnnouncementMode);
    nextOptions.uiScale = normalizeScale(nextOptions.uiScale, DEFAULT_OPTIONS.uiScale, 0.85, 1.3);
    nextOptions.studioZoom = normalizeScale(nextOptions.studioZoom, DEFAULT_OPTIONS.studioZoom, 0.6, 2.4);
    nextOptions.tooltipScale = normalizeScale(nextOptions.tooltipScale, DEFAULT_OPTIONS.tooltipScale, 0.85, 1.5);
    nextOptions.enemyPanelMode = normalizeEnemyPanelMode(nextOptions.enemyPanelMode);
    if (areVoiceAnnouncementsForcedOff()) {
      nextOptions.voiceAnnouncements = false;
    }
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

  function createEmptySavegameStore() {
    return {
      version: SAVEGAME_STORE_VERSION,
      slots: Array.from({ length: MAX_SAVE_SLOTS }, () => null),
    };
  }

  function normalizeSaveSlotIndex(slotIndex) {
    const normalized = Number(slotIndex);
    if (!Number.isInteger(normalized) || normalized < 0 || normalized >= MAX_SAVE_SLOTS) {
      return null;
    }
    return normalized;
  }

  function createSaveMetadata(slotIndex, entry, options = {}) {
    const normalizedSlotIndex = normalizeSaveSlotIndex(slotIndex) ?? 0;
    const slotLabel = `Slot ${normalizedSlotIndex + 1}`;
    if (!entry) {
      return {
        id: `save-slot-${normalizedSlotIndex + 1}`,
        slotIndex: normalizedSlotIndex,
        slotLabel,
        isLatest: false,
        empty: true,
        compatible: true,
        canLoad: false,
        canOverwrite: true,
        canDelete: false,
        savedAt: null,
        heroName: null,
        heroClass: null,
        floor: null,
        level: null,
        turn: null,
      };
    }

    const compatible = isSaveEntryCompatible(entry);

    return {
      id: entry.id ?? `save-slot-${normalizedSlotIndex + 1}`,
      slotIndex: normalizedSlotIndex,
      slotLabel,
      isLatest: Boolean(options.isLatest),
      empty: false,
      version: entry.snapshotVersion ?? null,
      compatible,
      canLoad: compatible,
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

    const parsedEntry = Array.isArray(parsed?.slots)
      ? parsed.slots.find((entry) => entry?.state)
      : Array.isArray(parsed?.entries)
        ? parsed.entries[0]
        : parsed;

    return {
      id: INCOMPATIBLE_SAVE_ENTRY_ID,
      slotIndex: null,
      slotLabel: "Inkompatibler Spielstand",
      empty: false,
      isLatest: false,
      version: parsed?.version ?? null,
      compatible: false,
      canLoad: false,
      canOverwrite: false,
      canDelete: true,
      savedAt: parsedEntry?.savedAt ?? null,
      heroName: parsedEntry?.state?.player?.name ?? parsed?.state?.player?.name ?? "Unbekannt",
      heroClass: parsedEntry?.state?.player?.classLabel ?? parsed?.state?.player?.classLabel ?? null,
      floor: parsedEntry?.state?.floor ?? parsed?.state?.floor ?? null,
      level: parsedEntry?.state?.player?.level ?? parsed?.state?.player?.level ?? null,
      turn: parsedEntry?.state?.turn ?? parsed?.state?.turn ?? null,
    };
  }

  function normalizeSaveEntry(entry) {
    if (!entry || typeof entry !== "object" || !entry.state || typeof entry.state !== "object") {
      return null;
    }

    return {
      id: entry.id ?? createTimestampedId("save"),
      savedAt: Number(entry.savedAt) || Date.now(),
      snapshotVersion: Number(entry.snapshotVersion) || SAVEGAME_VERSION,
      state: entry.state,
    };
  }

  function normalizeSaveSlots(slots) {
    const normalizedSlots = Array.from({ length: MAX_SAVE_SLOTS }, (_, slotIndex) =>
      normalizeSaveEntry(slots?.[slotIndex] ?? null)
    );
    return normalizedSlots;
  }

  function isSaveEntryCompatible(entry) {
    if (!entry) {
      return false;
    }

    return Number(entry.snapshotVersion) === SAVEGAME_VERSION;
  }

  function readSavegameStore() {
    const rawSave = readStorage(SAVEGAME_KEY);
    if (!rawSave) {
      return createEmptySavegameStore();
    }

    const parsed = JSON.parse(rawSave);
    if (parsed?.version === SAVEGAME_STORE_VERSION && Array.isArray(parsed.slots)) {
      return {
        version: SAVEGAME_STORE_VERSION,
        slots: normalizeSaveSlots(parsed.slots),
      };
    }

    throw new Error("incompatible-savegame-store");
  }

  function writeSavegameStore(store) {
    return writeStorage(SAVEGAME_KEY, JSON.stringify({
      version: SAVEGAME_STORE_VERSION,
      slots: normalizeSaveSlots(store.slots),
    }));
  }

  function hasSavedGame() {
    try {
      return readSavegameStore().slots.some(Boolean);
    } catch {
      return Boolean(readStorage(SAVEGAME_KEY));
    }
  }

  function clearSavedGame() {
    removeStorage(SAVEGAME_KEY);
  }

  function deleteSavedGame(targetEntryId) {
    const targetSlotIndex = normalizeSaveSlotIndex(targetEntryId);
    if (targetSlotIndex === null && targetEntryId !== INCOMPATIBLE_SAVE_ENTRY_ID) {
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
    if (!store.slots[targetSlotIndex]) {
      return false;
    }

    store.slots[targetSlotIndex] = null;
    if (!store.slots.some(Boolean)) {
      removeStorage(SAVEGAME_KEY);
      return true;
    }

    return writeSavegameStore(store);
  }

  function getLatestSaveMetadataFromStore(store) {
    const latestEntry = (store.slots ?? []).reduce((latest, entry, slotIndex) => {
      if (!entry) {
        return latest;
      }

      if (!latest || (entry.savedAt ?? 0) > (latest.entry.savedAt ?? 0)) {
        return { slotIndex, entry };
      }

      return latest;
    }, null);

    return latestEntry
      ? createSaveMetadata(latestEntry.slotIndex, latestEntry.entry, { isLatest: true })
      : null;
  }

  function getSavedGameMetadata() {
    try {
      return getLatestSaveMetadataFromStore(readSavegameStore());
    } catch {
      return createIncompatibleSaveMetadata();
    }
  }

  function listSavedGames() {
    try {
      const store = readSavegameStore();
      const latestMetadata = getLatestSaveMetadataFromStore(store);
      return store.slots.map((entry, slotIndex) =>
        createSaveMetadata(slotIndex, entry, {
          isLatest: latestMetadata?.slotIndex === slotIndex,
        })
      );
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
        studioTopologyOpen: false,
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
      effects: Array.isArray(item.effects) ? item.effects.map(cloneWeaponRuntimeEffect) : [],
      numericMods: Array.isArray(item.numericMods) ? item.numericMods : [],
      modifiers: Array.isArray(item.modifiers) ? item.modifiers.map(cloneItemModifierRuntime) : [],
      modifierIds: Array.isArray(item.modifierIds) ? item.modifierIds : [],
      balanceGroups: Array.isArray(item.balanceGroups) ? item.balanceGroups : getItemBalanceGroups(item),
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
        ? item.modifiers.map(cloneItemModifierRuntime)
        : [],
      modifierIds: Array.isArray(item.modifierIds) ? [...item.modifierIds] : [],
      balanceGroups: Array.isArray(item.balanceGroups) ? [...item.balanceGroups] : getItemBalanceGroups(item),
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

  function normalizeKeyItem(item) {
    if (!item || typeof item !== "object") {
      return item ?? null;
    }

    if (!item.keyColor && item.type !== "key") {
      return { ...item };
    }

    return createKeyItem(item.keyColor ?? "green", item.keyFloor ?? null, item);
  }

  function normalizeKeyPickup(entry) {
    if (!entry || typeof entry !== "object") {
      return entry;
    }

    return {
      ...entry,
      item: normalizeKeyItem(entry.item),
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

    if (item.type === "key" || item.keyColor) {
      return normalizeKeyItem(item);
    }

    if (item.type === "consumable" || item.itemType === "consumable" || item.effectFamily) {
      const definition = cloneConsumableDefinition(item.id);
      if (definition) {
        return {
          ...definition,
          ...item,
          magnitude: item.magnitude && typeof item.magnitude === 'object' ? { ...item.magnitude } : definition.magnitude,
          useLogTexts: Array.isArray(item.useLogTexts) ? [...item.useLogTexts] : [...(definition.useLogTexts ?? [])],
          expireLogTexts: Array.isArray(item.expireLogTexts) ? [...item.expireLogTexts] : [...(definition.expireLogTexts ?? [])],
          resultLogTexts: Array.isArray(item.resultLogTexts) ? [...item.resultLogTexts] : [...(definition.resultLogTexts ?? [])],
          balanceGroups: Array.isArray(item.balanceGroups) ? [...item.balanceGroups] : getItemBalanceGroups(item),
        };
      }
    }

    return normalizeLegacyConsumableItem({ ...item });
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

    floorState.consumables = Array.isArray(floorState.consumables)
      ? floorState.consumables.map((entry) => ({
          ...entry,
          item: normalizeLegacyConsumableItem(entry.item),
        }))
      : Array.isArray(floorState.potions)
        ? floorState.potions.map((entry) => ({
            ...entry,
            item: normalizeLegacyConsumableItem(entry.item),
          }))
        : [];
    floorState.potions = floorState.consumables;
    floorState.weapons = Array.isArray(floorState.weapons)
      ? floorState.weapons.map(normalizeWeaponPickup)
      : [];
    floorState.offHands = Array.isArray(floorState.offHands)
      ? floorState.offHands.map(normalizeOffHandPickup)
      : [];
    floorState.keys = Array.isArray(floorState.keys)
      ? floorState.keys.map(normalizeKeyPickup)
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

  function findFirstEmptySaveSlot(store) {
    return (store.slots ?? []).findIndex((entry) => !entry);
  }

  function saveGame(targetEntryId = null) {
    const state = getState();
    const store = readSavegameStore();
    const resolvedSlotIndex = normalizeSaveSlotIndex(targetEntryId)
      ?? (() => {
        const firstEmptySlotIndex = findFirstEmptySaveSlot(store);
        return firstEmptySlotIndex >= 0 ? firstEmptySlotIndex : 0;
      })();
    const entry = {
      id: store.slots[resolvedSlotIndex]?.id ?? createTimestampedId("save"),
      savedAt: Date.now(),
      snapshotVersion: SAVEGAME_VERSION,
      state: createSerializableSnapshot(state),
    };
    store.slots[resolvedSlotIndex] = entry;

    return writeSavegameStore(store)
      ? { ok: true, entry: createSaveMetadata(resolvedSlotIndex, entry, { isLatest: true }), slotIndex: resolvedSlotIndex }
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
    normalizedState.activeConsumableBuffs = Array.isArray(savedState.activeConsumableBuffs)
      ? savedState.activeConsumableBuffs.map((buff) => ({
          ...buff,
          magnitude: buff?.magnitude && typeof buff.magnitude === 'object' ? { ...buff.magnitude } : buff?.magnitude,
        }))
      : [];
    normalizedState.consumableLogMemory = savedState.consumableLogMemory && typeof savedState.consumableLogMemory === 'object'
      ? { ...savedState.consumableLogMemory }
      : {};
    normalizedState.knownMonsterTypes = savedState.knownMonsterTypes ?? {};
    normalizedState.seenMonsterCounts = savedState.seenMonsterCounts ?? {};
    normalizedState.lastScoreRank = savedState.lastScoreRank ?? null;
    normalizedState.runSeed = normalizeSeed(savedState.runSeed ?? normalizedState.runSeed, normalizedState.runSeed);
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
      studioTopologyOpen: false,
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
    normalizedState.healOverlay = {
      open: false,
      selectedFamilyId: savedState.healOverlay?.selectedFamilyId ?? null,
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
      type: "player",
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
    normalizedState.player.progressionBonuses = {
      ...createEmptyProgressionBonuses(),
      ...(savedState.player?.progressionBonuses ?? {}),
    };
    normalizedState.player.mainHand = normalizeWeaponItem(savedState.player?.mainHand ?? normalizedState.player.mainHand);
    normalizedState.player.offHand = normalizeOffHandItem(savedState.player?.offHand ?? normalizedState.player.offHand);
    normalizedState.player.equipmentStatsApplied = false;
    normalizedState.player.statusEffects = Array.isArray(savedState.player?.statusEffects)
      ? savedState.player.statusEffects
      : [];
    normalizedState.player.consumableBonuses = savedState.player?.consumableBonuses && typeof savedState.player.consumableBonuses === 'object'
      ? { ...savedState.player.consumableBonuses }
      : {};
    normalizedState.player.activeConsumableBuffs = Array.isArray(savedState.player?.activeConsumableBuffs)
      ? savedState.player.activeConsumableBuffs.map((buff) => ({ ...buff }))
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

    if (!store.slots.some(Boolean)) {
      return {
        ok: false,
        reason: "missing",
      };
    }

    try {
      const targetSlotIndex = normalizeSaveSlotIndex(targetEntryId)
        ?? (() => {
          const latestMetadata = getLatestSaveMetadataFromStore(store);
          return latestMetadata?.slotIndex ?? null;
        })();
      const entry = targetSlotIndex === null ? null : store.slots[targetSlotIndex];
      if (!entry) {
        return {
          ok: false,
          reason: "missing",
        };
      }

      if (!isSaveEntryCompatible(entry)) {
        return {
          ok: false,
          reason: "incompatible",
          foundVersion: entry.snapshotVersion ?? "unknown",
          expectedVersion: SAVEGAME_VERSION,
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
      store.slots[targetSlotIndex] = null;
      if (store.slots.some(Boolean)) {
        writeSavegameStore(store);
      } else {
        removeStorage(SAVEGAME_KEY);
      }
      return {
        ok: true,
        state: normalizedState,
        savedAt: entry.savedAt ?? null,
        metadata: createSaveMetadata(targetSlotIndex, entry, { isLatest: true }),
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
      maxHp: getActorDerivedMaxHp(state.player),
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
