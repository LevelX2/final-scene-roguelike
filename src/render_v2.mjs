import { getHeroClassAssets } from './balance.mjs';

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

  function escapeHtml(text) {
    return String(text)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  const messageHighlightTerms = [
    ...monsterNames.map((name) => ({ text: name, kind: "monster" })),
    ...itemNames.map((name) => ({ text: name, kind: "item" })),
  ]
    .filter((entry) => entry.text)
    .sort((left, right) => right.text.length - left.text.length);

  function formatLogMessage(messageText) {
    if (!messageHighlightTerms.length) {
      return escapeHtml(messageText);
    }

    const lowerText = messageText.toLowerCase();
    const matches = [];

    messageHighlightTerms.forEach((term) => {
      const needle = term.text.toLowerCase();
      let searchIndex = 0;

      while (searchIndex < lowerText.length) {
        const start = lowerText.indexOf(needle, searchIndex);
        if (start === -1) {
          break;
        }

        const end = start + needle.length;
        const overlaps = matches.some((match) => !(end <= match.start || start >= match.end));
        if (!overlaps) {
          matches.push({
            start,
            end,
            kind: term.kind,
          });
        }
        searchIndex = end;
      }
    });

    if (!matches.length) {
      return escapeHtml(messageText);
    }

    matches.sort((left, right) => left.start - right.start);
    let html = "";
    let cursor = 0;

    matches.forEach((match) => {
      if (cursor < match.start) {
        html += escapeHtml(messageText.slice(cursor, match.start));
      }
      html += `<span class="log-mark log-mark-${match.kind}">${escapeHtml(messageText.slice(match.start, match.end))}</span>`;
      cursor = match.end;
    });

    if (cursor < messageText.length) {
      html += escapeHtml(messageText.slice(cursor));
    }

    return html;
  }

  function getPlayerCombatSummary() {
    const state = getState();
    const weapon = getMainHand(state.player);
    const offHand = getOffHand(state.player);
    const baseDamage = Math.max(1, state.player.strength + weapon.damage);
    const hitValue = state.player.precision * 2 + weapon.hitBonus;
    const critChance = clamp(state.player.precision + weapon.critBonus, MIN_CRIT_CHANCE, MAX_CRIT_CHANCE);
    const blockBase = offHand?.subtype === "shield" ? offHand.blockChance : 0;
    const blockChance = offHand?.subtype === "shield"
      ? clamp(blockBase + state.player.nerves + (state.player.shieldBlockBonus ?? 0), 5, 75)
      : 0;

    return {
      hp: `${state.player.hp}/${state.player.maxHp}`,
      level: String(state.player.level),
      damage: String(baseDamage),
      totalDamage: String(baseDamage),
      hit: String(hitValue),
      totalHit: String(hitValue),
      crit: `${critChance}%`,
      totalCrit: `${critChance}%`,
      block: `${blockChance}%`,
      totalBlock: `${blockChance}%`,
    };
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

  function getInventoryItemIcon(item) {
    if (item.type === "weapon") {
      return item.handedness === "two-handed" ? "2H" : "1H";
    }

    if (item.type === "offhand") {
      return "[]";
    }

    if (item.type === "potion") {
      return "!";
    }

    if (item.type === "key") {
      return "K";
    }

    if (item.type === "food") {
      return "Fd";
    }

    return "?";
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

  function getInventoryItemTypeOrder(item) {
    const order = {
      weapon: 0,
      offhand: 1,
      potion: 2,
      food: 3,
      key: 4,
    };
    return order[item?.type] ?? 99;
  }

  function getInventorySectionLabel(type) {
    const labels = {
      weapon: "Waffen",
      offhand: "Schilde",
      potion: "Tränke",
      food: "Essen",
      key: "Schlüssel",
    };
    return labels[type] ?? "Sonstiges";
  }

  function applyInventoryIcon(iconElement, item) {
    if (!iconElement) {
      return;
    }

    const iconUrl = getInventoryIconAssetUrl(item);
    if (!iconUrl) {
      return;
    }

    iconElement.textContent = "";
    iconElement.style.backgroundImage = `url("${iconUrl}")`;
    iconElement.style.backgroundRepeat = "no-repeat";
    iconElement.style.backgroundPosition = "center";
    iconElement.style.backgroundSize = "28px 28px";
    iconElement.style.color = "transparent";
  }

  function renderInventory() {
    const state = getState();
    inventoryListElement.innerHTML = "";
    inventoryFilterButtons.forEach((button) => {
      button.classList.toggle("active", (button.dataset.filter ?? "all") === (state.preferences.inventoryFilter ?? "all"));
    });

    if (state.inventory.length === 0) {
      inventoryListElement.innerHTML = `<div class="inventory-empty">Kein Gegenstand im Inventar.</div>`;
      return;
    }

    const groupedItems = [];
    const groupMap = new Map();

    state.inventory.forEach((item, index) => {
      const key = item.type === "weapon"
        ? `${item.type}:${item.id}:${item.rarity ?? "common"}:${(item.modifierIds ?? []).join(",")}:${item.damage}:${item.hitBonus}:${item.critBonus}`
        : item.type === "offhand"
          ? `${item.type}:${item.id}:${item.rarity ?? "common"}:${(item.modifierIds ?? []).join(",")}:${item.blockChance}:${item.blockValue}`
          : item.type === "food"
            ? `${item.type}:${item.id}:${item.nutritionRestore}`
          : `${item.type}:${item.name}`;

      if (!groupMap.has(key)) {
        const group = {
          item,
          firstIndex: index,
          count: 1,
        };
        groupMap.set(key, group);
        groupedItems.push(group);
        return;
      }

      groupMap.get(key).count += 1;
    });

    const inventoryFilter = state.preferences.inventoryFilter ?? "all";
    const visibleGroups = groupedItems
      .filter(({ item }) => inventoryFilter === "all" || item.type === inventoryFilter)
      .sort((left, right) =>
        getInventoryItemTypeOrder(left.item) - getInventoryItemTypeOrder(right.item) ||
        left.item.name.localeCompare(right.item.name, "de")
      );

    if (visibleGroups.length === 0) {
      inventoryListElement.innerHTML = `<div class="inventory-empty">Keine Gegenstände in diesem Filter.</div>`;
      return;
    }

    let currentSectionType = null;
    visibleGroups.forEach(({ item, firstIndex, count }) => {
      if (item.type !== currentSectionType) {
        currentSectionType = item.type;
        const sectionHeading = document.createElement("div");
        sectionHeading.className = "inventory-section-title";
        sectionHeading.textContent = getInventorySectionLabel(item.type);
        inventoryListElement.appendChild(sectionHeading);
      }

      const statsLine = item.type === "weapon"
        ? formatWeaponStats(item)
        : item.type === "offhand"
          ? formatOffHandStats(item)
          : null;
      const detailLine = item.type === "weapon"
        ? `${formatRarityLabel(item.rarity ?? "common")} | ${item.source}${item.modifiers?.length ? ` | Mods: ${getItemModifierSummary(item)}` : ""} | ${item.description}`
        : item.type === "offhand"
          ? `${formatRarityLabel(item.rarity ?? "common")} | ${item.source}${item.modifiers?.length ? ` | Mods: ${getItemModifierSummary(item)}` : ""} | ${item.description}`
          : item.type === "key"
            ? item.description
            : item.type === "food"
              ? `${item.nutritionRestore} Nahrung | ${item.description}`
          : item.description;
      const wrapper = document.createElement("div");
      wrapper.className = "inventory-item";
      wrapper.innerHTML = `
        <div class="inventory-icon inventory-icon-${item.type} ${getItemRarityClass(item)}" aria-hidden="true">${getInventoryItemIcon(item)}</div>
        <div class="inventory-meta">
          <strong>${item.name}${count > 1 ? ` x${count}` : ""}</strong>
          ${statsLine ? `<span>${statsLine}</span>` : ""}
          <span>${detailLine}</span>
        </div>
      `;
      const iconElement = wrapper.querySelector(".inventory-icon");
      applyInventoryIcon(iconElement, item);
      const button = document.createElement("button");
      button.className = "item-btn";
      button.type = "button";
      button.textContent = "Benutzen";
      button.addEventListener("click", () => useInventoryItem(firstIndex));
      wrapper.appendChild(button);
      inventoryListElement.appendChild(wrapper);
    });
  }

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

  function renderLog() {
    const state = getState();
    const logMode = state.collapsedCards?.log ?? "compact";
    const visibleMessages = logMode === "full"
      ? state.messages
      : state.messages.slice(0, 3);
    messageLogElement.innerHTML = "";
    visibleMessages.forEach((message) => {
      const entry = document.createElement("div");
      entry.className = `log-entry ${message.tone}`.trim();
      entry.innerHTML = formatLogMessage(message.text);
      messageLogElement.appendChild(entry);
    });
  }

  function tileAt(x, y) {
    const state = getState();
    const floorState = getCurrentFloorState();
    const isVisible = Boolean(floorState.visible?.[y]?.[x]);
    const isExplored = Boolean(floorState.explored?.[y]?.[x]);

    if (!isVisible && !isExplored) {
      return { type: "unknown", glyph: "" };
    }

    if (state.player.x === x && state.player.y === y) {
      return {
        type: state.gameOver ? `player dead class-${state.player.classId}` : `player class-${state.player.classId}`,
        glyph: TILE.PLAYER,
        hp: state.player.hp,
        maxHp: state.player.maxHp,
        tooltip: {
          title: state.gameOver ? "Gefallener Held" : "Held",
          imageUrl: getPlayerIconAssetUrl(state.player, state.gameOver),
          imageClass: state.gameOver ? "tooltip-art-player tooltip-art-player-dead" : "tooltip-art-player",
          lines: [
            `${state.player.classLabel ?? "Held"} | ${state.player.classPassiveName ?? "Keine Passive"}`,
            `Level ${state.player.level}`,
            `Leben ${state.player.hp}/${state.player.maxHp}`,
            `Stärke ${state.player.strength}`,
            `Präzision ${state.player.precision}`,
            `Reaktion ${state.player.reaction}`,
            `Nerven ${state.player.nerves}`,
            `Intelligenz ${state.player.intelligence}`,
            `Haupthand ${getMainHand(state.player).name} (${formatWeaponStats(getMainHand(state.player))})`,
            `Nebenhand ${getOffHand(state.player)?.name ?? "Leer"}${getOffHand(state.player) ? ` (${formatOffHandStats(getOffHand(state.player))})` : ""}`,
            state.player.classPassiveDescription,
            `XP ${state.player.xp}/${state.player.xpToNext}`,
          ].filter(Boolean),
        },
      };
    }

    const enemy = isVisible
      ? floorState.enemies.find((entry) => entry.x === x && entry.y === y)
      : null;
    if (enemy) {
      const revealed = knowsMonster(enemy);
      return {
        type: `enemy monster-${enemy.id}`,
        glyph: TILE.ENEMY,
        hp: enemy.hp,
        maxHp: enemy.maxHp,
        tooltip: {
          title: enemy.name,
          imageUrl: getMonsterIconAssetUrl(enemy),
          imageClass: getEnemyTooltipImageClass(enemy),
          lines: revealed
              ? [
                  enemy.description,
                  `Variante: ${enemy.variantLabel ?? "Normal"}`,
                  enemy.variantModifiers?.length
                    ? `Merkmale: ${enemy.variantModifiers.map((modifier) => modifier.label).join(", ")}`
                    : "Merkmale: Keine",
                  `Mobilität: ${enemy.mobilityLabel ?? "Mobil"}`,
                  `Rückzug: ${enemy.retreatLabel ?? "Standhaft"}`,
                  `Regeneration: ${enemy.healingLabel ?? "Langsam"}`,
                  `Leben ${enemy.hp}/${enemy.maxHp}`,
                  enemy.special,
                ]
            : [
                enemy.description,
              ],
        },
      };
    }

    if (isVisible && floorState.potions.some((potion) => potion.x === x && potion.y === y)) {
      return {
        type: "potion",
        glyph: TILE.POTION,
        tooltip: {
          title: "Heiltrank",
          imageUrl: getPotionIconAssetUrl({ type: "potion" }),
          imageClass: "tooltip-art-potion",
          lines: [
            "Stellt 8 Lebenspunkte wieder her.",
            "Kann direkt getrunken oder ins Inventar gelegt werden.",
          ],
        },
      };
    }

    const keyPickup = isVisible
      ? floorState.keys?.find((entry) => entry.x === x && entry.y === y)
      : null;
    if (keyPickup) {
      return {
        type: `key key-${keyPickup.item.keyColor}`,
        glyph: TILE.KEY,
        tooltip: {
          title: keyPickup.item.name,
          imageUrl: getKeyIconAssetUrl(keyPickup.item),
          imageClass: "tooltip-art-key",
          lines: [
            keyPickup.item.description,
            "Wird automatisch aufgehoben und beim passenden Aufsperren verbraucht.",
          ],
        },
      };
    }

    const foodPickup = isVisible
      ? floorState.foods?.find((entry) => entry.x === x && entry.y === y)
      : null;
    if (foodPickup) {
      return {
        type: "food",
        glyph: "",
        iconUrl: getFoodIconAssetUrl(foodPickup.item),
        tooltip: {
          title: foodPickup.item.name,
          imageUrl: getFoodIconAssetUrl(foodPickup.item),
          imageClass: "tooltip-art-food",
          lines: [
            `${foodPickup.item.nutritionRestore} Nahrung`,
            foodPickup.item.description,
          ],
        },
      };
    }

    const door = floorState.doors?.find((entry) => entry.x === x && entry.y === y);
    if (door && (isVisible || isExplored)) {
      const locked = door.doorType === "locked";
      const stateLabel = door.isOpen ? "Offen" : locked ? "Verschlossen" : "Geschlossen";
      return {
        type: `${door.isOpen ? "door-open" : "door-closed"}${locked ? ` lock-${door.lockColor}` : ""}${isVisible ? "" : " memory"}`,
        glyph: door.isOpen ? TILE.DOOR_OPEN : TILE.DOOR_CLOSED,
        tooltip: isVisible ? {
          title: locked ? `${getDoorColorLabel(door.lockColor)} Tür` : "Tür",
          imageUrl: getDoorIconAssetUrl(door),
          imageClass: `tooltip-art-door${locked ? ` tooltip-art-door-${door.lockColor}` : ""}`,
          lines: [
            stateLabel,
            door.isOpen
              ? "Blockiert keine Sicht mehr."
              : "Blockiert Sicht und Durchgang, bis sie geöffnet wird.",
            locked
              ? "Benötigt beim ersten Öffnen einen passenden Schlüssel."
              : "Öffnet sich automatisch beim Betreten.",
          ],
        } : null,
      };
    }

    const weaponPickup = isVisible
      ? floorState.weapons?.find((weapon) => weapon.x === x && weapon.y === y)
      : null;
    if (weaponPickup) {
      return {
        type: `weapon ${getItemRarityClass(weaponPickup.item)}`,
        glyph: "",
        iconUrl: getWeaponIconAssetUrl(weaponPickup.item),
        tooltip: {
          title: weaponPickup.item.name,
          imageUrl: getWeaponIconAssetUrl(weaponPickup.item),
          imageClass: `tooltip-art-weapon ${getItemRarityClass(weaponPickup.item)}`,
          lines: [
            formatRarityLabel(weaponPickup.item.rarity ?? "common"),
            weaponPickup.item.source,
            formatWeaponStats(weaponPickup.item),
            weaponPickup.item.modifiers?.length ? `Mods: ${getItemModifierSummary(weaponPickup.item)}` : "Keine Modifikatoren",
            weaponPickup.item.description,
          ],
        },
      };
    }

    const offHandPickup = isVisible
      ? floorState.offHands?.find((item) => item.x === x && item.y === y)
      : null;
    if (offHandPickup) {
      return {
        type: `weapon offhand-drop ${getItemRarityClass(offHandPickup.item)}`,
        glyph: "",
        iconUrl: getOffHandIconAssetUrl(offHandPickup.item),
        tooltip: {
          title: offHandPickup.item.name,
          imageUrl: getOffHandIconAssetUrl(offHandPickup.item),
          imageClass: `tooltip-art-offhand ${getItemRarityClass(offHandPickup.item)}`,
          lines: getOffHandTooltipLines(offHandPickup.item),
        },
      };
    }

    const chestPickup = isVisible
      ? floorState.chests?.find((item) => item.x === x && item.y === y)
      : null;
    if (chestPickup) {
      return {
        type: "chest",
        glyph: TILE.CHEST,
        tooltip: {
          title: "Requisitenkiste",
          imageUrl: "./assets/chest.svg",
          imageClass: "tooltip-art-chest",
          lines: [
            "Eine schwere Transportkiste aus dem Fundus.",
            "Tritt darauf, um sie aufzubrechen.",
          ],
        },
      };
    }

    const trap = floorState.traps?.find((entry) => entry.x === x && entry.y === y) ?? null;
    const trapCanBeShown = trap && (
      ((trap.visibility === "visible" || trap.visibility === "discovered") && (isVisible || isExplored)) ||
      (trap.state !== "active" && isExplored)
    );
    if (trapCanBeShown) {
      const trapStateClass = trap.state === "consumed"
        ? "consumed"
        : trap.state === "disabled"
          ? "disabled"
          : trap.visibility === "discovered"
            ? "discovered"
            : "active";
      const trapGlyph = trap.type === "floor"
        ? "^"
        : trap.type === "alarm"
          ? "!"
          : "~";
      const trapStateLabel = trap.state === "consumed"
        ? "Verbraucht"
        : trap.state === "disabled"
          ? "Deaktiviert"
          : "Aktiv";
      const trapEffectLine = trap.effect?.alarm
        ? "Löst Alarm im Umfeld aus."
        : trap.effect?.damage
          ? `Verursacht bis zu ${trap.effect.damage} Schaden.`
          : trap.effect?.slow
            ? "Bremst Bewegungen und Tritt aus."
            : null;
      return {
        type: `trap trap-${trap.type} ${trapStateClass}${isVisible ? "" : " memory"}`.trim(),
        glyph: trapGlyph,
        tooltip: {
          title: trap.name,
          imageUrl: getTrapIconAssetUrl(trap),
          imageClass: `tooltip-art-trap tooltip-art-trap-${trap.type}`,
          lines: [
            trap.description,
            trapStateLabel,
            trapEffectLine,
          ].filter(Boolean),
        },
      };
    }

    const showcase = floorState.showcases?.find((entry) => entry.x === x && entry.y === y) ?? null;
    if (showcase && (isVisible || isExplored)) {
      return {
        type: `showcase${isVisible ? "" : " memory"}`,
        glyph: TILE.SHOWCASE,
        iconUrl: getShowcaseIconAssetUrl(showcase.item),
        tooltip: isVisible ? {
          title: showcase.item.name,
          imageUrl: getShowcaseIconAssetUrl(showcase.item),
          imageClass: "tooltip-art-showcase",
          lines: [
            `Vitrine | ${showcase.item.source}`,
            showcase.item.description,
            "Nur Dekoration, aber sie blockiert das Feld.",
          ],
        } : null,
      };
    }

    if (floorState.stairsDown && floorState.stairsDown.x === x && floorState.stairsDown.y === y) {
      return {
        type: isVisible ? "stairs-down" : "stairs-down memory",
        glyph: TILE.STAIRS_DOWN,
        tooltip: isVisible ? {
          title: "Abwärtstreppe",
          imageUrl: "./assets/stairs-down.svg",
          imageClass: "tooltip-art-stairs tooltip-art-stairs-down",
          lines: [
            "Führt tiefer in den Dungeon.",
          ],
        } : null,
      };
    }

    if (floorState.stairsUp && floorState.stairsUp.x === x && floorState.stairsUp.y === y) {
      return {
        type: isVisible ? "stairs-up" : "stairs-up memory",
        glyph: TILE.STAIRS_UP,
        tooltip: isVisible ? {
          title: "Aufwärtstreppe",
          imageUrl: "./assets/stairs-up.svg",
          imageClass: "tooltip-art-stairs tooltip-art-stairs-up",
          lines: [
            "Bringt dich zur vorherigen Ebene zurück.",
          ],
        } : null,
      };
    }

    if (floorState.grid[y][x] === TILE.WALL) {
      return { type: isVisible ? "wall" : "wall memory", glyph: TILE.WALL };
    }

    return { type: isVisible ? "floor" : "floor memory", glyph: "" };
  }

  function renderBoard() {
    const state = getState();
    boardElement.style.gridTemplateColumns = `repeat(${WIDTH}, ${TILE_SIZE}px)`;
    boardElement.style.gridTemplateRows = `repeat(${HEIGHT}, ${TILE_SIZE}px)`;
    boardElement.innerHTML = "";

    for (let y = 0; y < HEIGHT; y += 1) {
      for (let x = 0; x < WIDTH; x += 1) {
        const tile = tileAt(x, y);
        const cell = document.createElement("div");
        cell.className = `tile ${tile.type}`;
        cell.textContent = tile.glyph ?? "";
        if (tile.iconUrl) {
          cell.style.backgroundImage = `
            radial-gradient(circle at 50% 28%, rgba(255, 232, 170, 0.12), transparent 48%),
            url("${tile.iconUrl}")
          `;
          cell.style.backgroundRepeat = "no-repeat, no-repeat";
          cell.style.backgroundPosition = "center, center";
          cell.style.backgroundSize = "cover, 22px 22px";
          cell.style.color = "transparent";
        }

        if (tile.tooltip) {
          cell.addEventListener("mouseenter", (event) => showTooltip(tile.tooltip, event));
          cell.addEventListener("mousemove", (event) => moveTooltip(event));
          cell.addEventListener("mouseleave", () => hideTooltip());
        }

        if (typeof tile.hp === "number" && typeof tile.maxHp === "number") {
          const hpRatio = tile.maxHp > 0 ? tile.hp / tile.maxHp : 0;
          const hpBar = document.createElement("div");
          hpBar.className = "tile-hp";
          const hpFill = document.createElement("div");
          hpFill.className = `tile-hp-fill ${hpRatio > 0.6 ? "good" : hpRatio > 0.3 ? "warn" : "bad"}`;
          hpFill.style.width = `${Math.max(0, Math.min(100, hpRatio * 100))}%`;
          hpBar.appendChild(hpFill);
          cell.appendChild(hpBar);
        }

        boardElement.appendChild(cell);
      }
    }

    state.floatingTexts.forEach((entry) => {
      const text = document.createElement("div");
      text.className = `floating-text ${entry.kind}`;
      text.textContent = entry.text;
      text.style.left = `${BOARD_PADDING + entry.x * (TILE_SIZE + TILE_GAP) + 5}px`;
      text.style.top = `${BOARD_PADDING + entry.y * (TILE_SIZE + TILE_GAP) - 2}px`;
      boardElement.appendChild(text);
    });
  }

  function showFloatingText(x, y, text, kind) {
    const state = getState();
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    state.floatingTexts.push({ id, x, y, text, kind });
    renderSelf();
    window.setTimeout(() => {
      const nextState = getState();
      nextState.floatingTexts = nextState.floatingTexts.filter((entry) => entry.id !== id);
      renderSelf();
    }, 700);
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
