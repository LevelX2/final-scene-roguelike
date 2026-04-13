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
      },
      stairsDown: floorState.stairsDown ? { ...floorState.stairsDown } : null,
      stairsUp: floorState.stairsUp ? { ...floorState.stairsUp } : null,
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
        retreatProfile: enemy.retreatProfile ?? "none",
        retreatLabel: enemy.retreatLabel ?? "Standhaft",
        healingProfile: enemy.healingProfile ?? "slow",
        healingLabel: enemy.healingLabel ?? "Langsam",
        isRetreating: Boolean(enemy.isRetreating),
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
