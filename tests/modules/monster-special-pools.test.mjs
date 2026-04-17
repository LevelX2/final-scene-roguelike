import test from 'node:test';
import assert from 'node:assert/strict';

import { buildAvailableMonsterPool } from '../../src/dungeon/branch-layout.mjs';
import { LEGACY_STUDIO_SPECIAL_POOLS, MONSTER_CATALOG } from '../../src/content/catalogs/monsters.mjs';
import { createDungeonEnemyFactory } from '../../src/dungeon/enemy-factory.mjs';

test('legacy monster assignments expose the expected studio special pools', () => {
  assert.deepEqual(
    Object.keys(LEGACY_STUDIO_SPECIAL_POOLS).sort(),
    ['action', 'creature_feature', 'slasher', 'space_opera'],
  );
  assert.ok(LEGACY_STUDIO_SPECIAL_POOLS.slasher.includes('ghostface'));
  assert.ok(LEGACY_STUDIO_SPECIAL_POOLS.creature_feature.includes('xenomorph'));
  assert.ok(LEGACY_STUDIO_SPECIAL_POOLS.action.includes('terminator'));
  assert.ok(LEGACY_STUDIO_SPECIAL_POOLS.space_opera.includes('vader'));
});

test('legacy special pool monsters are tagged for studio-based spawning', () => {
  const ghostface = MONSTER_CATALOG.find((monster) => monster.id === 'ghostface');
  const xenomorph = MONSTER_CATALOG.find((monster) => monster.id === 'xenomorph');
  const terminator = MONSTER_CATALOG.find((monster) => monster.id === 'terminator');

  assert.equal(ghostface?.spawnGroup, 'legacy_special');
  assert.equal(ghostface?.archetypeId, 'slasher');
  assert.equal(xenomorph?.spawnGroup, 'legacy_special');
  assert.equal(xenomorph?.archetypeId, 'creature_feature');
  assert.equal(terminator?.spawnGroup, 'legacy_special');
  assert.equal(terminator?.archetypeId, 'action');
});

test('available monster pool keeps themed standards and appends unlocked studio special monsters', () => {
  const pool = buildAvailableMonsterPool(MONSTER_CATALOG, 2, 'slasher');
  const poolIds = new Set(pool.map((monster) => monster.id));

  assert.ok(pool.some((monster) => monster.spawnGroup === 'standard' && monster.archetypeId === 'slasher'));
  assert.ok(poolIds.has('bates'));
  assert.ok(poolIds.has('ghostface'));
  assert.ok(poolIds.has('maskierter-nachahmer'));
  assert.ok(poolIds.has('videotheken-stalker'));
  assert.ok(!poolIds.has('chucky'));
});

test('available monster pool only includes special monsters unlocked for the active studio', () => {
  const actionPool = buildAvailableMonsterPool(MONSTER_CATALOG, 9, 'action');
  const actionIds = new Set(actionPool.map((monster) => monster.id));

  assert.ok(actionIds.has('predator'));
  assert.ok(actionIds.has('trophaeenjaeger'));
  assert.ok(actionIds.has('soeldner-tracker'));
  assert.ok(!actionIds.has('terminator'));
  assert.ok(!actionIds.has('vader'));
});

test('weighted monster selection respects the explicit legacy special spawn chance', () => {
  const availableMonsters = [
    { id: 'slasher-standard', rank: 4, spawnGroup: 'standard', spawnWeight: 10 },
    { id: 'slasher-special', rank: 4, spawnGroup: 'legacy_special', spawnWeight: 1 },
  ];

  const buildFactory = (randomChanceValue, specialChance) => createDungeonEnemyFactory({
    cloneOffHandItem: (item) => item,
    createMonsterWeapon: () => null,
    createMonsterShield: () => null,
    randomChance: () => randomChanceValue,
    randomInt: () => 0,
    getEnemyScaleForFloor: () => 0,
    ENEMY_HP_PER_SCALE: 5,
    ENEMY_XP_PER_SCALE: 5,
    ENEMY_STRENGTH_SCALE_STEP: 1,
    ENEMY_PRECISION_SCALE_STEP: 2,
    ENEMY_REACTION_SCALE_STEP: 2,
    ENEMY_NERVES_SCALE_STEP: 2,
    ENEMY_INTELLIGENCE_SCALE_STEP: 3,
    ENEMY_AGGRO_RADIUS_CAP: 4,
    MONSTER_VARIANT_TIERS: { normal: { id: 'normal' } },
    MONSTER_VARIANT_MODIFIERS: [],
    getMonsterVariantWeights: () => ({ normal: 100 }),
    NON_ICONIC_MONSTER_WEIGHT_BONUS: 1,
    ICONIC_MONSTER_WEIGHT_PENALTY: 1,
    getLegacySpecialMonsterSpawnChance: () => specialChance,
  });

  const specialFactory = buildFactory(0.05, 0.2);
  const standardFactory = buildFactory(0.9, 0.2);

  assert.equal(
    specialFactory.chooseWeightedMonster(availableMonsters, 4, {}, {}).id,
    'slasher-special',
  );
  assert.equal(
    standardFactory.chooseWeightedMonster(availableMonsters, 4, {}, {}).id,
    'slasher-standard',
  );
});
