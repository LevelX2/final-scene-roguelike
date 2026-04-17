import { PROP_CATALOG } from './data.mjs';
import {
  NON_ICONIC_MONSTER_WEIGHT_BONUS,
  ICONIC_MONSTER_WEIGHT_PENALTY,
  ENEMY_HP_PER_SCALE,
  ENEMY_XP_PER_SCALE,
  ENEMY_STRENGTH_SCALE_STEP,
  ENEMY_PRECISION_SCALE_STEP,
  ENEMY_REACTION_SCALE_STEP,
  ENEMY_NERVES_SCALE_STEP,
  ENEMY_INTELLIGENCE_SCALE_STEP,
  ENEMY_AGGRO_RADIUS_CAP,
  MONSTER_VARIANT_TIERS,
  MONSTER_VARIANT_MODIFIERS,
  getMonsterVariantWeights,
  getEnemyScaleForFloor,
  getLegacySpecialMonsterSpawnChance,
} from './balance.mjs';
import { createDungeonEquipmentRolls } from './dungeon/equipment-rolls.mjs';
import { createDungeonEnemyFactory } from './dungeon/enemy-factory.mjs';
import { createDungeonPickupFactory } from './dungeon/pickup-factory.mjs';
import { createDungeonSpatialApi } from './dungeon/spatial-helpers.mjs';
import { createStudioLayoutGenerator } from './dungeon/branch-layout.mjs';
import { createWeaponGenerationService } from './application/weapon-generation-service.mjs';
import { createShieldGenerationService } from './application/shield-generation-service.mjs';
import { getContainerConfigForArchetype } from './content/catalogs/studio-archetypes.mjs';
import { cloneItemDef } from './item-defs.mjs';

export function createDungeonApi(context) {
  const {
    WIDTH,
    HEIGHT,
    TILE,
    MONSTER_CATALOG,
    PROP_CATALOG: propCatalog = PROP_CATALOG,
    DOOR_TYPE,
    LOCK_COLORS,
    buildFoodItemsForBudget,
    rollFoodBudget,
    splitFoodBudget,
    rollMonsterPlannedDrop,
    shouldSpawnFloorShield,
    buildTrapsForFloor,
    randomChance = Math.random,
    randomInt,
    createGrid,
    cloneOffHandItem,
    generateEquipmentItem,
    getState,
  } = context;

  const pickupFactory = createDungeonPickupFactory({
    DOOR_TYPE,
    cloneOffHandItem,
  });

  const {
    createWeaponPickup,
    createOffHandPickup,
    createChestPickup,
    createPotionPickup,
    createFoodPickup,
    createShowcase,
    cloneWeapon,
    createDoor,
    createKeyPickup,
  } = pickupFactory;

  const weaponGenerationService = createWeaponGenerationService({
    randomChance,
    randomInt,
    generateEquipmentItem,
    getState,
  });

  const shieldGenerationService = createShieldGenerationService({
    randomChance,
    generateEquipmentItem,
    getState,
  });

  const {
    chooseWeightedWeapon,
    chooseWeightedShield,
    rollChestContent,
  } = createDungeonEquipmentRolls({
    getState,
    randomChance,
    createLootWeapon: (...args) => weaponGenerationService.createLootWeapon(...args),
    createLootShield: (...args) => shieldGenerationService.createLootShield(...args),
  });

  const {
    createEnemy,
    chooseWeightedMonster,
  } = createDungeonEnemyFactory({
    cloneOffHandItem,
    createMonsterWeapon: (...args) => weaponGenerationService.createMonsterWeapon(...args),
    createMonsterShield: (...args) => shieldGenerationService.createMonsterShield(...args),
    randomChance,
    randomInt,
    getEnemyScaleForFloor,
    ENEMY_HP_PER_SCALE,
    ENEMY_XP_PER_SCALE,
    ENEMY_STRENGTH_SCALE_STEP,
    ENEMY_PRECISION_SCALE_STEP,
    ENEMY_REACTION_SCALE_STEP,
    ENEMY_NERVES_SCALE_STEP,
    ENEMY_INTELLIGENCE_SCALE_STEP,
    ENEMY_AGGRO_RADIUS_CAP,
    MONSTER_VARIANT_TIERS,
    MONSTER_VARIANT_MODIFIERS,
    getMonsterVariantWeights,
    NON_ICONIC_MONSTER_WEIGHT_BONUS,
    ICONIC_MONSTER_WEIGHT_PENALTY,
    getLegacySpecialMonsterSpawnChance,
  });

  const {
    collectUsedShowcasePropIds,
    computeReachableTilesWithBlockedPositions,
  } = createDungeonSpatialApi({
    WIDTH,
    HEIGHT,
    TILE,
    DOOR_TYPE,
    createDoor,
    getState,
  });

  const studioLayoutGenerator = createStudioLayoutGenerator({
    WIDTH,
    HEIGHT,
    TILE,
    DOOR_TYPE,
    LOCK_COLORS,
    MONSTER_CATALOG,
    propCatalog,
    randomChance,
    randomInt,
    createGrid,
    getState,
    createEnemy,
    chooseWeightedMonster,
    createWeaponPickup,
    createOffHandPickup,
    createChestPickup,
    createPotionPickup,
    createFoodPickup,
    createShowcase,
    createDoor,
    createKeyPickup,
    chooseWeightedWeapon,
    chooseWeightedShield,
    rollChestContent,
    getFloorWeaponSpawnCount: (...args) => weaponGenerationService.getFloorWeaponSpawnCount(...args),
    getEnemyCountForFloor: (...args) => context.getEnemyCountForFloor(...args),
    getPotionCountForFloor: (...args) => context.getPotionCountForFloor(...args),
    getUnlockedMonsterRank: (...args) => context.getUnlockedMonsterRank(...args),
    shouldSpawnFloorWeapon: (...args) => context.shouldSpawnFloorWeapon(...args),
    shouldSpawnFloorShield: (...args) => shouldSpawnFloorShield(...args),
    shouldSpawnChest: (...args) => context.shouldSpawnChest(...args),
    getChestCountForFloor: (...args) => context.getChestCountForFloor(...args),
    shouldPlaceLockedRoomChest: (...args) => context.shouldPlaceLockedRoomChest(...args),
    getLockedDoorCountForFloor: (...args) => context.getLockedDoorCountForFloor(...args),
    buildFoodItemsForBudget,
    rollFoodBudget,
    splitFoodBudget,
    rollMonsterPlannedDrop,
    buildTrapsForFloor,
    getContainerConfigForArchetype,
    collectUsedShowcasePropIds,
    computeReachableTilesWithBlockedPositions,
    cloneItemDef,
  });

  return {
    createEnemy,
    createWeaponPickup,
    createOffHandPickup,
    createChestPickup,
    createPotionPickup,
    createFoodPickup,
    createShowcase,
    createKeyPickup,
    createDoor,
    rollChestContent,
    cloneWeapon,
    createDungeonLevel: studioLayoutGenerator.createDungeonLevel,
  };
}
