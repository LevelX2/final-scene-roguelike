export function createDungeonEnemyFactory(context) {
  const {
    OFFHAND_CATALOG,
    cloneOffHandItem,
    createMonsterWeapon,
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

  function weightedPick(entries, weightKey = 'weight') {
    const totalWeight = entries.reduce((sum, entry) => sum + (entry[weightKey] ?? 0), 0);
    if (totalWeight <= 0) {
      return entries[entries.length - 1] ?? null;
    }

    let roll = Math.random() * totalWeight;
    for (const entry of entries) {
      roll -= entry[weightKey] ?? 0;
      if (roll <= 0) {
        return entry;
      }
    }

    return entries[entries.length - 1] ?? null;
  }

  function weightedPickFromMap(weights) {
    return weightedPick(
      Object.entries(weights).map(([value, weight]) => ({ value, weight })),
    );
  }

  function rollMonsterVariant(floorNumber) {
    const weights = getMonsterVariantWeights(floorNumber);
    const tierId = weightedPickFromMap(weights)?.value ?? 'normal';
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

  function formatMonsterModifierPhrase(modifiers, limit) {
    const labels = modifiers
      .map((modifier) => modifier.label)
      .filter(Boolean)
      .slice(0, limit)
      .map((label) => label.charAt(0).toLowerCase() + label.slice(1));

    if (labels.length === 0) {
      return "";
    }

    if (labels.length === 1) {
      return labels[0];
    }

    return `${labels.slice(0, -1).join(", ")} und ${labels[labels.length - 1]}`;
  }

  function buildMonsterVariantName(baseName, variant, modifiers) {
    if (variant.id === 'normal' || modifiers.length === 0) {
      return baseName;
    }

    const modifierPhrase = formatMonsterModifierPhrase(modifiers, variant.id === 'dire' ? 2 : 1);
    if (!modifierPhrase) {
      return baseName;
    }

    return `${baseName}, ${modifierPhrase}`;
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

    const totalWeight = weighted.reduce((sum, entry) => sum + entry.weight, 0);
    let roll = Math.random() * totalWeight;
    for (const entry of weighted) {
      roll -= entry.weight;
      if (roll <= 0) {
        return entry.monster;
      }
    }

    return weighted[weighted.length - 1].monster;
  }

  function getWeaponDropChance(monster, variant) {
    if (iconicMonsterIds.has(monster.id)) {
      return variant.id === 'dire' ? 0.45 : variant.id === 'elite' ? 0.34 : 0.25;
    }

    return variant.id === 'dire' ? 0.24 : variant.id === 'elite' ? 0.16 : 0.08;
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
    const offHand = monster.offHand ? OFFHAND_CATALOG[monster.offHand] : null;
    const variantName = buildMonsterVariantName(monster.name, variant, variantModifiers);
    const mobilityAggroBonus = monster.mobility === 'relentless'
      ? 2
      : monster.mobility === 'roaming'
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
      grammar: monster.grammar ? { ...monster.grammar } : null,
      behavior: monster.behavior,
      behaviorLabel: monster.behaviorLabel,
      mobility: monster.mobility,
      mobilityLabel: monster.mobilityLabel,
      retreatProfile: monster.retreatProfile,
      retreatLabel: monster.retreatLabel,
      healingProfile: monster.healingProfile,
      healingLabel: monster.healingLabel,
      isRetreating: false,
      description: monster.description,
      special: monster.special,
      originX: position.x,
      originY: position.y,
      aggro: false,
      turnsSinceHit: 0,
      statusEffects: [],
      canChangeFloors: Boolean(monster.canChangeFloors),
      mainHand: generatedWeapon ? cloneWeaponItem(generatedWeapon) : null,
      offHand: offHand ? cloneOffHandItem(offHand) : null,
      lootWeapon: generatedWeapon ? cloneWeaponItem(generatedWeapon) : null,
      lootOffHand: offHand ? cloneOffHandItem(offHand) : null,
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
