import { getFoodOvereatMessage, getFoodSatietyEstimate } from '../nutrition.mjs';
import {
  HEALING_FAMILY_ORDER,
  getHealingFamily,
  getHealingOverlayLabel,
  isFoodConsumable,
  isHealingConsumable,
} from '../content/catalogs/consumables.mjs';
import { getActorDerivedMaxHp } from './derived-actor-stats.mjs';

function getRandomArrayEntry(entries, randomChance) {
  if (!Array.isArray(entries) || entries.length === 0) {
    return null;
  }

  const roll = typeof randomChance === 'function' ? randomChance() : Math.random();
  const index = Math.max(0, Math.min(entries.length - 1, Math.floor(roll * entries.length)));
  return entries[index] ?? entries[0];
}

export function createItemEquipmentApi(context) {
  const {
    getState,
    getMainHand,
    cloneWeapon,
    cloneOffHandItem,
    formatWeaponReference,
    addMessage,
    endTurn,
    healPlayer,
    restoreNutrition,
    refreshNutritionState,
    renderSelf,
    applyStatusEffect,
    useConsumable,
    randomChance = Math.random,
  } = context;

  function getHealingOverlayState() {
    const state = getState();
    state.healOverlay ??= {
      open: false,
      selectedFamilyId: null,
    };
    return state.healOverlay;
  }

  function getHealingInventoryEntries() {
    return getState().inventory
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => isHealingConsumable(item));
  }

  function getHealingConsumableGroups() {
    const groupsByFamily = new Map();

    getHealingInventoryEntries().forEach(({ item, index }) => {
      const familyId = item.familyId ?? item.id;
      if (!groupsByFamily.has(familyId)) {
        groupsByFamily.set(familyId, {
          familyId,
          item,
          count: 0,
          indexes: [],
          family: getHealingFamily(familyId),
        });
      }

      const group = groupsByFamily.get(familyId);
      group.count += 1;
      group.indexes.push(index);
    });

    return [...groupsByFamily.values()].sort((left, right) => {
      const leftOrder = HEALING_FAMILY_ORDER.indexOf(left.familyId);
      const rightOrder = HEALING_FAMILY_ORDER.indexOf(right.familyId);
      return (leftOrder === -1 ? 999 : leftOrder) - (rightOrder === -1 ? 999 : rightOrder);
    });
  }

  function syncHealingOverlaySelection() {
    const overlay = getHealingOverlayState();
    const groups = getHealingConsumableGroups();
    if (groups.length === 0) {
      overlay.selectedFamilyId = null;
      overlay.open = false;
      return groups;
    }

    if (!groups.some((group) => group.familyId === overlay.selectedFamilyId)) {
      overlay.selectedFamilyId = groups[0].familyId;
    }

    return groups;
  }

  function closeHealingOverlay() {
    const overlay = getHealingOverlayState();
    overlay.open = false;
    renderSelf();
  }

  function selectHealingOverlayFamily(familyId, { render = true } = {}) {
    const overlay = getHealingOverlayState();
    overlay.selectedFamilyId = familyId;
    syncHealingOverlaySelection();
    if (render) {
      renderSelf();
    }
  }

  function openHealingOverlay() {
    const state = getState();
    if (state.gameOver || state.pendingChoice || state.pendingStairChoice || state.modals.inventoryOpen) {
      return false;
    }

    const overlay = getHealingOverlayState();
    const groups = syncHealingOverlaySelection();
    if (groups.length === 0) {
      addMessage("Du hast keine Heilgegenstände im Inventar.");
      renderSelf();
      return false;
    }

    overlay.open = true;
    renderSelf();
    return true;
  }

  function toggleHealingOverlay() {
    const overlay = getHealingOverlayState();
    if (overlay.open) {
      closeHealingOverlay();
      renderSelf();
      return false;
    }

    return openHealingOverlay();
  }

  function cycleHealingOverlay(direction) {
    const overlay = getHealingOverlayState();
    if (!overlay.open) {
      return;
    }

    const groups = syncHealingOverlaySelection();
    if (groups.length <= 1) {
      renderSelf();
      return;
    }

    const currentIndex = groups.findIndex((group) => group.familyId === overlay.selectedFamilyId);
    const nextIndex = (Math.max(0, currentIndex) + direction + groups.length) % groups.length;
    overlay.selectedFamilyId = groups[nextIndex].familyId;
    renderSelf();
  }

  function buildHealingUseMessage(item) {
    return getRandomArrayEntry(item.useLogLines, randomChance)
      ?? `${getHealingOverlayLabel(item)} bringt dich wieder auf die Beine.`;
  }

  function applyHealingConsumableEffect(item) {
    const state = getState();
    const family = getHealingFamily(item.familyId);
    if (!family) {
      return false;
    }

    state.safeRestTurns = 0;
    state.consumedPotions = (state.consumedPotions ?? 0) + 1;
    state.consumedHealingConsumables = (state.consumedHealingConsumables ?? 0) + 1;

    if (family.healType === 'regen') {
      applyStatusEffect?.(state.player, {
        type: 'healing_over_time',
        duration: item.durationTurns ?? family.durationTurns ?? 0,
        healPerTurn: item.healPerTurn ?? family.healPerTurn ?? 0,
        sourceName: item.displayName ?? item.name ?? family.baseNameDe,
      });
      addMessage(buildHealingUseMessage(item), 'important');
      return true;
    }

    healPlayer(item.heal ?? family.healAmount ?? 0);
    addMessage(buildHealingUseMessage(item), 'important');
    return true;
  }

  function equipWeapon(item) {
    const state = getState();
    const nextWeapon = cloneWeapon(item);
    const previousMainHand = cloneWeapon(state.player.mainHand);
    const previousOffHand = cloneOffHandItem(state.player.offHand);

    state.player.mainHand = nextWeapon;
    if (nextWeapon.handedness === "two-handed" && previousOffHand) {
      state.inventory.push(previousOffHand);
      state.player.offHand = null;
      refreshNutritionState(state.player.hungerState);
      addMessage(`Mit ${formatWeaponReference(nextWeapon, { article: "definite", grammaticalCase: "dative" })} sind beide Haende belegt. ${previousOffHand.name} wandert ins Inventar.`);
    }

    addMessage(`Du führst jetzt ${formatWeaponReference(nextWeapon, { article: "definite", grammaticalCase: "accusative" })}.`, "important");
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

    state.player.offHand = nextItem;
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

    if (isHealingConsumable(item)) {
      if (state.player.hp >= getActorDerivedMaxHp(state.player)) {
        addMessage("Du bist bereits bei voller Gesundheit.");
        renderSelf();
        return;
      }

      state.inventory.splice(index, 1);
      applyHealingConsumableEffect(item);
      getHealingOverlayState().open = false;
      syncHealingOverlaySelection();
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
      addMessage(`${item.name} passt nur zu passenden Farbtueren in Studio ${item.keyFloor ?? "?"} und wird beim Oeffnen verbraucht.`, "important");
      renderSelf();
      return;
    }

    if (item.type === "consumable") {
      const used = useConsumable?.(item);
      if (!used) {
        renderSelf();
        return;
      }
      state.inventory.splice(index, 1);
      endTurn();
      return;
    }

    if (isFoodConsumable(item)) {
      state.inventory.splice(index, 1);
      state.consumedFoods = (state.consumedFoods ?? 0) + 1;
      const nutritionResult = restoreNutrition(item.nutritionRestore);
      addMessage(`${item.name} wirkt so, als ${getFoodSatietyEstimate(item.nutritionRestore).toLowerCase()}`, "important");
      const overeatMessage = getFoodOvereatMessage(nutritionResult.restoredAmount, item.nutritionRestore);
      if (overeatMessage) {
        addMessage(overeatMessage, "important");
      }
      endTurn();
    }
  }

  function useHealingConsumableByFamily(familyId) {
    const groups = syncHealingOverlaySelection();
    const group = groups.find((entry) => entry.familyId === familyId);
    if (!group) {
      renderSelf();
      return false;
    }

    useInventoryItem(group.indexes[0]);
    return true;
  }

  function useSelectedHealingConsumable() {
    const overlay = getHealingOverlayState();
    if (!overlay.open) {
      return false;
    }

    return useHealingConsumableByFamily(overlay.selectedFamilyId);
  }

  function quickUsePotion() {
    toggleHealingOverlay();
  }

  return {
    equipWeapon,
    canEquipOffHand,
    equipOffHand,
    applyHealingConsumableEffect,
    useInventoryItem,
    quickUsePotion,
    getHealingConsumableGroups,
    getHealingOverlayState,
    openHealingOverlay,
    closeHealingOverlay,
    toggleHealingOverlay,
    cycleHealingOverlay,
    selectHealingOverlayFamily,
    useSelectedHealingConsumable,
    useHealingConsumableByFamily,
  };
}
