const DERIVED_STATS = Object.freeze([
  'strength',
  'precision',
  'reaction',
  'nerves',
  'intelligence',
  'endurance',
]);
const PROGRESSION_STATS = Object.freeze([
  ...DERIVED_STATS,
  'maxHp',
]);

const STATUS_EFFECT_TO_STAT = Object.freeze({
  precision_malus: 'precision',
  reaction_malus: 'reaction',
});

export function createEmptyProgressionBonuses() {
  return PROGRESSION_STATS.reduce((bonuses, stat) => {
    bonuses[stat] = 0;
    return bonuses;
  }, {});
}

function getNumericStat(actor, stat) {
  return typeof actor?.[stat] === 'number' ? actor[stat] : 0;
}

function getActorStatusEffects(actor) {
  return Array.isArray(actor?.statusEffects) ? actor.statusEffects : [];
}

function areEquipmentStatsAppliedToBase(actor) {
  if (typeof actor?.equipmentStatsApplied === 'boolean') {
    return actor.equipmentStatsApplied;
  }

  // Older player saves stored shield stat mods directly in the base fields.
  return actor?.type !== 'monster';
}

function mergeItemStatMods(target, item) {
  if (!item?.statMods) {
    return target;
  }

  Object.entries(item.statMods).forEach(([stat, value]) => {
    if (!value) {
      return;
    }
    target[stat] = (target[stat] ?? 0) + value;
  });

  return target;
}

export function getActorEquipmentStatMods(actor) {
  if (!actor || areEquipmentStatsAppliedToBase(actor)) {
    return {};
  }

  const combined = {};
  mergeItemStatMods(combined, actor.mainHand);
  mergeItemStatMods(combined, actor.offHand);
  return combined;
}

export function getActorProgressionStatMods(actor) {
  const progressionBonuses = actor?.progressionBonuses ?? {};
  return DERIVED_STATS.reduce((mods, stat) => {
    mods[stat] = getNumericStat(progressionBonuses, stat);
    return mods;
  }, {});
}

export function getActorStatusStatMods(actor) {
  return getActorStatusEffects(actor).reduce((mods, effect) => {
    const stat = STATUS_EFFECT_TO_STAT[effect?.type];
    if (!stat) {
      return mods;
    }

    mods[stat] = (mods[stat] ?? 0) - (effect.penalty ?? 0);
    return mods;
  }, {});
}

export function getActorDerivedStats(actor) {
  const progression = getActorProgressionStatMods(actor);
  const equipment = getActorEquipmentStatMods(actor);
  const status = getActorStatusStatMods(actor);
  const base = {};
  const final = {};

  DERIVED_STATS.forEach((stat) => {
    base[stat] = getNumericStat(actor, stat);
    final[stat] = base[stat] + (progression[stat] ?? 0) + (equipment[stat] ?? 0) + (status[stat] ?? 0);
  });

  return {
    base,
    progression,
    equipment,
    status,
    final,
    equipmentStatsAppliedToBase: areEquipmentStatsAppliedToBase(actor),
  };
}

export function getActorDerivedStat(actor, stat) {
  const derived = getActorDerivedStats(actor);
  return derived.final[stat] ?? getNumericStat(actor, stat);
}

export function getActorDerivedMaxHp(actor) {
  const baseMaxHp = getNumericStat(actor, 'maxHp');
  const progressionMaxHp = getNumericStat(actor?.progressionBonuses ?? {}, 'maxHp');
  return Math.max(1, baseMaxHp + progressionMaxHp);
}

export function getActorBlockChance(actor, offHand, clamp) {
  if (!offHand || offHand.subtype !== 'shield') {
    return 0;
  }

  return clamp(
    offHand.blockChance + getActorDerivedStat(actor, 'nerves') + (actor?.shieldBlockBonus ?? 0),
    5,
    75,
  );
}

export function getActorCombatSnapshot(actor, {
  weapon,
  clamp,
  minCritChance,
  maxCritChance,
  distance = 1,
  floorNumber = 1,
  conditionalDamage = 0,
  useOpeningStrike = false,
} = {}) {
  const derived = getActorDerivedStats(actor);
  const precision = derived.final.precision ?? 0;
  const reaction = derived.final.reaction ?? 0;
  const nerves = derived.final.nerves ?? 0;
  const strength = derived.final.strength ?? 0;
  const safeWeapon = weapon ?? actor?.mainHand ?? {};
  const isRangedAttack = safeWeapon.attackMode === 'ranged' && distance > 1;
  const meleePenalty = safeWeapon.attackMode === 'ranged' && distance <= 1
    ? safeWeapon.meleePenaltyHit ?? 0
    : 0;
  const openingHitBonus = useOpeningStrike ? (actor?.openingStrikeHitBonus ?? 0) : 0;
  const openingCritBonus = useOpeningStrike ? (actor?.openingStrikeCritBonus ?? 0) : 0;
  const rangedDamagePenalty = isRangedAttack
    ? floorNumber <= 2
      ? 2
      : floorNumber <= 4
        ? 1
        : 0
    : 0;

  return {
    ...derived,
    hitValue: precision * 2 + (safeWeapon.hitBonus ?? 0) + meleePenalty + openingHitBonus,
    dodgeValue: reaction * 2 + nerves,
    critChance: clamp(
      precision + (safeWeapon.critBonus ?? 0) + openingCritBonus,
      minCritChance,
      maxCritChance,
    ),
    blockChance: getActorBlockChance(actor, actor?.offHand ?? null, clamp),
    baseDamage: Math.max(1, strength + (safeWeapon.damage ?? 0) + conditionalDamage - rangedDamagePenalty),
    critMultiplier: isRangedAttack ? 1.35 : 1.5,
    isRangedAttack,
    meleePenalty,
  };
}
