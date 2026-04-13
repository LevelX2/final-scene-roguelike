import { buildNeighborArchetypeOptions, getArchetypeForFloor } from '../content/catalogs/studio-archetypes.mjs';
import { getArchetypeWeaponTemplates, getIconicWeaponTemplateForMonster } from '../content/catalogs/weapon-templates.mjs';

const SOURCE_ARCHETYPE_WEIGHTS = {
  floor: { current: 72, neighbor: 20, distanceTwo: 8 },
  chest: { current: 68, neighbor: 22, distanceTwo: 10 },
  monster: { current: 80, neighbor: 16, distanceTwo: 4 },
  bonusChest: { current: 62, neighbor: 24, distanceTwo: 14 },
};

export function createWeaponGenerationService(context) {
  const {
    randomInt,
    generateEquipmentItem,
    getState,
  } = context;

  function weightedPick(entries, weightKey = 'weight') {
    const totalWeight = entries.reduce((sum, entry) => sum + (entry[weightKey] ?? 0), 0);
    if (totalWeight <= 0) {
      return entries[entries.length - 1] ?? null;
    }

    let roll = Math.random() * totalWeight;
    for (const entry of entries) {
      roll -= entry[weightKey] ?? 0;
      if (roll <= 0) {
        return entry;
      }
    }

    return entries[entries.length - 1] ?? null;
  }

  function normalizeSourceType(dropSourceTag = 'floor') {
    if (dropSourceTag === 'chest') {
      return 'chest';
    }
    if (dropSourceTag === 'locked-room-chest') {
      return 'bonusChest';
    }
    if (dropSourceTag.startsWith('monster:')) {
      return 'monster';
    }
    return 'floor';
  }

  function rollLootArchetype(floorNumber, dropSourceTag = 'floor', preferredArchetypeId = null, sequenceOverride = null) {
    if (preferredArchetypeId) {
      return preferredArchetypeId;
    }

    const state = getState?.();
    const sequence = sequenceOverride ?? state?.runArchetypeSequence ?? [];
    const neighbors = buildNeighborArchetypeOptions(sequence, floorNumber);
    const weights = SOURCE_ARCHETYPE_WEIGHTS[normalizeSourceType(dropSourceTag)] ?? SOURCE_ARCHETYPE_WEIGHTS.floor;
    const entries = neighbors.map((entry) => ({
      archetypeId: entry.archetypeId,
      weight: entry.distance === 0
        ? weights.current
        : entry.distance === 1
          ? weights.neighbor / 2
          : weights.distanceTwo / 2,
    }));
    return weightedPick(entries)?.archetypeId ?? getArchetypeForFloor(sequence, floorNumber);
  }

  function chooseTemplateForArchetype(archetypeId, options = {}) {
    const templates = getArchetypeWeaponTemplates(archetypeId);
    if (templates.length === 0) {
      return null;
    }

    const entries = templates.map((template) => ({
      template,
      weight: options.boostSpecial && template.weaponRole === 'special'
        ? Math.max(template.weight ?? 10, 22)
        : template.weight ?? 10,
    }));
    return weightedPick(entries)?.template ?? null;
  }

  function createLootWeapon(options) {
    const {
      floorNumber,
      dropSourceTag = 'floor-weapon',
      preferredArchetypeId = null,
      boostSpecial = false,
      forceRarity = null,
      runArchetypeSequence = null,
    } = options;

    const archetypeId = rollLootArchetype(floorNumber, dropSourceTag, preferredArchetypeId, runArchetypeSequence);
    const template = chooseTemplateForArchetype(archetypeId, { boostSpecial });

    if (!template) {
      return null;
    }

    return generateEquipmentItem(template, {
      floorNumber,
      dropSourceTag,
      sourceArchetypeId: archetypeId ?? template.archetypeId,
      forceRarity,
    });
  }

  function createMonsterWeapon(monster, floorNumber, options = {}) {
    const iconicTemplate = getIconicWeaponTemplateForMonster(monster.id);
    const dropSourceTag = options.dropSourceTag ?? `monster:${monster.id}`;
    const sourceArchetypeId = options.sourceArchetypeId ?? null;
    const preferredRarity = options.forceRarity ?? null;
    const runArchetypeSequence = options.runArchetypeSequence ?? null;

    if (iconicTemplate) {
      return generateEquipmentItem(iconicTemplate, {
        floorNumber,
        dropSourceTag,
        sourceArchetypeId: iconicTemplate.archetypeId,
        forceRarity: preferredRarity,
      });
    }

    return createLootWeapon({
      floorNumber,
      dropSourceTag,
      preferredArchetypeId: sourceArchetypeId,
      boostSpecial: Boolean(options.boostSpecial),
      forceRarity: preferredRarity,
      runArchetypeSequence,
    });
  }

  function getFloorWeaponSpawnCount(floorNumber) {
    if (floorNumber <= 2) {
      return 1;
    }

    if (floorNumber >= 8) {
      return Math.random() < 0.6 ? 2 : 1;
    }

    return Math.random() < 0.35 ? 2 : 1;
  }

  return {
    normalizeSourceType,
    rollLootArchetype,
    chooseTemplateForArchetype,
    createLootWeapon,
    createMonsterWeapon,
    getFloorWeaponSpawnCount,
  };
}
