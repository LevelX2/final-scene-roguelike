import { getFoodSatietyEstimate } from '../nutrition.mjs';

export function createItemChoiceConfigs(context) {
  const {
    getState,
    getMainHand,
    getOffHand,
    formatWeaponDisplayName,
    formatWeaponStats,
    formatOffHandStats,
    buildEquipmentCompareModel,
  } = context;

  function buildPotionChoiceConfig(potionIndex, consumable) {
    const state = getState();
    return {
      kind: "healingConsumable",
      potionIndex,
      selectedAction: state.preferences.potionAction,
      title: `${consumable?.name ?? "Healing-Consumable"} gefunden`,
      text: `${consumable?.description ?? "Schnelle Heilung für einen schlechten Moment."} Möchtest du es sofort benutzen, ins Inventar legen oder es vorerst liegen lassen?`,
      labels: ["Jetzt benutzen", "Ins Inventar", "Liegen lassen"],
    };
  }

  function buildConsumableChoiceConfig(consumableIndex, item) {
    return {
      kind: "consumable",
      consumableIndex,
      selectedAction: "store",
      title: `${item.name} gefunden`,
      text: `${item.description} Möchtest du das Consumable sofort benutzen, ins Inventar legen oder es vorerst liegen lassen?`,
      labels: ["Jetzt benutzen", "Ins Inventar", "Liegen lassen"],
    };
  }

  function buildFoodChoiceConfig(foodIndex, food) {
    const state = getState();
    return {
      kind: "food",
      foodIndex,
      selectedAction: state.preferences.foodAction,
      title: `${food.name} gefunden`,
      text: `${getFoodSatietyEstimate(food.nutritionRestore)} Möchtest du sofort essen, einpacken oder es liegen lassen?`,
      labels: ["Jetzt essen", "Ins Inventar", "Liegen lassen"],
    };
  }

  function buildWeaponChoiceConfig(weaponIndex, weapon) {
    const state = getState();
    const currentWeapon = getMainHand(state.player);
    return {
      kind: "weapon",
      weaponIndex,
      selectedAction: "equip",
      title: `${formatWeaponDisplayName(weapon)} gefunden`,
      comparison: buildEquipmentCompareModel(weapon, currentWeapon?.id === "bare-hands" ? null : currentWeapon, "Waffe", formatWeaponStats),
      labels: ["Ausrüsten", "Ins Inventar", "Liegen lassen"],
    };
  }

  function buildOffHandChoiceConfig(offHandIndex, item) {
    const state = getState();
    const currentOffHand = getOffHand(state.player);
    return {
      kind: "offhand",
      offHandIndex,
      selectedAction: "equip",
      title: `${item.name} gefunden`,
      comparison: buildEquipmentCompareModel(item, currentOffHand, "Schild", formatOffHandStats),
      labels: ["Ausrüsten", "Ins Inventar", "Liegen lassen"],
    };
  }

  return {
    buildPotionChoiceConfig,
    buildConsumableChoiceConfig,
    buildFoodChoiceConfig,
    buildWeaponChoiceConfig,
    buildOffHandChoiceConfig,
  };
}
