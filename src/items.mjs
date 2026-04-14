import { createItemEquipmentApi } from './application/item-equipment.mjs';
import { createItemLootApi } from './application/item-loot.mjs';
import { createItemUiHelpers } from './application/item-ui-helpers.mjs';

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
    formatWeaponDisplayName,
    formatWeaponReference,
    formatWeaponStats,
    formatOffHandStats,
    formatRarityLabel,
    getItemModifierSummary,
    addMessage,
    showChoiceModal,
    hideChoiceModal,
    endTurn,
    healPlayer,
    restoreNutrition,
    refreshNutritionState,
    renderSelf,
  } = context;

  const { buildEquipmentCompareModel } = createItemUiHelpers({
    formatRarityLabel,
    formatWeaponDisplayName,
    getItemModifierSummary,
  });

  const equipmentApi = createItemEquipmentApi({
    getState,
    getMainHand,
    applyItemStatMods,
    cloneWeapon,
    cloneOffHandItem,
    formatWeaponReference,
    addMessage,
    endTurn,
    healPlayer,
    restoreNutrition,
    refreshNutritionState,
    renderSelf,
  });

  const lootApi = createItemLootApi({
    getState,
    getCurrentFloorState,
    getMainHand,
    getOffHand,
    cloneWeapon,
    cloneOffHandItem,
    createWeaponPickup,
    createOffHandPickup,
    createFoodPickup,
    formatWeaponDisplayName,
    formatWeaponReference,
    formatWeaponStats,
    formatOffHandStats,
    addMessage,
    showChoiceModal,
    hideChoiceModal,
    endTurn,
    healPlayer,
    restoreNutrition,
    renderSelf,
    buildEquipmentCompareModel,
    equipWeapon: equipmentApi.equipWeapon,
    equipOffHand: equipmentApi.equipOffHand,
  });

  return {
    tryPickupLoot: lootApi.tryPickupLoot,
    equipWeapon: equipmentApi.equipWeapon,
    canEquipOffHand: equipmentApi.canEquipOffHand,
    equipOffHand: equipmentApi.equipOffHand,
    openChest: lootApi.openChest,
    resolvePotionChoice: lootApi.resolvePotionChoice,
    useInventoryItem: equipmentApi.useInventoryItem,
    quickUsePotion: equipmentApi.quickUsePotion,
    cloneWeapon,
  };
}
