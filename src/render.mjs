import { getHeroClassAssets } from './balance.mjs';
import { createBoardView } from './ui/board-view.mjs';
import { createHudView } from './ui/hud-view.mjs';
import { createInventoryView } from './ui/inventory-view.mjs';
import { createLogView } from './ui/log-view.mjs';
import { createRenderAssetHelpers } from './ui/render-assets.mjs';
import { createStudioTopologyView } from './ui/studio-topology-view.mjs';
import { createTooltipView } from './ui/tooltip-view.mjs';
import { getWeaponEffectDefinition, getEffectStateLabel } from './content/catalogs/weapon-effects.mjs';

export function createRenderApi(context) {
  const {
    MIN_CRIT_CHANCE,
    MAX_CRIT_CHANCE,
    WIDTH,
    HEIGHT,
    TILE_SIZE,
    TILE_GAP,
    BOARD_PADDING,
    TILE,
    boardElement,
    messageLogElement,
    inventoryListElement,
    inventoryFilterButtons = [],
    playerSheetElement,
    enemySheetElement,
    highscoreListElement,
    studioTopologyViewportElement,
    studioTopologySceneElement,
    studioTopologySummaryElement,
    studioTopologySelectorElement,
    studioTopologyMiniMapElement,
    studioTopologyModalElement,
    studioTopologyZoomRangeElement,
    studioTopologyZoomValueElement,
    studioTopologyPrevButtonElement,
    studioTopologyNextButtonElement,
    runStatsSummaryElement,
    runStatsKillsElement,
    hoverTooltipElement,
    monsterNames = [],
    itemNames = [],
    getState,
    getCurrentFloorState,
    getMainHand,
    getOffHand,
    getCombatWeapon,
    hasLineOfSight,
    isStraightShot,
    formatWeaponDisplayName,
    formatWeaponReference,
    formatWeaponStats,
    formatOffHandStats,
    getOffHandTooltipLines,
    formatRarityLabel,
    getItemModifierSummary,
    getHungerStateLabel,
    clamp,
    loadHighscores,
    loadLastHighscoreMarker,
    countPotionsInInventory,
    countFoodInInventory,
    useInventoryItem,
    renderSelf,
    selectTargetTile,
    confirmTargetAttack,
    createRuntimeId,
    resetStudioTopologyViewButtonElement,
  } = context;

  function getDoorColorLabel(color) {
    if (color === "green") {
      return "grüne";
    }

    if (color === "blue") {
      return "blaue";
    }

    return color;
  }

  function getActorStatusDisplay(actor) {
    const effects = actor?.statusEffects ?? [];
    if (!effects.length) {
      return [];
    }

    return effects.map((effect) => ({
      type: effect.type,
      label: getEffectStateLabel(effect.type) ?? getWeaponEffectDefinition(effect.type)?.label ?? effect.type,
      duration: effect.duration ?? 0,
    }));
  }

  const {
    formatLogMessage,
    getPlayerCombatSummary,
    getTopbarTooltipContent,
    showTooltip,
    moveTooltip,
    hideTooltip,
    bindTooltip,
  } = createTooltipView({
    MIN_CRIT_CHANCE,
    MAX_CRIT_CHANCE,
    hoverTooltipElement,
    monsterNames,
    itemNames,
    getState,
    getMainHand,
    getOffHand,
    getCombatWeapon,
    getActorStatusDisplay,
    clamp,
  });

  function createSheetRow(label, value) {
    return `<div class="sheet-row"><span>${label}</span><strong>${value}</strong></div>`;
  }

  function knowsMonster(enemy) {
    const state = getState();
    return Boolean(state.knownMonsterTypes?.[enemy.id]);
  }

  const {
    getHeroClassIconUrl,
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
  } = createRenderAssetHelpers({
    getHeroClassAssets,
  });

  const { renderInventory } = createInventoryView({
    inventoryListElement,
    inventoryFilterButtons,
    getState,
    formatWeaponStats,
    formatOffHandStats,
    formatWeaponDisplayName,
    formatRarityLabel,
    getItemModifierSummary,
    useInventoryItem,
    getItemRarityClass,
    getInventoryIconAssetUrl,
  });

  const {
    renderPlayerSheet,
    renderEnemySheet,
    renderHighscores,
    renderRunStats,
  } = createHudView({
    playerSheetElement,
    enemySheetElement,
    highscoreListElement,
    runStatsSummaryElement,
    runStatsKillsElement,
    createSheetRow,
    getState,
    getCurrentFloorState,
    getMainHand,
    getOffHand,
    formatWeaponDisplayName,
    formatWeaponReference,
    formatWeaponStats,
    formatOffHandStats,
    loadHighscores,
    loadLastHighscoreMarker,
    getHungerStateLabel,
    getHeroClassIconUrl,
    knowsMonster,
  });

  const { renderLog } = createLogView({
    messageLogElement,
    getState,
    formatLogMessage,
  });

  const { renderStudioTopology } = createStudioTopologyView({
    studioTopologyViewportElement,
    studioTopologySceneElement,
    studioTopologySummaryElement,
    studioTopologySelectorElement,
    studioTopologyMiniMapElement,
    studioTopologyModalElement,
    studioTopologyZoomRangeElement,
    studioTopologyZoomValueElement,
    studioTopologyPrevButtonElement,
    studioTopologyNextButtonElement,
    resetStudioTopologyViewButtonElement,
    getState,
    TILE,
  });

  const { tileAt, renderBoard, showFloatingText } = createBoardView({
    WIDTH,
    HEIGHT,
    TILE_SIZE,
    TILE_GAP,
    BOARD_PADDING,
    TILE,
    boardElement,
    getState,
    getCurrentFloorState,
    getMainHand,
    getCombatWeapon,
    getOffHand,
    formatWeaponDisplayName,
    formatWeaponReference,
    formatWeaponStats,
    formatOffHandStats,
    getOffHandTooltipLines,
    formatRarityLabel,
    getItemModifierSummary,
    renderSelf,
    selectTargetTile,
    confirmTargetAttack,
    showTooltip,
    moveTooltip,
    hideTooltip,
    knowsMonster,
    getDoorColorLabel,
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
    getItemRarityClass,
    hasLineOfSight,
    isStraightShot,
    createRuntimeId,
  });

  return {
    getPlayerCombatSummary,
    getTopbarTooltipContent,
    getActorStatusDisplay,
    bindTooltip,
    createSheetRow,
    renderPlayerSheet,
    renderEnemySheet,
    renderInventory,
    renderHighscores,
    renderRunStats,
    renderLog,
    renderStudioTopology,
    renderBoard,
    showFloatingText,
    showTooltip,
    moveTooltip,
    hideTooltip,
    tileAt,
  };
}
