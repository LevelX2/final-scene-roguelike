import test from 'node:test';
import assert from 'node:assert/strict';
import { createCombatResolutionApi } from '../../src/combat/combat-resolution.mjs';

function createGrid(width, height, fill = '.') {
  return Array.from({ length: height }, () => Array(width).fill(fill));
}

function createResolutionHarness(floor, { floorState = null } = {}) {
  const state = {
    floor,
    player: { type: 'player' },
  };
  const activeFloorState = floorState ?? {
    grid: createGrid(8, 8, '.'),
    showcases: [],
    doors: [],
  };

  return createCombatResolutionApi({
    BASE_HIT_CHANCE: 65,
    MIN_HIT_CHANCE: 10,
    MAX_HIT_CHANCE: 90,
    MIN_CRIT_CHANCE: 0,
    MAX_CRIT_CHANCE: 100,
    clamp: (value, min, max) => Math.max(min, Math.min(max, value)),
    rollPercent: (() => {
      let call = 0;
      return () => {
        call += 1;
        return call === 1;
      };
    })(),
    getState: () => state,
    getCurrentFloorState: () => activeFloorState,
    getCombatWeapon: () => null,
    getOffHand: () => null,
    getWeaponConditionalDamageBonus: () => 0,
    itemHasModifier: () => false,
    TILE: { WALL: '#' },
    getDoorAt: (x, y, nextFloorState = activeFloorState) =>
      nextFloorState.doors.find((door) => door.x === x && door.y === y) ?? null,
    isDoorClosed: (door) => Boolean(door) && !door.isOpen,
    getActorPrecisionModifier: () => 0,
    getActorReactionModifier: () => 0,
  });
}

test('early floors reduce ranged damage compared to later floors', () => {
  const attacker = {
    type: 'player',
    strength: 2,
    precision: 5,
    openingStrikeHitBonus: 0,
    openingStrikeCritBonus: 0,
  };
  const defender = {
    type: 'monster',
    reaction: 0,
    nerves: 0,
    openingStrikeSpent: true,
  };
  const weapon = {
    attackMode: 'ranged',
    range: 6,
    damage: 3,
    hitBonus: 0,
    critBonus: 0,
    meleePenaltyHit: -2,
  };

  const earlyApi = createResolutionHarness(1);
  const lateApi = createResolutionHarness(5);

  const earlyResult = earlyApi.resolveCombatAttack(attacker, { ...defender }, { distance: 4, weapon });
  const lateResult = lateApi.resolveCombatAttack(attacker, { ...defender }, { distance: 4, weapon });

  assert.equal(earlyResult.hit, true);
  assert.equal(lateResult.hit, true);
  assert.equal(earlyResult.damage, 3);
  assert.equal(lateResult.damage, 5);
});

test('previewCombatAttack lowers ranged hit chance for remote corner cover', () => {
  const floorState = {
    grid: createGrid(8, 8, '.'),
    showcases: [],
    doors: [],
  };
  floorState.grid[2][3] = '#';

  const attacker = {
    type: 'player',
    x: 1,
    y: 1,
    strength: 2,
    precision: 6,
    openingStrikeHitBonus: 0,
    openingStrikeCritBonus: 0,
  };
  const defender = {
    type: 'monster',
    x: 5,
    y: 5,
    reaction: 1,
    nerves: 1,
    openingStrikeSpent: true,
  };
  const weapon = {
    attackMode: 'ranged',
    range: 6,
    damage: 3,
    hitBonus: 2,
    critBonus: 0,
    meleePenaltyHit: -2,
  };

  const api = createResolutionHarness(5, { floorState });
  const preview = api.previewCombatAttack(attacker, defender, { distance: 4, weapon });

  assert.equal(preview.baseHitChance, 76);
  assert.equal(preview.coverPenalty, 15);
  assert.equal(preview.hitChance, 61);
  assert.equal(preview.coverLabel, 'Teildeckung');
});

test('previewCombatAttack keeps a point-blank corner shot without extra cover penalty', () => {
  const floorState = {
    grid: createGrid(8, 8, '.'),
    showcases: [],
    doors: [],
  };
  floorState.grid[1][2] = '#';

  const attacker = {
    type: 'player',
    x: 1,
    y: 1,
    strength: 2,
    precision: 6,
    openingStrikeHitBonus: 0,
    openingStrikeCritBonus: 0,
  };
  const defender = {
    type: 'monster',
    x: 4,
    y: 4,
    reaction: 1,
    nerves: 1,
    openingStrikeSpent: true,
  };
  const weapon = {
    attackMode: 'ranged',
    range: 6,
    damage: 3,
    hitBonus: 2,
    critBonus: 0,
    meleePenaltyHit: -2,
  };

  const api = createResolutionHarness(5, { floorState });
  const preview = api.previewCombatAttack(attacker, defender, { distance: 3, weapon });

  assert.equal(preview.coverPenalty, 0);
  assert.equal(preview.hitChance, 76);
  assert.equal(preview.coverLabel, '');
});

test('previewCombatAttack now catches near-corner shots that miss the old exact-graze check', () => {
  const floorState = {
    grid: createGrid(8, 8, '.'),
    showcases: [],
    doors: [],
  };
  floorState.grid[2][2] = '#';

  const attacker = {
    type: 'player',
    x: 1,
    y: 1,
    strength: 2,
    precision: 6,
    openingStrikeHitBonus: 0,
    openingStrikeCritBonus: 0,
  };
  const defender = {
    type: 'monster',
    x: 5,
    y: 2,
    reaction: 1,
    nerves: 1,
    openingStrikeSpent: true,
  };
  const weapon = {
    attackMode: 'ranged',
    range: 6,
    damage: 3,
    hitBonus: 2,
    critBonus: 0,
    meleePenaltyHit: -2,
  };

  const api = createResolutionHarness(5, { floorState });
  const preview = api.previewCombatAttack(attacker, defender, { distance: 4, weapon });

  assert.equal(preview.baseHitChance, 76);
  assert.equal(preview.coverPenalty, 15);
  assert.equal(preview.hitChance, 61);
  assert.equal(preview.coverLabel, 'Teildeckung');
});
