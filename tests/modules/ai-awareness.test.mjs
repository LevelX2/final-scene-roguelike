import test from 'node:test';
import assert from 'node:assert/strict';
import { createAiAwarenessApi } from '../../src/ai/awareness.mjs';

test('ai-awareness grants showcase healing bonus and logs the showcase message', () => {
  const state = {
    player: { x: 5, y: 5, hp: 10, maxHp: 12 },
    safeRestTurns: 3.5,
  };
  const floorState = {
    enemies: [],
    showcases: [{ x: 6, y: 5 }],
  };
  const messages = [];

  const api = createAiAwarenessApi({
    getState: () => state,
    getCurrentFloorState: () => floorState,
    healPlayer: (amount) => {
      const previous = state.player.hp;
      state.player.hp = Math.min(state.player.maxHp, state.player.hp + amount);
      return state.player.hp - previous;
    },
    addMessage: (text) => messages.push(text),
  });

  api.processSafeRegeneration('move');

  assert.equal(state.player.hp, 11);
  assert.equal(state.safeRestTurns, 0);
  assert.ok(messages.some((entry) => entry.includes('Nähe der Vitrine')));
});

test('ai-awareness treats diagonal showcase adjacency and enemy proximity as nearby in 8 directions', () => {
  const state = {
    player: { x: 5, y: 5, hp: 10, maxHp: 12 },
    safeRestTurns: 3.5,
  };
  const floorState = {
    enemies: [{ x: 8, y: 8 }],
    showcases: [{ x: 6, y: 6 }],
  };
  const messages = [];

  const api = createAiAwarenessApi({
    getState: () => state,
    getCurrentFloorState: () => floorState,
    healPlayer: (amount) => {
      const previous = state.player.hp;
      state.player.hp = Math.min(state.player.maxHp, state.player.hp + amount);
      return state.player.hp - previous;
    },
    addMessage: (text) => messages.push(text),
  });

  assert.equal(api.hasNearbyEnemy(), true);
  api.processSafeRegeneration('move');

  assert.equal(state.player.hp, 10);
  assert.equal(state.safeRestTurns, 0);
  assert.deepEqual(messages, []);
});

test('ai-awareness includes consumable rest bonus in safe rest progress', () => {
  const state = {
    player: { x: 5, y: 5, hp: 8, maxHp: 12, consumableBonuses: { safeRestProgressBonus: 1 } },
    safeRestTurns: 2.5,
  };
  const floorState = {
    enemies: [],
    showcases: [],
  };

  const api = createAiAwarenessApi({
    getState: () => state,
    getCurrentFloorState: () => floorState,
    healPlayer: (amount) => {
      const previous = state.player.hp;
      state.player.hp = Math.min(state.player.maxHp, state.player.hp + amount);
      return state.player.hp - previous;
    },
    addMessage: () => {},
  });

  api.processSafeRegeneration('wait');

  assert.equal(state.player.hp, 9);
  assert.equal(state.safeRestTurns, 0);
});

test('ai-awareness only applies actor-safe-regeneration to the player actor', () => {
  const state = {
    player: { x: 5, y: 5, hp: 8, maxHp: 12 },
    safeRestTurns: 2,
  };
  const floorState = {
    enemies: [],
    showcases: [],
  };

  const api = createAiAwarenessApi({
    getState: () => state,
    getCurrentFloorState: () => floorState,
    healPlayer: (amount) => {
      state.player.hp += amount;
      return amount;
    },
    addMessage: () => {},
  });

  api.processActorSafeRegeneration({ type: 'monster', x: 1, y: 1, hp: 5, maxHp: 5 }, 'wait');

  assert.equal(state.safeRestTurns, 2);
  assert.equal(state.player.hp, 8);
});
