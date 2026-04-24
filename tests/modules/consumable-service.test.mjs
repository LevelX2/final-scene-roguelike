import test from 'node:test';
import assert from 'node:assert/strict';
import { createConsumableService } from '../../src/application/consumable-service.mjs';
import { cloneConsumableDefinition } from '../../src/content/catalogs/consumables.mjs';

function createHarness() {
  const state = {
    floor: 1,
    activeConsumableBuffs: [],
    consumableLogMemory: {},
    player: {
      x: 2,
      y: 2,
      consumableBonuses: {},
      activeConsumableBuffs: [],
    },
  };
  const floorState = {
    grid: Array.from({ length: 8 }, () => Array(8).fill('.')),
    enemies: [],
    chests: [],
    traps: [],
  };
  const messages = [];
  const floorMoves = [];

  const api = createConsumableService({
    getState: () => state,
    getCurrentFloorState: () => floorState,
    getDoorAt: () => null,
    getShowcaseAt: () => null,
    detectNearbyTraps: () => {},
    maybeTriggerShowcaseAmbience: () => {},
    handleActorEnterTile: () => false,
    moveToFloor: (direction) => {
      floorMoves.push(direction);
      state.floor += direction;
      return true;
    },
    addMessage: (text) => messages.push(text),
    renderSelf: () => {},
    createRuntimeId: (prefix) => `${prefix}-test`,
    randomChance: () => 0,
  });

  api.ensureConsumableState();
  api.rebuildPlayerConsumableState();

  return { api, state, messages, floorMoves };
}

test('consumable-service applies buffs, replaces weaker versions and expires them cleanly', () => {
  const { api, state, messages } = createHarness();

  const weak = cloneConsumableDefinition('cons_vision_scan_cart_t1');
  const strong = cloneConsumableDefinition('cons_vision_scan_cart_t3');

  assert.equal(api.useConsumable(weak), true);
  assert.equal(state.player.consumableBonuses.lightBonus, 1);
  assert.equal(state.activeConsumableBuffs[0].remainingTurns, 12);
  assert.deepEqual(state.player.activeConsumableBuffs[0].magnitude, { lightBonus: 1 });

  assert.equal(api.useConsumable(strong), true);
  assert.equal(state.player.consumableBonuses.lightBonus, 3);
  assert.equal(state.activeConsumableBuffs[0].remainingTurns, 20);
  assert.deepEqual(state.player.activeConsumableBuffs[0].magnitude, { lightBonus: 3 });

  state.activeConsumableBuffs[0].remainingTurns = 1;
  api.processConsumableBuffs();

  assert.equal(state.activeConsumableBuffs.length, 0);
  assert.equal(state.player.consumableBonuses.lightBonus, 0);
  assert.equal(messages.some((entry) => entry.includes('Die Kartusche entlädt sich') || entry.includes('Das Raster flackert aus')), true);
});

test('consumable-service uses multi-step floorwarps with the configured distance', () => {
  const { api, state, floorMoves } = createHarness();
  const jump = cloneConsumableDefinition('cons_floorwarp_jump_cassette_t3');

  assert.equal(api.useConsumable(jump), true);
  assert.deepEqual(floorMoves, [1, 1]);
  assert.equal(state.floor, 3);
});
