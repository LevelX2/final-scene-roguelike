import { createItemChoiceConfigs } from './item-choice-configs.mjs';
import { createItemChestService } from './item-chest-service.mjs';
import { createItemFloorStateApi } from './item-floor-state.mjs';

export function createItemLootApi(context) {
  const {
    getState,
    getCurrentFloorState,
    getMainHand,
    getOffHand,
    cloneWeapon,
    cloneOffHandItem,
    createWeaponPickup,
    createOffHandPickup,
    createPotionPickup,
    createFoodPickup,
    formatWeaponDisplayName,
    formatWeaponReference,
    formatWeaponStats,
    formatOffHandStats,
    addMessage,
    showChoiceModal,
    hideChoiceModal,
    endTurn,
    restoreNutrition,
    applyHealingConsumableEffect,
    useConsumable,
    renderSelf,
    buildEquipmentCompareModel,
    equipWeapon,
    equipOffHand,
  } = context;

  const floorStateApi = createItemFloorStateApi({
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
  });

  const choiceConfigs = createItemChoiceConfigs({
    getState,
    getMainHand,
    getOffHand,
    formatWeaponDisplayName,
    formatWeaponStats,
    formatOffHandStats,
    buildEquipmentCompareModel,
  });

  const chestService = createItemChestService({
    getState,
    getCurrentFloorState,
    removeChestAt: floorStateApi.removeChestAt,
    spawnChestContentAtPlayer: floorStateApi.spawnChestContentAtPlayer,
    addMessage,
  });

  function equipWeaponFromGround(index) {
    const item = floorStateApi.takeWeaponFromGround(index);
    if (!item) {
      return;
    }

    equipWeapon(item);
  }

  function equipOffHandFromGround(index) {
    const state = getState();
    const item = floorStateApi.takeOffHandFromGround(index);
    if (!item) {
      return;
    }

    if (!equipOffHand(item)) {
      state.inventory.push(cloneOffHandItem(item));
      addMessage(`${item.name} landet vorerst in deinem Inventar.`, 'important');
    }
  }

  function tryPickupLoot() {
    const state = getState();
    const floorState = getCurrentFloorState();
    const chestIndex = floorState.chests?.findIndex((chest) => chest.x === state.player.x && chest.y === state.player.y) ?? -1;
    if (chestIndex !== -1) {
      chestService.openChest(chestIndex);
      renderSelf();
      return tryPickupLoot();
    }

    const consumableIndex = floorState.consumables?.findIndex((entry) => entry.x === state.player.x && entry.y === state.player.y) ?? -1;
    if (consumableIndex !== -1) {
      const item = floorState.consumables[consumableIndex].item;
      showChoiceModal(
        item?.effectFamily
          ? choiceConfigs.buildConsumableChoiceConfig(consumableIndex, item)
          : choiceConfigs.buildPotionChoiceConfig(consumableIndex, item),
      );
      renderSelf();
      return true;
    }

    const foodIndex = floorState.foods?.findIndex((food) => food.x === state.player.x && food.y === state.player.y) ?? -1;
    if (foodIndex !== -1) {
      const food = floorState.foods[foodIndex].item;
      showChoiceModal(choiceConfigs.buildFoodChoiceConfig(foodIndex, food));
      renderSelf();
      return true;
    }

    const keyIndex = floorState.keys?.findIndex((entry) => entry.x === state.player.x && entry.y === state.player.y) ?? -1;
    if (keyIndex !== -1) {
      floorStateApi.pickupKey(keyIndex);
      renderSelf();
      return tryPickupLoot();
    }

    const weaponIndex = floorState.weapons?.findIndex((weapon) => weapon.x === state.player.x && weapon.y === state.player.y) ?? -1;
    if (weaponIndex !== -1) {
      const weapon = floorState.weapons[weaponIndex].item;
      showChoiceModal(choiceConfigs.buildWeaponChoiceConfig(weaponIndex, weapon));
      renderSelf();
      return true;
    }

    const offHandIndex = floorState.offHands?.findIndex((item) => item.x === state.player.x && item.y === state.player.y) ?? -1;
    if (offHandIndex !== -1) {
      const item = floorState.offHands[offHandIndex].item;
      showChoiceModal(choiceConfigs.buildOffHandChoiceConfig(offHandIndex, item));
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

    if (pending.kind === 'healingConsumable') {
      if (action === 'use' || action === 'store') {
        state.preferences.potionAction = action;
      }

      if (action === 'store') {
        floorStateApi.storePotion(pending.potionIndex);
        endTurn();
        return;
      }

      if (action === 'use') {
        if (floorStateApi.drinkPotionFromGround(pending.potionIndex)) {
          endTurn();
        } else {
          renderSelf();
        }
        return;
      }
    }

    if (pending.kind === 'consumable') {
      if (action === 'store') {
        floorStateApi.storePotion(pending.consumableIndex);
        endTurn();
        return;
      }

      if (action === 'use') {
        if (floorStateApi.useConsumableFromGround(pending.consumableIndex)) {
          endTurn();
        } else {
          renderSelf();
        }
        return;
      }
    }

    if (pending.kind === 'food') {
      if (action === 'eat' || action === 'store') {
        state.preferences.foodAction = action;
      }

      if (action === 'store') {
        floorStateApi.storeFood(pending.foodIndex);
        endTurn();
        return;
      }

      if (action === 'eat') {
        floorStateApi.eatFoodFromGround(pending.foodIndex);
        endTurn();
        return;
      }
    }

    if (pending.kind === 'weapon') {
      if (action === 'store') {
        floorStateApi.storeWeapon(pending.weaponIndex);
        endTurn();
        return;
      }

      if (action === 'equip') {
        equipWeaponFromGround(pending.weaponIndex);
        endTurn();
        return;
      }
    }

    if (pending.kind === 'offhand') {
      if (action === 'store') {
        floorStateApi.storeOffHand(pending.offHandIndex);
        endTurn();
        return;
      }

      if (action === 'equip') {
        equipOffHandFromGround(pending.offHandIndex);
        endTurn();
        return;
      }
    }

    const leaveMessage = pending.kind === 'weapon'
      ? 'Du lässt die Waffe vorerst liegen.'
      : pending.kind === 'offhand'
        ? 'Du lässt das Nebenhand-Item vorerst liegen.'
        : pending.kind === 'food'
          ? 'Du lässt das Essen vorerst liegen.'
          : pending.kind === 'consumable'
            ? 'Du lässt das Consumable vorerst liegen.'
            : 'Du lässt das Heil-Consumable vorerst liegen.';
    addMessage(leaveMessage);
    renderSelf();
  }

  return {
    tryPickupLoot,
    openChest: chestService.openChest,
    resolvePotionChoice,
  };
}
