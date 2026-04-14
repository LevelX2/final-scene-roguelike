import { formatStudioOrigin } from '../studio-theme.mjs';

export function createItemUiHelpers(context) {
  const {
    formatRarityLabel,
    formatWeaponDisplayName = (item) => item?.name ?? 'Unbekannt',
    getItemModifierSummary = () => 'Keine Modifikatoren',
  } = context;

  function getItemOriginLabel(item) {
    if (!Number.isFinite(item?.floorNumber)) {
      return null;
    }

    return formatStudioOrigin(item.floorNumber);
  }

  function buildComparisonCard(item, typeLabel, statsFormatter, fallbackLabel = null) {
    if (!item) {
      return {
        item: null,
        label: fallbackLabel ?? "Leer",
        rarityLabel: "Nichts ausgerüstet",
        statsText: "Kein Gegenstand.",
        detailText: "Hier landet die neue Ausrüstung direkt.",
      };
    }

    return {
      item,
      label: typeLabel === "Waffe" ? formatWeaponDisplayName(item) : item.name,
      rarityLabel: formatRarityLabel(item.rarity ?? "common"),
      statsText: statsFormatter(item),
      detailText: [
        getItemOriginLabel(item),
        `Mods: ${getItemModifierSummary(item)}`,
      ].filter(Boolean).join(" | "),
    };
  }

  function buildEquipmentCompareModel(foundItem, equippedItem, typeLabel, statsFormatter) {
    return {
      typeLabel,
      note: "Möchtest du direkt ausrüsten, ins Inventar legen oder den Fund liegen lassen?",
      found: {
        title: `Gefundenes ${typeLabel}`,
        ...buildComparisonCard(foundItem, typeLabel, statsFormatter),
      },
      equipped: {
        title: "Derzeit getragen",
        ...buildComparisonCard(equippedItem, typeLabel, statsFormatter, "Leer"),
      },
    };
  }

  return {
    buildEquipmentCompareModel,
  };
}
