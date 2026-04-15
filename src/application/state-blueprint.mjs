import { getWeaponTemplate } from '../content/catalogs/weapon-templates.mjs';
import { getShieldTemplate } from '../content/catalogs/shields.mjs';
import { getStartLoadout } from '../content/start-loadouts.mjs';
import { cloneItemDef, createKeyItem } from '../item-defs.mjs';
import { cloneOffHandItem } from '../equipment-helpers.mjs';
import { applyItemStatMods } from './item-stat-mods.mjs';

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
    createRunStudioTopology = () => ({ nodes: { 1: { floorNumber: 1, position: { x: 0, y: 0, z: 0 }, entryDirection: "front", entryTransitionStyle: "passage", exitDirection: null, exitTransitionStyle: null } }, occupied: { "0,0,0": 1 }, generatedToFloor: 1 }),
    randomInt,
  } = context;

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

  function getHeroStartLoadout(heroClass) {
    return getStartLoadout(heroClass?.startLoadoutId ?? heroClass?.id ?? DEFAULT_HERO_CLASS);
  }

  function cloneStartingWeaponItem(item, sourceLabel) {
    if (!item || typeof item !== "object") {
      return null;
    }

    const templateId = item.itemId ?? item.templateId ?? item.baseItemId ?? item.id ?? null;
    const template = templateId ? getWeaponTemplate(templateId) : null;
    if (template && generateEquipmentItem && (item.itemId || item.templateId || item.baseItemId)) {
      const weapon = generateEquipmentItem(template, {
        floorNumber: 1,
        forceRarity: item.forceRarity ?? "common",
        dropSourceTag: "starting-loadout",
        sourceArchetypeId: template.archetypeId,
      });

      return {
        ...weapon,
        ...item,
        type: "weapon",
        id: item.id ?? weapon.id ?? template.id,
        templateId: item.templateId ?? weapon.templateId ?? template.id,
        baseItemId: item.baseItemId ?? weapon.baseItemId ?? template.id,
        name: item.name ?? template.name,
        displayName: item.displayName ?? item.name ?? template.name,
        source: item.source ?? sourceLabel,
        modifiers: Array.isArray(item.modifiers) ? item.modifiers.map((modifier) => ({ ...modifier })) : weapon.modifiers,
        modifierIds: Array.isArray(item.modifierIds) ? [...item.modifierIds] : weapon.modifierIds,
        numericMods: Array.isArray(item.numericMods) ? [...item.numericMods] : weapon.numericMods,
        effects: Array.isArray(item.effects) ? item.effects.map((effect) => ({ ...effect })) : weapon.effects,
      };
    }

    return {
      type: "weapon",
      modifiers: Array.isArray(item.modifiers) ? item.modifiers.map((modifier) => ({ ...modifier })) : [],
      modifierIds: [...(item.modifierIds ?? [])],
      numericMods: [...(item.numericMods ?? [])],
      effects: (item.effects ?? []).map((effect) => ({ ...effect })),
      lightBonus: item.lightBonus ?? 0,
      source: item.source ?? sourceLabel,
      ...item,
    };
  }

  function cloneStartingOffHand(item, sourceLabel) {
    if (!item || typeof item !== "object") {
      return null;
    }

    const templateId = item.itemId ?? item.templateId ?? item.baseItemId ?? item.id ?? null;
    const template = templateId ? getShieldTemplate(templateId) : null;

    return cloneOffHandItem({
      ...(template ?? {}),
      ...item,
      id: item.id ?? templateId ?? null,
      source: item.source ?? sourceLabel,
    });
  }

  function createStartingWeapon(heroClass, loadout = getHeroStartLoadout(heroClass)) {
    const sourceLabel = `Startausstattung | ${loadout?.label ?? heroClass.label}`;
    if (loadout?.mainHand) {
      return cloneStartingWeaponItem(loadout.mainHand, sourceLabel) ?? createBareHandsWeapon();
    }

    const explicitTemplateId = loadout?.mainHandId ?? null;
    const templatePool = explicitTemplateId ? [explicitTemplateId] : (loadout?.mainHandPool ?? []);
    if (!templatePool.length) {
      return createBareHandsWeapon();
    }

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
      source: sourceLabel,
    };
  }

  function createStartingOffHand(heroClass, loadout = getHeroStartLoadout(heroClass)) {
    const sourceLabel = `Startausstattung | ${loadout?.label ?? heroClass.label}`;
    if (loadout?.equippedOffHand) {
      return cloneStartingOffHand(loadout.equippedOffHand, sourceLabel);
    }

    const templateId = loadout?.equippedOffHandId ?? null;
    if (!templateId) {
      return null;
    }

    const template = getShieldTemplate(templateId);
    if (!template) {
      return null;
    }

    return cloneOffHandItem({
      ...template,
      source: sourceLabel,
    });
  }

  function createStartingInventoryItem(entry, heroClass, loadout) {
    if (!entry || typeof entry !== "object") {
      return null;
    }

    if (entry.type === "food" || entry.type === "potion") {
      const item = entry.itemId ? cloneItemDef(entry.itemId) : null;
      if (!item && !entry.item) {
        return null;
      }

      return {
        ...(item ?? {}),
        ...(entry.item ?? {}),
      };
    }

    if (entry.type === "weapon") {
      const inlineWeapon = entry.item ? cloneStartingWeaponItem(entry.item, `Startausstattung | ${loadout?.label ?? heroClass.label}`) : null;
      if (!entry.itemId) {
        return inlineWeapon;
      }

      const template = getWeaponTemplate(entry.itemId);
      if (!template || !generateEquipmentItem) {
        return null;
      }

      const weapon = generateEquipmentItem(template, {
        floorNumber: 1,
        forceRarity: entry.forceRarity ?? "common",
        dropSourceTag: "starting-loadout",
        sourceArchetypeId: template.archetypeId,
      });

      return {
        ...weapon,
        ...(entry.item ?? {}),
        name: entry.item?.name ?? template.name,
        displayName: entry.item?.displayName ?? entry.item?.name ?? template.name,
        source: `Startausstattung | ${loadout?.label ?? heroClass.label}`,
      };
    }

    if (entry.type === "offhand") {
      if (!entry.itemId) {
        return entry.item ? cloneStartingOffHand(entry.item, `Startausstattung | ${loadout?.label ?? heroClass.label}`) : null;
      }

      const template = getShieldTemplate(entry.itemId);
      if (!template) {
        return null;
      }

      return cloneOffHandItem({
        ...template,
        source: `Startausstattung | ${loadout?.label ?? heroClass.label}`,
      });
    }

    if (entry.type === "key") {
      if (entry.item?.keyColor || entry.keyColor) {
        return createKeyItem(
          entry.keyColor ?? entry.item?.keyColor,
          entry.keyFloor ?? entry.item?.keyFloor ?? null,
          entry.item ?? {},
        );
      }

      return {
        type: "key",
        ...(entry.item ?? {}),
      };
    }

    return entry.item ? { ...entry.item } : null;
  }

  function createStartingInventory(heroClassId) {
    const resolvedClassId = resolveHeroClassId(heroClassId, DEFAULT_HERO_CLASS);
    const heroClass = HERO_CLASSES[resolvedClassId] ?? HERO_CLASSES[DEFAULT_HERO_CLASS];
    const loadout = getHeroStartLoadout(heroClass);
    const inventory = [];

    for (const entry of loadout?.inventory ?? []) {
      const count = Math.max(1, Number(entry.count) || 1);
      for (let index = 0; index < count; index += 1) {
        const item = createStartingInventoryItem(entry, heroClass, loadout);
        if (item) {
          inventory.push(item);
        }
      }
    }

    return inventory;
  }

  function createPlayerFromProfile(heroName, heroClassId) {
    const resolvedClassId = resolveHeroClassId(heroClassId, DEFAULT_HERO_CLASS);
    const heroClass = HERO_CLASSES[resolvedClassId] ?? HERO_CLASSES[DEFAULT_HERO_CLASS];
    const loadout = getHeroStartLoadout(heroClass);
    const startingOffHand = createStartingOffHand(heroClass, loadout);
    const player = {
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
      mainHand: createStartingWeapon(heroClass, loadout),
      offHand: startingOffHand,
      statusEffects: [],
    };

    if (startingOffHand) {
      applyItemStatMods(player, startingOffHand, 1);
    }

    return player;
  }

  function createDefaultModals(openStartModal = true) {
    return {
      inventoryOpen: false,
      studioTopologyOpen: false,
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
      runStudioTopology: createRunStudioTopology(randomInt, 10),
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
    createStartingInventory,
    createFreshState,
  };
}
