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
  const CONTAINER_ACTIONS = ['selected', 'all', 'close'];

  function getChestContents(chest) {
    if (!chest) {
      return [];
    }

    if (Array.isArray(chest.contents)) {
      return chest.contents.filter(Boolean);
    }

    return chest.content ? [chest.content] : [];
  }

  function getEnabledContainerActions(contents, selectedItemIndices = []) {
    const selectedCount = selectedItemIndices.length;
    return CONTAINER_ACTIONS.filter((action) =>
      action === 'close'
        || (action === 'all' && contents.length > 0)
        || (action === 'selected' && selectedCount > 0)
    );
  }

  function clampFocusedContainerItemIndex(index, contents) {
    if (!contents.length) {
      return null;
    }

    return Math.min(contents.length - 1, Math.max(0, Number.isInteger(index) ? index : 0));
  }

  function normalizePendingContainerLoot(pending, chest) {
    const contents = getChestContents(chest);
    const selectedItemIndices = Array.from(new Set(pending?.selectedItemIndices ?? []))
      .filter((index) => Number.isInteger(index) && index >= 0 && index < contents.length)
      .sort((left, right) => left - right);
    const enabledActions = getEnabledContainerActions(contents, selectedItemIndices);
    const selectedAction = enabledActions.includes(pending?.selectedAction)
      ? pending.selectedAction
      : enabledActions[0] ?? 'close';
    const focusArea = pending?.focusArea === 'items' && contents.length > 0
      ? 'items'
      : 'actions';

    return {
      chestIndex: pending?.chestIndex,
      selectedItemIndices,
      selectedAction,
      focusArea,
      focusedItemIndex: clampFocusedContainerItemIndex(pending?.focusedItemIndex, contents),
    };
  }

  function setPendingContainerLoot(chestIndex, selectedItemIndices = [], options = {}) {
    const chest = getCurrentFloorState().chests?.[chestIndex] ?? null;
    const pending = normalizePendingContainerLoot({
      chestIndex,
      selectedItemIndices,
      selectedAction: options.selectedAction,
      focusArea: options.focusArea,
      focusedItemIndex: options.focusedItemIndex,
    }, chest);
    getState().pendingContainerLoot = {
      ...pending,
      chestIndex,
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

    setPendingContainerLoot(index, [], {
      selectedAction: getChestContents(chest).length > 0 ? 'all' : 'close',
      focusArea: 'actions',
      focusedItemIndex: 0,
    });
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

    const nextSelectedItemIndices = [...selected].sort((left, right) => left - right);
    setPendingContainerLoot(pending.chestIndex, nextSelectedItemIndices, {
      selectedAction: nextSelectedItemIndices.length > 0 ? 'selected' : 'all',
      focusArea: 'items',
      focusedItemIndex: itemIndex,
    });
    renderSelf();
  }

  function cycleContainerLootAction(direction = 1) {
    const pendingChest = getPendingChest();
    if (!pendingChest) {
      return;
    }

    const state = getState();
    const pending = normalizePendingContainerLoot(state.pendingContainerLoot, pendingChest.chest);
    const enabledActions = getEnabledContainerActions(getChestContents(pendingChest.chest), pending.selectedItemIndices);
    if (!enabledActions.length) {
      return;
    }

    const currentIndex = Math.max(0, enabledActions.indexOf(pending.selectedAction));
    const nextIndex = (currentIndex + direction + enabledActions.length) % enabledActions.length;
    state.pendingContainerLoot = {
      ...pending,
      chestIndex: pendingChest.chestIndex,
      focusArea: 'actions',
      selectedAction: enabledActions[nextIndex],
    };
    renderSelf();
  }

  function moveContainerLootFocus(direction = 1) {
    const pendingChest = getPendingChest();
    if (!pendingChest) {
      return;
    }

    const state = getState();
    const contents = getChestContents(pendingChest.chest);
    const pending = normalizePendingContainerLoot(state.pendingContainerLoot, pendingChest.chest);
    if (!contents.length) {
      state.pendingContainerLoot = {
        ...pending,
        chestIndex: pendingChest.chestIndex,
        focusArea: 'actions',
        selectedAction: 'close',
        focusedItemIndex: null,
      };
      renderSelf();
      return;
    }

    if (pending.focusArea === 'actions') {
      if (direction < 0) {
        state.pendingContainerLoot = {
          ...pending,
          chestIndex: pendingChest.chestIndex,
          focusArea: 'items',
          focusedItemIndex: clampFocusedContainerItemIndex(pending.focusedItemIndex, contents),
        };
        renderSelf();
      }
      return;
    }

    const currentIndex = clampFocusedContainerItemIndex(pending.focusedItemIndex, contents) ?? 0;
    if (direction > 0 && currentIndex >= contents.length - 1) {
      state.pendingContainerLoot = {
        ...pending,
        chestIndex: pendingChest.chestIndex,
        focusArea: 'actions',
      };
      renderSelf();
      return;
    }

    const nextIndex = Math.min(contents.length - 1, Math.max(0, currentIndex + direction));
    state.pendingContainerLoot = {
      ...pending,
      chestIndex: pendingChest.chestIndex,
      focusArea: 'items',
      focusedItemIndex: nextIndex,
    };
    renderSelf();
  }

  function confirmContainerLootFocus() {
    const pendingChest = getPendingChest();
    if (!pendingChest) {
      return false;
    }

    const state = getState();
    const pending = normalizePendingContainerLoot(state.pendingContainerLoot, pendingChest.chest);
    if (pending.focusArea === 'items' && Number.isInteger(pending.focusedItemIndex)) {
      toggleContainerLootSelection(pending.focusedItemIndex);
      return true;
    }

    if (pending.selectedAction === 'selected') {
      return takeSelectedContainerLoot();
    }

    if (pending.selectedAction === 'all') {
      return takeAllContainerLoot();
    }

    closeContainerLoot();
    return true;
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
    cycleContainerLootAction,
    moveContainerLootFocus,
    confirmContainerLootFocus,
    takeSelectedContainerLoot,
    takeAllContainerLoot,
  };
}
