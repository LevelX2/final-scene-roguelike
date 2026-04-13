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

  function createChestPickup(content, x, y) {
    return {
      x,
      y,
      content,
      opened: false,
    };
  }

  function createFoodPickup(item, x, y) {
    return {
      x,
      y,
      item: {
        ...item,
        type: item.type ?? "food",
      },
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
      modifiers: weapon.modifiers ? weapon.modifiers.map((modifier) => ({
        ...modifier,
        allowedItemTypes: [...(modifier.allowedItemTypes ?? [])],
        statChanges: { ...(modifier.statChanges ?? {}) },
        tags: [...(modifier.tags ?? [])],
      })) : [],
      modifierIds: [...(weapon.modifierIds ?? [])],
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
    const label = color === "green"
      ? "Grüner"
      : color === "blue"
        ? "Blauer"
        : `${color}er`;
    const colorLabel = color === "green" ? "grünen" : color === "blue" ? "blauen" : color;
    return {
      x,
      y,
      item: {
        type: "key",
        name: `${label} Schlüssel`,
        description: floorNumber
          ? `Passt zu ${colorLabel} Türen in Studio ${floorNumber}. Wird beim Öffnen verbraucht.`
          : `Passt zu ${colorLabel} Türen. Wird beim Öffnen verbraucht.`,
        keyColor: color,
        keyFloor: floorNumber,
      },
    };
  }

  return {
    createWeaponPickup,
    createOffHandPickup,
    createChestPickup,
    createFoodPickup,
    createShowcase,
    cloneWeapon,
    createDoor,
    createKeyPickup,
  };
}
