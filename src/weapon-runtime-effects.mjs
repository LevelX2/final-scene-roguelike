import { isOnHitWeaponEffect, isPassiveWeaponEffect } from './content/catalogs/weapon-effects.mjs';

export function cloneWeaponRuntimeEffect(effect) {
  return effect ? { ...effect } : effect ?? null;
}

export function cloneItemModifierRuntime(modifier) {
  if (!modifier || typeof modifier !== 'object') {
    return modifier ?? null;
  }

  return {
    ...modifier,
    allowedItemTypes: [...(modifier.allowedItemTypes ?? [])],
    statChanges: { ...(modifier.statChanges ?? {}) },
    tags: [...(modifier.tags ?? [])],
    runtimeEffect: cloneWeaponRuntimeEffect(modifier.runtimeEffect),
  };
}

export function getWeaponRuntimeEffects(weapon) {
  const effectsFromModifiers = (weapon?.modifiers ?? [])
    .map((modifier) => cloneWeaponRuntimeEffect(modifier?.runtimeEffect))
    .filter(Boolean);

  if (effectsFromModifiers.length > 0) {
    return effectsFromModifiers;
  }

  return (weapon?.effects ?? []).map(cloneWeaponRuntimeEffect).filter(Boolean);
}

export function getWeaponOnHitEffects(weapon) {
  return getWeaponRuntimeEffects(weapon).filter((effect) => isOnHitWeaponEffect(effect));
}

export function getWeaponPassiveEffects(weapon) {
  return getWeaponRuntimeEffects(weapon).filter((effect) => isPassiveWeaponEffect(effect));
}

