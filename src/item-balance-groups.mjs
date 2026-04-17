import { getWeaponEffectCategory } from './content/catalogs/weapon-effects.mjs';
import { getWeaponRuntimeEffects } from './weapon-runtime-effects.mjs';

function addGroup(target, value) {
  if (!value || target.includes(value)) {
    return;
  }

  target.push(value);
}

function addGroups(target, values) {
  (values ?? []).forEach((value) => addGroup(target, value));
}

function getItemKind(item) {
  if (item?.type === 'offhand' || item?.itemType === 'shield' || item?.subtype === 'shield') {
    return 'shield';
  }

  if (item?.type === 'weapon' || item?.itemType === 'weapon' || item?.weaponRole) {
    return 'weapon';
  }

  return item?.type ?? 'unknown';
}

function getModifierStatKinds(modifier) {
  const statChanges = modifier?.statChanges ?? {};
  const groups = [];
  if ((statChanges.damageAdd ?? 0) !== 0) {
    groups.push('damage');
  }
  if ((statChanges.hitBonusAdd ?? 0) !== 0) {
    groups.push('hit');
  }
  if ((statChanges.critBonusAdd ?? 0) !== 0) {
    groups.push('crit');
  }
  if ((statChanges.blockChanceAdd ?? 0) !== 0) {
    groups.push('block-chance');
  }
  if ((statChanges.blockValueAdd ?? 0) !== 0) {
    groups.push('block-value');
  }
  if ((statChanges.lightBonusAdd ?? 0) !== 0) {
    groups.push('light');
  }
  return groups;
}

function getWeaponModifierClusters(modifier) {
  const tags = modifier?.tags ?? [];
  const groups = [];

  if (modifier?.id === 'final' || tags.includes('final-strike')) {
    groups.push('weapon-mod:conditional');
  }

  if (tags.includes('passive-effect')) {
    groups.push('weapon-mod:passive');
  }

  const effectCategoryTag = tags.find((tag) => tag.startsWith('effect-category:'));
  const effectCategory = effectCategoryTag
    ? effectCategoryTag.replace('effect-category:', '')
    : null;

  if (effectCategory === 'dot') {
    groups.push('weapon-mod:dot', 'weapon-mod:on-hit');
  } else if (effectCategory === 'debuff') {
    groups.push('weapon-mod:debuff', 'weapon-mod:on-hit');
  } else if (effectCategory === 'control') {
    groups.push('weapon-mod:control', 'weapon-mod:on-hit');
  } else if (effectCategory === 'passive') {
    groups.push('weapon-mod:passive');
  }

  if (modifier?.source === 'numeric' || tags.includes('weapon-stat')) {
    groups.push('weapon-mod:stat');
  }

  if (modifier?.source === 'effect' || modifier?.source === 'signature' || modifier?.source === 'mod') {
    groups.push('weapon-mod:effect');
  }

  if (groups.length === 0) {
    groups.push('weapon-mod:misc');
  }

  return groups;
}

function getShieldModifierClusters(modifier) {
  const tags = modifier?.tags ?? [];
  const groups = [];

  if (modifier?.id === 'reflective' || tags.includes('reflective')) {
    groups.push('shield-mod:reflective');
  }

  if (modifier?.exclusiveGroup === 'shield-core') {
    groups.push('shield-mod:core');
  }

  if (modifier?.exclusiveGroup === 'curse') {
    groups.push('shield-mod:curse');
  }

  if (groups.length === 0) {
    groups.push('shield-mod:utility');
  }

  return groups;
}

function deriveWeaponGroups(item) {
  const groups = [];
  addGroups(groups, [
    `weapon-role:${item?.weaponRole ?? 'unknown'}`,
    `weapon-profile:${item?.profileId ?? 'unknown'}`,
    `weapon-handedness:${item?.handedness ?? 'one-handed'}`,
    `weapon-attack:${item?.attackMode ?? 'melee'}`,
    `weapon-range:${item?.attackMode === 'ranged' && (item?.range ?? 1) > 1 ? 'ranged' : 'melee'}`,
  ]);
  if (item?.id === 'bare-hands' || item?.baseItemId === 'bare-hands' || item?.templateId === 'bare-hands') {
    addGroup(groups, 'weapon:bare-hands');
  }

  (item?.modifiers ?? []).forEach((modifier) => {
    addGroup(groups, `modifier-id:${modifier.id ?? 'unknown'}`);
    addGroup(groups, `modifier-source:${modifier.source ?? 'runtime'}`);
    addGroups(groups, getWeaponModifierClusters(modifier));
    addGroups(groups, getModifierStatKinds(modifier).map((kind) => `modifier-stat:${kind}`));
  });

  getWeaponRuntimeEffects(item).forEach((effect) => {
    addGroup(groups, `effect:${effect.type ?? 'unknown'}`);
    addGroup(groups, `effect-category:${getWeaponEffectCategory(effect)}`);
  });

  return groups;
}

function deriveShieldGroups(item) {
  const groups = [];
  addGroups(groups, [
    `shield-archetype:${item?.archetypeId ?? 'unknown'}`,
  ]);

  Object.entries(item?.statMods ?? {})
    .filter(([, value]) => value)
    .forEach(([stat]) => addGroup(groups, `shield-stat:${stat}`));

  (item?.modifiers ?? []).forEach((modifier) => {
    addGroup(groups, `modifier-id:${modifier.id ?? 'unknown'}`);
    addGroups(groups, getShieldModifierClusters(modifier));
    addGroups(groups, getModifierStatKinds(modifier).map((kind) => `modifier-stat:${kind}`));
  });

  return groups;
}

export function getItemBalanceGroups(item) {
  const kind = getItemKind(item);
  const groups = [];

  addGroup(groups, `item:${kind}`);
  if (item?.rarity) {
    addGroup(groups, `rarity:${item.rarity}`);
  }
  if (item?.dropSourceTag) {
    addGroup(groups, `drop-source:${item.dropSourceTag}`);
  }
  if (item?.sourceArchetypeId) {
    addGroup(groups, `source-archetype:${item.sourceArchetypeId}`);
  }

  if (kind === 'weapon') {
    addGroups(groups, deriveWeaponGroups(item));
  } else if (kind === 'shield') {
    addGroups(groups, deriveShieldGroups(item));
  }

  return groups;
}
