import { getArchetypeWeaponTemplates, getIconicWeaponTemplateForMonster } from '../content/catalogs/weapon-templates.mjs';
import { createArchetypeLootService } from './archetype-loot-service.mjs';

export function createWeaponGenerationService(context) {
  const {
    generateEquipmentItem,
    randomChance = Math.random,
  } = context;

  const archetypeLootService = createArchetypeLootService(context);
  const {
    normalizeSourceType,
    rollLootArchetype,
    pickWeightedEntry,
  } = archetypeLootService;

  function chooseTemplateForArchetype(archetypeId, options = {}) {
    const templates = getArchetypeWeaponTemplates(archetypeId);
    if (templates.length === 0) {
      return null;
    }

    const preferredWeaponRoles = Array.isArray(options.preferredWeaponRoles)
      ? options.preferredWeaponRoles.filter(Boolean)
      : [];

    const entries = templates.map((template) => ({
      template,
      weight: (() => {
        let weight = options.boostSpecial && template.weaponRole === 'special'
          ? Math.max(template.weight ?? 10, 22)
          : template.weight ?? 10;

        if (preferredWeaponRoles.length > 0) {
          weight *= preferredWeaponRoles.includes(template.weaponRole) ? 4.2 : 0.28;
        }

        const isRangedTemplate = template.attackMode === 'ranged' && (template.range ?? 1) > 1;
        const floorNumber = Math.max(1, options.floorNumber ?? 1);
        const prefersRanged = preferredWeaponRoles.includes('ranged');
        if (isRangedTemplate) {
          if (options.sourceType === 'monster') {
            if (floorNumber <= 2) {
              weight *= prefersRanged ? 0.9 : 0.12;
            } else if (floorNumber <= 4) {
              weight *= prefersRanged ? 0.7 : 0.35;
            }
          } else if (floorNumber <= 2) {
            weight *= 0.35;
          } else if (floorNumber <= 4) {
            weight *= 0.65;
          }
        }

        return Math.max(0.1, weight);
      })(),
    }));
    return pickWeightedEntry(entries)?.template ?? null;
  }

  function createLootWeapon(options) {
    const {
      floorNumber,
      dropSourceTag = 'floor-weapon',
      preferredArchetypeId = null,
      preferredWeaponRoles = null,
      boostSpecial = false,
      forceRarity = null,
      runArchetypeSequence = null,
    } = options;

    const archetypeId = rollLootArchetype(floorNumber, dropSourceTag, preferredArchetypeId, runArchetypeSequence);
    const template = chooseTemplateForArchetype(archetypeId, {
      boostSpecial,
      floorNumber,
      preferredWeaponRoles,
      sourceType: normalizeSourceType(dropSourceTag),
    });

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
      preferredWeaponRoles: monster.preferredWeaponRoles ?? null,
    });
  }

  function getFloorWeaponSpawnCount(floorNumber) {
    if (floorNumber <= 2) {
      return 1;
    }

    if (floorNumber >= 8) {
      return randomChance() < 0.6 ? 2 : 1;
    }

    return randomChance() < 0.35 ? 2 : 1;
  }

  return {
    ...archetypeLootService,
    chooseTemplateForArchetype,
    createLootWeapon,
    createMonsterWeapon,
    getFloorWeaponSpawnCount,
  };
}
