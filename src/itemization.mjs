import { RARITY_LABELS, WEAPON_MODIFIER_DEFS, SHIELD_MODIFIER_DEFS } from './content/item-modifiers.mjs';

function cloneModifier(modifier) {
  return {
    ...modifier,
    allowedItemTypes: [...(modifier.allowedItemTypes ?? [])],
    statChanges: { ...(modifier.statChanges ?? {}) },
    tags: [...(modifier.tags ?? [])],
  };
}

export function createItemizationApi(context) {
  const {
    ITEM_RARITY_MODIFIER_COUNTS,
    getEquipmentRarityWeights,
    randomChance,
  } = context;

  function getItemType(baseItem) {
    if (baseItem?.type === "weapon" || baseItem?.itemType === "weapon") {
      return "weapon";
    }

    if (baseItem?.subtype === "shield" || baseItem?.itemType === "shield") {
      return "shield";
    }

    return baseItem?.type ?? "weapon";
  }

  function formatRarityLabel(rarity) {
    return RARITY_LABELS[rarity] ?? RARITY_LABELS.common;
  }

  function weightedPick(entries, weightKey = "weight") {
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
    return weightedPick(entries)?.rarity ?? "common";
  }

  function getModifierPool(itemType, rarity) {
    const pool = itemType === "shield" ? SHIELD_MODIFIER_DEFS : WEAPON_MODIFIER_DEFS;
    return pool
      .filter((modifier) => modifier.allowedItemTypes.includes(itemType))
      .filter((modifier) => {
        if (!modifier.minRarity) {
          return true;
        }

        const rarityOrder = ["common", "uncommon", "rare", "veryRare"];
        return rarityOrder.indexOf(rarity) >= rarityOrder.indexOf(modifier.minRarity);
      })
      .map(cloneModifier);
  }

  function isModifierCompatible(candidate, selected) {
    if (selected.some((modifier) => modifier.id === candidate.id)) {
      return false;
    }

    if (
      candidate.exclusiveGroup &&
      selected.some((modifier) => modifier.exclusiveGroup === candidate.exclusiveGroup)
    ) {
      return false;
    }

    if (
      candidate.exclusiveGroup === "curse" &&
      selected.some((modifier) => modifier.exclusiveGroup === "curse")
    ) {
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

  function applyWeaponStatChanges(baseItem, modifiers) {
    const nextItem = {
      ...baseItem,
      type: "weapon",
      itemType: "weapon",
      damage: baseItem.damage ?? 0,
      hitBonus: baseItem.hitBonus ?? 0,
      critBonus: baseItem.critBonus ?? 0,
    };

    for (const modifier of modifiers) {
      nextItem.damage += modifier.statChanges.damageAdd ?? 0;
      nextItem.hitBonus += modifier.statChanges.hitBonusAdd ?? 0;
      nextItem.critBonus += modifier.statChanges.critBonusAdd ?? 0;
    }

    nextItem.damage = Math.max(1, Math.round(nextItem.damage));
    nextItem.hitBonus = Math.round(nextItem.hitBonus);
    nextItem.critBonus = Math.round(nextItem.critBonus);
    return nextItem;
  }

  function applyShieldStatChanges(baseItem, modifiers) {
    const nextItem = {
      ...baseItem,
      type: "offhand",
      itemType: "shield",
      subtype: "shield",
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

  function buildDescription(baseItem, modifiers) {
    if (!modifiers.length) {
      return baseItem.description;
    }

    const modifierSummary = modifiers.map((modifier) => modifier.summary).join(" | ");
    return `${modifierSummary}. ${baseItem.description}`;
  }

  function generateDisplayName(baseItem, modifiers) {
    if (!modifiers.length) {
      return baseItem.name;
    }

    const shownAffixes = modifiers.slice(0, 2).map((modifier) => modifier.affix);
    return `${shownAffixes.join(" ")} ${baseItem.name}`.trim();
  }

  function generateEquipmentItem(baseItem, dropContext = {}) {
    const itemType = getItemType(baseItem);
    const rarity = dropContext.forceRarity ?? rollRarity(dropContext);
    const modifiers = dropContext.forceModifiers
      ? dropContext.forceModifiers
        .map((modifierId) => [...WEAPON_MODIFIER_DEFS, ...SHIELD_MODIFIER_DEFS].find((modifier) => modifier.id === modifierId))
        .filter(Boolean)
        .map(cloneModifier)
      : rollModifiers(baseItem, rarity);

    const computedItem = itemType === "shield"
      ? applyShieldStatChanges(baseItem, modifiers)
      : applyWeaponStatChanges(baseItem, modifiers);

    const displayName = generateDisplayName(baseItem, modifiers);

    return {
      ...computedItem,
      baseItemId: baseItem.id,
      rarity,
      rarityLabel: formatRarityLabel(rarity),
      modifiers,
      modifierIds: modifiers.map((modifier) => modifier.id),
      displayName,
      name: displayName,
      dropSourceTag: dropContext.dropSourceTag ?? null,
      description: buildDescription(baseItem, modifiers),
    };
  }

  function getItemModifierSummary(item) {
    if (!item?.modifiers?.length) {
      return "Keine Modifikatoren";
    }

    return item.modifiers.map((modifier) => modifier.affix).join(", ");
  }

  function getWeaponConditionalDamageBonus(attacker, weapon) {
    if (!weapon?.modifierIds?.includes("final")) {
      return 0;
    }

    if (!attacker?.maxHp) {
      return 0;
    }

    return attacker.hp / attacker.maxHp <= 0.35 ? 2 : 0;
  }

  function itemHasModifier(item, modifierId) {
    return Boolean(item?.modifierIds?.includes(modifierId));
  }

  return {
    formatRarityLabel,
    generateEquipmentItem,
    getItemModifierSummary,
    getWeaponConditionalDamageBonus,
    itemHasModifier,
  };
}
