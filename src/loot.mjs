import { createFoodLootPipeline } from './application/food-loot-pipeline.mjs';

const foodLootPipeline = createFoodLootPipeline();

export const {
  rollFoodBudget,
  splitFoodBudget,
  buildFoodItemsForBudget,
  rollMonsterPlannedDrop,
} = foodLootPipeline;

export {
  GLOBAL_FOOD_FACTOR,
  FOOD_SUPPLY_CLASSES,
  FOOD_SOURCE_SPLIT,
  FOOD_SPAWN_WEIGHTS,
  MONSTER_DROP_DEFS,
  ITEM_DEFS,
} from './application/food-loot-pipeline.mjs';
