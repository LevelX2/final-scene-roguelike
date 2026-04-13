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

    const blockChance = clamp(offHand.blockChance + defender.nerves + (defender.shieldBlockBonus ?? 0), 5, 75);
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

  function resolveCombatAttack(attacker, defender) {
    const state = getState();
    const weapon = getCombatWeapon(attacker);
    const isPlayerAttack = attacker === state.player && defender?.type === "monster";
    const usesOpeningStrike = isPlayerAttack && !defender.openingStrikeSpent;
    const hitValue = attacker.precision * 2 + weapon.hitBonus + (usesOpeningStrike ? (attacker.openingStrikeHitBonus ?? 0) : 0);
    const dodgeValue = defender.reaction * 2 + defender.nerves;
    const hitChance = clamp(BASE_HIT_CHANCE + (hitValue - dodgeValue), MIN_HIT_CHANCE, MAX_HIT_CHANCE);
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

    const critChance = clamp(
      attacker.precision + weapon.critBonus + (usesOpeningStrike ? (attacker.openingStrikeCritBonus ?? 0) : 0),
      MIN_CRIT_CHANCE,
      MAX_CRIT_CHANCE,
    );
    const critical = rollPercent(critChance);
    const conditionalDamage = getWeaponConditionalDamageBonus(attacker, weapon);
    const baseDamage = Math.max(1, attacker.strength + weapon.damage + conditionalDamage);
    const damage = critical ? Math.floor(baseDamage * 1.5) : baseDamage;

    return {
      hit: true,
      critical,
      damage,
      usedOpeningStrike: usesOpeningStrike,
    };
  }

  return {
    resolveBlock,
    resolveCombatAttack,
  };
}
