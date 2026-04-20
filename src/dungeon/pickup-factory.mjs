import { createKeyItem } from '../item-defs.mjs';
import { getItemBalanceGroups } from '../item-balance-groups.mjs';
import { normalizeLegacyConsumableItem } from '../content/catalogs/consumables.mjs';
import { cloneItemModifierRuntime, cloneWeaponRuntimeEffect } from '../weapon-runtime-effects.mjs';

export function createDungeonPickupFactory(context) {
  const {
    DOOR_TYPE,
    cloneOffHandItem,
  } = context;

  function createWeaponPickup(weapon, x, y) {
    return {
      x,
      y,
      item: {
        ...weapon,
        type: "weapon",
      },
    };
  }

  function createOffHandPickup(item, x, y) {
    return {
      x,
      y,
      item: cloneOffHandItem(item),
    };
  }

  function normalizeChestContents(contentOrContents) {
    if (Array.isArray(contentOrContents)) {
      return contentOrContents.filter(Boolean).map((entry) => ({ ...entry }));
    }

    if (!contentOrContents) {
      return [];
    }

    return [{ ...contentOrContents }];
  }

  function createChestPickup(content, x, y, options = {}) {
    const contents = normalizeChestContents(content);
    return {
      x,
      y,
      content: contents[0] ?? null,
      contents,
      opened: false,
      containerName: options.containerName ?? 'Requisitenkiste',
      containerAssetId: options.containerAssetId ?? 'requisite-crate',
    };
  }

  function createPotionPickup(item, x, y) {
    return {
      x,
      y,
      item: normalizeLegacyConsumableItem({
        type: item?.type ?? "consumable",
        id: item?.id ?? null,
        name: item?.name ?? "Set-Sanitätskit",
        description: item?.description ?? "Stellt 8 Lebenspunkte wieder her.",
        heal: item?.heal ?? 8,
        ...(item ?? {}),
      }),
    };
  }

  function createFoodPickup(item, x, y) {
    return {
      x,
      y,
      item: normalizeLegacyConsumableItem({
        ...item,
        type: item.type ?? "food",
      }),
    };
  }

  function createConsumablePickup(item, x, y) {
    return {
      x,
      y,
      item: normalizeLegacyConsumableItem({
        ...(item ?? {}),
        type: item?.type ?? 'consumable',
        itemType: item?.itemType ?? 'consumable',
        magnitude: item?.magnitude && typeof item.magnitude === 'object' ? { ...item.magnitude } : item?.magnitude,
      }),
    };
  }

  function createShowcase(prop, x, y) {
    const ambienceId = prop.ambienceId ?? prop.id;
    return {
      x,
      y,
      item: {
        ...prop,
        type: "showcase",
        ambienceId,
        iconAsset: prop.iconAsset ?? `./assets/displays/${ambienceId}.svg`,
      },
    };
  }

  function cloneWeapon(weapon) {
    if (!weapon) {
      return null;
    }

    return {
      ...weapon,
      type: "weapon",
      balanceGroups: Array.isArray(weapon.balanceGroups) ? [...weapon.balanceGroups] : getItemBalanceGroups(weapon),
      modifiers: weapon.modifiers ? weapon.modifiers.map(cloneItemModifierRuntime) : [],
      modifierIds: [...(weapon.modifierIds ?? [])],
      numericMods: [...(weapon.numericMods ?? [])],
      effects: (weapon.effects ?? []).map(cloneWeaponRuntimeEffect),
    };
  }

  function createDoor(x, y, config = {}) {
    return {
      x,
      y,
      doorType: config.doorType ?? DOOR_TYPE.NORMAL,
      isOpen: config.isOpen ?? false,
      lockColor: config.lockColor ?? null,
      roomIdA: config.roomIdA ?? null,
      roomIdB: config.roomIdB ?? null,
    };
  }

  function createKeyPickup(color, x, y, floorNumber = null) {
    return {
      x,
      y,
      item: createKeyItem(color, floorNumber),
    };
  }

  return {
    createWeaponPickup,
    createOffHandPickup,
    createChestPickup,
    createPotionPickup,
    createFoodPickup,
    createConsumablePickup,
    createShowcase,
    cloneWeapon,
    createDoor,
    createKeyPickup,
  };
}
