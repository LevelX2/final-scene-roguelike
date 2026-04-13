export function createItemUiHelpers(context) {
  const { formatRarityLabel, formatWeaponDisplayName = (item) => item?.name ?? 'Unbekannt' } = context;

  function getRarityClass(item) {
    return `rarity-${item?.rarity ?? "common"}`;
  }

  function getItemIconUrl(item) {
    if (!item) {
      return null;
    }

    if (item.type === "weapon" && item.id) {
      return `./assets/weapons/${item.id}.svg`;
    }

    if (item.type === "offhand") {
      if (item.id) {
        return `./assets/shields/${item.id}.svg`;
      }

      if (item.icon) {
        return `./assets/shields/${item.icon}.svg`;
      }
    }

    return null;
  }

  function buildCompareIconHtml(item) {
    const iconUrl = getItemIconUrl(item);
    const rarityClass = getRarityClass(item);
    if (!iconUrl) {
      return `<div class="choice-compare-icon ${rarityClass} is-empty" aria-hidden="true"></div>`;
    }

    return `<div class="choice-compare-icon ${rarityClass}" style="background-image: url('${iconUrl}')"></div>`;
  }

  function buildEquipmentCompareHtml(foundItem, equippedItem, typeLabel, statsFormatter) {
    const foundRarity = formatRarityLabel(foundItem.rarity ?? "common");
    const equippedRarity = equippedItem ? formatRarityLabel(equippedItem.rarity ?? "common") : null;
    const foundMods = foundItem.modifiers?.length
      ? `Mods: ${foundItem.modifiers.map((modifier) => modifier.summary ?? modifier.affix ?? modifier.id).join(", ")}`
      : "Keine Modifikatoren";
    const equippedMods = equippedItem?.modifiers?.length
      ? `Mods: ${equippedItem.modifiers.map((modifier) => modifier.summary ?? modifier.affix ?? modifier.id).join(", ")}`
      : "Keine Modifikatoren";

    return `
      <div class="choice-compare">
        <div class="choice-compare-card ${getRarityClass(foundItem)}">
          <p class="choice-compare-label">Gefundenes ${typeLabel}</p>
          ${buildCompareIconHtml(foundItem)}
          <p class="choice-compare-name">${typeLabel === "Waffe" ? formatWeaponDisplayName(foundItem) : foundItem.name}</p>
          <p class="choice-rarity ${getRarityClass(foundItem)}">${foundRarity}</p>
          <p class="choice-compare-stats">${statsFormatter(foundItem)}</p>
          <p class="choice-compare-detail">${foundMods}</p>
        </div>
        <div class="choice-compare-card ${equippedItem ? getRarityClass(equippedItem) : "rarity-common"}">
          <p class="choice-compare-label">Derzeit getragen</p>
          ${equippedItem ? buildCompareIconHtml(equippedItem) : '<div class="choice-compare-icon rarity-common is-empty" aria-hidden="true"></div>'}
          <p class="choice-compare-name">${equippedItem ? (typeLabel === "Waffe" ? formatWeaponDisplayName(equippedItem) : equippedItem.name) : "Leer"}</p>
          <p class="choice-rarity ${equippedItem ? getRarityClass(equippedItem) : "rarity-common"}">${equippedRarity ?? "Nichts ausgerüstet"}</p>
          <p class="choice-compare-stats">${equippedItem ? statsFormatter(equippedItem) : "Kein Gegenstand."}</p>
          <p class="choice-compare-detail">${equippedItem ? equippedMods : "Hier landet die neue Ausrüstung direkt."}</p>
        </div>
      </div>
      <p class="choice-compare-note">Möchtest du direkt ausrüsten, ins Inventar legen oder den Fund liegen lassen?</p>
    `;
  }

  return {
    buildEquipmentCompareHtml,
  };
}
