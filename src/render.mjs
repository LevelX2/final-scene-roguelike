import { getHeroClassAssets } from './balance.mjs';
import { createBoardView } from './ui/board-view.mjs';
import { createHudView } from './ui/hud-view.mjs';
import { createInventoryView } from './ui/inventory-view.mjs';
import { createLogView } from './ui/log-view.mjs';
import { createRenderAssetHelpers } from './ui/render-assets.mjs';
import { createTooltipView } from './ui/tooltip-view.mjs';
import { getWeaponEffectDefinition, getEffectStateLabel } from './content/catalogs/weapon-effects.mjs';
import { formatStudioLabel, formatStudioWithArchetype, getStudioArchetypeLabel } from './studio-theme.mjs';

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


  function getTopbarTooltipContent() {
    const state = getState();
    const weapon = getCombatWeapon(state.player);
    const offHand = getOffHand(state.player);
    const precisionPenalty = (state.player.statusEffects ?? [])
      .filter((effect) => effect.type === "precision_malus")
      .reduce((sum, effect) => sum + (effect.penalty ?? 0), 0);
    const reactionPenalty = (state.player.statusEffects ?? [])
      .filter((effect) => effect.type === "reaction_malus")
      .reduce((sum, effect) => sum + (effect.penalty ?? 0), 0);
    const activeStatusEffects = getActorStatusDisplay(state.player)
      .map((effect) => `${effect.label} ${effect.duration}`)
      .join(", ");
    const baseDamage = Math.max(1, state.player.strength + weapon.damage);
    const hitValue = (state.player.precision - precisionPenalty) * 2 + weapon.hitBonus;
    const critChance = clamp(state.player.precision - precisionPenalty + weapon.critBonus, MIN_CRIT_CHANCE, MAX_CRIT_CHANCE);
    const blockBase = offHand?.subtype === "shield" ? offHand.blockChance : 0;
    const blockChance = offHand?.subtype === "shield"
      ? clamp(blockBase + state.player.nerves + (state.player.shieldBlockBonus ?? 0) - reactionPenalty, 5, 75)
      : 0;
    const weaponStyle = weapon.attackMode === "ranged" && (weapon.range ?? 1) > 1
      ? `Fernkampf ${weapon.range}`
      : "Nahkampf";
    const weaponStyleDetail = [
      `Waffenprofil ${weaponStyle}`,
      (weapon.meleePenaltyHit ?? 0) < 0 ? `Nahkampfmalus ${weapon.meleePenaltyHit}` : null,
      (weapon.lightBonus ?? 0) > 0 ? `Lichtbonus +${weapon.lightBonus}` : null,
    ].filter(Boolean).join(" | ");

    return {
      hp: {
        title: "Lebenspunkte",
        lines: [
          `Aktuell ${state.player.hp}/${state.player.maxHp}`,
          "Wenn das auf 0 fällt, endet das Spiel.",
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
          weaponStyleDetail,
          `Ergibt aktuell ${baseDamage} Schaden pro Treffer vor Krits.`,
        ],
      },
      hit: {
        title: "Trefferwert",
        lines: [
          `Präzision ${state.player.precision}${precisionPenalty > 0 ? ` - Statusmalus ${precisionPenalty}` : ""} x 2 + Waffenbonus ${weapon.hitBonus >= 0 ? "+" : ""}${weapon.hitBonus}`,
          (weapon.meleePenaltyHit ?? 0) < 0 ? `Im Nahkampf fällt zusätzlich ${Math.abs(weapon.meleePenaltyHit)} Treffer an.` : null,
          activeStatusEffects ? `Aktive Effekte: ${activeStatusEffects}` : null,
          `Ergibt aktuell Trefferwert ${hitValue}.`,
        ].filter(Boolean),
      },
      crit: {
        title: "Krit-Chance",
        lines: [
          `Präzision ${state.player.precision}${precisionPenalty > 0 ? ` - Statusmalus ${precisionPenalty}` : ""} + Waffenkrit ${weapon.critBonus >= 0 ? "+" : ""}${weapon.critBonus}`,
          (weapon.lightBonus ?? 0) > 0 ? `Diese Waffe erhöht zugleich deine Sichtweite um ${weapon.lightBonus}.` : null,
          `Ergibt aktuell ${critChance}% Krit-Chance.`,
        ].filter(Boolean),
      },
      block: {
        title: "Blockchance",
        lines: offHand?.subtype === "shield"
          ? [
              `Schild ${offHand.blockChance}% + Nerven ${state.player.nerves}${(state.player.shieldBlockBonus ?? 0) ? ` + Klassenbonus ${state.player.shieldBlockBonus}` : ""}${reactionPenalty > 0 ? ` - Reaktionsmalus ${reactionPenalty}` : ""}`,
              `Ergibt aktuell ${blockChance}% Blockchance mit ${offHand.blockValue} Blockwert.`,
            ]
          : [
              "Kein Schild in der Nebenhand.",
              reactionPenalty > 0
                ? `Aktiver Reaktionsmalus ${reactionPenalty} wirkt derzeit auf Ausweichen und Blocken.`
                : "Mit Schild würdest du hier deine Blockchance sehen.",
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
    formatWeaponDisplayName,
    formatWeaponReference,
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
    hasLineOfSight,
    isStraightShot,
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
    renderBoard,
    showFloatingText,
    showTooltip,
    moveTooltip,
    hideTooltip,
    tileAt,
  };
}
