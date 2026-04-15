import test from 'node:test';
import assert from 'node:assert/strict';
import { createCombatResolutionApi } from '../../src/combat/combat-resolution.mjs';

function createResolutionHarness(floor) {
  const state = {
    floor,
    player: { type: 'player' },
  };

  return createCombatResolutionApi({
    BASE_HIT_CHANCE: 70,
    MIN_HIT_CHANCE: 5,
    MAX_HIT_CHANCE: 95,
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
    getCombatWeapon: () => null,
    getOffHand: () => null,
    getWeaponConditionalDamageBonus: () => 0,
    itemHasModifier: () => false,
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
