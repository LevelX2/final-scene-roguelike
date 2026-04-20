import test from 'node:test';
import assert from 'node:assert/strict';
import { createStatusEffectService } from '../../src/application/status-effect-service.mjs';

test('status-effect-service records a death marker when a monster dies from damage over time', () => {
  const enemy = {
    type: 'monster',
    id: 'test-enemy',
    name: 'Test Enemy',
    x: 4,
    y: 5,
    hp: 2,
    maxHp: 8,
    xpReward: 3,
    statusEffects: [{
      type: 'burn',
      duration: 2,
      dotDamage: 2,
      sourceActorType: 'player',
    }],
  };
  const floorState = {
    enemies: [enemy],
    recentDeaths: [],
  };
  const state = {
    player: { x: 1, y: 1, hp: 12, maxHp: 12 },
    floor: 1,
    turn: 0,
    gameOver: false,
    damageDealt: 0,
    damageTaken: 0,
    kills: 0,
    killStats: {},
    floors: { 1: floorState },
  };
  const grantedXp = [];
  const messages = [];

  const service = createStatusEffectService({
    getEffectStateLabel: (type) => type,
    getState: () => state,
    getCurrentFloorState: () => floorState,
    addMessage: (text) => messages.push(text),
    showFloatingText: () => {},
    noteMonsterEncounter: () => {},
    playEnemyHitSound: () => {},
    playPlayerHitSound: () => {},
    saveHighscoreIfNeeded: () => null,
    createDeathCause: () => 'Test',
    showDeathModal: () => {},
    playDeathSound: () => {},
    grantExperience: (...args) => grantedXp.push(args),
  });

  const result = service.processActorStatusEffects(enemy, floorState);

  assert.deepEqual(result, { dead: true });
  assert.equal(state.kills, 1);
  assert.deepEqual(floorState.enemies, []);
  assert.deepEqual(floorState.recentDeaths, [{
    x: 4,
    y: 5,
    expiresAfterTurn: 3,
    markerAssetId: 'death-mark',
  }]);
  assert.deepEqual(grantedXp, [[3, 'den Test Enemy']]);
  assert.equal(messages.some((entry) => entry.includes('bricht unter burn zusammen')), true);
});
