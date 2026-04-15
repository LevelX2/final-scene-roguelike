import { formatMonsterDisplayName } from '../text/combat-phrasing.mjs';
import { weightedPick, weightedPickFromMap } from '../utils/random-tools.mjs';
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
      effects: (item.effects ?? []).map((effect) => ({ ...effect })),
      modifiers: (item.modifiers ?? []).map((modifier) => ({ ...modifier })),
      modifierIds: [...(item.modifierIds ?? [])],
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

  function chooseWeightedMonster(availableMonsters, floorNumber, runSeenCounts, floorSeenCounts) {
    const weighted = availableMonsters.map((monster) => {
      const runSeen = runSeenCounts[monster.id] ?? 0;
      const floorSeen = floorSeenCounts[monster.id] ?? 0;
      const recencyBonus = Math.max(0, (monster.rank - 1) / Math.max(1, floorNumber + 1));
      const iconWeight = iconicMonsterIds.has(monster.id)
        ? ICONIC_MONSTER_WEIGHT_PENALTY
        : NON_ICONIC_MONSTER_WEIGHT_BONUS;
      const weight = Math.max(
        0.2,
        (1.2 + recencyBonus * 1.4 - runSeen * 0.18 - floorSeen * 0.4) * iconWeight,
      );
      return { monster, weight };
    });

    return weightedPick(weighted, randomChance)?.monster ?? weighted[weighted.length - 1].monster;
  }

  function getWeaponDropChance(monster, variant) {
    if (iconicMonsterIds.has(monster.id)) {
      return variant.id === 'dire' ? 0.45 : variant.id === 'elite' ? 0.34 : 0.25;
    }

    return variant.id === 'dire' ? 0.24 : variant.id === 'elite' ? 0.16 : 0.08;
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
    const variant = rollMonsterVariant(floor);
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
    const generatedWeapon = createMonsterWeapon(monster, floor, {
      dropSourceTag,
      sourceArchetypeId: options.sourceArchetypeId ?? null,
      boostSpecial: iconicMonsterIds.has(monster.id),
      forceRarity: iconicMonsterIds.has(monster.id) && variant.id === 'dire'
        ? 'veryRare'
        : iconicMonsterIds.has(monster.id) && variant.id === 'elite'
          ? 'rare'
          : null,
    });
    const generatedOffHand = createMonsterShield(monster, floor, {
      dropSourceTag,
      sourceArchetypeId: options.sourceArchetypeId ?? null,
      forceRarity: variant.id === 'dire'
        ? 'veryRare'
        : variant.id === 'elite'
          ? 'rare'
          : null,
    });

    return {
      ...position,
      type: 'monster',
      id: monster.id,
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
      statusEffects: [],
      canOpenDoors: Boolean(monster.canOpenDoors),
      canChangeFloors: Boolean(monster.canChangeFloors),
      sourceArchetypeId: options.sourceArchetypeId ?? null,
      mainHand: generatedWeapon ? cloneWeaponItem(generatedWeapon) : null,
      offHand: generatedOffHand ? cloneOffHandItem(generatedOffHand) : null,
      lootWeapon: generatedWeapon ? cloneWeaponItem(generatedWeapon) : null,
      lootOffHand: generatedOffHand ? cloneOffHandItem(generatedOffHand) : null,
      weaponDropChance: getWeaponDropChance(monster, variant),
      offHandDropChance: variant.id === 'dire' ? 0.18 : variant.id === 'elite' ? 0.12 : 0.06,
      xpReward: Math.round((monster.xpReward + scale * ENEMY_XP_PER_SCALE) * variant.xpMultiplier),
      maxHp,
      hp: maxHp,
      strength: baseStrength + (variantBonus.strength ?? 0),
      precision: basePrecision + (variantBonus.precision ?? 0),
      reaction: baseReaction + (variantBonus.reaction ?? 0),
      nerves: baseNerves + (variantBonus.nerves ?? 0),
      intelligence: baseIntelligence + (variantBonus.intelligence ?? 0),
      aggroRadius: baseAggroRadius + mobilityAggroBonus + (variantBonus.aggroRadius ?? 0),
    };
  }

  return {
    createEnemy,
    chooseWeightedMonster,
  };
}
