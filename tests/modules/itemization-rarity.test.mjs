import test from 'node:test';
import assert from 'node:assert/strict';
import { ITEM_RARITY_MODIFIER_COUNTS, getEquipmentRarityWeights, getMaxEquipmentRarity } from '../../src/balance.mjs';
import { createItemizationApi } from '../../src/itemization.mjs';

function createDeterministicItemizationApi(randomChance = 0.999) {
  return createItemizationApi({
    ITEM_RARITY_MODIFIER_COUNTS,
    getEquipmentRarityWeights,
    randomChance: () => randomChance,
    randomInt: (min) => min,
  });
}

test('early floors cap the maximum equipment rarity by depth', () => {
  assert.equal(getMaxEquipmentRarity({ floorNumber: 1 }), 'uncommon');
  assert.equal(getMaxEquipmentRarity({ floorNumber: 3 }), 'rare');
  assert.equal(getMaxEquipmentRarity({ floorNumber: 4 }), 'veryRare');

  const floor1Chest = getEquipmentRarityWeights({ floorNumber: 1, dropSourceTag: 'locked-room-chest' });
  assert.equal(floor1Chest.rare, 0);
  assert.equal(floor1Chest.veryRare, 0);
  assert.ok(floor1Chest.uncommon > 0);

  const floor3Chest = getEquipmentRarityWeights({ floorNumber: 3, dropSourceTag: 'locked-room-chest' });
  assert.ok(floor3Chest.rare > 0);
  assert.equal(floor3Chest.veryRare, 0);

  const floor4Chest = getEquipmentRarityWeights({ floorNumber: 4, dropSourceTag: 'locked-room-chest' });
  assert.ok(floor4Chest.veryRare > 0);
});

test('weapon generation respects the early-floor rarity cap', () => {
  const itemizationApi = createDeterministicItemizationApi();
  const template = {
    type: 'weapon-template',
    id: 'depth-test-revolver',
    name: 'Tiefentest-Revolver',
    source: 'Tests',
    archetypeId: 'western',
    weaponRole: 'ranged',
    attackMode: 'ranged',
    range: 6,
    profileId: 'precise_ranged',
    baseDamage: 3,
    baseHit: 2,
    baseCrit: 1,
    description: 'Nur fuer Tests.',
  };

  const floor1Weapon = itemizationApi.generateEquipmentItem(template, {
    floorNumber: 1,
    dropSourceTag: 'monster:test-enemy',
  });
  const floor3Weapon = itemizationApi.generateEquipmentItem(template, {
    floorNumber: 3,
    dropSourceTag: 'monster:test-enemy',
  });
  const floor4Weapon = itemizationApi.generateEquipmentItem(template, {
    floorNumber: 4,
    dropSourceTag: 'monster:test-enemy',
  });

  assert.equal(floor1Weapon.rarity, 'uncommon');
  assert.equal(floor3Weapon.rarity, 'rare');
  assert.equal(floor4Weapon.rarity, 'veryRare');
});
