import test from 'node:test';
import assert from 'node:assert/strict';
import { dropEnemyLoot } from '../../src/application/enemy-loot-drop-service.mjs';

function createEnemyReference() {
  return {
    subjectCapitalized: 'Der Testgegner',
  };
}

test('dropEnemyLoot places healing consumables onto the shared floor consumable list', () => {
  const floorState = {
    weapons: [],
    offHands: [],
    foods: [],
    consumables: [],
    potions: [],
  };
  floorState.potions = floorState.consumables;

  dropEnemyLoot({
    enemy: {
      x: 4,
      y: 7,
      lootDrop: {
        item: {
          id: 'heal_set_medkit_standard',
          type: 'consumable',
          itemType: 'consumable',
          consumableType: 'healing',
          familyId: 'heal_set_medkit_standard',
          name: 'Set-Sanitaetskit',
          displayName: 'Set-Sanitaetskit',
          heal: 8,
        },
      },
    },
    floorState,
    enemyReference: createEnemyReference(),
    addMessage: () => {},
    createWeaponPickup: () => {
      throw new Error('unexpected weapon drop');
    },
    createOffHandPickup: () => {
      throw new Error('unexpected offhand drop');
    },
    formatWeaponReference: () => 'Waffe',
    randomChance: () => 1,
  });

  assert.equal(floorState.consumables.length, 1);
  assert.equal(floorState.consumables[0].x, 4);
  assert.equal(floorState.consumables[0].y, 7);
  assert.equal(floorState.consumables[0].item.consumableType, 'healing');
  assert.equal(floorState.potions, floorState.consumables);
});

test('dropEnemyLoot keeps utility consumables as utility pickups', () => {
  const floorState = {
    weapons: [],
    offHands: [],
    foods: [],
    consumables: [],
    potions: [],
  };
  floorState.potions = floorState.consumables;

  dropEnemyLoot({
    enemy: {
      x: 2,
      y: 3,
      lootDrop: {
        item: {
          id: 'cons_teleport_blink_rune_t2',
          type: 'consumable',
          itemType: 'consumable',
          effectFamily: 'blink_teleport',
          displayName: 'Blink-Rune',
          name: 'Blink-Rune',
          magnitude: { quality: 'enemy_buffered' },
        },
      },
    },
    floorState,
    enemyReference: createEnemyReference(),
    addMessage: () => {},
    createWeaponPickup: () => {
      throw new Error('unexpected weapon drop');
    },
    createOffHandPickup: () => {
      throw new Error('unexpected offhand drop');
    },
    formatWeaponReference: () => 'Waffe',
    randomChance: () => 1,
  });

  assert.equal(floorState.consumables.length, 1);
  assert.equal(floorState.consumables[0].item.effectFamily, 'blink_teleport');
  assert.equal(floorState.consumables[0].item.heal ?? null, null);
});
