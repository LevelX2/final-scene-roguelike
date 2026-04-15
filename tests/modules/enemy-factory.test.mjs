import test from 'node:test';
import assert from 'node:assert/strict';
import { createDungeonEnemyFactory } from '../../src/dungeon/enemy-factory.mjs';
import { MONSTER_TEMPERAMENT_HINTS } from '../../src/content/catalogs/monsters.mjs';
import { MONSTER_CATALOG } from '../../src/content/catalogs/monsters.mjs';
import { buildAvailableMonsterPool } from '../../src/dungeon/branch-layout.mjs';

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
    MONSTER_VARIANT_TIERS: overrides.MONSTER_VARIANT_TIERS ?? {
      normal: {
        id: 'normal',
        label: 'Gewoehnlich',
        hpMultiplier: 1,
        xpMultiplier: 1,
        modCount: 0,
        weaponDropChance: 0.08,
        offHandDropChance: 0.06,
        iconicWeaponDropChance: 0.25,
      },
    },
    MONSTER_VARIANT_MODIFIERS: [],
    getMonsterVariantWeights: overrides.getMonsterVariantWeights ?? (() => ({ normal: 1 })),
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

test('enemy factory forces early floor variety before repeating the same monster id', () => {
  const factory = createFactoryHarness({
    randomChance: () => 0.05,
  });

  const floorSeenCounts = {};
  const pool = [
    { id: 'western-ranch-hand', rank: 1, spawnWeight: 9 },
    { id: 'western-bandit', rank: 2, spawnWeight: 11 },
    { id: 'western-saloon-schlaeger', rank: 3, spawnWeight: 7 },
  ];

  const first = factory.chooseWeightedMonster(pool, 1, {}, floorSeenCounts);
  floorSeenCounts[first.id] = 1;
  const second = factory.chooseWeightedMonster(pool, 1, {}, floorSeenCounts);
  floorSeenCounts[second.id] = 1;
  const third = factory.chooseWeightedMonster(pool, 1, {}, floorSeenCounts);

  assert.equal(new Set([first.id, second.id, third.id]).size, 3);
});

test('enemy factory yields three distinct picks on a fresh slasher floor-one pool', () => {
  const factory = createFactoryHarness({
    randomChance: () => 0.05,
  });

  const floorSeenCounts = {};
  const pool = buildAvailableMonsterPool(MONSTER_CATALOG, 1, 'slasher');

  const first = factory.chooseWeightedMonster(pool, 1, {}, floorSeenCounts);
  floorSeenCounts[first.id] = 1;
  const second = factory.chooseWeightedMonster(pool, 1, {}, floorSeenCounts);
  floorSeenCounts[second.id] = 1;
  const third = factory.chooseWeightedMonster(pool, 1, {}, floorSeenCounts);

  assert.equal(new Set([first.id, second.id, third.id]).size, 3);
});

test('enemy factory can suppress variants per monster for future bosses or scripted encounters', () => {
  const factory = createFactoryHarness({
    MONSTER_VARIANT_TIERS: {
      normal: {
        id: 'normal',
        label: 'Gewoehnlich',
        hpMultiplier: 1,
        xpMultiplier: 1,
        modCount: 0,
        weaponDropChance: 0.08,
        offHandDropChance: 0.06,
        iconicWeaponDropChance: 0.25,
      },
      elite: {
        id: 'elite',
        label: 'Ungewoehnlich',
        hpMultiplier: 1.18,
        xpMultiplier: 1.35,
        modCount: 1,
        weaponDropChance: 0.16,
        offHandDropChance: 0.12,
        iconicWeaponDropChance: 0.34,
      },
    },
    getMonsterVariantWeights: () => ({ normal: 0, elite: 1 }),
  });

  const enemy = factory.createEnemy({ x: 2, y: 3 }, 6, {
    id: 'scripted-boss-prototype',
    name: 'Scripted Boss Prototype',
    rank: 6,
    behavior: 'hunter',
    behaviorLabel: 'Boss',
    description: 'Nur fuer Tests.',
    special: 'Nur fuer Tests.',
    strength: 5,
    precision: 5,
    reaction: 5,
    nerves: 5,
    intelligence: 5,
    hp: 18,
    xpReward: 18,
    aggroRadius: 6,
    canOpenDoors: true,
    allowVariants: false,
  });

  assert.equal(enemy.allowVariants, false);
  assert.equal(enemy.variantTier, 'normal');
  assert.equal(enemy.variantLabel, 'Gewoehnlich');
  assert.equal(enemy.weaponDropChance, 0.08);
  assert.equal(enemy.offHandDropChance, 0.06);
});
