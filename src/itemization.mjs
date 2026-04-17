import { RARITY_LABELS, WEAPON_MODIFIER_DEFS, SHIELD_MODIFIER_DEFS } from './content/item-modifiers.mjs';
import { applyRarityCap, getMaxEquipmentRarity } from './balance.mjs';
import { getItemBalanceGroups } from './item-balance-groups.mjs';
import { getStudioCycleIndex } from './studio-theme.mjs';
import { getDecadePrefix, STANDARD_EFFECT_IDS, HIGH_IMPACT_EFFECT_IDS, getWeaponEffectCategory, getWeaponEffectDefinition, getProcBonusForFloor, getEffectNameParts, getEffectSummary } from './content/catalogs/weapon-effects.mjs';
import { getFloorScalingBonus, getWeaponProfile } from './content/catalogs/weapon-templates.mjs';
import { buildWeaponGrammar } from './text/combat-phrasing.mjs';
import { cloneItemModifierRuntime, cloneWeaponRuntimeEffect, getWeaponRuntimeEffects } from './weapon-runtime-effects.mjs';
import { getActorDerivedMaxHp } from './application/derived-actor-stats.mjs';

function cloneModifier(modifier) {
  return cloneItemModifierRuntime(modifier);
}

const WEAPON_RARITY_WEIGHTS = {
  floor: { common: 70, uncommon: 24, rare: 5, veryRare: 1 },
  chest: { common: 50, uncommon: 35, rare: 12, veryRare: 3 },
  monster: { common: 40, uncommon: 40, rare: 16, veryRare: 4 },
  bonusChest: { common: 30, uncommon: 45, rare: 20, veryRare: 5 },
};

const WEAPON_CONDITIONAL_MODIFIER_CHANCES = Object.freeze({
  rare: 0.18,
  veryRare: 0.4,
});

const NUMERIC_MOD_POOL = [
  { id: 'damage', stat: 'damage', amount: 1, label: 'Scharf', namePrefix: 'Scharf' },
  { id: 'hit', stat: 'hitBonus', amount: 1, label: 'Präzise', namePrefix: 'Präzise' },
  { id: 'crit', stat: 'critBonus', amount: 1, label: 'Tödlich', nameSuffix: 'des letzten Schnitts' },
];

function getRarityOrderIndex(rarity) {
  return ['common', 'uncommon', 'rare', 'veryRare'].indexOf(rarity);
}

function isWeaponTemplate(baseItem) {
  return baseItem?.type === 'weapon-template' || Boolean(baseItem?.weaponRole);
}

function normalizeDropSource(dropSourceTag = '') {
  if (dropSourceTag === 'chest') {
    return 'chest';
  }
  if (dropSourceTag === 'locked-room-chest') {
    return 'bonusChest';
  }
  if (dropSourceTag.startsWith('monster:')) {
    return 'monster';
  }
  return 'floor';
}

