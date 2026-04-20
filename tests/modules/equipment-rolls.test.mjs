import test from 'node:test';
import assert from 'node:assert/strict';

import { createDungeonEquipmentRolls } from '../../src/dungeon/equipment-rolls.mjs';

test('chests can roll shields much more often than the old narrow shield band', () => {
  const api = createDungeonEquipmentRolls({
    getState: () => ({ player: null }),
    randomChance: () => 0.45,
    createLootWeapon: () => ({ id: 'test-weapon' }),
    createLootShield: () => ({ id: 'test-shield', itemType: 'shield', subtype: 'shield' }),
    rollConsumableLootDefinition: () => ({ id: 'test-consumable' }),
  });

  const entry = api.rollChestContent(4, null, {
    dropSourceTag: 'chest',
    preferredArchetypeId: 'slasher',
  });

  assert.equal(entry?.type, 'offhand');
  assert.equal(entry?.item?.id, 'test-shield');
});

test('locked-room chests get an additional shield bonus on top of the base chest rate', () => {
  const api = createDungeonEquipmentRolls({
    getState: () => ({ player: null }),
    randomChance: () => 0.58,
    createLootWeapon: () => ({ id: 'test-weapon' }),
    createLootShield: () => ({ id: 'locked-room-shield', itemType: 'shield', subtype: 'shield' }),
    rollConsumableLootDefinition: () => ({ id: 'test-consumable' }),
  });

  const entry = api.rollChestContent(6, null, {
    dropSourceTag: 'locked-room-chest',
    preferredArchetypeId: 'fantasy',
  });

  assert.equal(entry?.type, 'offhand');
  assert.equal(entry?.item?.id, 'locked-room-shield');
});

