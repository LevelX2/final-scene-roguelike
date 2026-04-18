import { createHealingConsumableDefinition, normalizeFoodConsumable } from './content/catalogs/consumables.mjs';

export const ITEM_DEFS = {
  "healing-potion": createHealingConsumableDefinition("heal_set_medkit_standard", {
    id: "healing-potion",
    iconAssetPath: "./assets/consumables/potion.svg",
  }),
  heal_bandage_small: createHealingConsumableDefinition("heal_bandage_small", {
    iconAssetPath: "./assets/consumables/potion.svg",
  }),
  heal_set_medkit_standard: createHealingConsumableDefinition("heal_set_medkit_standard", {
    iconAssetPath: "./assets/consumables/potion.svg",
  }),
  heal_stunt_emergency_kit: createHealingConsumableDefinition("heal_stunt_emergency_kit", {
    iconAssetPath: "./assets/consumables/potion.svg",
  }),
  heal_cool_gel_pack: createHealingConsumableDefinition("heal_cool_gel_pack", {
    iconAssetPath: "./assets/consumables/potion.svg",
  }),
  heal_recovery_inhaler: createHealingConsumableDefinition("heal_recovery_inhaler", {
    iconAssetPath: "./assets/consumables/potion.svg",
  }),
  candy: normalizeFoodConsumable({
    id: "candy",
    type: "food",
    name: "Süßigkeit",
    icon: "candy",
    nutritionRestore: 15,
    description: "Kurz Zucker, wenig Sättigung.",
  }),
  chips: normalizeFoodConsumable({
    id: "chips",
    type: "food",
    name: "Chips",
    icon: "chips",
    nutritionRestore: 30,
    description: "Salzig, laut, erstaunlich hilfreich.",
  }),
  popcorn: normalizeFoodConsumable({
    id: "popcorn",
    type: "food",
    name: "Popcorn",
    icon: "popcorn",
    nutritionRestore: 50,
    description: "Passt erschreckend gut in dieses Setting.",
  }),
  softdrink: normalizeFoodConsumable({
    id: "softdrink",
    type: "food",
    name: "Softdrink",
    icon: "softdrink",
    nutritionRestore: 60,
    description: "Zucker und Koffein in fragwürdiger Balance.",
  }),
  sandwich: normalizeFoodConsumable({
    id: "sandwich",
    type: "food",
    name: "Sandwich",
    icon: "sandwich",
    nutritionRestore: 75,
    description: "Simpel, kompakt, verlässlich.",
  }),
  burger_leftovers: normalizeFoodConsumable({
    id: "burger_leftovers",
    type: "food",
    name: "Burgerreste",
    icon: "burger-leftovers",
    nutritionRestore: 95,
    description: "Nicht frisch, aber eindeutig Kalorien.",
  }),
  canned_beans: normalizeFoodConsumable({
    id: "canned_beans",
    type: "food",
    name: "Bohnenkonserve",
    icon: "canned-beans",
    nutritionRestore: 110,
    description: "Trocken, schwer, aber wirksam.",
  }),
  energy_bar: normalizeFoodConsumable({
    id: "energy_bar",
    type: "food",
    name: "Energieriegel",
    icon: "energy-bar",
    nutritionRestore: 125,
    description: "Kompakter Treibstoff für schlechte Nächte.",
  }),
  smoked_meat: normalizeFoodConsumable({
    id: "smoked_meat",
    type: "food",
    name: "Räucherfleisch",
    icon: "smoked-meat",
    nutritionRestore: 150,
    description: "Schwer, salzig, sehr sättigend.",
  }),
  hunting_ration: normalizeFoodConsumable({
    id: "hunting_ration",
    type: "food",
    name: "Jagdration",
    icon: "hunting-ration",
    nutritionRestore: 190,
    description: "Solider Proviant für lange, schlechte Wege.",
  }),
};

export function cloneItemDef(itemId) {
  const item = ITEM_DEFS[itemId];
  if (!item) {
    return null;
  }

  return {
    ...item,
  };
}

function getKeyLabels(color) {
  return {
    articleLabel: color === "green"
      ? "Grüner"
      : color === "blue"
        ? "Blauer"
        : `${color}er`,
    colorLabel: color === "green"
      ? "grünen"
      : color === "blue"
        ? "blauen"
        : color,
  };
}

export function createKeyItem(color, floorNumber = null, overrides = {}) {
  const normalizedColor = String(color ?? overrides.keyColor ?? "green");
  const { articleLabel, colorLabel } = getKeyLabels(normalizedColor);
  const normalizedFloor = floorNumber ?? overrides.keyFloor ?? null;

  return {
    type: "key",
    id: overrides.id ?? `key-${normalizedColor}${normalizedFloor != null ? `-${normalizedFloor}` : ""}`,
    name: overrides.name ?? `${articleLabel} Schlüssel`,
    description: overrides.description ?? (
      normalizedFloor != null
        ? `Passt zu ${colorLabel} Türen in Studio ${normalizedFloor}. Wird beim Öffnen verbraucht.`
        : `Passt zu ${colorLabel} Türen. Wird beim Öffnen verbraucht.`
    ),
    keyColor: normalizedColor,
    keyFloor: normalizedFloor,
    ...overrides,
  };
}
