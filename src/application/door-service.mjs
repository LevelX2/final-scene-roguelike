export function createDoorService(context) {
  const {
    DOOR_TYPE,
    getState,
    getCurrentFloorState,
    addMessage,
    playDoorOpenSound,
    playDoorCloseSound,
  } = context;

  function getDoorAt(x, y, floorState = getCurrentFloorState()) {
    return floorState?.doors?.find((door) => door.x === x && door.y === y) ?? null;
  }

  function isDoorClosed(door) {
    return Boolean(door) && !door.isOpen;
  }

  function hasKeyForDoor(door, entity = getState().player) {
    const state = getState();
    if (!door) {
      return false;
    }

    return entity === state.player && state.inventory.some((item) =>
      item.type === "key" &&
      item.keyColor === door.lockColor &&
      item.keyFloor === state.floor
    );
  }

  function consumeKeyForDoor(door, entity = getState().player) {
    const state = getState();
    if (entity !== state.player || !door) {
      return null;
    }

    const keyIndex = state.inventory.findIndex((item) =>
      item.type === "key" &&
      item.keyColor === door.lockColor &&
      item.keyFloor === state.floor
    );

    if (keyIndex === -1) {
      return null;
    }

    const [usedKey] = state.inventory.splice(keyIndex, 1);
    return usedKey ?? null;
  }

  function getDoorColorLabels(color) {
    if (color === "green") {
      return { adjective: "grüne", adjectiveDative: "grüne", key: "grüner" };
    }

    if (color === "blue") {
      return { adjective: "blaue", adjectiveDative: "blauen", key: "blauer" };
    }

    return { adjective: color, adjectiveDative: color, key: color };
  }

  function canPlayerOpenDoor(door) {
    if (!door || door.isOpen) {
      return true;
    }

    if (door.doorType === DOOR_TYPE.LOCKED) {
      return hasKeyForDoor(door);
    }

    return true;
  }

  function openDoor(door, actor = "player") {
    if (!door || door.isOpen) {
      return true;
    }

    let usedKey = null;
    if (door.doorType === DOOR_TYPE.LOCKED) {
      usedKey = consumeKeyForDoor(door);
      if (!usedKey) {
        return false;
      }
    }

    door.isOpen = true;
    playDoorOpenSound();
    if (actor === "player") {
      const colorLabels = getDoorColorLabels(door.lockColor);
      addMessage(
        door.doorType === DOOR_TYPE.LOCKED
          ? `Der ${colorLabels.key} Schlüssel aus Studio ${usedKey.keyFloor} entriegelt die Tür und wird verbraucht.`
          : "Die Tür schwingt auf.",
        "important",
      );
    } else {
      addMessage(`${actor.name} drückt eine Tür auf.`, "danger");
    }

    if (door.doorType === DOOR_TYPE.LOCKED) {
      door.doorType = DOOR_TYPE.NORMAL;
      door.lockColor = null;
    }

    return true;
  }

  function closeDoor(door) {
    const state = getState();
    if (!door || !door.isOpen) {
      return false;
    }

    const floorState = getCurrentFloorState();
    const occupiedByEnemy = floorState.enemies.some((enemy) => enemy.x === door.x && enemy.y === door.y);
    const occupiedByPlayer = state.player.x === door.x && state.player.y === door.y;
    if (occupiedByEnemy || occupiedByPlayer) {
      return false;
    }

    door.isOpen = false;
    playDoorCloseSound();
    return true;
  }

  return {
    getDoorAt,
    isDoorClosed,
    getDoorColorLabels,
    canPlayerOpenDoor,
    openDoor,
    closeDoor,
  };
}
