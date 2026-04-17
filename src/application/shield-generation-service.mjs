import { getArchetypeShieldTemplates, getShieldTemplate } from '../content/catalogs/shields.mjs';
import { createArchetypeLootService } from './archetype-loot-service.mjs';

export function createShieldGenerationService(context) {
  const {
    generateEquipmentItem,
  } = context;

  const archetypeLootService = createArchetypeLootService(context);
  const {
    normalizeSourceType,
    rollLootArchetype,
    pickWeightedEntry,
  } = archetypeLootService;

  function chooseTemplateForArchetype(archetypeId, options = {}) {
    const floorNumber = Math.max(1, options.floorNumber ?? 1);
    const templates = getArchetypeShieldTemplates(archetypeId)
      .filter((template) => (template.minFloor ?? 1) <= floorNumber);
    if (templates.length === 0) {
      return null;
    }

    const currentShieldId = options.currentShieldId ?? null;
    const entries = templates.map((template) => ({
      template,
      weight: (template.weight ?? 10) * (template.id === currentShieldId ? 0.35 : 1),
    }));
    return pickWeightedEntry(entries)?.template ?? null;
  }

  function createLootShield(options) {
    const {
      floorNumber,
      dropSourceTag = 'floor-shield',
      preferredArchetypeId = null,
      currentShieldId = null,
      forceRarity = null,
      runArchetypeSequence = null,
    } = options;

    const archetypeId = rollLootArchetype(floorNumber, dropSourceTag, preferredArchetypeId, runArchetypeSequence);
    const template = chooseTemplateForArchetype(archetypeId, { currentShieldId, floorNumber });
    if (!template) {
      return null;
    }

    return generateEquipmentItem(template, {
      floorNumber,
      dropSourceTag,
      sourceArchetypeId: archetypeId ?? template.archetypeId ?? null,
      forceRarity,
    });
  }

  function createMonsterShield(monster, floorNumber, options = {}) {
    const shieldId = monster?.offHand ?? null;
    if (!shieldId) {
      return null;
    }

    const template = getShieldTemplate(shieldId);
    if (!template) {
      return null;
    }

    return generateEquipmentItem(template, {
      floorNumber,
      dropSourceTag: options.dropSourceTag ?? `monster:${monster.id}:shield`,
      sourceArchetypeId: options.sourceArchetypeId ?? template.archetypeId ?? null,
      forceRarity: options.forceRarity ?? null,
    });
  }

  return {
    ...archetypeLootService,
    chooseTemplateForArchetype,
    createLootShield,
    createMonsterShield,
  };
}
