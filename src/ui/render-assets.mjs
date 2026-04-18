import { getItemRarityClass, getOffHandIconAssetUrl, getWeaponIconAssetUrl } from './item-asset-helpers.mjs';
import { isHealingConsumable } from '../content/catalogs/consumables.mjs';
import { MONSTER_ASSET_OVERRIDES } from '../content/catalogs/enemy-asset-manifest.mjs';

export function createRenderAssetHelpers(context) {
  const { getHeroClassAssets } = context;
  const BOW_KEYWORDS = ['bow'];
  const HEAVY_RANGED_KEYWORDS = ['shotgun', 'launcher', 'lance'];

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

    return `./assets/consumables/food-${item.icon}.svg`;
  }

  function getPotionIconAssetUrl(item) {
    if (!isHealingConsumable(item)) {
      return null;
    }

    return item.iconAssetPath || "./assets/consumables/potion.svg";
  }

  function getConsumableIconAssetUrl(item) {
    if (!item || item.type !== 'consumable') {
      return null;
    }

    return item.svgAsset ?? item.iconAssetPath ?? null;
  }

  function getKeyIconAssetUrl(item) {
    if (!item || item.type !== "key") {
      return null;
    }

    return item.keyColor
      ? `./assets/keys/key-${item.keyColor}.svg`
      : "./assets/keys/key.svg";
  }

  function getShowcaseIconAssetUrl(item) {
    if (!item || item.type !== "showcase") {
      return null;
    }

    return item.iconAsset ?? `./assets/displays/${item.ambienceId ?? item.id}.svg`;
  }

  function getPlayerIconAssetUrl(player, isDead = false) {
    return isDead
      ? "./assets/player/player-dead.svg"
      : getHeroClassSpriteUrl(player?.classId);
  }

  function getActorWeaponOverlay(actor, options = {}) {
    if (options.isDead) {
      return null;
    }

    const weapon = actor?.mainHand ?? actor?.weapon ?? null;
    if (!weapon || weapon.id === 'bare-hands') {
      return null;
    }

    const imageUrl = getWeaponIconAssetUrl(weapon);
    if (!imageUrl) {
      return null;
    }

    const weaponId = String(weapon.id ?? '').toLowerCase();
    const attackMode = weapon.attackMode ?? 'melee';
    const handedness = weapon.handedness ?? 'one-handed';

    if (attackMode === 'ranged') {
      if (BOW_KEYWORDS.some((keyword) => weaponId.includes(keyword))) {
        return {
          imageUrl,
          poseClass: 'ranged-bow',
          scale: 1.18,
          offsetX: 10,
          offsetY: -2,
          rotation: -18,
        };
      }

      if (handedness === 'two-handed' || HEAVY_RANGED_KEYWORDS.some((keyword) => weaponId.includes(keyword))) {
        return {
          imageUrl,
          poseClass: 'ranged-heavy',
          scale: 1.12,
          offsetX: 10,
          offsetY: 1,
          rotation: -14,
        };
      }

      return {
        imageUrl,
        poseClass: 'ranged-gun',
        scale: 1.08,
        offsetX: 10,
        offsetY: 2,
        rotation: -10,
      };
    }

    if (handedness === 'two-handed') {
      return {
        imageUrl,
        poseClass: 'melee-heavy',
        scale: 1.16,
        offsetX: 10,
        offsetY: -3,
        rotation: -30,
      };
    }

    return {
      imageUrl,
      poseClass: 'melee-light',
      scale: 1.02,
      offsetX: 10,
      offsetY: 3,
      rotation: -34,
    };
  }

  function getPlayerWeaponOverlay(player, isDead = false) {
    return getActorWeaponOverlay(player, { isDead });
  }

  function getEnemyWeaponOverlay(enemy) {
    return getActorWeaponOverlay(enemy);
  }

  function getMonsterIconAssetUrl(enemy) {
    if (!enemy?.id) {
      return null;
    }

    if (MONSTER_ASSET_OVERRIDES[enemy.id]) {
      return MONSTER_ASSET_OVERRIDES[enemy.id];
    }

    return `./assets/enemies/legacy-${enemy.id}.svg`;
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
      ? "./assets/transitions/door-open.svg"
      : "./assets/transitions/door-closed.svg";
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
      getConsumableIconAssetUrl(item) ||
      getKeyIconAssetUrl(item);
  }

  return {
    getHeroClassIconUrl,
    getHeroClassSpriteUrl,
    getFoodIconAssetUrl,
    getWeaponIconAssetUrl,
    getOffHandIconAssetUrl,
    getPotionIconAssetUrl,
    getConsumableIconAssetUrl,
    getKeyIconAssetUrl,
    getShowcaseIconAssetUrl,
    getPlayerIconAssetUrl,
    getPlayerWeaponOverlay,
    getEnemyWeaponOverlay,
    getMonsterIconAssetUrl,
    getEnemyTooltipImageClass,
    getDoorIconAssetUrl,
    getTrapIconAssetUrl,
    getInventoryIconAssetUrl,
    getItemRarityClass,
  };
}
