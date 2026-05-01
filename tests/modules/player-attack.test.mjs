import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlayerAttackApi } from '../../src/combat/player-attack.mjs';
import { DEATH_MARKER_DURATION_TURNS } from '../../src/application/death-marker-service.mjs';

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
    expiresAfterTurn: DEATH_MARKER_DURATION_TURNS,
    markerAssetId: 'death-mark',
  }]);
  assert.deepEqual(grantedXp, [[4, 'den Test Enemy']]);
});

test('player-attack uses an arrow-style projectile effect for bows', () => {
  const enemy = {
    type: 'monster',
    id: 'test-enemy',
    name: 'Test Enemy',
    x: 4,
    y: 5,
    hp: 12,
    maxHp: 12,
    aggro: false,
    turnsSinceHit: 0,
    xpReward: 4,
  };
  const floatingTexts = [];
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

  const api = createPlayerAttackApi({
    getState: () => state,
    getCombatWeapon: () => ({
      id: 'hunting-bow',
      name: 'Jagdbogen',
      attackMode: 'ranged',
    }),
    getCurrentFloorState: () => ({
      enemies: [enemy],
      weapons: [],
      offHands: [],
      foods: [],
      recentDeaths: [],
    }),
    createWeaponPickup: () => null,
    createOffHandPickup: () => null,
    createFoodPickup: () => null,
    resolveCombatAttack: () => ({ hit: true, damage: 3, critical: false, usedOpeningStrike: false }),
    resolveBlock: (_actor, damage) => ({ damage, blocked: false, prevented: 0, reflectiveDamage: 0, item: { name: 'Blocker' } }),
    tryApplyWeaponEffects: () => {},
    grantExperience: () => {},
    showFloatingText: (x, y, text, kind, options = {}) => floatingTexts.push({ x, y, text, kind, options }),
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

  api.attackEnemy(enemy, { distance: 3 });

  assert.equal(floatingTexts.length, 1);
  assert.equal(floatingTexts[0].options.boardEffect.kind, 'hero-arrow');
  assert.equal(floatingTexts[0].options.boardEffect.flash, false);
  assert.equal(floatingTexts[0].options.boardEffect.duration, 820);
  assert.equal(floatingTexts[0].options.boardEffect.steps, 5);
});

test('player-attack logs atmospheric cover context when a reduced-chance shot still hits', () => {
  const enemy = {
    type: 'monster',
    id: 'test-enemy',
    name: 'Test Enemy',
    x: 4,
    y: 5,
    hp: 12,
    maxHp: 12,
    aggro: false,
    turnsSinceHit: 0,
    xpReward: 4,
  };
  const messages = [];
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

  const api = createPlayerAttackApi({
    getState: () => state,
    getCombatWeapon: () => ({
      id: 'test-pistol',
      name: 'Testpistole',
      attackMode: 'ranged',
    }),
    getCurrentFloorState: () => ({
      enemies: [enemy],
      weapons: [],
      offHands: [],
      foods: [],
      recentDeaths: [],
    }),
    createWeaponPickup: () => null,
    createOffHandPickup: () => null,
    createFoodPickup: () => null,
    resolveCombatAttack: () => ({
      hit: true,
      damage: 3,
      critical: false,
      usedOpeningStrike: false,
      coverPenalty: 15,
      coverLabel: 'Teildeckung',
      hitChance: 50,
    }),
    resolveBlock: (_actor, damage) => ({ damage, blocked: false, prevented: 0, reflectiveDamage: 0, item: { name: 'Blocker' } }),
    tryApplyWeaponEffects: () => {},
    grantExperience: () => {},
    showFloatingText: () => {},
    playEnemyHitSound: () => {},
    playDodgeSound: () => {},
    playVictorySound: () => {},
    getWeaponConditionalDamageBonus: () => 0,
    itemHasModifier: () => false,
    noteMonsterEncounter: () => {},
    addMessage: (text) => messages.push(text),
    renderSelf: () => {},
    randomChance: () => 1,
  });

  api.attackEnemy(enemy, { distance: 3 });

  assert.equal(
    messages.some((entry) => entry.includes('Teildeckung nimmt deinem Schuss 15% Trefferchance') && entry.includes('50% Restchance')),
    true,
  );
});

test('player-attack logs atmospheric cover context when a reduced-chance shot misses', () => {
  const enemy = {
    type: 'monster',
    id: 'test-enemy',
    name: 'Test Enemy',
    x: 4,
    y: 5,
    hp: 12,
    maxHp: 12,
    aggro: false,
    turnsSinceHit: 0,
    xpReward: 4,
  };
  const messages = [];
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

  const api = createPlayerAttackApi({
    getState: () => state,
    getCombatWeapon: () => ({
      id: 'test-pistol',
      name: 'Testpistole',
      attackMode: 'ranged',
    }),
    getCurrentFloorState: () => ({
      enemies: [enemy],
      weapons: [],
      offHands: [],
      foods: [],
      recentDeaths: [],
    }),
    createWeaponPickup: () => null,
    createOffHandPickup: () => null,
    createFoodPickup: () => null,
    resolveCombatAttack: () => ({
      hit: false,
      damage: 0,
      critical: false,
      usedOpeningStrike: false,
      coverPenalty: 15,
      coverLabel: 'Teildeckung',
      hitChance: 50,
    }),
    resolveBlock: (_actor, damage) => ({ damage, blocked: false, prevented: 0, reflectiveDamage: 0, item: { name: 'Blocker' } }),
    tryApplyWeaponEffects: () => {},
    grantExperience: () => {},
    showFloatingText: () => {},
    playEnemyHitSound: () => {},
    playDodgeSound: () => {},
    playVictorySound: () => {},
    getWeaponConditionalDamageBonus: () => 0,
    itemHasModifier: () => false,
    noteMonsterEncounter: () => {},
    addMessage: (text) => messages.push(text),
    renderSelf: () => {},
    randomChance: () => 1,
  });

  api.attackEnemy(enemy, { distance: 3 });

  assert.equal(
    messages.some((entry) => entry.includes('Teildeckung klaut deinem Schuss 15% Trefferchance') && entry.includes('50% Restchance')),
    true,
  );
});
