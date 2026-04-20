import { getItemRarityClass, getOffHandIconAssetUrl, getWeaponIconAssetUrl } from './item-asset-helpers.mjs';
import { isHealingConsumable } from '../content/catalogs/consumables.mjs';
import { MONSTER_ASSET_OVERRIDES } from '../content/catalogs/enemy-asset-manifest.mjs';

export function createRenderAssetHelpers(context) {
  const { getHeroClassAssets } = context;
  const BOW_KEYWORDS = ['bow'];
  const HEAVY_RANGED_KEYWORDS = ['shotgun', 'launcher', 'lance'];
  const MAIN_HAND_POSES = {
    'melee-light': { scale: 0.98, offsetX: 7, offsetY: 0, rotation: 42 },
    'melee-heavy': { scale: 1.08, offsetX: 6, offsetY: -1, rotation: 36 },
    'ranged-bow': { scale: 1.08, offsetX: 5, offsetY: -2, rotation: 2 },
    'ranged-heavy': { scale: 1.06, offsetX: 5, offsetY: -1, rotation: 0 },
    'ranged-gun': { scale: 1, offsetX: 4, offsetY: -3, rotation: -4 },
  };
  const OFF_HAND_POSES = {
    shield: { poseClass: 'offhand-shield', scale: 0.9, offsetX: -5, offsetY: 2, rotation: 10 },
    utility: { poseClass: 'offhand-light', scale: 0.84, offsetX: -6, offsetY: 4, rotation: 16 },
  };

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

  function getDeathMarkerAssetUrl(markerAssetId = 'death-mark') {
    if (markerAssetId === 'death-mark') {
      return './assets/overlays/death-marker-128.svg';
    }

    return './assets/overlays/death-marker-128.svg';
  }

  function getPlayerIconAssetUrl(player, isDead = false) {
    return isDead
      ? "./assets/player/player-dead.svg"
      : getHeroClassSpriteUrl(player?.classId);
  }

  function getActorMainHand(actor) {
    return actor?.mainHand ?? actor?.weapon ?? null;
  }

  function isTwoHandedMainHand(weapon) {
    return Boolean(weapon && weapon.id !== 'bare-hands' && (weapon.handedness ?? 'one-handed') === 'two-handed');
  }

  function getActorWeaponOverlay(actor, options = {}) {
    if (options.isDead) {
      return null;
    }

    const weapon = getActorMainHand(actor);
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
          ...MAIN_HAND_POSES['ranged-bow'],
        };
      }

      if (handedness === 'two-handed' || HEAVY_RANGED_KEYWORDS.some((keyword) => weaponId.includes(keyword))) {
        return {
          imageUrl,
          poseClass: 'ranged-heavy',
          ...MAIN_HAND_POSES['ranged-heavy'],
        };
      }

      return {
        imageUrl,
        poseClass: 'ranged-gun',
        ...MAIN_HAND_POSES['ranged-gun'],
      };
    }

    if (handedness === 'two-handed') {
      return {
        imageUrl,
        poseClass: 'melee-heavy',
        ...MAIN_HAND_POSES['melee-heavy'],
      };
    }

    return {
      imageUrl,
      poseClass: 'melee-light',
      ...MAIN_HAND_POSES['melee-light'],
    };
  }

  function getActorOffHandOverlay(actor, options = {}) {
    if (options.isDead) {
      return null;
    }

    const offHand = actor?.offHand ?? null;
    if (!offHand || isTwoHandedMainHand(getActorMainHand(actor))) {
      return null;
    }

    const imageUrl = getOffHandIconAssetUrl(offHand);
    if (!imageUrl) {
      return null;
    }

    if (offHand.subtype === 'shield' || offHand.itemType === 'shield') {
      return {
        imageUrl,
        ...OFF_HAND_POSES.shield,
      };
    }

    return {
      imageUrl,
      ...OFF_HAND_POSES.utility,
    };
  }

  function getPlayerWeaponOverlay(player, isDead = false) {
    return getActorWeaponOverlay(player, { isDead });
  }

  function getPlayerOffHandOverlay(player, isDead = false) {
    return getActorOffHandOverlay(player, { isDead });
  }

  function getEnemyWeaponOverlay(enemy) {
    return getActorWeaponOverlay(enemy);
  }

  function getEnemyOffHandOverlay(enemy) {
    return getActorOffHandOverlay(enemy);
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
    getDeathMarkerAssetUrl,
    getPlayerIconAssetUrl,
    getPlayerWeaponOverlay,
    getPlayerOffHandOverlay,
    getEnemyWeaponOverlay,
    getEnemyOffHandOverlay,
    getMonsterIconAssetUrl,
    getEnemyTooltipImageClass,
    getDoorIconAssetUrl,
    getTrapIconAssetUrl,
    getInventoryIconAssetUrl,
    getItemRarityClass,
  };
}
