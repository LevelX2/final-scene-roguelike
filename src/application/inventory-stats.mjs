import { isFoodConsumable, isHealingConsumable } from '../content/catalogs/consumables.mjs';

export function createInventoryStatsApi(context) {
  const { getState } = context;

  function countItemsByType(type) {
    if (type === "potion") {
      return getState().inventory.filter((item) => isHealingConsumable(item)).length;
    }

    if (type === "food") {
      return getState().inventory.filter((item) => isFoodConsumable(item)).length;
    }

    return getState().inventory.filter((item) => item.type === type).length;
  }

  function countPotionsInInventory() {
    return getState().inventory.filter((item) => isHealingConsumable(item)).length;
  }

  function countFoodInInventory() {
    return countItemsByType("food");
  }

  return {
    countItemsByType,
    countPotionsInInventory,
    countFoodInInventory,
  };
}
