export const ITEM_DEFS = {
  "healing-potion": {
    id: "healing-potion",
    type: "potion",
    name: "Heiltrank",
    icon: "potion",
    heal: 8,
    description: "Stellt 8 Lebenspunkte wieder her.",
  },
  candy: {
    id: "candy",
    type: "food",
    name: "Süßigkeit",
    icon: "candy",
    nutritionRestore: 15,
    description: "Kurz Zucker, wenig Sättigung.",
  },
  chips: {
    id: "chips",
    type: "food",
    name: "Chips",
    icon: "chips",
    nutritionRestore: 30,
    description: "Salzig, laut, erstaunlich hilfreich.",
  },
  popcorn: {
    id: "popcorn",
    type: "food",
    name: "Popcorn",
    icon: "popcorn",
    nutritionRestore: 50,
    description: "Passt erschreckend gut in dieses Setting.",
  },
  softdrink: {
    id: "softdrink",
    type: "food",
    name: "Softdrink",
    icon: "softdrink",
    nutritionRestore: 60,
    description: "Zucker und Koffein in fragwürdiger Balance.",
  },
  sandwich: {
    id: "sandwich",
    type: "food",
    name: "Sandwich",
    icon: "sandwich",
    nutritionRestore: 75,
    description: "Simpel, kompakt, verlässlich.",
  },
  burger_leftovers: {
    id: "burger_leftovers",
    type: "food",
    name: "Burgerreste",
    icon: "burger-leftovers",
    nutritionRestore: 95,
    description: "Nicht frisch, aber eindeutig Kalorien.",
  },
  canned_beans: {
    id: "canned_beans",
    type: "food",
    name: "Bohnenkonserve",
    icon: "canned-beans",
    nutritionRestore: 110,
    description: "Trocken, schwer, aber wirksam.",
  },
  energy_bar: {
    id: "energy_bar",
    type: "food",
    name: "Energieriegel",
    icon: "energy-bar",
    nutritionRestore: 125,
    description: "Kompakter Treibstoff für schlechte Nächte.",
  },
  smoked_meat: {
    id: "smoked_meat",
    type: "food",
    name: "Räucherfleisch",
    icon: "smoked-meat",
    nutritionRestore: 150,
    description: "Schwer, salzig, sehr sättigend.",
  },
  hunting_ration: {
    id: "hunting_ration",
    type: "food",
    name: "Jagdration",
    icon: "hunting-ration",
    nutritionRestore: 190,
    description: "Solider Proviant für lange, schlechte Wege.",
  },
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
