import { getEnemyBalanceGroups } from '../enemy-balance-groups.mjs';
import { formatMonsterDisplayName } from '../text/combat-phrasing.mjs';
import { getItemBalanceGroups } from '../item-balance-groups.mjs';
import { weightedPick, weightedPickFromMap } from '../utils/random-tools.mjs';
import { cloneItemModifierRuntime, cloneWeaponRuntimeEffect } from '../weapon-runtime-effects.mjs';
import { NORMAL_SPEED_INTERVAL } from '../application/actor-speed.mjs';
import {
  MONSTER_HEALING_LABELS,
  MONSTER_HEALING_PROFILE,
  MONSTER_MOBILITY,
  MONSTER_MOBILITY_LABELS,
  MONSTER_RETREAT_LABELS,
  MONSTER_RETREAT_PROFILE,
  MONSTER_TEMPERAMENT_HINTS,
  MONSTER_TEMPERAMENT_VALUES,
} from '../content/catalogs/monsters.mjs';

export function createDungeonEnemyFactory(context) {
  const {
    cloneOffHandItem,
    createMonsterWeapon,
    createMonsterShield,
    randomChance = Math.random,
    randomInt,
    getEnemyScaleForFloor,
    ENEMY_HP_PER_SCALE,
    ENEMY_XP_PER_SCALE,
    ENEMY_STRENGTH_SCALE_STEP,
    ENEMY_PRECISION_SCALE_STEP,
    ENEMY_REACTION_SCALE_STEP,
    ENEMY_NERVES_SCALE_STEP,
    ENEMY_INTELLIGENCE_SCALE_STEP,
    ENEMY_AGGRO_RADIUS_CAP,
    MONSTER_VARIANT_TIERS,
    MONSTER_VARIANT_MODIFIERS,
    getMonsterVariantWeights,
    NON_ICONIC_MONSTER_WEIGHT_BONUS,
    ICONIC_MONSTER_WEIGHT_PENALTY,
    getLegacySpecialMonsterSpawnChance,
  } = context;

  const iconicMonsterIds = new Set([
    'bates',
    'ghostface',
    'chucky',
    'myers',
    'jason',
    'freddy',
    'pennywise',
    'xenomorph',
    'predator',
    'vader',
    'terminator',
  ]);

  function cloneWeaponItem(item) {
    if (!item) {
      return null;
    }

    return {
      ...item,
      numericMods: [...(item.numericMods ?? [])],
      effects: (item.effects ?? []).map(cloneWeaponRuntimeEffect),
      modifiers: (item.modifiers ?? []).map(cloneItemModifierRuntime),
      modifierIds: [...(item.modifierIds ?? [])],
      balanceGroups: Array.isArray(item.balanceGroups) ? [...item.balanceGroups] : getItemBalanceGroups(item),
    };
  }

  function rollMonsterVariant(floorNumber) {
    const weights = getMonsterVariantWeights(floorNumber);
    const tierId = weightedPickFromMap(weights, randomChance)?.value ?? 'normal';
    return MONSTER_VARIANT_TIERS[tierId] ?? MONSTER_VARIANT_TIERS.normal;
  }

  function rollMonsterVariantModifiers(variant) {
    const modifierCount = variant.modCount ?? 0;
    if (modifierCount <= 0) {
      return [];
    }

    const modifiers = [];
    const pool = [...MONSTER_VARIANT_MODIFIERS];
    while (modifiers.length < modifierCount && pool.length > 0) {
      const index = randomInt(0, pool.length - 1);
      modifiers.push(pool.splice(index, 1)[0]);
    }
    return modifiers;
  }

  function getMonsterVariantStatBonus(modifiers) {
    return modifiers.reduce((sum, modifier) => {
      Object.entries(modifier.statChanges ?? {}).forEach(([stat, value]) => {
        sum[stat] = (sum[stat] ?? 0) + value;
      });
      return sum;
    }, {});
  }

  function getMonsterNamePrefixStems(modifiers, limit) {
    return modifiers
      .map((modifier) => modifier.adjectiveStem)
      .filter(Boolean)
      .slice(0, limit);
  }

  function buildMonsterVariantName(baseName, variant, modifiers, grammar) {
    if (variant.id === 'normal' || modifiers.length === 0) {
      return baseName;
    }

    const namePrefixStems = getMonsterNamePrefixStems(modifiers, variant.id === 'dire' ? 2 : 1);
    if (namePrefixStems.length === 0) {
      return baseName;
    }

    return formatMonsterDisplayName({
      baseName,
      name: baseName,
      grammar: {
        ...(grammar ?? {}),
        namePrefixStems,
      },
    });
  }

  function getMonsterRankBandWeight(floorNumber, monsterRank) {
    const unlockedRank = floorNumber === 1 ? 1 : floorNumber + 1;
    const rankDistance = Math.max(0, unlockedRank - Math.max(1, monsterRank ?? 1));

    if (rankDistance === 0) {
      return 0.72;
    }
    if (rankDistance === 1) {
      return 1;
    }
    if (rankDistance === 2) {
      return 0.82;
    }
    if (rankDistance === 3) {
      return 0.58;
    }
    return 0.34;
  }

  function chooseSpawnCohort(availableMonsters, floorNumber) {
    const standardMonsters = availableMonsters.filter((monster) => monster.spawnGroup !== 'legacy_special');
    const legacySpecialMonsters = availableMonsters.filter((monster) => monster.spawnGroup === 'legacy_special');

    if (standardMonsters.length === 0 || legacySpecialMonsters.length === 0) {
      return availableMonsters;
    }

    const specialChance = getLegacySpecialMonsterSpawnChance?.(floorNumber) ?? 0;
    return randomChance() < specialChance ? legacySpecialMonsters : standardMonsters;
  }

  function chooseWeightedMonster(availableMonsters, floorNumber, runSeenCounts, floorSeenCounts) {
    const cohortPool = chooseSpawnCohort(availableMonsters, floorNumber);
    const distinctPoolTarget = Math.min(
      3,
      new Set(cohortPool.map((monster) => monster.id)).size,
    );
    const seenDistinctCount = cohortPool.filter((monster) => (floorSeenCounts[monster.id] ?? 0) > 0).length;
    const selectionPool = seenDistinctCount < distinctPoolTarget
      ? cohortPool.filter((monster) => (floorSeenCounts[monster.id] ?? 0) === 0)
      : cohortPool;
    const effectivePool = selectionPool.length > 0 ? selectionPool : cohortPool;

    const weighted = effectivePool.map((monster) => {
      const runSeen = runSeenCounts[monster.id] ?? 0;
      const floorSeen = floorSeenCounts[monster.id] ?? 0;
      const recencyBonus = Math.max(0, (monster.rank - 1) / Math.max(1, floorNumber + 1));
      const rankBandWeight = getMonsterRankBandWeight(floorNumber, monster.rank);
      const spawnWeight = Math.max(0.25, monster.spawnWeight ?? 1);
      const iconWeight = iconicMonsterIds.has(monster.id)
        ? ICONIC_MONSTER_WEIGHT_PENALTY
        : NON_ICONIC_MONSTER_WEIGHT_BONUS;
      const weight = Math.max(
        0.2,
        (1.2 + recencyBonus * 1.4 - runSeen * 0.18 - floorSeen * 0.4) * iconWeight * rankBandWeight * spawnWeight,
      );
      return { monster, weight };
    });

    return weightedPick(weighted, randomChance)?.monster ?? weighted[weighted.length - 1].monster;
  }

  function getWeaponDropChance(monster, variant) {
    if (iconicMonsterIds.has(monster.id)) {
      return variant.iconicWeaponDropChance ?? variant.weaponDropChance ?? 0;
    }

    return variant.weaponDropChance ?? 0;
  }

  function getOffHandDropChance(variant) {
    return variant.offHandDropChance ?? 0;
  }

  function resolveMonsterVariant(monster, floorNumber, options = {}) {
    if (monster.allowVariants === false) {
      return MONSTER_VARIANT_TIERS.normal;
    }

    if (options.forceVariantTier && MONSTER_VARIANT_TIERS[options.forceVariantTier]) {
      return MONSTER_VARIANT_TIERS[options.forceVariantTier];
    }

    return rollMonsterVariant(floorNumber);
  }

  function getAllowedTemperaments(monster) {
    const allowed = Array.isArray(monster.allowedTemperaments) && monster.allowedTemperaments.length > 0
      ? monster.allowedTemperaments.filter((temperament) => MONSTER_TEMPERAMENT_VALUES.includes(temperament))
      : MONSTER_TEMPERAMENT_VALUES;

    return allowed.length > 0 ? allowed : MONSTER_TEMPERAMENT_VALUES;
  }

  function rollMonsterTemperament(monster) {
    const allowed = getAllowedTemperaments(monster);
    if (allowed.length === 1) {
      return allowed[0];
    }

    return allowed[randomInt(0, allowed.length - 1)] ?? MONSTER_TEMPERAMENT_VALUES[0];
  }

  function rollTemperamentHint(temperament) {
    const hints = MONSTER_TEMPERAMENT_HINTS[temperament] ?? MONSTER_TEMPERAMENT_HINTS[MONSTER_TEMPERAMENT_VALUES[0]];
    return hints[randomInt(0, hints.length - 1)] ?? hints[0] ?? '';
  }

  function createEnemy(position, floor, monster, options = {}) {
    const scale = getEnemyScaleForFloor(floor, monster.rank);
    const variant = resolveMonsterVariant(monster, floor, options);
    const variantModifiers = rollMonsterVariantModifiers(variant);
    const baseHp = monster.hp + scale * ENEMY_HP_PER_SCALE + randomInt(0, 2);
    const baseStrength = monster.strength + Math.floor((scale + 1) / ENEMY_STRENGTH_SCALE_STEP);
    const basePrecision = monster.precision + Math.floor(scale / ENEMY_PRECISION_SCALE_STEP);
    const baseReaction = monster.reaction + Math.floor(scale / ENEMY_REACTION_SCALE_STEP);
    const baseNerves = monster.nerves + Math.floor(scale / ENEMY_NERVES_SCALE_STEP);
    const baseIntelligence = monster.intelligence + Math.floor(scale / ENEMY_INTELLIGENCE_SCALE_STEP);
    const baseAggroRadius = monster.aggroRadius + Math.min(ENEMY_AGGRO_RADIUS_CAP, Math.floor(scale / 3));
    const variantBonus = getMonsterVariantStatBonus(variantModifiers);
    const maxHp = Math.max(1, Math.round(baseHp * variant.hpMultiplier) + (variantBonus.hpFlat ?? 0));
    const variantNamePrefixStems = getMonsterNamePrefixStems(variantModifiers, variant.id === 'dire' ? 2 : 1);
    const runtimeGrammar = monster.grammar
      ? {
          ...monster.grammar,
          namePrefixStems: variantNamePrefixStems,
        }
      : variantNamePrefixStems.length > 0
        ? { namePrefixStems: variantNamePrefixStems }
        : null;
    const variantName = buildMonsterVariantName(monster.name, variant, variantModifiers, runtimeGrammar);
    const mobility = monster.mobility ?? MONSTER_MOBILITY.ROAMING;
    const retreatProfile = monster.retreatProfile ?? MONSTER_RETREAT_PROFILE.NONE;
    const healingProfile = monster.healingProfile ?? MONSTER_HEALING_PROFILE.SLOW;
    const temperament = rollMonsterTemperament(monster);
    const mobilityAggroBonus = mobility === MONSTER_MOBILITY.RELENTLESS
      ? 2
      : mobility === MONSTER_MOBILITY.ROAMING
        ? 1
        : 0;
    const dropSourceTag = variant.id === 'normal'
      ? `monster:${monster.id}`
      : `monster:${monster.id}:${variant.id}`;
    const generatedWeapon = monster.noEquipment
      ? null
      : createMonsterWeapon(monster, floor, {
          dropSourceTag,
          sourceArchetypeId: options.sourceArchetypeId ?? null,
          boostSpecial: iconicMonsterIds.has(monster.id),
          forceRarity: iconicMonsterIds.has(monster.id) && variant.id === 'dire'
            ? 'veryRare'
            : iconicMonsterIds.has(monster.id) && variant.id === 'elite'
              ? 'rare'
              : null,
        });
    const generatedOffHand = monster.noEquipment
      ? null
      : createMonsterShield(monster, floor, {
          dropSourceTag,
          sourceArchetypeId: options.sourceArchetypeId ?? null,
          forceRarity: variant.id === 'dire'
            ? 'veryRare'
            : variant.id === 'elite'
              ? 'rare'
              : null,
        });

    const enemy = {
      ...position,
      type: 'monster',
      id: monster.id,
      archetypeId: monster.archetypeId ?? null,
      spawnGroup: monster.spawnGroup ?? null,
      spawnProfileId: monster.spawnGroup === 'legacy_special'
        ? 'studio-special'
        : monster.spawnGroup === 'special_event'
          ? 'special-event'
          : 'studio-standard',
      allowVariants: monster.allowVariants !== false,
      spawnWeight: monster.spawnWeight ?? 1,
      roleProfileId: monster.roleProfileId ?? monster.behavior ?? null,
      preferredWeaponRoles: Array.isArray(monster.preferredWeaponRoles) ? [...monster.preferredWeaponRoles] : [],
      baseName: monster.name,
      name: variantName,
      rank: monster.rank,
      variantTier: variant.id,
      variantLabel: variant.label,
      variantModifiers,
      grammar: runtimeGrammar,
      behavior: monster.behavior,
      behaviorLabel: monster.behaviorLabel,
      mobility,
      mobilityLabel: monster.mobilityLabel ?? MONSTER_MOBILITY_LABELS[mobility],
      retreatProfile,
      retreatLabel: monster.retreatLabel ?? MONSTER_RETREAT_LABELS[retreatProfile],
      healingProfile,
      healingLabel: monster.healingLabel ?? MONSTER_HEALING_LABELS[healingProfile],
      allowedTemperaments: [...getAllowedTemperaments(monster)],
      temperament,
      temperamentHint: rollTemperamentHint(temperament),
      idleTarget: null,
      idleTargetType: null,
      idlePlanAge: 0,
      recentRoomHistory: [],
      recentDoorHistory: [],
      recentAggroPositions: [],
      isRetreating: false,
      description: monster.description,
      special: monster.special,
      originX: position.x,
      originY: position.y,
      aggro: false,
      turnsSinceHit: 0,
      nextActionTime: 0,
      statusEffects: [],
      canOpenDoors: Boolean(monster.canOpenDoors),
      canChangeFloors: Boolean(monster.canChangeFloors),
      sourceArchetypeId: options.sourceArchetypeId ?? null,
      equipmentStatsApplied: false,
      mainHand: generatedWeapon ? cloneWeaponItem(generatedWeapon) : null,
      offHand: generatedOffHand ? cloneOffHandItem(generatedOffHand) : null,
      lootWeapon: generatedWeapon ? cloneWeaponItem(generatedWeapon) : null,
      lootOffHand: generatedOffHand ? cloneOffHandItem(generatedOffHand) : null,
      weaponDropChance: getWeaponDropChance(monster, variant),
      offHandDropChance: getOffHandDropChance(variant),
      xpReward: Math.round((monster.xpReward + scale * ENEMY_XP_PER_SCALE) * variant.xpMultiplier),
      maxHp,
      hp: maxHp,
      baseSpeed: Number.isFinite(monster.baseSpeed) ? Math.round(monster.baseSpeed) : NORMAL_SPEED_INTERVAL,
      speedIntervalModifier: Number.isFinite(monster.speedIntervalModifier) ? Math.round(monster.speedIntervalModifier) : 0,
      speedIntervalModifiers: Array.isArray(monster.speedIntervalModifiers)
        ? monster.speedIntervalModifiers.map((entry) => ({ ...entry }))
        : [],
      strength: baseStrength + (variantBonus.strength ?? 0),
      precision: basePrecision + (variantBonus.precision ?? 0),
      reaction: baseReaction + (variantBonus.reaction ?? 0),
      nerves: baseNerves + (variantBonus.nerves ?? 0),
      intelligence: baseIntelligence + (variantBonus.intelligence ?? 0),
      aggroRadius: baseAggroRadius + mobilityAggroBonus + (variantBonus.aggroRadius ?? 0),
    };
    return {
      ...enemy,
      balanceGroups: getEnemyBalanceGroups(enemy),
    };
  }

  return {
    createEnemy,
    chooseWeightedMonster,
  };
}
