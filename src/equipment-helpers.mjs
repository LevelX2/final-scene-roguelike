export function createBareHandsWeapon() {
  return {
    type: "weapon",
    id: "bare-hands",
    name: "Bloße Fäuste",
    source: "Start",
    handedness: "one-handed",
    damage: 1,
    hitBonus: 0,
    critBonus: 0,
    description: "Nicht ideal, aber immerhin ehrlich.",
  };
}

export function cloneOffHandItem(item) {
  if (!item) {
    return null;
  }

  return {
    ...item,
    type: item.type ?? "offhand",
    modifiers: item.modifiers ? item.modifiers.map((modifier) => ({
      ...modifier,
      allowedItemTypes: [...(modifier.allowedItemTypes ?? [])],
      statChanges: { ...(modifier.statChanges ?? {}) },
      tags: [...(modifier.tags ?? [])],
    })) : [],
    modifierIds: [...(item.modifierIds ?? [])],
    statMods: { ...(item.statMods ?? {}) },
  };
}

export function getMainHand(entity) {
  return entity.mainHand ?? entity.weapon ?? createBareHandsWeapon();
}

export function getOffHand(entity) {
  return entity.offHand ?? null;
}

export function getCombatWeapon(entity) {
  return getMainHand(entity);
}

export function createEquipmentPresentationHelpers({ formatRarityLabel, getItemModifierSummary }) {
  function getStatLabel(stat) {
    return {
      strength: "Stärke",
      precision: "Präzision",
      reaction: "Reaktion",
      nerves: "Nerven",
      intelligence: "Intelligenz",
      endurance: "Ausdauer",
      charm: "Charme",
    }[stat] ?? stat;
  }

  function formatStatMod(value) {
    return `${value >= 0 ? "+" : ""}${value}`;
  }

  function formatStatMods(statMods = {}) {
    return Object.entries(statMods)
      .filter(([, value]) => value)
      .map(([stat, value]) => `${getStatLabel(stat)} ${formatStatMod(value)}`)
      .join(" | ");
  }

  function formatModifier(value) {
    return `${value >= 0 ? "+" : ""}${value}`;
  }

  function getHandednessLabel(handedness) {
    return handedness === "two-handed" ? "2H" : "1H";
  }

  function formatWeaponStats(weapon) {
    const stats = [
      getHandednessLabel(weapon.handedness),
      `${weapon.damage} Schaden`,
      `${formatModifier(weapon.hitBonus)} Treffer`,
    ];

    if (weapon.rarity && weapon.rarity !== "common") {
      stats.unshift(formatRarityLabel(weapon.rarity));
    }

    if (weapon.critBonus !== 0) {
      stats.push(`${formatModifier(weapon.critBonus)} Krit`);
    }

    return stats.join(" | ");
  }

  function formatOffHandStats(item) {
    if (!item) {
      return "Leer";
    }

    if (item.subtype === "shield") {
      const stats = [`${item.blockChance}% Block`, `${item.blockValue} Blockwert`];
      const statMods = formatStatMods(item.statMods);
      if (statMods) {
        stats.push(statMods);
      }
      if (item.rarity && item.rarity !== "common") {
        stats.unshift(formatRarityLabel(item.rarity));
      }
      return stats.join(" | ");
    }

    return item.description ?? "Nebenhand-Item";
  }

  function getOffHandTooltipLines(item) {
    if (!item) {
      return ["Kein Gegenstand ausgerüstet."];
    }

    if (item.subtype === "shield") {
      const lines = [
        item.source,
        item.rarity ? formatRarityLabel(item.rarity) : null,
        `${item.blockChance}% Blockchance`,
        `${item.blockValue} Schadensblock`,
        formatStatMods(item.statMods),
        item.modifiers?.length ? `Mods: ${getItemModifierSummary(item)}` : null,
        item.description,
      ];
      return lines.filter(Boolean);
    }

    return [
      item.source ?? "Nebenhand",
      item.description ?? "Kein weiterer Effekt bekannt.",
    ];
  }

  return {
    formatWeaponStats,
    formatOffHandStats,
    getOffHandTooltipLines,
  };
}
