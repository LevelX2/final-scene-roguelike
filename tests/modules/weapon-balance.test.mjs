import test from 'node:test';
import assert from 'node:assert/strict';
import { ITEM_RARITY_MODIFIER_COUNTS, getEquipmentRarityWeights } from '../../src/balance.mjs';
import { createItemizationApi } from '../../src/itemization.mjs';
import { getFloorScalingBonus, getWeaponTemplate } from '../../src/content/catalogs/weapon-templates.mjs';
import { createWeaponGenerationService } from '../../src/application/weapon-generation-service.mjs';

function createDeterministicItemizationApi() {
  return createItemizationApi({
    ITEM_RARITY_MODIFIER_COUNTS,
    getEquipmentRarityWeights,
    randomChance: () => 0.5,
    randomInt: (min) => min,
  });
}

test('weapon floor scaling grows more gradually across the first ten floors', () => {
  assert.deepEqual(getFloorScalingBonus(1), { damage: 0, hit: 0, crit: 0 });
  assert.deepEqual(getFloorScalingBonus(2), { damage: 0, hit: 0, crit: 0 });
  assert.deepEqual(getFloorScalingBonus(4), { damage: 1, hit: 1, crit: 0 });
  assert.deepEqual(getFloorScalingBonus(7), { damage: 2, hit: 2, crit: 1 });
  assert.deepEqual(getFloorScalingBonus(10), { damage: 3, hit: 3, crit: 2 });
});

test('standard weapon templates use flatter early damage bands', () => {
  assert.equal(getWeaponTemplate('rune-sword')?.baseDamage, 2);
  assert.equal(getWeaponTemplate('greatsword')?.baseDamage, 4);
  assert.equal(getWeaponTemplate('expedition-revolver')?.baseDamage, 2);
  assert.equal(getWeaponTemplate('service-pistol')?.baseDamage, 2);
  assert.equal(getWeaponTemplate('revolver')?.baseDamage, 2);
});

test('generated common weapons stay below previous early-floor burst levels', () => {
  const itemizationApi = createDeterministicItemizationApi();

  const floor1Revolver = itemizationApi.generateEquipmentItem(getWeaponTemplate('expedition-revolver'), {
    floorNumber: 1,
    forceRarity: 'common',
    dropSourceTag: 'starting-loadout',
  });
  const floor4Revolver = itemizationApi.generateEquipmentItem(getWeaponTemplate('expedition-revolver'), {
    floorNumber: 4,
    forceRarity: 'common',
    dropSourceTag: 'floor-weapon',
  });
  const floor10Axe = itemizationApi.generateEquipmentItem(getWeaponTemplate('breach-axe'), {
    floorNumber: 10,
    forceRarity: 'common',
    dropSourceTag: 'floor-weapon',
  });

  assert.equal(floor1Revolver.damage, 2);
  assert.equal(floor4Revolver.damage, 3);
  assert.equal(floor10Axe.damage, 8);
});

test('early ranged monsters can still roll a ranged weapon when their role prefers it', () => {
  const service = createWeaponGenerationService({
    ITEM_RARITY_MODIFIER_COUNTS,
    getEquipmentRarityWeights,
    generateEquipmentItem: (template) => template,
    getState: () => ({ runArchetypeSequence: ['western'] }),
    randomChance: () => 0.2,
    randomInt: (min) => min,
  });

  const template = service.chooseTemplateForArchetype('western', {
    floorNumber: 1,
    preferredWeaponRoles: ['ranged'],
    sourceType: 'monster',
  });

  assert.equal(template?.weaponRole, 'ranged');
  assert.equal(template?.id, 'revolver');
});
