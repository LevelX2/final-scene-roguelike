export function createItemEquipmentApi(context) {
  const {
    getState,
    getMainHand,
    applyItemStatMods,
    cloneWeapon,
    cloneOffHandItem,
    addMessage,
    endTurn,
    healPlayer,
    restoreNutrition,
    refreshNutritionState,
    renderSelf,
  } = context;

  function equipWeapon(item) {
    const state = getState();
    const nextWeapon = cloneWeapon(item);
    const previousMainHand = cloneWeapon(state.player.mainHand);
    const previousOffHand = cloneOffHandItem(state.player.offHand);

    state.player.mainHand = nextWeapon;
    if (nextWeapon.handedness === "two-handed" && previousOffHand) {
      applyItemStatMods(state.player, previousOffHand, -1);
      state.inventory.push(previousOffHand);
      state.player.offHand = null;
      refreshNutritionState(state.player.hungerState);
      addMessage(`${nextWeapon.name} braucht beide Haende. ${previousOffHand.name} wandert ins Inventar.`);
    }

    addMessage(`Du führst jetzt ${nextWeapon.name}.`, "important");
    if (previousMainHand && previousMainHand.id !== "bare-hands") {
      state.inventory.push(previousMainHand);
    }
  }

  function canEquipOffHand(item, entity = getState().player) {
    return getMainHand(entity).handedness !== "two-handed";
  }

  function equipOffHand(item) {
    const state = getState();
    if (!canEquipOffHand(item)) {
      addMessage("Mit einer zweihändigen Waffe ist deine Nebenhand blockiert.");
      renderSelf();
      return false;
    }

    const nextItem = cloneOffHandItem(item);
    const previous = cloneOffHandItem(state.player.offHand);
    if (previous) {
      applyItemStatMods(state.player, previous, -1);
    }

    state.player.offHand = nextItem;
    applyItemStatMods(state.player, nextItem, 1);
    refreshNutritionState(state.player.hungerState);
    addMessage(`Du nimmst jetzt ${nextItem.name} in die Nebenhand.`, "important");
    if (previous) {
      state.inventory.push(previous);
    }
    return true;
  }

  function useInventoryItem(index) {
    const state = getState();
    if (state.gameOver || state.pendingChoice || state.pendingStairChoice) {
      return;
    }

    const item = state.inventory[index];
    if (!item) {
      return;
    }

    if (item.type === "potion") {
      if (state.player.hp === state.player.maxHp) {
        addMessage("Du bist bereits bei voller Gesundheit.");
        renderSelf();
        return;
      }

      state.inventory.splice(index, 1);
      state.safeRestTurns = 0;
      state.consumedPotions = (state.consumedPotions ?? 0) + 1;
      healPlayer(item.heal);
      addMessage("Du trinkst einen Heiltrank aus dem Inventar.", "important");
      endTurn();
      return;
    }

    if (item.type === "weapon") {
      state.inventory.splice(index, 1);
      equipWeapon(item);
      endTurn();
      return;
    }

    if (item.type === "offhand") {
      state.inventory.splice(index, 1);
      if (!equipOffHand(item)) {
        state.inventory.splice(index, 0, cloneOffHandItem(item));
        renderSelf();
        return;
      }
      endTurn();
      return;
    }

    if (item.type === "key") {
      addMessage(`${item.name} passt nur zu passenden Farbtüren in Studio ${item.keyFloor ?? "?"} und wird beim Öffnen verbraucht.`, "important");
      renderSelf();
      return;
    }

    if (item.type === "food") {
      state.inventory.splice(index, 1);
      state.consumedFoods = (state.consumedFoods ?? 0) + 1;
      const restored = restoreNutrition(item.nutritionRestore);
      addMessage(`${item.name} füllt ${restored} Nahrung auf.`, "important");
      endTurn();
    }
  }

  function quickUsePotion() {
    const state = getState();
    if (state.gameOver || state.pendingChoice || state.pendingStairChoice || state.modals.inventoryOpen) {
      return;
    }

    const potionIndex = state.inventory.findIndex((item) => item.type === "potion");
    if (potionIndex === -1) {
      addMessage("Du hast keinen Heiltrank im Inventar.");
      renderSelf();
      return;
    }

    useInventoryItem(potionIndex);
  }

  return {
    equipWeapon,
    canEquipOffHand,
    equipOffHand,
    useInventoryItem,
    quickUsePotion,
  };
}
