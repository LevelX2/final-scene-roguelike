import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlayerAttackApi } from '../../src/combat/player-attack.mjs';

test('player-attack records a death marker when the player kills an enemy', () => {
  const enemy = {
    type: 'monster',
    id: 'test-enemy',
    name: 'Test Enemy',
    x: 4,
    y: 5,
    hp: 3,
    maxHp: 3,
    aggro: false,
    turnsSinceHit: 0,
    xpReward: 4,
  };
  const floorState = {
    enemies: [enemy],
    weapons: [],
    offHands: [],
    foods: [],
    recentDeaths: [],
  };
  const state = {
    player: {
      x: 2,
      y: 5,
      name: 'Ripley',
      classId: 'filmstar',
    },
    turn: 0,
    safeRestTurns: 2,
    damageDealt: 0,
    damageTaken: 0,
    kills: 0,
    killStats: {},
  };
  const grantedXp = [];

  const api = createPlayerAttackApi({
    getState: () => state,
    getCombatWeapon: () => ({ id: 'test-blade', name: 'Testklinge', attackMode: 'melee' }),
    getCurrentFloorState: () => floorState,
    createWeaponPickup: () => { throw new Error('unexpected weapon drop'); },
    createOffHandPickup: () => { throw new Error('unexpected offhand drop'); },
    createFoodPickup: () => { throw new Error('unexpected food drop'); },
    resolveCombatAttack: () => ({ hit: true, damage: 3, critical: false, usedOpeningStrike: false }),
    resolveBlock: (_actor, damage) => ({ damage, blocked: false, prevented: 0, reflectiveDamage: 0, item: { name: 'Blocker' } }),
    tryApplyWeaponEffects: () => {},
    grantExperience: (...args) => grantedXp.push(args),
    showFloatingText: () => {},
    playEnemyHitSound: () => {},
    playDodgeSound: () => {},
    playVictorySound: () => {},
    getWeaponConditionalDamageBonus: () => 0,
    itemHasModifier: () => false,
    noteMonsterEncounter: () => {},
    addMessage: () => {},
    renderSelf: () => {},
    randomChance: () => 1,
  });

  api.attackEnemy(enemy);

  assert.equal(state.safeRestTurns, 0);
  assert.equal(state.kills, 1);
  assert.deepEqual(floorState.enemies, []);
  assert.deepEqual(floorState.recentDeaths, [{
    x: 4,
    y: 5,
    expiresAfterTurn: 3,
    markerAssetId: 'death-mark',
  }]);
  assert.deepEqual(grantedXp, [[4, 'den Test Enemy']]);
});
