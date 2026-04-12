export const ITEM_DEFS = {
  candy: {
    id: "candy",
    type: "food",
    name: "Suessigkeit",
    icon: "candy",
    nutritionRestore: 15,
    description: "Kurz Zucker, wenig Saettigung.",
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
    description: "Zucker und Koffein in fragwuerdiger Balance.",
  },
  sandwich: {
    id: "sandwich",
    type: "food",
    name: "Sandwich",
    icon: "sandwich",
    nutritionRestore: 75,
    description: "Simpel, kompakt, verlaesslich.",
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
    description: "Kompakter Treibstoff fuer schlechte Naechte.",
  },
  smoked_meat: {
    id: "smoked_meat",
    type: "food",
    name: "Raeucherfleisch",
    icon: "smoked-meat",
    nutritionRestore: 150,
    description: "Schwer, salzig, sehr saettigend.",
  },
  hunting_ration: {
    id: "hunting_ration",
    type: "food",
    name: "Jagdration",
    icon: "hunting-ration",
    nutritionRestore: 190,
    description: "Solider Proviant fuer lange, schlechte Wege.",
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
