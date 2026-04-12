import { getHeroClassAssets } from './balance.mjs';
import { createBoardView } from './ui/board-view.mjs';
import { createHudView } from './ui/hud-view.mjs';
import { createInventoryView } from './ui/inventory-view.mjs';
import { createLogView } from './ui/log-view.mjs';
import { createRenderAssetHelpers } from './ui/render-assets.mjs';
import { createTooltipView } from './ui/tooltip-view.mjs';

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

  const {
    formatLogMessage,
    getPlayerCombatSummary: buildPlayerCombatSummary,
    getTopbarTooltipContent: buildTopbarTooltipContent,
    showTooltip: showTooltipFromView,
    moveTooltip: moveTooltipFromView,
    hideTooltip: hideTooltipFromView,
    bindTooltip: bindTooltipFromView,
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
    clamp,
  });

  function getPlayerCombatSummary() {
    return buildPlayerCombatSummary();
  }


  function getTopbarTooltipContent() {
    const state = getState();
    const weapon = getCombatWeapon(state.player);
    const offHand = getOffHand(state.player);
    const baseDamage = Math.max(1, state.player.strength + weapon.damage);
    const hitValue = state.player.precision * 2 + weapon.hitBonus;
    const critChance = clamp(state.player.precision + weapon.critBonus, MIN_CRIT_CHANCE, MAX_CRIT_CHANCE);
    const blockBase = offHand?.subtype === "shield" ? offHand.blockChance : 0;
    const blockChance = offHand?.subtype === "shield"
      ? clamp(blockBase + state.player.nerves + (state.player.shieldBlockBonus ?? 0), 5, 75)
      : 0;

    return {
      hp: {
        title: "Lebenspunkte",
        lines: [
          `Aktuell ${state.player.hp}/${state.player.maxHp}`,
          "Wenn das auf 0 fällt, endet der Lauf.",
        ],
      },
      level: {
        title: "Heldlevel",
        lines: [
          `Stufe ${state.player.level}`,
          `XP ${state.player.xp}/${state.player.xpToNext}`,
        ],
      },
      damage: {
        title: "Basisschaden",
        lines: [
          `Stärke ${state.player.strength} + Waffenschaden ${weapon.damage}`,
          `Ergibt aktuell ${baseDamage} Schaden pro Treffer vor Krits.`,
        ],
      },
      hit: {
        title: "Trefferwert",
        lines: [
          `Präzision ${state.player.precision} x 2 + Waffenbonus ${weapon.hitBonus >= 0 ? "+" : ""}${weapon.hitBonus}`,
          `Ergibt aktuell Trefferwert ${hitValue}.`,
        ],
      },
      crit: {
        title: "Krit-Chance",
        lines: [
          `Präzision ${state.player.precision} + Waffenkrit ${weapon.critBonus >= 0 ? "+" : ""}${weapon.critBonus}`,
          `Ergibt aktuell ${critChance}% Krit-Chance.`,
        ],
      },
      block: {
        title: "Blockchance",
        lines: offHand?.subtype === "shield"
          ? [
              `Schild ${offHand.blockChance}% + Nerven ${state.player.nerves}${(state.player.shieldBlockBonus ?? 0) ? ` + Klassenbonus ${state.player.shieldBlockBonus}` : ""}`,
              `Ergibt aktuell ${blockChance}% Blockchance mit ${offHand.blockValue} Blockwert.`,
            ]
          : [
              "Kein Schild in der Nebenhand.",
              "Mit Schild würdest du hier deine Blockchance sehen.",
            ],
      },
    };
  }

  function showTooltip(tooltip, event) {
    hoverTooltipElement.innerHTML = `
      ${tooltip.imageUrl ? `<div class="tooltip-art ${tooltip.imageClass ?? ""}" style="background-image: url('${tooltip.imageUrl}')"></div>` : ""}
      <p class="tooltip-title">${tooltip.title}</p>
      <p class="tooltip-copy">${tooltip.lines.join("<br>")}</p>
    `;
    hoverTooltipElement.classList.remove("hidden");
    hoverTooltipElement.setAttribute("aria-hidden", "false");
    moveTooltip(event);
  }

  function moveTooltip(event) {
    const offsetX = 16;
    const offsetY = 16;
    hoverTooltipElement.style.left = `${event.clientX + offsetX}px`;
    hoverTooltipElement.style.top = `${event.clientY + offsetY}px`;
  }

  function hideTooltip() {
    hoverTooltipElement.classList.add("hidden");
    hoverTooltipElement.setAttribute("aria-hidden", "true");
  }

  function bindTooltip(element, tooltipFactory) {
    if (!element) {
      return;
    }

    element.addEventListener("mouseenter", (event) => showTooltip(tooltipFactory(), event));
    element.addEventListener("mousemove", (event) => moveTooltip(event));
    element.addEventListener("mouseleave", () => hideTooltip());
  }

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
    formatWeaponStats,
    formatOffHandStats,
    loadHighscores,
    loadLastHighscoreMarker,
    getHeroClassIconUrl,
    knowsMonster,
  });

  const { renderLog } = createLogView({
    messageLogElement,
    getState,
    formatLogMessage,
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
    getOffHand,
    formatWeaponStats,
    formatOffHandStats,
    getOffHandTooltipLines,
    formatRarityLabel,
    getItemModifierSummary,
    renderSelf,
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
  });

  return {
    getPlayerCombatSummary,
    getTopbarTooltipContent,
    bindTooltip,
    createSheetRow,
    renderPlayerSheet,
    renderEnemySheet,
    renderInventory,
    renderHighscores,
    renderRunStats,
    renderLog,
    renderBoard,
    showFloatingText,
    showTooltip,
    moveTooltip,
    hideTooltip,
    tileAt,
  };
}
