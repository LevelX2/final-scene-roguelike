export function createInventoryStatsApi(context) {
  const { getState } = context;

  function countItemsByType(type) {
    return getState().inventory.filter((item) => item.type === type).length;
  }

  function countPotionsInInventory() {
    return countItemsByType("potion");
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
