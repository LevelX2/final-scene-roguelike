export const DEFAULT_START_LOADOUT_ID = "filmstar_opening";

function createLoadout(config) {
  const inventory = (config.inventory ?? []).map((entry) => ({ ...entry }));
  return {
    ...config,
    inventory,
  };
}

export const START_LOADOUTS = {
  filmstar_opening: createLoadout({
    id: "filmstar_opening",
    label: "Filmstar",
    mainHandId: "expedition-revolver",
    inventory: [
      { type: "healingConsumable", itemId: "heal_set_medkit_standard", count: 2 },
    ],
  }),
  lead_opening: createLoadout({
    id: "filmstar_opening",
    label: "Filmstar",
    mainHandId: "expedition-revolver",
    inventory: [
      { type: "healingConsumable", itemId: "heal_set_medkit_standard", count: 2 },
    ],
  }),
  stuntman_kit: createLoadout({
    id: "stuntman_kit",
    label: "Stuntman",
    mainHandPool: ["combat-knife", "woodcutter-axe", "breach-axe", "bowie-knife"],
    inventory: [
      { type: "healingConsumable", itemId: "heal_set_medkit_standard", count: 1 },
      { type: "food", itemId: "sandwich", count: 1 },
    ],
  }),
  director_cache: createLoadout({
    id: "director_cache",
    label: "Regisseur",
    mainHandPool: ["cane-blade", "electro-scalpel"],
    inventory: [
      { type: "healingConsumable", itemId: "heal_set_medkit_standard", count: 1 },
      { type: "food", itemId: "energy_bar", count: 2 },
    ],
  }),
  arsenal_demo: createLoadout({
    id: "arsenal_demo",
    label: "Arsenal Demo",
    mainHandId: "expedition-revolver",
    equippedOffHandId: "stuntman-bracer",
    inventory: [
      {
        type: "food",
        item: {
          id: "custom-snack",
          type: "food",
          name: "Custom Snack",
          nutritionRestore: 40,
          description: "Inline-Proviant fuer flexible Starts.",
        },
      },
      {
        type: "weapon",
        item: {
          type: "weapon",
          id: "training-baton",
          name: "Trainingsstab",
          handedness: "one-handed",
          attackMode: "melee",
          damage: 2,
          hitBonus: 1,
          critBonus: 0,
          lightBonus: 0,
          description: "Inline-Waffe fuer Test-Loadouts.",
          modifiers: [],
          modifierIds: [],
          numericMods: [],
          effects: [],
        },
      },
      {
        type: "key",
        keyColor: "blue",
        keyFloor: 2,
      },
    ],
  }),
};

export function getStartLoadout(loadoutId, fallbackId = DEFAULT_START_LOADOUT_ID) {
  const resolvedLoadout = START_LOADOUTS[loadoutId] ?? START_LOADOUTS[fallbackId] ?? null;
  if (!resolvedLoadout) {
    return null;
  }

  return createLoadout(resolvedLoadout);
}
