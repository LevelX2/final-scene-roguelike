import test from 'node:test';
import assert from 'node:assert/strict';
import { createDungeonEnemyFactory } from '../../src/dungeon/enemy-factory.mjs';
import { MONSTER_TEMPERAMENT_HINTS } from '../../src/content/catalogs/monsters.mjs';

function createFactoryHarness(overrides = {}) {
  return createDungeonEnemyFactory({
    cloneOffHandItem: (item) => item ? { ...item } : null,
    createMonsterWeapon: () => null,
    createMonsterShield: () => null,
    randomChance: overrides.randomChance ?? (() => 0.5),
    randomInt: overrides.randomInt ?? ((min) => min),
    getEnemyScaleForFloor: overrides.getEnemyScaleForFloor ?? (() => 0),
    ENEMY_HP_PER_SCALE: 0,
    ENEMY_XP_PER_SCALE: 0,
    ENEMY_STRENGTH_SCALE_STEP: 99,
    ENEMY_PRECISION_SCALE_STEP: 99,
    ENEMY_REACTION_SCALE_STEP: 99,
    ENEMY_NERVES_SCALE_STEP: 99,
    ENEMY_INTELLIGENCE_SCALE_STEP: 99,
    ENEMY_AGGRO_RADIUS_CAP: 0,
    MONSTER_VARIANT_TIERS: {
      normal: { id: 'normal', label: 'Normal', hpMultiplier: 1, xpMultiplier: 1, modCount: 0 },
    },
    MONSTER_VARIANT_MODIFIERS: [],
    getMonsterVariantWeights: () => ({ normal: 1 }),
    NON_ICONIC_MONSTER_WEIGHT_BONUS: 1,
    ICONIC_MONSTER_WEIGHT_PENALTY: 1,
  });
}

test('enemy factory copies door handling and normalizes default AI runtime fields', () => {
  const factory = createFactoryHarness();
  const monster = {
    id: 'test-stalker',
    name: 'Test-Stalker',
    rank: 1,
    behavior: 'stalker',
    behaviorLabel: 'Verfolger',
    description: 'Nur fuer Tests.',
    special: 'Nur fuer Tests.',
    strength: 3,
    precision: 3,
    reaction: 3,
    nerves: 3,
    intelligence: 3,
    hp: 10,
    xpReward: 10,
    aggroRadius: 5,
    canOpenDoors: true,
    allowedTemperaments: ['patrol'],
  };

  const enemy = factory.createEnemy({ x: 4, y: 6 }, 1, monster);

  assert.equal(enemy.canOpenDoors, true);
  assert.equal(enemy.mobility, 'roaming');
  assert.equal(enemy.retreatProfile, 'none');
  assert.equal(enemy.healingProfile, 'slow');
  assert.equal(enemy.temperament, 'patrol');
  assert.ok(MONSTER_TEMPERAMENT_HINTS.patrol.includes(enemy.temperamentHint));
  assert.deepEqual(enemy.recentRoomHistory, []);
  assert.deepEqual(enemy.recentDoorHistory, []);
  assert.deepEqual(enemy.recentAggroPositions, []);
});

test('enemy factory chooses among allowed temperaments with equal-weight selection', () => {
  const factory = createFactoryHarness({
    randomInt: (min, max) => max,
  });
  const monster = {
    id: 'test-hunter',
    name: 'Test-Hunter',
    rank: 1,
    behavior: 'hunter',
    behaviorLabel: 'Jager',
    description: 'Nur fuer Tests.',
    special: 'Nur fuer Tests.',
    strength: 3,
    precision: 3,
    reaction: 3,
    nerves: 3,
    intelligence: 3,
    hp: 10,
    xpReward: 10,
    aggroRadius: 5,
    canOpenDoors: false,
    allowedTemperaments: ['stoic', 'erratic'],
  };

  const enemy = factory.createEnemy({ x: 1, y: 1 }, 1, monster);

  assert.equal(enemy.temperament, 'erratic');
  assert.ok(MONSTER_TEMPERAMENT_HINTS.erratic.includes(enemy.temperamentHint));
});

test('enemy factory respects spawn weight when picking among equally fresh monsters', () => {
  const factory = createFactoryHarness({
    randomChance: () => 0.95,
  });

  const chosen = factory.chooseWeightedMonster(
    [
      { id: 'low-weight', rank: 1, spawnWeight: 1 },
      { id: 'high-weight', rank: 1, spawnWeight: 10 },
    ],
    1,
    {},
    {},
  );

  assert.equal(chosen.id, 'high-weight');
});
