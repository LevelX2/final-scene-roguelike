import { getFoodOvereatMessage, getFoodSatietyEstimate } from '../nutrition.mjs';
import { isFoodConsumable, isHealingConsumable } from '../content/catalogs/consumables.mjs';
import { getActorDerivedMaxHp } from './derived-actor-stats.mjs';

export function createItemFloorStateApi(context) {
  const {
    getState,
    getCurrentFloorState,
    cloneWeapon,
    cloneOffHandItem,
    createWeaponPickup,
    createOffHandPickup,
    createPotionPickup,
    createFoodPickup,
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
    state.inventory.push({ ...pickup.item });
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
    addMessage(`${pickup.item.name} wirkt so, als ${getFoodSatietyEstimate(pickup.item.nutritionRestore).toLowerCase()}`, "important");
    const overeatMessage = getFoodOvereatMessage(nutritionResult.restoredAmount, pickup.item.nutritionRestore);
    if (overeatMessage) {
      addMessage(overeatMessage, "important");
    }
  }

  function spawnChestContentAtPlayer(content, containerName = 'Requisitenkiste') {
    const state = getState();
    const floorState = getCurrentFloorState();
    if (!content) {
      return false;
    }

    if (content.type === "healingConsumable" || content.type === "consumable" || isHealingConsumable(content.item)) {
      floorState.consumables.push(createPotionPickup(content.item, state.player.x, state.player.y));
      addMessage(`In der ${containerName} wartet ${content.item.name}.`, "important");
      return true;
    }

    if (content.type === "weapon") {
      floorState.weapons.push(createWeaponPickup(content.item, state.player.x, state.player.y));
      addMessage(`In der ${containerName} lag ${formatWeaponReference(content.item, { article: "definite", grammaticalCase: "nominative" })} verborgen.`, "important");
      return true;
    }

    if (content.type === "offhand") {
      floorState.offHands.push(createOffHandPickup(content.item, state.player.x, state.player.y));
      addMessage(`${content.item.name} wartet in der ${containerName}.`, "important");
      return true;
    }

    if (content.type === "food" || isFoodConsumable(content.item)) {
      floorState.foods.push(createFoodPickup(content.item, state.player.x, state.player.y));
      addMessage(`${content.item.name} steckt in der ${containerName} zwischen altem Schrott.`, "important");
      return true;
    }

    return false;
  }

  return {
    removeChestAt,
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
    spawnChestContentAtPlayer,
  };
}
