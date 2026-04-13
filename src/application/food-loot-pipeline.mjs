import { ITEM_DEFS, cloneItemDef } from '../item-defs.mjs';
import {
  GLOBAL_FOOD_FACTOR,
  FOOD_SUPPLY_CLASSES,
  FOOD_SOURCE_SPLIT,
  FOOD_SPAWN_WEIGHTS,
  MONSTER_DROP_DEFS,
} from '../content/food-balance.mjs';

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

export function createFoodLootPipeline() {
  function rollFoodBudget(randomInt) {
    const supplyClass = chooseWeighted(FOOD_SUPPLY_CLASSES);
    return {
      supplyClass: supplyClass.id,
      totalBudget: Math.round(randomInt(supplyClass.min, supplyClass.max) * GLOBAL_FOOD_FACTOR),
    };
  }

  function splitFoodBudget(totalBudget) {
    return {
      world: Math.round(totalBudget * FOOD_SOURCE_SPLIT.world),
      containers: Math.round(totalBudget * FOOD_SOURCE_SPLIT.containers),
      monsters: Math.round(totalBudget * FOOD_SOURCE_SPLIT.monsters),
    };
  }

  function buildFoodItemsForBudget(budget) {
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

  function rollMonsterPlannedDrop(monsterId, remainingBudget) {
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

  return {
    rollFoodBudget,
    splitFoodBudget,
    buildFoodItemsForBudget,
    rollMonsterPlannedDrop,
  };
}

export {
  GLOBAL_FOOD_FACTOR,
  FOOD_SUPPLY_CLASSES,
  FOOD_SOURCE_SPLIT,
  FOOD_SPAWN_WEIGHTS,
  MONSTER_DROP_DEFS,
  ITEM_DEFS,
};
