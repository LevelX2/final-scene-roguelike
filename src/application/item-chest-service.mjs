export function createItemChestService(context) {
  const {
    getState,
    getCurrentFloorState,
    removeChestAt,
    spawnChestContentAtPlayer,
    addMessage,
  } = context;

  function openChest(index) {
    const state = getState();
    const chest = getCurrentFloorState().chests[index];
    if (!chest) {
      return false;
    }

    removeChestAt(index);
    state.openedChests = (state.openedChests ?? 0) + 1;
    addMessage("Du hebelst eine verstaubte Requisitenkiste auf.", "important");
    return spawnChestContentAtPlayer(chest.content);
  }

  return { openChest };
}
