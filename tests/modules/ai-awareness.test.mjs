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
