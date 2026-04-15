export function createTestApiSnapshots(context) {
  const {
    getState,
    getCurrentFloorState,
    getMainHand,
    getOffHand,
    countPotionsInInventory,
    countFoodInInventory,
    loadHighscores,
    generateEquipmentItem,
  } = context;

  function getSnapshot() {
    const state = getState();
    const floorState = getCurrentFloorState();
    return {
      floor: state.floor,
      player: {
        name: state.player.name,
        classId: state.player.classId,
        classLabel: state.player.classLabel,
        classPassiveName: state.player.classPassiveName,
        x: state.player.x,
        y: state.player.y,
        hp: state.player.hp,
        maxHp: state.player.maxHp,
        nutrition: state.player.nutrition,
        nutritionMax: state.player.nutritionMax,
        hungerState: state.player.hungerState,
        statusEffects: (state.player.statusEffects ?? []).map((effect) => ({ ...effect })),
      },
      targeting: {
        active: Boolean(state.targeting?.active),
        cursorX: state.targeting?.cursorX ?? null,
        cursorY: state.targeting?.cursorY ?? null,
      },
      stairsDown: floorState.stairsDown ? { ...floorState.stairsDown } : null,
      stairsUp: floorState.stairsUp ? { ...floorState.stairsUp } : null,
      entryAnchor: floorState.entryAnchor ? {
        ...floorState.entryAnchor,
        position: { ...floorState.entryAnchor.position },
        transitionPosition: floorState.entryAnchor.transitionPosition ? { ...floorState.entryAnchor.transitionPosition } : null,
        corridorPosition: floorState.entryAnchor.corridorPosition ? { ...floorState.entryAnchor.corridorPosition } : null,
      } : null,
      exitAnchor: floorState.exitAnchor ? {
        ...floorState.exitAnchor,
        position: { ...floorState.exitAnchor.position },
        transitionPosition: floorState.exitAnchor.transitionPosition ? { ...floorState.exitAnchor.transitionPosition } : null,
        corridorPosition: floorState.exitAnchor.corridorPosition ? { ...floorState.exitAnchor.corridorPosition } : null,
      } : null,
      layoutId: floorState.layoutId ?? null,
      layoutFailureReason: floorState.layoutFailureReason ?? null,
      corridorWidth: floorState.corridorWidth ?? null,
      gangBoundingBox: floorState.gangBoundingBox ? { ...floorState.gangBoundingBox } : null,
      topologyNode: floorState.topologyNode
        ? {
          ...floorState.topologyNode,
          position: floorState.topologyNode.position ? { ...floorState.topologyNode.position } : null,
        }
        : null,
      grid: floorState.grid.map((row) => [...row]),
      rooms: (floorState.rooms ?? []).map((room) => ({ ...room })),
      visible: floorState.visible?.map((row) => [...row]) ?? [],
      keys: (floorState.keys ?? []).map((entry) => ({
        x: entry.x,
        y: entry.y,
        keyColor: entry.item.keyColor,
        keyFloor: entry.item.keyFloor,
      })),
      foods: (floorState.foods ?? []).map((entry) => ({
        x: entry.x,
        y: entry.y,
        id: entry.item.id,
        nutritionRestore: entry.item.nutritionRestore,
      })),
      doors: (floorState.doors ?? []).map((door) => ({
        x: door.x,
        y: door.y,
        doorType: door.doorType,
        isOpen: door.isOpen,
        lockColor: door.lockColor,
        roomIdA: door.roomIdA,
        roomIdB: door.roomIdB,
      })),
      showcases: (floorState.showcases ?? []).map((entry) => ({
        x: entry.x,
        y: entry.y,
        id: entry.item.id,
        ambienceId: entry.item.ambienceId,
        name: entry.item.name,
        source: entry.item.source,
      })),
      traps: (floorState.traps ?? []).map((trap) => ({
        id: trap.id,
        name: trap.name,
        type: trap.type,
        visibility: trap.visibility,
        state: trap.state,
        trigger: trap.trigger,
        x: trap.x,
        y: trap.y,
        effect: { ...(trap.effect ?? {}) },
      })),
      offHands: (floorState.offHands ?? []).map((item) => ({
        id: item.item.id,
        name: item.item.name,
        x: item.x,
        y: item.y,
      })),
      enemies: floorState.enemies.map((enemy) => ({
        id: enemy.id,
        name: enemy.name,
        x: enemy.x,
        y: enemy.y,
        hp: enemy.hp,
        maxHp: enemy.maxHp,
        aggro: Boolean(enemy.aggro),
        canOpenDoors: Boolean(enemy.canOpenDoors),
        temperament: enemy.temperament ?? "stoic",
        temperamentHint: enemy.temperamentHint ?? "",
        idleTarget: enemy.idleTarget ? { ...enemy.idleTarget } : null,
        idleTargetType: enemy.idleTargetType ?? null,
        retreatProfile: enemy.retreatProfile ?? "none",
        retreatLabel: enemy.retreatLabel ?? "Standhaft",
        healingProfile: enemy.healingProfile ?? "slow",
        healingLabel: enemy.healingLabel ?? "Langsam",
        isRetreating: Boolean(enemy.isRetreating),
        statusEffects: (enemy.statusEffects ?? []).map((effect) => ({ ...effect })),
      })),
    };
  }

  function getMessages() {
    const state = getState();
    return state.messages.map((entry) => ({ ...entry }));
  }

  function getInventorySnapshot() {
    const state = getState();
    return {
      inventoryCount: state.inventory.length,
      potionCount: countPotionsInInventory(),
      foodCount: countFoodInInventory(),
      equippedWeapon: getMainHand(state.player) ? { ...getMainHand(state.player) } : null,
      offHand: getOffHand(state.player) ? { ...getOffHand(state.player) } : null,
      items: state.inventory.map((item) => ({ ...item })),
    };
  }

  function getOptionsSnapshot() {
    const state = getState();
    return { ...state.options };
  }

  function getHighscores() {
    return loadHighscores();
  }

  function previewGeneratedEquipment(baseItem, dropContext = {}) {
    return generateEquipmentItem(baseItem, dropContext);
  }

  return {
    getSnapshot,
    getMessages,
    getInventorySnapshot,
    getOptionsSnapshot,
    getHighscores,
    previewGeneratedEquipment,
  };
}
