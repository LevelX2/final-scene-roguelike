import { getHeroClassAssets } from './balance.mjs';
import { createBoardView } from './ui/board-view.mjs';
import { createInventoryView } from './ui/inventory-view.mjs';
import { createLogView } from './ui/log-view.mjs';
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

  function getHeroClassIconUrl(reference) {
    return getHeroClassAssets(reference).iconUrl;
  }

  function getHeroClassSpriteUrl(reference) {
    return getHeroClassAssets(reference).spriteUrl;
  }

  function nearestEnemy() {
    const state = getState();
    const floorState = getCurrentFloorState();
    const visibleEnemies = floorState.enemies.filter((enemy) => floorState.visible?.[enemy.y]?.[enemy.x]);
    if (visibleEnemies.length === 0) {
      return null;
    }

    return [...visibleEnemies]
      .map((enemy) => ({
        enemy,
        distance: Math.abs(enemy.x - state.player.x) + Math.abs(enemy.y - state.player.y),
      }))
      .sort((a, b) => a.distance - b.distance)[0];
  }

  function knowsMonster(enemy) {
    const state = getState();
    return Boolean(state.knownMonsterTypes?.[enemy.id]);
  }

  function renderPlayerSheet() {
    const state = getState();
    const playerCardMode = state.collapsedCards?.player ?? "summary";
    const summaryRows = [
      createSheetRow("Klasse", state.player.classLabel ?? "-"),
      createSheetRow("Passive", state.player.classPassiveName ?? "-"),
      createSheetRow("Haupthand", `${getMainHand(state.player).name} (${formatWeaponStats(getMainHand(state.player))})`),
      createSheetRow("Nebenhand", getOffHand(state.player) ? `${getOffHand(state.player).name} (${formatOffHandStats(getOffHand(state.player))})` : "Leer"),
      createSheetRow("Schritte", state.turn),
    ];
    const fullRows = [
      ...summaryRows,
      createSheetRow("Erfahrung", `${state.player.xp} / ${state.player.xpToNext}`),
      createSheetRow("Stärke", state.player.strength),
      createSheetRow("Präzision", state.player.precision),
      createSheetRow("Reaktion", state.player.reaction),
      createSheetRow("Nerven", state.player.nerves),
      createSheetRow("Intelligenz", state.player.intelligence),
      createSheetRow("Ausdauer", state.player.endurance ?? 0),
      createSheetRow("Passiveffekt", state.player.classPassiveDescription ?? "-"),
      createSheetRow("Nahrung", `${state.player.nutrition}/${state.player.nutritionMax}`),
    ];

    playerSheetElement.innerHTML = (playerCardMode === "full" ? fullRows : summaryRows).join("");
  }

  function renderEnemySheet() {
    const target = nearestEnemy();

    if (!target) {
      enemySheetElement.innerHTML = `<div class="inventory-empty">Kein Gegner in Sicht.</div>`;
      return;
    }

    const revealed = knowsMonster(target.enemy);
    const variantSummary = target.enemy.variantModifiers?.length
      ? target.enemy.variantModifiers.map((modifier) => modifier.label).join(", ")
      : "Keine";
    enemySheetElement.innerHTML = [
      createSheetRow("Name", target.enemy.name),
      createSheetRow("Hinweis", target.enemy.description),
      ...(revealed
        ? [
            createSheetRow("Variante", target.enemy.variantLabel ?? "Normal"),
            createSheetRow("Merkmale", variantSummary),
            createSheetRow("Verhalten", target.enemy.behaviorLabel),
            createSheetRow("Mobilität", target.enemy.mobilityLabel ?? "Mobil"),
            createSheetRow("Rückzug", target.enemy.retreatLabel ?? "Standhaft"),
            createSheetRow("Regeneration", target.enemy.healingLabel ?? "Langsam"),
            createSheetRow("Entfernung", `${target.distance} Felder`),
            createSheetRow("Leben", `${target.enemy.hp}/${target.enemy.maxHp}`),
            createSheetRow("Türen", target.enemy.canOpenDoors ? "Kann öffnen" : "Bleibt hängen"),
            createSheetRow("Besonderheit", target.enemy.special),
          ]
        : [
            createSheetRow("Status", "Mehr Details nach dem ersten Kampf."),
          ]),
    ].join("");
  }

  function getFoodIconAssetUrl(item) {
    if (!item || item.type !== "food" || !item.icon) {
      return null;
    }

    return `./assets/food-${item.icon}.svg`;
  }

  function getWeaponIconAssetUrl(item) {
    if (!item || item.type !== "weapon" || !item.id) {
      return null;
    }

    return `./assets/weapons/${item.id}.svg`;
  }

  function getOffHandIconAssetUrl(item) {
    if (!item || item.type !== "offhand") {
      return null;
    }

    if (item.id) {
      return `./assets/shields/${item.id}.svg`;
    }

    if (item.icon) {
      return `./assets/shields/${item.icon}.svg`;
    }

    return null;
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

  function getItemRarityClass(item) {
    return `rarity-${item?.rarity ?? "common"}`;
  }

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

  function renderHighscores() {
    const scores = loadHighscores();
    const lastMarker = loadLastHighscoreMarker();
    highscoreListElement.innerHTML = "";

    if (scores.length === 0) {
      highscoreListElement.innerHTML = `<div class="inventory-empty">Noch keine Einträge. Das erste Abenteuer wartet.</div>`;
      return;
    }

    scores.forEach((score, index) => {
      const item = document.createElement("div");
      const isLatest = Boolean(lastMarker) && score.marker === lastMarker;
      const deathFloor = score.deathFloor ?? score.deepestFloor;
      const classIconUrl = getHeroClassIconUrl(score.heroClassId ?? score.heroClass);
      item.className = `score-item${isLatest ? " score-item-latest" : ""}`;
      item.innerHTML = `
        <div class="score-item-head">
          <div class="class-badge score-class-badge" aria-hidden="true"${classIconUrl ? ` style="--class-icon: url('${classIconUrl}')"` : ""}></div>
          <div class="score-item-copy">
            <strong>#${index + 1} ${score.heroName ?? "Unbenannt"} | Ebene ${score.deepestFloor}${isLatest ? ' <span class="score-badge">Letzter Lauf</span>' : ""}</strong>
            <span>${score.heroClass ?? "Unbekannt"} | Level ${score.level} | Kills ${score.kills ?? 0} | Leben ${score.hp}/${score.maxHp} | Gestorben auf Ebene ${deathFloor}</span>
            <span>${score.deathCause ?? "Ohne dokumentierte Schluss-Szene."}</span>
            <span>${score.turns} Schritte | ${score.date}</span>
          </div>
        </div>
      `;
      highscoreListElement.appendChild(item);
    });
  }

  function renderRunStats() {
    const state = getState();
    runStatsSummaryElement.innerHTML = [
      createSheetRow("Held", state.player.name),
      createSheetRow("Klasse", state.player.classLabel ?? "-"),
      createSheetRow("Aktuelle Ebene", state.floor),
      createSheetRow("Tiefste Ebene", state.deepestFloor),
      createSheetRow("Gegner besiegt", state.kills),
      createSheetRow("Erhaltene XP", state.xpGained ?? 0),
      createSheetRow("Schaden ausgeteilt", state.damageDealt ?? 0),
      createSheetRow("Schaden erhalten", state.damageTaken ?? 0),
      createSheetRow("Requisitenkisten geöffnet", state.openedChests ?? 0),
      createSheetRow("Essen gegessen", state.consumedFoods ?? 0),
      createSheetRow("Heiltränke getrunken", state.consumedPotions ?? 0),
      createSheetRow("Schritte", state.turn),
    ].join("");

    const killEntries = Object.entries(state.killStats ?? {})
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], "de"));
    runStatsKillsElement.innerHTML = killEntries.length > 0
      ? killEntries.map(([name, count]) => createSheetRow(name, count)).join("")
      : `<div class="inventory-empty">Noch keine Gegnertypen besiegt.</div>`;
  }

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
