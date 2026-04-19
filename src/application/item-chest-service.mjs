export function createItemChestService(context) {
  const {
    getState,
    getCurrentFloorState,
    storeContainerItems,
    removeChestIfEmpty,
    addMessage,
    endTurn,
    renderSelf,
  } = context;

  function getChestContents(chest) {
    if (!chest) {
      return [];
    }

    if (Array.isArray(chest.contents)) {
      return chest.contents.filter(Boolean);
    }

    return chest.content ? [chest.content] : [];
  }

  function setPendingContainerLoot(chestIndex, selectedItemIndices = []) {
    getState().pendingContainerLoot = {
      chestIndex,
      selectedItemIndices,
    };
  }

  function getPendingChest() {
    const state = getState();
    const chestIndex = state.pendingContainerLoot?.chestIndex;
    if (!Number.isInteger(chestIndex) || chestIndex < 0) {
      return null;
    }

    const chest = getCurrentFloorState().chests?.[chestIndex] ?? null;
    return chest ? { chest, chestIndex } : null;
  }

  function getContainerEntryLabel(entry) {
    return entry?.item?.name ?? 'unbekannte Beute';
  }

  function openChest(index) {
    const state = getState();
    const chest = getCurrentFloorState().chests[index];
    if (!chest) {
      return false;
    }

    if (!chest.opened) {
      chest.opened = true;
      state.openedChests = (state.openedChests ?? 0) + 1;
      addMessage(`Du öffnest ${chest.containerName ?? 'eine verstaubte Requisitenkiste'}.`, 'important');
    }

    if (getChestContents(chest).length === 0) {
      addMessage(`${chest.containerName ?? 'Die Kiste'} ist leer.`, 'important');
    }

    setPendingContainerLoot(index);
    return true;
  }

  function closeContainerLoot() {
    const state = getState();
    const pending = state.pendingContainerLoot;
    if (!pending) {
      return;
    }

    removeChestIfEmpty(pending.chestIndex);
    state.pendingContainerLoot = null;
    renderSelf();
  }

  function toggleContainerLootSelection(itemIndex) {
    const state = getState();
    const pending = state.pendingContainerLoot;
    if (!pending) {
      return;
    }

    const selected = new Set(pending.selectedItemIndices ?? []);
    if (selected.has(itemIndex)) {
      selected.delete(itemIndex);
    } else {
      selected.add(itemIndex);
    }

    setPendingContainerLoot(pending.chestIndex, [...selected].sort((left, right) => left - right));
    renderSelf();
  }

  function takeContainerItems(itemIndices) {
    const pendingChest = getPendingChest();
    if (!pendingChest) {
      return false;
    }

    const takenEntries = storeContainerItems(pendingChest.chestIndex, itemIndices);
    if (!takenEntries.length) {
      closeContainerLoot();
      return false;
    }

    addMessage(
      `Aus ${pendingChest.chest.containerName ?? 'der Kiste'} nimmst du ${takenEntries.map(getContainerEntryLabel).join(', ')}.`,
      'important',
    );

    const chestIsEmpty = removeChestIfEmpty(pendingChest.chestIndex);
    if (chestIsEmpty) {
      addMessage(`${pendingChest.chest.containerName ?? 'Die Kiste'} ist jetzt leer.`, 'important');
    }

    getState().pendingContainerLoot = null;
    endTurn();
    return true;
  }

  function takeSelectedContainerLoot() {
    const pending = getState().pendingContainerLoot;
    if (!pending) {
      return false;
    }

    return takeContainerItems(pending.selectedItemIndices ?? []);
  }

  function takeAllContainerLoot() {
    const pendingChest = getPendingChest();
    if (!pendingChest) {
      return false;
    }

    return takeContainerItems(getChestContents(pendingChest.chest).map((_, index) => index));
  }

  return {
    openChest,
    closeContainerLoot,
    toggleContainerLootSelection,
    takeSelectedContainerLoot,
    takeAllContainerLoot,
  };
}
