export function createItemsApi(context) {
  const {
  getState,
  getCurrentFloorState,
  getMainHand,
  getOffHand,
  applyItemStatMods,
  cloneWeapon,
  cloneOffHandItem,
  createWeaponPickup,
  createOffHandPickup,
  createFoodPickup,
  formatWeaponStats,
  formatOffHandStats,
  formatRarityLabel,
  addMessage,
  showChoiceModal,
    hideChoiceModal,
    endTurn,
    healPlayer,
    restoreNutrition,
    refreshNutritionState,
    renderSelf,
  } = context;

  function removePotionAt(index) {
    getCurrentFloorState().potions.splice(index, 1);
  }

  function removeWeaponAt(index) {
    getCurrentFloorState().weapons.splice(index, 1);
  }

  function removeOffHandAt(index) {
    getCurrentFloorState().offHands.splice(index, 1);
  }

  function removeChestAt(index) {
    getCurrentFloorState().chests.splice(index, 1);
  }

  function removeFoodAt(index) {
    getCurrentFloorState().foods.splice(index, 1);
  }

  function removeKeyAt(index) {
    getCurrentFloorState().keys.splice(index, 1);
  }

  function getRarityClass(item) {
    return `rarity-${item?.rarity ?? "common"}`;
  }

  function getItemIconUrl(item) {
    if (!item) {
      return null;
    }

    if (item.type === "weapon" && item.id) {
      return `./assets/weapons/${item.id}.svg`;
    }

    if (item.type === "offhand") {
      if (item.id) {
        return `./assets/shields/${item.id}.svg`;
      }
      if (item.icon) {
        return `./assets/shields/${item.icon}.svg`;
      }
    }

    return null;
  }

  function buildCompareIconHtml(item) {
    const iconUrl = getItemIconUrl(item);
    const rarityClass = getRarityClass(item);
    if (!iconUrl) {
      return `<div class="choice-compare-icon ${rarityClass} is-empty" aria-hidden="true"></div>`;
    }

    return `<div class="choice-compare-icon ${rarityClass}" style="background-image: url('${iconUrl}')"></div>`;
  }

  function buildEquipmentCompareHtml(foundItem, equippedItem, typeLabel, statsFormatter) {
    const foundRarity = formatRarityLabel(foundItem.rarity ?? "common");
    const equippedRarity = equippedItem ? formatRarityLabel(equippedItem.rarity ?? "common") : null;
    const foundMods = foundItem.modifiers?.length ? `Mods: ${foundItem.modifiers.map((modifier) => modifier.summary ?? modifier.affix ?? modifier.id).join(", ")}` : "Keine Modifikatoren";
    const equippedMods = equippedItem?.modifiers?.length ? `Mods: ${equippedItem.modifiers.map((modifier) => modifier.summary ?? modifier.affix ?? modifier.id).join(", ")}` : "Keine Modifikatoren";

    return `
      <div class="choice-compare">
        <div class="choice-compare-card ${getRarityClass(foundItem)}">
          <p class="choice-compare-label">Gefundenes ${typeLabel}</p>
          ${buildCompareIconHtml(foundItem)}
          <p class="choice-compare-name">${foundItem.name}</p>
          <p class="choice-rarity ${getRarityClass(foundItem)}">${foundRarity}</p>
          <p class="choice-compare-stats">${statsFormatter(foundItem)}</p>
          <p class="choice-compare-detail">${foundMods}</p>
        </div>
        <div class="choice-compare-card ${equippedItem ? getRarityClass(equippedItem) : "rarity-common"}">
          <p class="choice-compare-label">Derzeit getragen</p>
          ${equippedItem ? buildCompareIconHtml(equippedItem) : '<div class="choice-compare-icon rarity-common is-empty" aria-hidden="true"></div>'}
          <p class="choice-compare-name">${equippedItem ? equippedItem.name : "Leer"}</p>
          <p class="choice-rarity ${equippedItem ? getRarityClass(equippedItem) : "rarity-common"}">${equippedRarity ?? "Nichts ausgeruestet"}</p>
          <p class="choice-compare-stats">${equippedItem ? statsFormatter(equippedItem) : "Kein Gegenstand."}</p>
          <p class="choice-compare-detail">${equippedItem ? equippedMods : "Hier landet die neue Ausrüstung direkt."}</p>
        </div>
      </div>
      <p class="choice-compare-note">Möchtest du direkt ausruesten, ins Inventar legen oder den Fund liegen lassen?</p>
    `;
  }

  function storePotion(index) {
    const state = getState();
    removePotionAt(index);
    state.inventory.push({
      type: "potion",
      name: "Heiltrank",
      description: "Stellt 8 Lebenspunkte wieder her.",
      heal: 8,
    });
    addMessage("Du verstaust den Heiltrank in deinem Inventar.", "important");
  }

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

  function storeWeapon(index) {
    const state = getState();
    const item = getCurrentFloorState().weapons[index].item;
    removeWeaponAt(index);
    state.inventory.push(cloneWeapon(item));
    addMessage(`${item.name} wandert in dein Inventar.`, "important");
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

  function storeOffHand(index) {
    const state = getState();
    const item = getCurrentFloorState().offHands[index].item;
    removeOffHandAt(index);
    state.inventory.push(cloneOffHandItem(item));
    addMessage(`${item.name} wandert in dein Inventar.`, "important");
  }

  function equipWeaponFromGround(index) {
    const item = getCurrentFloorState().weapons[index].item;
    removeWeaponAt(index);
    equipWeapon(item);
  }

  function equipOffHandFromGround(index) {
    const state = getState();
    const item = getCurrentFloorState().offHands[index].item;
    removeOffHandAt(index);
    if (!equipOffHand(item)) {
      state.inventory.push(cloneOffHandItem(item));
      addMessage(`${item.name} landet vorerst in deinem Inventar.`, "important");
    }
  }

  function drinkPotionFromGround(index) {
    const state = getState();
    removePotionAt(index);
    state.safeRestTurns = 0;
    state.consumedPotions = (state.consumedPotions ?? 0) + 1;
    healPlayer(8);
    addMessage("Du trinkst den Heiltrank sofort und fühlst dich besser.", "important");
  }

  function eatFoodFromGround(index) {
    const state = getState();
    const pickup = getCurrentFloorState().foods[index];
    if (!pickup) {
      return;
    }

    removeFoodAt(index);
    state.safeRestTurns = 0;
    state.consumedFoods = (state.consumedFoods ?? 0) + 1;
    const restored = restoreNutrition(pickup.item.nutritionRestore);
    addMessage(`${pickup.item.name} füllt ${restored} Nahrung auf.`, "important");
  }

  function storeFood(index) {
    const state = getState();
    const pickup = getCurrentFloorState().foods[index];
    removeFoodAt(index);
    state.inventory.push({ ...pickup.item });
    addMessage(`${pickup.item.name} wandert in dein Inventar.`, "important");
  }

  function openChest(index) {
    const state = getState();
    const chest = getCurrentFloorState().chests[index];
    if (!chest) {
      return false;
    }

    removeChestAt(index);
    state.openedChests = (state.openedChests ?? 0) + 1;
    addMessage("Du hebelst eine verstaubte Requisitenkiste auf.", "important");

    if (chest.content.type === "potion") {
      getCurrentFloorState().potions.push({
        x: state.player.x,
        y: state.player.y,
        heal: chest.content.item.heal,
      });
      addMessage("Darin klirrt ein Heiltrank gegen morsches Holz.", "important");
      return true;
    }

    if (chest.content.type === "weapon") {
      getCurrentFloorState().weapons.push(createWeaponPickup(chest.content.item, state.player.x, state.player.y));
      addMessage(`${chest.content.item.name} lag zwischen altem Filmkrempel versteckt.`, "important");
      return true;
    }

    if (chest.content.type === "offhand") {
      getCurrentFloorState().offHands.push(createOffHandPickup(chest.content.item, state.player.x, state.player.y));
    addMessage(`${chest.content.item.name} wartet in der aufgesprungenen Requisitenkiste.`, "important");
      return true;
    }

    if (chest.content.type === "food") {
      getCurrentFloorState().foods.push(createFoodPickup(chest.content.item, state.player.x, state.player.y));
    addMessage(`${chest.content.item.name} steckt in der Requisitenkiste zwischen altem Schrott.`, "important");
      return true;
    }

    return false;
  }

  function tryPickupLoot() {
    const state = getState();
    const floorState = getCurrentFloorState();
    const chestIndex = floorState.chests?.findIndex((chest) => chest.x === state.player.x && chest.y === state.player.y) ?? -1;
    if (chestIndex !== -1) {
      openChest(chestIndex);
      renderSelf();
      return tryPickupLoot();
    }

    const potionIndex = floorState.potions.findIndex((potion) => potion.x === state.player.x && potion.y === state.player.y);
    if (potionIndex !== -1) {
      showChoiceModal({
        kind: "potion",
        potionIndex,
        selectedAction: state.preferences.potionAction,
        title: "Heiltrank gefunden",
        text: "Möchtest du den Trank direkt trinken, ins Inventar legen oder vorerst liegen lassen?",
        labels: ["Direkt trinken", "Ins Inventar", "Liegen lassen"],
      });
      renderSelf();
      return true;
    }

    const foodIndex = floorState.foods?.findIndex((food) => food.x === state.player.x && food.y === state.player.y) ?? -1;
    if (foodIndex !== -1) {
      const food = floorState.foods[foodIndex].item;
      showChoiceModal({
        kind: "food",
        foodIndex,
        selectedAction: state.preferences.foodAction,
        title: `${food.name} gefunden`,
        text: `${food.nutritionRestore} Nahrung. Möchtest du sofort essen, einpacken oder es liegen lassen?`,
        labels: ["Jetzt essen", "Ins Inventar", "Liegen lassen"],
      });
      renderSelf();
      return true;
    }

    const keyIndex = floorState.keys?.findIndex((entry) => entry.x === state.player.x && entry.y === state.player.y) ?? -1;
    if (keyIndex !== -1) {
      const keyPickup = floorState.keys[keyIndex];
      removeKeyAt(keyIndex);
      state.inventory.push({ ...keyPickup.item });
      addMessage(`Du steckst den ${keyPickup.item.name} ein.`, "important");
      renderSelf();
      return tryPickupLoot();
    }

    const weaponIndex = floorState.weapons?.findIndex((weapon) => weapon.x === state.player.x && weapon.y === state.player.y) ?? -1;
    if (weaponIndex !== -1) {
      const weapon = floorState.weapons[weaponIndex].item;
      const currentWeapon = getMainHand(state.player);
      showChoiceModal({
        kind: "weapon",
        weaponIndex,
        selectedAction: "equip",
        title: `${weapon.name} gefunden`,
        htmlText: buildEquipmentCompareHtml(weapon, currentWeapon?.id === "bare-hands" ? null : currentWeapon, "Waffe", formatWeaponStats),
        labels: ["Ausrüsten", "Ins Inventar", "Liegen lassen"],
      });
      renderSelf();
      return true;
    }

    const offHandIndex = floorState.offHands?.findIndex((item) => item.x === state.player.x && item.y === state.player.y) ?? -1;
    if (offHandIndex !== -1) {
      const item = floorState.offHands[offHandIndex].item;
      const currentOffHand = getOffHand(state.player);
      showChoiceModal({
        kind: "offhand",
        offHandIndex,
        selectedAction: "equip",
        title: `${item.name} gefunden`,
        htmlText: buildEquipmentCompareHtml(item, currentOffHand, "Schild", formatOffHandStats),
        labels: ["Ausrüsten", "Ins Inventar", "Liegen lassen"],
      });
      renderSelf();
      return true;
    }

    return false;
  }

  function resolvePotionChoice(action) {
    const state = getState();
    if (!state.pendingChoice) {
      return;
    }

    const pending = state.pendingChoice;
    hideChoiceModal();

    if (pending.kind === "potion") {
      if (action === "drink" || action === "store") {
        state.preferences.potionAction = action;
      }

      if (action === "store") {
        storePotion(pending.potionIndex);
        endTurn();
        return;
      }

      if (action === "drink") {
        drinkPotionFromGround(pending.potionIndex);
        endTurn();
        return;
      }
    }

    if (pending.kind === "food") {
      if (action === "eat" || action === "store") {
        state.preferences.foodAction = action;
      }

      if (action === "store") {
        storeFood(pending.foodIndex);
        endTurn();
        return;
      }

      if (action === "eat") {
        eatFoodFromGround(pending.foodIndex);
        endTurn();
        return;
      }
    }

    if (pending.kind === "weapon") {
      if (action === "store") {
        storeWeapon(pending.weaponIndex);
        endTurn();
        return;
      }

      if (action === "equip") {
        equipWeaponFromGround(pending.weaponIndex);
        endTurn();
        return;
      }
    }

    if (pending.kind === "offhand") {
      if (action === "store") {
        storeOffHand(pending.offHandIndex);
        endTurn();
        return;
      }

      if (action === "equip") {
        equipOffHandFromGround(pending.offHandIndex);
        endTurn();
        return;
      }
    }

    addMessage(
      pending.kind === "weapon"
        ? "Du lässt die Waffe vorerst liegen."
        : pending.kind === "offhand"
          ? "Du lässt das Nebenhand-Item vorerst liegen."
          : pending.kind === "food"
            ? "Du lässt das Essen vorerst liegen."
            : "Du lässt den Heiltrank vorerst liegen.",
    );
    renderSelf();
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
    tryPickupLoot,
    equipWeapon,
    canEquipOffHand,
    equipOffHand,
    openChest,
    resolvePotionChoice,
    useInventoryItem,
    quickUsePotion,
    cloneWeapon,
  };
}
