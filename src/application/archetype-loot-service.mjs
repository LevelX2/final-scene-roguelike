import { buildNeighborArchetypeOptions, getArchetypeForFloor } from '../content/catalogs/studio-archetypes.mjs';
import { weightedPick } from '../utils/random-tools.mjs';

const SOURCE_ARCHETYPE_WEIGHTS = {
  floor: { current: 72, neighbor: 20, distanceTwo: 8 },
  chest: { current: 68, neighbor: 22, distanceTwo: 10 },
  monster: { current: 80, neighbor: 16, distanceTwo: 4 },
  bonusChest: { current: 62, neighbor: 24, distanceTwo: 14 },
};

export function createArchetypeLootService(context) {
  const {
    getState,
    randomChance = Math.random,
  } = context;

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

    return weightedPick(entries, randomChance)?.archetypeId ?? getArchetypeForFloor(sequence, floorNumber);
  }

  function pickWeightedEntry(entries, weightKey = 'weight') {
    return weightedPick(entries, randomChance, weightKey);
  }

  return {
    normalizeSourceType,
    rollLootArchetype,
    pickWeightedEntry,
  };
}
