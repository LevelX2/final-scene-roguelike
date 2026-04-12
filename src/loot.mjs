import { ITEM_DEFS, cloneItemDef } from './item-defs.mjs';

export const GLOBAL_FOOD_FACTOR = 0.35;

export const FOOD_SUPPLY_CLASSES = [
  { id: "SCARCE", weight: 28, min: 90, max: 160 },
  { id: "LOW", weight: 34, min: 161, max: 240 },
  { id: "NORMAL", weight: 24, min: 241, max: 320 },
  { id: "HIGH", weight: 10, min: 321, max: 420 },
  { id: "ABUNDANT", weight: 4, min: 421, max: 520 },
];

export const FOOD_SOURCE_SPLIT = {
  world: 0.78,
  containers: 0.14,
  monsters: 0.08,
};

export const FOOD_SPAWN_WEIGHTS = [
  { itemId: "candy", weight: 18 },
  { itemId: "chips", weight: 18 },
  { itemId: "popcorn", weight: 18 },
  { itemId: "softdrink", weight: 16 },
  { itemId: "sandwich", weight: 12 },
  { itemId: "burger_leftovers", weight: 8 },
  { itemId: "canned_beans", weight: 8 },
  { itemId: "energy_bar", weight: 8 },
  { itemId: "smoked_meat", weight: 4 },
  { itemId: "hunting_ration", weight: 2 },
];

export const MONSTER_DROP_DEFS = {
  bates: { dropChance: 0.09, dropTable: [{ itemId: "sandwich", weight: 70 }, { itemId: "candy", weight: 30 }] },
  "motel-shlurfer": { dropChance: 0.1, dropTable: [{ itemId: "chips", weight: 40 }, { itemId: "sandwich", weight: 60 }] },
  kellerkriecher: { dropChance: 0.09, dropTable: [{ itemId: "canned_beans", weight: 100 }] },
  ghostface: { dropChance: 0.08, dropTable: [{ itemId: "popcorn", weight: 50 }, { itemId: "softdrink", weight: 50 }] },
  "maskierter-nachahmer": { dropChance: 0.08, dropTable: [{ itemId: "chips", weight: 45 }, { itemId: "softdrink", weight: 55 }] },
  "videotheken-stalker": { dropChance: 0.08, dropTable: [{ itemId: "popcorn", weight: 70 }, { itemId: "candy", weight: 30 }] },
  chucky: { dropChance: 0.06, dropTable: [{ itemId: "candy", weight: 100 }] },
  "besessene-puppe": { dropChance: 0.06, dropTable: [{ itemId: "candy", weight: 100 }] },
  gremlin: { dropChance: 0.11, dropTable: [{ itemId: "chips", weight: 45 }, { itemId: "burger_leftovers", weight: 55 }] },
  "stummer-maskentraeger": { dropChance: 0.1, dropTable: [{ itemId: "canned_beans", weight: 55 }, { itemId: "sandwich", weight: 45 }] },
  jason: { dropChance: 0.12, dropTable: [{ itemId: "canned_beans", weight: 45 }, { itemId: "smoked_meat", weight: 55 }] },
  "camp-schlaechter": { dropChance: 0.11, dropTable: [{ itemId: "sandwich", weight: 45 }, { itemId: "smoked_meat", weight: 55 }] },
  "mutierter-hinterwaeldler": { dropChance: 0.12, dropTable: [{ itemId: "burger_leftovers", weight: 50 }, { itemId: "smoked_meat", weight: 50 }] },
  "kesselraum-peiniger": { dropChance: 0.09, dropTable: [{ itemId: "softdrink", weight: 45 }, { itemId: "canned_beans", weight: 55 }] },
  pennywise: { dropChance: 0.07, dropTable: [{ itemId: "popcorn", weight: 70 }, { itemId: "candy", weight: 30 }] },
  kanalclown: { dropChance: 0.07, dropTable: [{ itemId: "popcorn", weight: 70 }, { itemId: "candy", weight: 30 }] },
  critter: { dropChance: 0.11, dropTable: [{ itemId: "burger_leftovers", weight: 100 }] },
  predator: { dropChance: 0.15, dropTable: [{ itemId: "hunting_ration", weight: 60 }, { itemId: "smoked_meat", weight: 40 }] },
  trophaeenjaeger: { dropChance: 0.14, dropTable: [{ itemId: "hunting_ration", weight: 55 }, { itemId: "energy_bar", weight: 45 }] },
  "soeldner-tracker": { dropChance: 0.13, dropTable: [{ itemId: "energy_bar", weight: 45 }, { itemId: "hunting_ration", weight: 55 }] },
};

function chooseWeighted(entries, randomValue = Math.random()) {
  const totalWeight = entries.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = randomValue * totalWeight;

  for (const entry of entries) {
    roll -= entry.weight;
    if (roll <= 0) {
      return entry;
    }
  }

  return entries[entries.length - 1];
}

export function rollFoodBudget(randomInt) {
  const supplyClass = chooseWeighted(FOOD_SUPPLY_CLASSES);
  return {
    supplyClass: supplyClass.id,
    totalBudget: Math.round(randomInt(supplyClass.min, supplyClass.max) * GLOBAL_FOOD_FACTOR),
  };
}

export function splitFoodBudget(totalBudget) {
  return {
    world: Math.round(totalBudget * FOOD_SOURCE_SPLIT.world),
    containers: Math.round(totalBudget * FOOD_SOURCE_SPLIT.containers),
    monsters: Math.round(totalBudget * FOOD_SOURCE_SPLIT.monsters),
  };
}

export function buildFoodItemsForBudget(budget) {
  const items = [];
  let remaining = budget;

  while (remaining > 0) {
    const choice = chooseWeighted(FOOD_SPAWN_WEIGHTS);
    const item = cloneItemDef(choice.itemId);
    if (!item) {
      break;
    }
    items.push(item);
    remaining -= item.nutritionRestore;
    if (remaining < -80) {
      break;
    }
  }

  return items;
}

export function rollMonsterPlannedDrop(monsterId, remainingBudget) {
  const monsterDrop = MONSTER_DROP_DEFS[monsterId];
  if (!monsterDrop || remainingBudget <= 0) {
    return null;
  }

  if (Math.random() > monsterDrop.dropChance) {
    return null;
  }

  const choice = chooseWeighted(monsterDrop.dropTable);
  const item = cloneItemDef(choice.itemId);
  if (!item) {
    return null;
  }

  return {
    itemId: item.id,
    item,
    spentBudget: item.nutritionRestore,
  };
}

export { ITEM_DEFS };