export function createItemizationApi(context) {
  const {
    ITEM_RARITY_MODIFIER_COUNTS,
    getEquipmentRarityWeights,
    randomChance,
    randomInt,
  } = context;

  function getItemType(baseItem) {
    if (isWeaponTemplate(baseItem) || baseItem?.type === 'weapon' || baseItem?.itemType === 'weapon') {
      return 'weapon';
    }

    if (baseItem?.subtype === 'shield' || baseItem?.itemType === 'shield') {
      return 'shield';
    }

    return baseItem?.type ?? 'weapon';
  }

  function formatRarityLabel(rarity) {
    return RARITY_LABELS[rarity] ?? RARITY_LABELS.common;
  }

  function weightedPick(entries, weightKey = 'weight') {
    const totalWeight = entries.reduce((sum, entry) => sum + (entry[weightKey] ?? 0), 0);
    if (totalWeight <= 0) {
      return entries[entries.length - 1] ?? null;
    }

    let roll = randomChance() * totalWeight;
    for (const entry of entries) {
      roll -= entry[weightKey] ?? 0;
      if (roll <= 0) {
        return entry;
      }
    }

    return entries[entries.length - 1] ?? null;
  }

  function rollRarity(dropContext = {}) {
    const weights = getEquipmentRarityWeights(dropContext);
    const entries = Object.entries(weights).map(([rarity, weight]) => ({ rarity, weight }));
    return weightedPick(entries)?.rarity ?? 'common';
  }

  function rollWeaponRarity(dropContext = {}) {
    const sourceProfile = WEAPON_RARITY_WEIGHTS[normalizeDropSource(dropContext.dropSourceTag)] ?? WEAPON_RARITY_WEIGHTS.floor;
    const cappedProfile = applyRarityCap(sourceProfile, getMaxEquipmentRarity(dropContext));
    const entries = Object.entries(cappedProfile).map(([rarity, weight]) => ({ rarity, weight }));
    return weightedPick(entries)?.rarity ?? 'common';
  }

  function getModifierPool(itemType, rarity) {
    const pool = itemType === 'shield' ? SHIELD_MODIFIER_DEFS : WEAPON_MODIFIER_DEFS;
    return pool
      .filter((modifier) => modifier.allowedItemTypes.includes(itemType))
      .filter((modifier) => {
        if (!modifier.minRarity) {
          return true;
        }

        return getRarityOrderIndex(rarity) >= getRarityOrderIndex(modifier.minRarity);
      })
      .map(cloneModifier);
  }

  function isModifierCompatible(candidate, selected) {
    if (selected.some((modifier) => modifier.id === candidate.id)) {
      return false;
    }

    if (candidate.exclusiveGroup && selected.some((modifier) => modifier.exclusiveGroup === candidate.exclusiveGroup)) {
      return false;
    }

    return true;
  }

  function rollModifiers(baseItem, rarity) {
    const itemType = getItemType(baseItem);
    const modifierCount = ITEM_RARITY_MODIFIER_COUNTS[rarity] ?? 0;
    if (modifierCount <= 0) {
      return [];
    }

    const pool = getModifierPool(itemType, rarity);
    const modifiers = [];
    let safety = 0;

    while (modifiers.length < modifierCount && safety < 40) {
      safety += 1;
      const modifier = weightedPick(pool);
      if (!modifier || !isModifierCompatible(modifier, modifiers)) {
        continue;
      }
      modifiers.push(modifier);
    }

    return modifiers;
  }

  function applyShieldStatChanges(baseItem, modifiers) {
    const nextItem = {
      ...baseItem,
      type: 'offhand',
      itemType: 'shield',
      subtype: 'shield',
      blockChance: baseItem.blockChance ?? 0,
      blockValue: baseItem.blockValue ?? 0,
    };

    for (const modifier of modifiers) {
      nextItem.blockChance += modifier.statChanges.blockChanceAdd ?? 0;
      nextItem.blockValue += modifier.statChanges.blockValueAdd ?? 0;
    }

    nextItem.blockChance = Math.max(0, Math.round(nextItem.blockChance));
    nextItem.blockValue = Math.max(0, Math.round(nextItem.blockValue));
    return nextItem;
  }

  function rollNumericMods(rarity) {
    const selected = [];
    let targetCount = 0;
    if (rarity === 'uncommon') {
      targetCount = 1;
    } else if (rarity === 'rare') {
      targetCount = 2;
    } else if (rarity === 'veryRare') {
      targetCount = 2;
    }

    const pool = [...NUMERIC_MOD_POOL];
    while (selected.length < targetCount && pool.length > 0) {
      const index = randomInt(0, pool.length - 1);
      selected.push(pool.splice(index, 1)[0]);
    }

    return selected;
  }

  function createWeaponModifierFromNumericMod(numericMod) {
    if (!numericMod) {
      return null;
    }

    const statChanges = numericMod.stat === 'damage'
      ? { damageAdd: numericMod.amount }
      : numericMod.stat === 'hitBonus'
        ? { hitBonusAdd: numericMod.amount }
        : numericMod.stat === 'critBonus'
          ? { critBonusAdd: numericMod.amount }
          : {};

    return {
      id: `weapon-numeric-${numericMod.id}`,
      affix: numericMod.label,
      summary: `${numericMod.label}: ${numericMod.stat} +${numericMod.amount}`,
      statChanges,
      source: 'numeric',
      tags: ['weapon-stat'],
    };
  }

  function hasControlConflict(existingEffects, nextType) {
    const existingTypes = new Set(existingEffects.map((effect) => effect.type));
    return (existingTypes.has('stun') && nextType === 'root') || (existingTypes.has('root') && nextType === 'stun');
  }

  function buildEffect(type, tier, floorNumber, source = 'mod') {
    const definition = getWeaponEffectDefinition(type);
    if (!definition) {
      return null;
    }

    if (definition.trigger === 'passive') {
      return {
        type,
        tier,
        trigger: definition.trigger,
        source,
        value: definition.valueByTier?.[tier - 1] ?? tier,
      };
    }

    const procBonus = getProcBonusForFloor(floorNumber);
    const effectiveProcBonus = definition.pool === 'highImpact' ? Math.floor(procBonus / 2) : procBonus;
    return {
      type,
      tier,
      trigger: definition.trigger,
      source,
      procChance: Math.min(95, (definition.baseChance ?? 0) + effectiveProcBonus),
      duration: definition.durationByTier?.[tier - 1] ?? tier,
      dotDamage: definition.dotDamageByTier?.[tier - 1] ?? 0,
      penalty: definition.penaltyByTier?.[tier - 1] ?? 0,
    };
  }

  function createWeaponModifierFromEffect(effect) {
    if (!effect?.type) {
      return null;
    }

    const definition = getWeaponEffectDefinition(effect.type);
    const statChanges = {};
    if (effect.type === 'crit_bonus' && (effect.value ?? 0) !== 0) {
      statChanges.critBonusAdd = effect.value ?? 0;
    }
    if (effect.type === 'light_bonus' && (effect.value ?? 0) !== 0) {
      statChanges.lightBonusAdd = effect.value ?? 0;
    }

    return {
      id: `weapon-effect-${effect.type}`,
      affix: definition?.label ?? effect.type,
      summary: getEffectSummary(effect) || definition?.label || effect.type,
      statChanges,
      source: effect.source ?? 'effect',
      runtimeEffect: cloneWeaponRuntimeEffect(effect),
      tags: [
        effect.trigger === 'passive' ? 'passive-effect' : 'weapon-effect',
        `effect-category:${getWeaponEffectCategory(effect)}`,
      ],
    };
  }

  function rollWeaponConditionalModifiers(rarity) {
    const finalModifier = WEAPON_MODIFIER_DEFS.find((modifier) => modifier.id === 'final');
    const chance = WEAPON_CONDITIONAL_MODIFIER_CHANCES[rarity] ?? 0;
    if (!finalModifier || chance <= 0 || randomChance() >= chance) {
      return [];
    }

    return [cloneModifier(finalModifier)];
  }

  function rollEffectMods(rarity, floorNumber, existingEffects = []) {
    const effects = [...existingEffects];
    const takenTypes = new Set(effects.map((effect) => effect.type));
    let guaranteedType = null;
    let extraHighImpact = false;

    if (rarity === 'rare') {
      guaranteedType = randomChance() < 0.45 ? 'standard' : null;
    } else if (rarity === 'veryRare') {
      guaranteedType = 'standard';
      extraHighImpact = randomChance() < 0.24;
    }

    if (guaranteedType) {
      const pool = [...STANDARD_EFFECT_IDS].filter((effectId) => !takenTypes.has(effectId));
      if (pool.length > 0) {
        const effectType = pool[randomInt(0, pool.length - 1)];
        const effect = buildEffect(effectType, rarity === 'veryRare' ? 2 : 1, floorNumber, 'mod');
        if (effect) {
          effects.push(effect);
          takenTypes.add(effect.type);
        }
      }
    }

    if (extraHighImpact && effects.length < 2) {
      const pool = [...HIGH_IMPACT_EFFECT_IDS]
        .filter((effectId) => !takenTypes.has(effectId))
        .filter((effectId) => !hasControlConflict(effects, effectId));
      if (pool.length > 0) {
        const effectType = pool[randomInt(0, pool.length - 1)];
        const effect = buildEffect(effectType, 1, floorNumber, 'mod');
        if (effect) {
          effects.push(effect);
        }
      }
    }

    return effects.slice(0, 2);
  }

  function applyWeaponStatChanges(baseStats, modifiers) {
    const nextItem = { ...baseStats };
    for (const modifier of modifiers) {
      nextItem.damage = (nextItem.damage ?? 0) + (modifier.statChanges?.damageAdd ?? 0);
      nextItem.hitBonus = (nextItem.hitBonus ?? 0) + (modifier.statChanges?.hitBonusAdd ?? 0);
      nextItem.critBonus = (nextItem.critBonus ?? 0) + (modifier.statChanges?.critBonusAdd ?? 0);
      nextItem.lightBonus = (nextItem.lightBonus ?? 0) + (modifier.statChanges?.lightBonusAdd ?? 0);
    }
    return nextItem;
  }

  function buildWeaponDescription(baseItem, numericMods, effects) {
    const parts = [];
    if (numericMods.length > 0) {
      parts.push(numericMods.map((modifier) => modifier.label).join(', '));
    }
    if (effects.length > 0) {
      parts.push(effects.map((effect) => getEffectSummary(effect)).filter(Boolean).join(' | '));
    }
    if (baseItem.description) {
      parts.push(baseItem.description);
    }
    return parts.join('. ');
  }

  function appendDecadeSuffix(name, decadeSuffix) {
    return decadeSuffix ? `${name} ${decadeSuffix}`.trim() : name;
  }

  function formatWeaponNameParts(nameParts) {
    return [
      nameParts.prefix,
      nameParts.baseName,
      nameParts.suffix,
      nameParts.decadeSuffix,
    ].filter(Boolean).join(' ').trim();
  }

  function buildWeaponNameParts(baseItem, rarity, numericMods, effects, floorNumber) {
    const decadeSuffix = getDecadePrefix(getStudioCycleIndex(floorNumber));
    const allEffects = effects.filter(Boolean);
    const primaryEffect = allEffects[0] ?? null;
    const secondaryEffect = allEffects[1] ?? null;
    const primaryParts = primaryEffect ? getEffectNameParts(primaryEffect.type) : null;
    const secondaryParts = secondaryEffect ? getEffectNameParts(secondaryEffect.type) : null;
    const fallbackPrefix = numericMods[0]?.namePrefix ?? '';
    const fallbackSuffix = numericMods[1]?.nameSuffix ?? '';
    const prefix = primaryParts?.prefix?.[0] ?? fallbackPrefix;
    const suffix = secondaryParts?.suffix?.[0] ?? primaryParts?.suffix?.[0] ?? fallbackSuffix;

    if (rarity === 'common') {
      return {
        prefix: null,
        baseName: baseItem.name,
        suffix: null,
        decadeSuffix,
      };
    }

    if (rarity === 'uncommon') {
      if (prefix) {
        return {
          prefix,
          baseName: baseItem.name,
          suffix: null,
          decadeSuffix,
        };
      }
      if (suffix) {
        return {
          prefix: null,
          baseName: baseItem.name,
          suffix,
          decadeSuffix,
        };
      }
    }

    return {
      prefix: prefix || null,
      baseName: baseItem.name,
      suffix: suffix || null,
      decadeSuffix,
    };
  }

  function buildWeaponName(baseItem, rarity, numericMods, effects, floorNumber) {
    return formatWeaponNameParts(buildWeaponNameParts(baseItem, rarity, numericMods, effects, floorNumber));
  }

  function generateWeaponItem(baseItem, dropContext = {}) {
    const floorNumber = Math.max(1, dropContext.floorNumber ?? 1);
    const rarity = dropContext.forceRarity ?? rollWeaponRarity(dropContext);
    const profile = getWeaponProfile(baseItem.profileId);
    const scaling = getFloorScalingBonus(floorNumber);

    const baseStats = {
      damage: (baseItem.baseDamage ?? baseItem.damage ?? 1) + Math.round(scaling.damage * profile.damageWeight),
      hitBonus: (baseItem.baseHit ?? baseItem.hitBonus ?? 0) + Math.round(scaling.hit * profile.hitWeight),
      critBonus: (baseItem.baseCrit ?? baseItem.critBonus ?? 0) + Math.round(scaling.crit * profile.critWeight),
    };

    const numericMods = rollNumericMods(rarity);
    let effects = [];
    if (baseItem.signatureEffect?.type) {
      const signature = buildEffect(baseItem.signatureEffect.type, baseItem.signatureEffect.tier ?? 1, floorNumber, 'signature');
      if (signature) {
        effects.push(signature);
      }
    }
    effects = rollEffectMods(rarity, floorNumber, effects);
    const modifiers = [
      ...numericMods.map(createWeaponModifierFromNumericMod).filter(Boolean),
      ...effects.map(createWeaponModifierFromEffect).filter(Boolean),
      ...rollWeaponConditionalModifiers(rarity),
    ];
    const finalStats = applyWeaponStatChanges({
      ...baseStats,
      lightBonus: 0,
    }, modifiers);
    const nameParts = buildWeaponNameParts(baseItem, rarity, numericMods, effects, floorNumber);
    const displayName = buildWeaponName(baseItem, rarity, numericMods, effects, floorNumber);
    const grammar = buildWeaponGrammar({
      ...baseItem,
      id: baseItem.id,
      templateId: baseItem.id,
      baseItemId: baseItem.id,
      name: displayName,
      nameParts,
    });

    const weapon = {
      ...baseItem,
      type: 'weapon',
      itemType: 'weapon',
      baseItemId: baseItem.id,
      templateId: baseItem.id,
      damage: Math.max(1, Math.round(finalStats.damage)),
      hitBonus: Math.round(finalStats.hitBonus),
      critBonus: Math.round(finalStats.critBonus),
      rarity,
      rarityLabel: formatRarityLabel(rarity),
      numericMods,
      effects: [],
      modifierIds: modifiers.map((modifier) => modifier.id),
      modifiers,
      lightBonus: finalStats.lightBonus ?? 0,
      displayName,
      name: displayName,
      nameParts,
      grammar,
      dropSourceTag: dropContext.dropSourceTag ?? null,
      sourceArchetypeId: dropContext.sourceArchetypeId ?? baseItem.archetypeId ?? null,
      floorNumber,
      description: buildWeaponDescription(baseItem, numericMods, effects),
    };
    return {
      ...weapon,
      balanceGroups: getItemBalanceGroups(weapon),
    };
  }

  function generateShieldItem(baseItem, dropContext = {}) {
    const floorNumber = Math.max(1, dropContext.floorNumber ?? 1);
    const rarity = dropContext.forceRarity ?? rollRarity(dropContext);
    const modifiers = dropContext.forceModifiers
      ? dropContext.forceModifiers
        .map((modifierId) => SHIELD_MODIFIER_DEFS.find((modifier) => modifier.id === modifierId))
        .filter(Boolean)
        .map(cloneModifier)
      : rollModifiers(baseItem, rarity);

    const computedItem = applyShieldStatChanges(baseItem, modifiers);
    const decadeSuffix = getDecadePrefix(getStudioCycleIndex(floorNumber));
    const displayName = modifiers.length > 0
      ? appendDecadeSuffix(`${modifiers.slice(0, 2).map((modifier) => modifier.affix).join(' ')} ${baseItem.name}`.trim(), decadeSuffix)
      : appendDecadeSuffix(baseItem.name, decadeSuffix);

    const shield = {
      ...computedItem,
      templateId: baseItem.id,
      baseItemId: baseItem.id,
      rarity,
      rarityLabel: formatRarityLabel(rarity),
      modifiers,
      modifierIds: modifiers.map((modifier) => modifier.id),
      displayName,
      name: displayName,
      dropSourceTag: dropContext.dropSourceTag ?? null,
      sourceArchetypeId: dropContext.sourceArchetypeId ?? baseItem.archetypeId ?? null,
      floorNumber,
      description: modifiers.length > 0
        ? `${modifiers.map((modifier) => modifier.summary).join(' | ')}. ${baseItem.description}`
        : baseItem.description,
    };
    return {
      ...shield,
      balanceGroups: getItemBalanceGroups(shield),
    };
  }

  function generateEquipmentItem(baseItem, dropContext = {}) {
    if (isWeaponTemplate(baseItem)) {
      return generateWeaponItem(baseItem, dropContext);
    }

    return generateShieldItem(baseItem, dropContext);
  }

  function getItemModifierSummary(item) {
    const modifierParts = item?.modifiers?.map((modifier) => modifier.summary ?? modifier.affix).filter(Boolean) ?? [];
    const parts = modifierParts.length > 0
      ? modifierParts
      : [
          ...(item?.numericMods?.map((modifier) => modifier.label) ?? []),
          ...getWeaponRuntimeEffects(item).map((effect) => getWeaponEffectDefinition(effect.type)?.label).filter(Boolean),
        ];
    return parts.length > 0 ? parts.join(', ') : 'Keine Modifikatoren';
  }

  function getWeaponConditionalDamageBonus(actor, weapon) {
    if (!itemHasModifier(weapon, 'final')) {
      return 0;
    }

    const currentHp = Math.max(0, actor?.hp ?? 0);
    const maxHp = getActorDerivedMaxHp(actor);
    const hpRatio = currentHp / maxHp;
    if (hpRatio <= 0.34) {
      return 2;
    }
    if (hpRatio <= 0.5) {
      return 1;
    }
    return 0;
  }

  function itemHasModifier(item, modifierId) {
    return Boolean(
      item?.modifierIds?.includes(modifierId) ||
      item?.modifiers?.some((modifier) =>
        modifier?.id === modifierId ||
        modifier?.tags?.includes(modifierId)
      )
    );
  }

  return {
    formatRarityLabel,
    generateEquipmentItem,
    getItemModifierSummary,
    getWeaponConditionalDamageBonus,
    itemHasModifier,
  };
}
