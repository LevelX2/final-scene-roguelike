export function createItemChoiceConfigs(context) {
  const {
    getState,
    getMainHand,
    getOffHand,
    formatWeaponStats,
    formatOffHandStats,
    buildEquipmentCompareHtml,
  } = context;

  function buildPotionChoiceConfig(potionIndex) {
    const state = getState();
    return {
      kind: "potion",
      potionIndex,
      selectedAction: state.preferences.potionAction,
      title: "Heiltrank gefunden",
      text: "Möchtest du den Trank direkt trinken, ins Inventar legen oder vorerst liegen lassen?",
      labels: ["Direkt trinken", "Ins Inventar", "Liegen lassen"],
    };
  }

  function buildFoodChoiceConfig(foodIndex, food) {
    const state = getState();
    return {
      kind: "food",
      foodIndex,
      selectedAction: state.preferences.foodAction,
      title: `${food.name} gefunden`,
      text: `${food.nutritionRestore} Nahrung. Möchtest du sofort essen, einpacken oder es liegen lassen?`,
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
      title: `${weapon.name} gefunden`,
      htmlText: buildEquipmentCompareHtml(weapon, currentWeapon?.id === "bare-hands" ? null : currentWeapon, "Waffe", formatWeaponStats),
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
      htmlText: buildEquipmentCompareHtml(item, currentOffHand, "Schild", formatOffHandStats),
      labels: ["Ausrüsten", "Ins Inventar", "Liegen lassen"],
    };
  }

  return {
    buildPotionChoiceConfig,
    buildFoodChoiceConfig,
    buildWeaponChoiceConfig,
    buildOffHandChoiceConfig,
  };
}
