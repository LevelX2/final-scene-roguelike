import test from 'node:test';
import assert from 'node:assert/strict';
import { ITEM_RARITY_MODIFIER_COUNTS, getEquipmentRarityWeights } from '../../src/balance.mjs';
import { createShieldGenerationService } from '../../src/application/shield-generation-service.mjs';
import { getArchetypeShieldTemplates } from '../../src/content/catalogs/shields.mjs';
import { STUDIO_ARCHETYPE_IDS } from '../../src/studio-theme.mjs';
import { createItemizationApi } from '../../src/itemization.mjs';

function createDeterministicRng(values) {
  let index = 0;
  return () => {
    const value = values[index] ?? values[values.length - 1] ?? 0;
    index += 1;
    return value;
  };
}

test('jede Studio-Archetype hat mindestens ein Schild-Template', () => {
  STUDIO_ARCHETYPE_IDS.forEach((archetypeId) => {
    assert.ok(
      getArchetypeShieldTemplates(archetypeId).length > 0,
      `Für ${archetypeId} fehlt mindestens ein Schild-Template.`,
    );
  });
});

test('Monster-Schilde laufen durch die Itemization mit Seltenheit und Metadaten', () => {
  const randomChance = createDeterministicRng([0.18, 0.82, 0.36, 0.64, 0.24, 0.74]);
  const randomInt = createDeterministicRng([0, 1, 0, 1, 0, 1]);
  const itemizationApi = createItemizationApi({
    ITEM_RARITY_MODIFIER_COUNTS,
    getEquipmentRarityWeights,
    randomChance,
    randomInt: (min, max) => Math.max(min, Math.min(max, min + randomInt())),
  });
  const shieldService = createShieldGenerationService({
    generateEquipmentItem: itemizationApi.generateEquipmentItem,
    getState: () => ({ runArchetypeSequence: ['slasher', 'action', 'noir'] }),
  });

  const shield = shieldService.createMonsterShield(
    {
      id: 'test-enemy',
      offHand: 'clapperboard-shield',
    },
    4,
    {
      dropSourceTag: 'monster:test-enemy',
      sourceArchetypeId: 'slasher',
      forceRarity: 'rare',
    },
  );

  assert.ok(shield);
  assert.equal(shield.type, 'offhand');
  assert.equal(shield.itemType, 'shield');
  assert.equal(shield.subtype, 'shield');
  assert.equal(shield.baseItemId, 'clapperboard-shield');
  assert.equal(shield.rarity, 'rare');
  assert.equal(shield.dropSourceTag, 'monster:test-enemy');
  assert.equal(shield.sourceArchetypeId, 'slasher');
  assert.ok(Array.isArray(shield.modifiers));
  assert.ok(Array.isArray(shield.modifierIds));
});
