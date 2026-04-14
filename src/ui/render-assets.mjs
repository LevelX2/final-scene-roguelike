import { getItemRarityClass, getOffHandIconAssetUrl, getWeaponIconAssetUrl } from './item-asset-helpers.mjs';

export function createRenderAssetHelpers(context) {
  const { getHeroClassAssets } = context;

  function getHeroClassIconUrl(reference) {
    return getHeroClassAssets(reference).iconUrl;
  }

  function getHeroClassSpriteUrl(reference) {
    return getHeroClassAssets(reference).spriteUrl;
  }

  function getFoodIconAssetUrl(item) {
    if (!item || item.type !== "food" || !item.icon) {
      return null;
    }

    return `./assets/food-${item.icon}.svg`;
  }

  function getPotionIconAssetUrl(item) {
    if (!item || item.type !== "potion") {
      return null;
    }

    return "./assets/potion.svg";
  }

  function getKeyIconAssetUrl(item) {
    if (!item || item.type !== "key") {
      return null;
    }

    return item.keyColor
      ? `./assets/key-${item.keyColor}.svg`
      : "./assets/key.svg";
  }

  function getShowcaseIconAssetUrl(item) {
    if (!item || item.type !== "showcase") {
      return null;
    }

    return item.iconAsset ?? `./assets/displays/${item.ambienceId ?? item.id}.svg`;
  }

  function getPlayerIconAssetUrl(player, isDead = false) {
    return isDead
      ? "./assets/player-dead.svg"
      : getHeroClassSpriteUrl(player?.classId);
  }

  function getMonsterIconAssetUrl(enemy) {
    if (!enemy?.id) {
      return null;
    }

    return `./assets/monster-${enemy.id}.svg`;
  }

  function getEnemyTooltipImageClass(enemy) {
    const variantTier = enemy?.variantTier ?? "normal";
    return `tooltip-art-enemy enemy-variant-${variantTier}`;
  }

  function getDoorIconAssetUrl(door) {
    if (!door) {
      return null;
    }

    return door.isOpen
      ? "./assets/door-open.svg"
      : "./assets/door-closed.svg";
  }

  function getTrapIconAssetUrl(trap) {
    if (!trap) {
      return null;
    }

    if (trap.type === "floor") {
      return "./assets/traps/bodenfalle.svg";
    }

    if (trap.type === "alarm") {
      return "./assets/traps/alarmfalle.svg";
    }

    return "./assets/traps/dauerfalle.svg";
  }

  function getInventoryIconAssetUrl(item) {
    return getFoodIconAssetUrl(item) ||
      getWeaponIconAssetUrl(item) ||
      getOffHandIconAssetUrl(item) ||
      getPotionIconAssetUrl(item) ||
      getKeyIconAssetUrl(item);
  }

  return {
    getHeroClassIconUrl,
    getHeroClassSpriteUrl,
    getFoodIconAssetUrl,
    getWeaponIconAssetUrl,
    getOffHandIconAssetUrl,
    getPotionIconAssetUrl,
    getKeyIconAssetUrl,
    getShowcaseIconAssetUrl,
    getPlayerIconAssetUrl,
    getMonsterIconAssetUrl,
    getEnemyTooltipImageClass,
    getDoorIconAssetUrl,
    getTrapIconAssetUrl,
    getInventoryIconAssetUrl,
    getItemRarityClass,
  };
}
