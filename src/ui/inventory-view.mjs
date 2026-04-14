import { formatStudioOrigin } from '../studio-theme.mjs';
import { getFoodSatietyEstimate } from '../nutrition.mjs';

export function createInventoryView(context) {
  const {
    inventoryListElement,
    inventoryFilterButtons = [],
    getState,
    formatWeaponDisplayName,
    formatWeaponStats,
    formatOffHandStats,
    formatRarityLabel,
    getItemModifierSummary,
    useInventoryItem,
    getItemRarityClass,
    getInventoryIconAssetUrl,
  } = context;

  function getInventoryItemIcon(item) {
    if (item.type === "weapon") {
      return item.handedness === "two-handed" ? "2H" : "1H";
    }

    if (item.type === "offhand") {
      return "[]";
    }

    if (item.type === "potion") {
      return "!";
    }

    if (item.type === "key") {
      return "K";
    }

    if (item.type === "food") {
      return "Fd";
    }

    return "?";
  }

  function getInventoryItemTypeOrder(item) {
    const order = {
      weapon: 0,
      offhand: 1,
      potion: 2,
      food: 3,
      key: 4,
    };
    return order[item?.type] ?? 99;
  }

  function getInventorySectionLabel(type) {
    const labels = {
      weapon: "Waffen",
      offhand: "Schilde",
      potion: "Tränke",
      food: "Essen",
      key: "Schlüssel",
    };
    return labels[type] ?? "Sonstiges";
  }

  function applyInventoryIcon(iconElement, item) {
    if (!iconElement) {
      return;
    }

    const iconUrl = getInventoryIconAssetUrl(item);
    if (!iconUrl) {
      return;
    }

    iconElement.textContent = "";
    iconElement.style.backgroundImage = `url("${iconUrl}")`;
    iconElement.style.backgroundRepeat = "no-repeat";
    iconElement.style.backgroundPosition = "center";
    iconElement.style.backgroundSize = "28px 28px";
    iconElement.style.color = "transparent";
  }

  function serializeWeaponEffects(item) {
    return (item.effects ?? [])
      .map((effect) => [
        effect.type ?? "",
        effect.trigger ?? "",
        effect.tier ?? "",
        effect.source ?? "",
        effect.value ?? "",
        effect.procChance ?? "",
        effect.duration ?? "",
        effect.dotDamage ?? "",
        effect.penalty ?? "",
      ].join(":"))
      .join("|");
  }

  function serializeWeaponNumericMods(item) {
    return (item.numericMods ?? [])
      .map((modifier) => [
        modifier.id ?? "",
        modifier.stat ?? "",
        modifier.amount ?? "",
        modifier.label ?? "",
        modifier.namePrefix ?? "",
        modifier.nameSuffix ?? "",
      ].join(":"))
      .join("|");
  }

  function serializeShieldModifiers(item) {
    return (item.modifiers ?? [])
      .map((modifier) => [
        modifier.id ?? "",
        modifier.affix ?? "",
        modifier.summary ?? "",
      ].join(":"))
      .join("|");
  }

  function buildInventoryGroupKey(item) {
    if (item.type === "weapon") {
      return [
        item.type,
        item.id ?? "",
        item.name ?? "",
        item.rarity ?? "common",
        (item.modifierIds ?? []).join(","),
        item.damage ?? "",
        item.hitBonus ?? "",
        item.critBonus ?? "",
        item.range ?? "",
        item.meleePenaltyHit ?? "",
        item.lightBonus ?? "",
        item.attackMode ?? "",
        item.handedness ?? "",
        serializeWeaponNumericMods(item),
        serializeWeaponEffects(item),
      ].join(":");
    }

    if (item.type === "offhand") {
      return [
        item.type,
        item.id ?? "",
        item.name ?? "",
        item.rarity ?? "common",
        (item.modifierIds ?? []).join(","),
        item.blockChance ?? "",
        item.blockValue ?? "",
        serializeShieldModifiers(item),
      ].join(":");
    }

    if (item.type === "food") {
      return `${item.type}:${item.id}:${item.nutritionRestore}`;
    }

    return `${item.type}:${item.name}`;
  }

  function getItemOriginLabel(item) {
    if (!Number.isFinite(item?.floorNumber)) {
      return null;
    }

    return formatStudioOrigin(item.floorNumber);
  }

  function renderInventory() {
    const state = getState();
    inventoryListElement.innerHTML = "";
    inventoryFilterButtons.forEach((button) => {
      button.classList.toggle("active", (button.dataset.filter ?? "all") === (state.preferences.inventoryFilter ?? "all"));
    });

    if (state.inventory.length === 0) {
      inventoryListElement.innerHTML = `<div class="inventory-empty">Kein Gegenstand im Inventar.</div>`;
      return;
    }

    const groupedItems = [];
    const groupMap = new Map();

    state.inventory.forEach((item, index) => {
      const key = buildInventoryGroupKey(item);

      if (!groupMap.has(key)) {
        const group = {
          item,
          firstIndex: index,
          count: 1,
        };
        groupMap.set(key, group);
        groupedItems.push(group);
        return;
      }

      groupMap.get(key).count += 1;
    });

    const inventoryFilter = state.preferences.inventoryFilter ?? "all";
    const visibleGroups = groupedItems
      .filter(({ item }) => inventoryFilter === "all" || item.type === inventoryFilter)
      .sort((left, right) =>
        getInventoryItemTypeOrder(left.item) - getInventoryItemTypeOrder(right.item) ||
        (left.item.type === "weapon" ? formatWeaponDisplayName(left.item) : left.item.name).localeCompare(
          right.item.type === "weapon" ? formatWeaponDisplayName(right.item) : right.item.name,
          "de",
        )
      );

    if (visibleGroups.length === 0) {
      inventoryListElement.innerHTML = `<div class="inventory-empty">Keine Gegenstände in diesem Filter.</div>`;
      return;
    }

    let currentSectionType = null;
    visibleGroups.forEach(({ item, firstIndex, count }) => {
      if (item.type !== currentSectionType) {
        currentSectionType = item.type;
        const sectionHeading = document.createElement("div");
        sectionHeading.className = "inventory-section-title";
        sectionHeading.textContent = getInventorySectionLabel(item.type);
        inventoryListElement.appendChild(sectionHeading);
      }

      const statsLine = item.type === "weapon"
        ? formatWeaponStats(item)
        : item.type === "offhand"
          ? formatOffHandStats(item)
          : null;
      const originLine = getItemOriginLabel(item);
      const detailLine = item.type === "weapon"
        ? [
            formatRarityLabel(item.rarity ?? "common"),
            item.source,
            originLine,
            `Mods: ${getItemModifierSummary(item)}`,
            `${item.attackMode === "ranged" && (item.range ?? 1) > 1 ? `Fernkampf ${item.range}` : "Nahkampf"}${(item.meleePenaltyHit ?? 0) < 0 ? ` | Nahkampf ${item.meleePenaltyHit}` : ""}${(item.lightBonus ?? 0) > 0 ? ` | Licht +${item.lightBonus}` : ""}`,
            item.description,
          ].filter(Boolean).join(" | ")
        : item.type === "offhand"
          ? [
              formatRarityLabel(item.rarity ?? "common"),
              item.source,
              originLine,
              item.modifiers?.length ? `Mods: ${getItemModifierSummary(item)}` : null,
              item.description,
            ].filter(Boolean).join(" | ")
          : item.type === "key"
            ? item.description
            : item.type === "food"
              ? `${getFoodSatietyEstimate(item.nutritionRestore)} | ${item.description}`
              : item.description;

      const wrapper = document.createElement("div");
      wrapper.className = "inventory-item";
      wrapper.innerHTML = `
        <div class="inventory-icon inventory-icon-${item.type} ${getItemRarityClass(item)}" aria-hidden="true">${getInventoryItemIcon(item)}</div>
        <div class="inventory-meta">
          <strong>${item.type === "weapon" ? formatWeaponDisplayName(item) : item.name}${count > 1 ? ` x${count}` : ""}</strong>
          ${statsLine ? `<span>${statsLine}</span>` : ""}
          <span>${detailLine}</span>
        </div>
      `;

      const iconElement = wrapper.querySelector(".inventory-icon");
      applyInventoryIcon(iconElement, item);

      const button = document.createElement("button");
      button.className = "item-btn";
      button.type = "button";
      button.textContent = "Benutzen";
      button.addEventListener("click", () => useInventoryItem(firstIndex));
      wrapper.appendChild(button);
      inventoryListElement.appendChild(wrapper);
    });
  }

  return {
    renderInventory,
  };
}
