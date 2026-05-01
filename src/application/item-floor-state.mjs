import { getFoodOvereatMessage, getFoodSatietyLogLine } from '../nutrition.mjs';
import { normalizeLegacyConsumableItem } from '../content/catalogs/consumables.mjs';
import { getActorDerivedMaxHp } from './derived-actor-stats.mjs';

export function createItemFloorStateApi(context) {
  const {
    getState,
    getCurrentFloorState,
    cloneWeapon,
    cloneOffHandItem,
    formatWeaponReference,
    addMessage,
    restoreNutrition,
    applyHealingConsumableEffect,
    useConsumable,
  } = context;

  function removePotionAt(index) {
    getCurrentFloorState().consumables.splice(index, 1);
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

  function getChestContents(chest) {
    if (!chest) {
      return [];
    }

    if (Array.isArray(chest.contents)) {
      return chest.contents.filter(Boolean);
    }

    return chest.content ? [chest.content] : [];
  }

  function syncChestContents(chest, contents) {
    if (!chest) {
      return;
    }

    chest.contents = contents;
    chest.content = contents[0] ?? null;
  }

  function storePotion(index) {
    const state = getState();
    const pickup = getCurrentFloorState().consumables[index];
    if (!pickup) {
      return;
    }

    removePotionAt(index);
    state.inventory.push({ ...pickup.item });
    addMessage(`${pickup.item.name} wandert in dein Inventar.`, "important");
  }

  function storeWeapon(index) {
    const state = getState();
    const item = getCurrentFloorState().weapons[index]?.item;
    if (!item) {
      return;
    }

    removeWeaponAt(index);
    state.inventory.push(cloneWeapon(item));
    addMessage(`Du packst ${formatWeaponReference(item, { article: "definite", grammaticalCase: "accusative" })} in dein Inventar.`, "important");
  }

  function storeOffHand(index) {
    const state = getState();
    const item = getCurrentFloorState().offHands[index]?.item;
    if (!item) {
      return;
    }

    removeOffHandAt(index);
    state.inventory.push(cloneOffHandItem(item));
    addMessage(`${item.name} wandert in dein Inventar.`, "important");
  }

  function storeFood(index) {
    const state = getState();
    const pickup = getCurrentFloorState().foods[index];
    if (!pickup) {
      return;
    }

    removeFoodAt(index);
    state.inventory.push(normalizeLegacyConsumableItem({ ...pickup.item }));
    addMessage(`${pickup.item.name} wandert in dein Inventar.`, "important");
  }

  function pickupKey(index) {
    const state = getState();
    const keyPickup = getCurrentFloorState().keys[index];
    if (!keyPickup) {
      return false;
    }

    removeKeyAt(index);
    state.inventory.push({ ...keyPickup.item });
    addMessage(`Du steckst den ${keyPickup.item.name} ein.`, "important");
    return true;
  }

  function takeWeaponFromGround(index) {
    const item = getCurrentFloorState().weapons[index]?.item;
    if (!item) {
      return null;
    }

    removeWeaponAt(index);
    return item;
  }

  function takeOffHandFromGround(index) {
    const item = getCurrentFloorState().offHands[index]?.item;
    if (!item) {
      return null;
    }

    removeOffHandAt(index);
    return item;
  }

  function drinkPotionFromGround(index) {
    const state = getState();
    const pickup = getCurrentFloorState().consumables[index];
    if (!pickup) {
      return false;
    }

    if (state.player.hp >= getActorDerivedMaxHp(state.player)) {
      addMessage("Du bist bereits bei voller Gesundheit.");
      return false;
    }

    removePotionAt(index);
    applyHealingConsumableEffect(pickup.item);
    return true;
  }

  function useConsumableFromGround(index) {
    const pickup = getCurrentFloorState().consumables[index];
    if (!pickup) {
      return false;
    }

    removePotionAt(index);
    const used = useConsumable?.(pickup.item);
    if (!used) {
      getCurrentFloorState().consumables.splice(index, 0, pickup);
      return false;
    }
    return true;
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
    const nutritionResult = restoreNutrition(pickup.item.nutritionRestore);
    addMessage(getFoodSatietyLogLine(pickup.item.name, pickup.item.nutritionRestore), "important");
    const overeatMessage = getFoodOvereatMessage(nutritionResult.restoredAmount, pickup.item.nutritionRestore);
    if (overeatMessage) {
      addMessage(overeatMessage, "important");
    }
  }

  function storeContainerItems(chestIndex, itemIndices = []) {
    const state = getState();
    const floorState = getCurrentFloorState();
    const chest = floorState.chests?.[chestIndex];
    if (!chest) {
      return [];
    }

    const contents = getChestContents(chest);
    const uniqueIndices = [...new Set(itemIndices)]
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value >= 0 && value < contents.length)
      .sort((left, right) => right - left);

    if (!uniqueIndices.length) {
      return [];
    }

    const takenEntries = [];
    uniqueIndices.forEach((itemIndex) => {
      const [entry] = contents.splice(itemIndex, 1);
      if (!entry?.item) {
        return;
      }

      if (entry.type === "weapon") {
        state.inventory.push(cloneWeapon(entry.item));
      } else if (entry.type === "offhand") {
        state.inventory.push(cloneOffHandItem(entry.item));
      } else {
        state.inventory.push(normalizeLegacyConsumableItem({ ...entry.item }));
      }

      takenEntries.push(entry);
    });

    syncChestContents(chest, contents);

    return takenEntries.reverse();
  }

  function removeChestIfEmpty(index) {
    const chest = getCurrentFloorState().chests?.[index];
    if (!chest) {
      return false;
    }

    if (getChestContents(chest).length > 0) {
      return false;
    }

    removeChestAt(index);
    return true;
  }

  return {
    removeChestAt,
    removeChestIfEmpty,
    storePotion,
    storeWeapon,
    storeOffHand,
    storeFood,
    pickupKey,
    takeWeaponFromGround,
    takeOffHandFromGround,
    drinkPotionFromGround,
    useConsumableFromGround,
    eatFoodFromGround,
    storeContainerItems,
  };
}
