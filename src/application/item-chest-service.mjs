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
    addMessage(`Du öffnest ${chest.containerName ?? 'eine verstaubte Requisitenkiste'}.`, "important");
    return spawnChestContentAtPlayer(chest.content, chest.containerName);
  }

  return { openChest };
}
