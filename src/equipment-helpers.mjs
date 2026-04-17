import { getWeaponTemplate } from './content/catalogs/weapon-templates.mjs';
import { getShieldTemplate } from './content/catalogs/shields.mjs';
import { getItemBalanceGroups } from './item-balance-groups.mjs';
import { buildWeaponGrammar, formatWeaponDisplayName as formatWeaponDisplayNameText, formatWeaponReference as formatWeaponReferenceText } from './text/combat-phrasing.mjs';
import { cloneItemModifierRuntime, cloneWeaponRuntimeEffect } from './weapon-runtime-effects.mjs';

export function createBareHandsWeapon() {
  const weapon = {
    type: 'weapon',
    id: 'bare-hands',
    name: 'Bloße Fäuste',
    source: 'Start',
    handedness: 'one-handed',
    attackMode: 'melee',
    range: 1,
    damage: 1,
    hitBonus: 0,
    critBonus: 0,
    lightBonus: 0,
    effects: [],
    description: 'Nicht ideal, aber immerhin ehrlich.',
  };
  weapon.balanceGroups = getItemBalanceGroups(weapon);
  weapon.grammar = buildWeaponGrammar(weapon);
  return weapon;
}

function normalizeWeaponRuntimeFields(weapon) {
  if (!weapon || typeof weapon !== 'object' || weapon.id === 'bare-hands') {
    return weapon;
  }

  const templateId = weapon.templateId ?? weapon.baseItemId ?? weapon.id ?? null;
  const template = templateId ? getWeaponTemplate(templateId) : null;
  if (!template) {
    return weapon;
  }

  weapon.templateId = weapon.templateId ?? template.id;
  weapon.baseItemId = weapon.baseItemId ?? template.id;
  weapon.handedness = weapon.handedness ?? template.handedness ?? 'one-handed';
  weapon.attackMode = weapon.attackMode ?? template.attackMode ?? 'melee';
  weapon.range = weapon.range ?? template.range ?? 1;
  weapon.meleePenaltyHit = weapon.meleePenaltyHit ?? template.meleePenaltyHit ?? 0;
  weapon.weaponRole = weapon.weaponRole ?? template.weaponRole ?? null;
  weapon.profileId = weapon.profileId ?? template.profileId ?? null;
  weapon.archetypeId = weapon.archetypeId ?? template.archetypeId ?? null;
  weapon.lightBonus = weapon.lightBonus ?? 0;
  weapon.balanceGroups = Array.isArray(weapon.balanceGroups) ? [...weapon.balanceGroups] : getItemBalanceGroups(weapon);
  weapon.grammar = weapon.grammar ?? buildWeaponGrammar(weapon);
  return weapon;
}

export function cloneOffHandItem(item) {
  if (!item) {
    return null;
  }

  const templateId = item.baseItemId ?? item.id ?? null;
  const template = templateId ? getShieldTemplate(templateId) : null;

  return {
    ...(template ?? {}),
    ...item,
    type: item.type ?? 'offhand',
    itemType: item.itemType ?? 'shield',
    subtype: item.subtype ?? 'shield',
    baseItemId: item.baseItemId ?? template?.id ?? item.id ?? null,
    archetypeId: item.archetypeId ?? template?.archetypeId ?? null,
    iconAssetId: item.iconAssetId ?? template?.iconAssetId ?? item.id ?? item.icon ?? null,
    blockChance: item.blockChance ?? template?.blockChance ?? 0,
    blockValue: item.blockValue ?? template?.blockValue ?? 0,
    modifiers: item.modifiers ? item.modifiers.map(cloneItemModifierRuntime) : [],
    modifierIds: [...(item.modifierIds ?? [])],
    numericMods: [...(item.numericMods ?? [])],
    effects: (item.effects ?? []).map(cloneWeaponRuntimeEffect),
    balanceGroups: Array.isArray(item.balanceGroups) ? [...item.balanceGroups] : getItemBalanceGroups(item),
    statMods: { ...(item.statMods ?? {}) },
  };
}

export function getMainHand(entity) {
  return normalizeWeaponRuntimeFields(entity.mainHand ?? entity.weapon ?? createBareHandsWeapon());
}

export function getOffHand(entity) {
  return entity?.offHand ? cloneOffHandItem(entity.offHand) : null;
}

export function getCombatWeapon(entity) {
  return getMainHand(entity);
}

export function createEquipmentPresentationHelpers({ formatRarityLabel, getItemModifierSummary }) {
  function formatWeaponDisplayName(weapon) {
    return formatWeaponDisplayNameText(weapon);
  }

  function formatWeaponReference(weapon, options = {}) {
    return formatWeaponReferenceText(weapon, options);
  }

  function getStatLabel(stat) {
    return {
      strength: 'Stärke',
      precision: 'Präzision',
      reaction: 'Reaktion',
      nerves: 'Nerven',
      intelligence: 'Intelligenz',
      endurance: 'Ausdauer',
      charm: 'Charme',
    }[stat] ?? stat;
  }

  function formatStatMod(value) {
    return `${value >= 0 ? '+' : ''}${value}`;
  }

  function formatStatMods(statMods = {}) {
    return Object.entries(statMods)
      .filter(([, value]) => value)
      .map(([stat, value]) => `${getStatLabel(stat)} ${formatStatMod(value)}`)
      .join(' | ');
  }

  function formatModifier(value) {
    return `${value >= 0 ? '+' : ''}${value}`;
  }

  function getHandednessLabel(handedness) {
    return handedness === 'two-handed' ? '2H' : '1H';
  }

  function formatWeaponStats(weapon) {
    const stats = [
      getHandednessLabel(weapon.handedness),
      `${weapon.damage} Schaden`,
      `${formatModifier(weapon.hitBonus)} Treffer`,
    ];

    if (weapon.rarity && weapon.rarity !== 'common') {
      stats.unshift(formatRarityLabel(weapon.rarity));
    }

    if (weapon.critBonus !== 0) {
      stats.push(`${formatModifier(weapon.critBonus)} Krit`);
    }

    if ((weapon.range ?? 1) > 1) {
      stats.push(`${weapon.range} Reichweite`);
    }

    if ((weapon.lightBonus ?? 0) > 0) {
      stats.push(`+${weapon.lightBonus} Sicht`);
    }

    return stats.join(' | ');
  }

  function formatOffHandStats(item) {
    if (!item) {
      return 'Leer';
    }

    if (item.subtype === 'shield') {
      const stats = [`${item.blockChance}% Block`, `${item.blockValue} Blockwert`];
      const statMods = formatStatMods(item.statMods);
      if (statMods) {
        stats.push(statMods);
      }
      if (item.rarity && item.rarity !== 'common') {
        stats.unshift(formatRarityLabel(item.rarity));
      }
      return stats.join(' | ');
    }

    return item.description ?? 'Nebenhand-Item';
  }

  function getOffHandTooltipLines(item) {
    if (!item) {
      return ['Kein Gegenstand ausgerüstet.'];
    }

    if (item.subtype === 'shield') {
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
      item.source ?? 'Nebenhand',
      item.description ?? 'Kein weiterer Effekt bekannt.',
    ];
  }

  return {
    formatWeaponDisplayName,
    formatWeaponReference,
    formatWeaponStats,
    formatOffHandStats,
    getOffHandTooltipLines,
  };
}
