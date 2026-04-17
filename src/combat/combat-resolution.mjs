import { getActorBlockChance, getActorCombatSnapshot } from '../application/derived-actor-stats.mjs';

export function createCombatResolutionApi(context) {
  const {
    BASE_HIT_CHANCE,
    MIN_HIT_CHANCE,
    MAX_HIT_CHANCE,
    MIN_CRIT_CHANCE,
    MAX_CRIT_CHANCE,
    clamp,
    rollPercent,
    getState,
    getCombatWeapon,
    getOffHand,
    getWeaponConditionalDamageBonus,
    itemHasModifier,
  } = context;

  function resolveBlock(defender, damage) {
    const offHand = getOffHand(defender);
    if (!offHand || offHand.subtype !== "shield") {
      return {
        blocked: false,
        damage,
        prevented: 0,
        item: null,
        reflectiveDamage: 0,
      };
    }

    const blockChance = getActorBlockChance(defender, offHand, clamp);
    if (!rollPercent(blockChance)) {
      return {
        blocked: false,
        damage,
        prevented: 0,
        item: offHand,
        reflectiveDamage: 0,
      };
    }

    const reducedDamage = Math.max(0, damage - offHand.blockValue);
    return {
      blocked: true,
      damage: reducedDamage,
      prevented: damage - reducedDamage,
      item: offHand,
      reflectiveDamage: itemHasModifier(offHand, "reflective") ? 1 : 0,
    };
  }

  function resolveCombatAttack(attacker, defender, options = {}) {
    const state = getState();
    const weapon = options.weapon ?? getCombatWeapon(attacker);
    const distance = Math.max(1, options.distance ?? 1);
    const floorNumber = Math.max(1, state?.floor ?? 1);
    const isPlayerAttack = attacker === state.player && defender?.type === "monster";
    const usesOpeningStrike = isPlayerAttack && !defender.openingStrikeSpent;
    const conditionalDamage = getWeaponConditionalDamageBonus(attacker, weapon);
    const attackSnapshot = getActorCombatSnapshot(attacker, {
      weapon,
      clamp,
      minCritChance: MIN_CRIT_CHANCE,
      maxCritChance: MAX_CRIT_CHANCE,
      distance,
      floorNumber,
      conditionalDamage,
      useOpeningStrike: usesOpeningStrike,
    });
    const defenseSnapshot = getActorCombatSnapshot(defender, {
      weapon: getCombatWeapon(defender),
      clamp,
      minCritChance: MIN_CRIT_CHANCE,
      maxCritChance: MAX_CRIT_CHANCE,
      distance: 1,
      floorNumber,
    });
    const hitChance = clamp(
      BASE_HIT_CHANCE + (attackSnapshot.hitValue - defenseSnapshot.dodgeValue),
      MIN_HIT_CHANCE,
      MAX_HIT_CHANCE,
    );
    if (usesOpeningStrike) {
      defender.openingStrikeSpent = true;
    }

    if (!rollPercent(hitChance)) {
      return {
        hit: false,
        critical: false,
        damage: 0,
        usedOpeningStrike: usesOpeningStrike,
      };
    }

    const critical = rollPercent(attackSnapshot.critChance);
    const damage = critical
      ? Math.max(attackSnapshot.baseDamage + 1, Math.floor(attackSnapshot.baseDamage * attackSnapshot.critMultiplier))
      : attackSnapshot.baseDamage;

    return {
      hit: true,
      critical,
      damage,
      usedOpeningStrike: usesOpeningStrike,
      hitChance,
      critChance: attackSnapshot.critChance,
      distance,
    };
  }

  return {
    resolveBlock,
    resolveCombatAttack,
  };
}
