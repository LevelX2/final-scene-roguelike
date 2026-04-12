// Legacy renderer kept for reference. The active runtime uses src/render_v2.mjs.
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
    playerSheetElement,
    enemySheetElement,
    highscoreListElement,
    hoverTooltipElement,
    getState,
    getCurrentFloorState,
    getMainHand,
    getOffHand,
    getCombatWeapon,
    formatWeaponStats,
    formatOffHandStats,
    getOffHandTooltipLines,
    clamp,
    loadHighscores,
    countPotionsInInventory,
    useInventoryItem,
    renderSelf,
  } = context;

  function getPlayerCombatSummary() {
    const state = getState();
    const weapon = getMainHand(state.player);
    const offHand = getOffHand(state.player);
    const baseDamage = Math.max(1, state.player.strength + weapon.damage);
    const hitValue = state.player.precision * 2 + weapon.hitBonus;
    const critChance = clamp(state.player.precision + weapon.critBonus, MIN_CRIT_CHANCE, MAX_CRIT_CHANCE);
    const blockBase = offHand?.subtype === "shield" ? offHand.blockChance : 0;
    const blockChance = offHand?.subtype === "shield" ? clamp(blockBase + state.player.nerves, 5, 75) : 0;

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
    const blockChance = offHand?.subtype === "shield" ? clamp(blockBase + state.player.nerves, 5, 75) : 0;

    return {
      hp: {
        title: "Lebenspunkte",
        lines: [
          `Aktuell ${state.player.hp}/${state.player.maxHp}`,
          "Wenn das auf 0 faellt, endet der Lauf.",
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
          `Staerke ${state.player.strength} + Waffenschaden ${weapon.damage}`,
          `Ergibt aktuell ${baseDamage} Schaden pro Treffer vor Krits.`,
        ],
      },
      hit: {
        title: "Trefferwert",
        lines: [
          `Praezision ${state.player.precision} x 2 + Waffenbonus ${weapon.hitBonus >= 0 ? "+" : ""}${weapon.hitBonus}`,
          `Ergibt aktuell Trefferwert ${hitValue}.`,
        ],
      },
      crit: {
        title: "Krit-Chance",
        lines: [
          `Praezision ${state.player.precision} + Waffenkrit ${weapon.critBonus >= 0 ? "+" : ""}${weapon.critBonus}`,
          `Ergibt aktuell ${critChance}% Krit-Chance.`,
        ],
      },
      block: {
        title: "Blockchance",
        lines: offHand?.subtype === "shield"
          ? [
              `Schild ${offHand.blockChance}% + Nerven ${state.player.nerves}`,
              `Ergibt aktuell ${blockChance}% Blockchance mit ${offHand.blockValue} Blockwert.`,
            ]
          : [
              "Kein Schild in der Nebenhand.",
              "Mit Schild wuerdest du hier deine Blockchance sehen.",
            ],
      },
    };
  }

  function showTooltip(tooltip, event) {
    hoverTooltipElement.innerHTML = `
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

  function renderPlayerSheet() {
    const state = getState();
    playerSheetElement.innerHTML = [
      createSheetRow("Name", state.player.name),
      createSheetRow("Erfahrung", `${state.player.xp} / ${state.player.xpToNext}`),
      createSheetRow("Haupthand", `${getMainHand(state.player).name} (${formatWeaponStats(getMainHand(state.player))})`),
      createSheetRow("Nebenhand", getOffHand(state.player) ? `${getOffHand(state.player).name} (${formatOffHandStats(getOffHand(state.player))})` : "Leer"),
      createSheetRow("Staerke", state.player.strength),
      createSheetRow("Praezision", state.player.precision),
      createSheetRow("Reaktion", state.player.reaction),
      createSheetRow("Nerven", state.player.nerves),
      createSheetRow("Intelligenz", state.player.intelligence),
      createSheetRow("Dungeon", state.floor),
      createSheetRow("Schritte", state.turn),
      createSheetRow("Kills", state.kills),
      createSheetRow("Tiefste Ebene", state.deepestFloor),
    ].join("");
  }

  function renderEnemySheet() {
    const target = nearestEnemy();

    if (!target) {
      enemySheetElement.innerHTML = `<div class="inventory-empty">Keine Gegner mehr auf dieser Ebene.</div>`;
      return;
    }

    enemySheetElement.innerHTML = [
      createSheetRow("Name", target.enemy.name),
      createSheetRow("Verhalten", target.enemy.behaviorLabel),
      createSheetRow("Entfernung", `${target.distance} Felder`),
      createSheetRow("Leben", `${target.enemy.hp}/${target.enemy.maxHp}`),
      createSheetRow("Staerke", target.enemy.strength),
      createSheetRow("Praezision", target.enemy.precision),
      createSheetRow("Reaktion", target.enemy.reaction),
      createSheetRow("Nerven", target.enemy.nerves),
      createSheetRow("Intelligenz", target.enemy.intelligence),
      createSheetRow("XP-Wert", target.enemy.xpReward),
      createSheetRow("Ebenenwechsel", target.enemy.canChangeFloors ? "Ja" : "Nein"),
      createSheetRow("Haupthand", `${getMainHand(target.enemy).name} (${formatWeaponStats(getMainHand(target.enemy))})`),
      createSheetRow("Nebenhand", getOffHand(target.enemy) ? `${getOffHand(target.enemy).name} (${formatOffHandStats(getOffHand(target.enemy))})` : "Leer"),
      createSheetRow("Hinweis", target.enemy.description),
      createSheetRow("Spezial", target.enemy.special),
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

    return "?";
  }

  function renderInventory() {
    const state = getState();
    inventoryListElement.innerHTML = "";

    if (state.inventory.length === 0) {
      inventoryListElement.innerHTML = `<div class="inventory-empty">Kein Gegenstand im Inventar.</div>`;
      return;
    }

    const groupedItems = [];
    const groupMap = new Map();

    state.inventory.forEach((item, index) => {
      const key = item.type === "weapon"
        ? `${item.type}:${item.id}:${item.damage}:${item.hitBonus}:${item.critBonus}`
        : item.type === "offhand"
          ? `${item.type}:${item.id}:${item.blockChance}:${item.blockValue}`
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

    groupedItems.forEach(({ item, firstIndex, count }) => {
      const statsLine = item.type === "weapon"
        ? formatWeaponStats(item)
        : item.type === "offhand"
          ? formatOffHandStats(item)
          : null;
      const detailLine = item.type === "weapon"
        ? `${item.source} | ${item.description}`
        : item.type === "offhand"
          ? `${item.source} | ${item.description}`
          : item.description;
      const wrapper = document.createElement("div");
      wrapper.className = "inventory-item";
      wrapper.innerHTML = `
        <div class="inventory-icon inventory-icon-${item.type}" aria-hidden="true">${getInventoryItemIcon(item)}</div>
        <div class="inventory-meta">
          <strong>${item.name}${count > 1 ? ` x${count}` : ""}</strong>
          ${statsLine ? `<span>${statsLine}</span>` : ""}
          <span>${detailLine}</span>
        </div>
      `;
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
    const lastMarker = localStorage.getItem("dungeon-rogue-highscores-last-entry");
    highscoreListElement.innerHTML = "";

    if (scores.length === 0) {
      highscoreListElement.innerHTML = `<div class="inventory-empty">Noch keine Eintraege. Das erste Abenteuer wartet.</div>`;
      return;
    }

    scores.forEach((score, index) => {
      const item = document.createElement("div");
      const isLatest = Boolean(lastMarker) && score.marker === lastMarker;
      const deathFloor = score.deathFloor ?? score.deepestFloor;
      item.className = `score-item${isLatest ? " score-item-latest" : ""}`;
      item.innerHTML = `
        <strong>#${index + 1} ${score.heroName ?? "Unbenannt"} | Ebene ${score.deepestFloor}${isLatest ? ' <span class="score-badge">Letzter Lauf</span>' : ""}</strong>
        <span>Level ${score.level} | Kills ${score.kills ?? 0} | Leben ${score.hp}/${score.maxHp} | Gestorben auf Ebene ${deathFloor}</span>
        <span>${score.deathCause ?? "Ohne dokumentierte Schluss-Szene."}</span>
        <span>${score.turns} Schritte | ${score.date}</span>
      `;
      highscoreListElement.appendChild(item);
    });
  }

  function renderLog() {
    const state = getState();
    messageLogElement.innerHTML = "";
    state.messages.forEach((message) => {
      const entry = document.createElement("div");
      entry.className = `log-entry ${message.tone}`.trim();
      entry.textContent = message.text;
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
        type: state.gameOver ? "player dead" : "player",
        glyph: TILE.PLAYER,
        hp: state.player.hp,
        maxHp: state.player.maxHp,
        tooltip: {
          title: state.gameOver ? "Gefallener Held" : "Held",
          lines: [
            `Level ${state.player.level}`,
            `Leben ${state.player.hp}/${state.player.maxHp}`,
            `Staerke ${state.player.strength}`,
            `Praezision ${state.player.precision}`,
            `Reaktion ${state.player.reaction}`,
            `Nerven ${state.player.nerves}`,
            `Intelligenz ${state.player.intelligence}`,
            `Haupthand ${getMainHand(state.player).name} (${formatWeaponStats(getMainHand(state.player))})`,
            `Nebenhand ${getOffHand(state.player)?.name ?? "Leer"}${getOffHand(state.player) ? ` (${formatOffHandStats(getOffHand(state.player))})` : ""}`,
            `XP ${state.player.xp}/${state.player.xpToNext}`,
          ],
        },
      };
    }

    const enemy = isVisible
      ? floorState.enemies.find((entry) => entry.x === x && entry.y === y)
      : null;
    if (enemy) {
      return {
        type: `enemy monster-${enemy.id}`,
        glyph: TILE.ENEMY,
        hp: enemy.hp,
        maxHp: enemy.maxHp,
        tooltip: {
          title: enemy.name,
          lines: [
            enemy.behaviorLabel,
            `Leben ${enemy.hp}/${enemy.maxHp}`,
            `Staerke ${enemy.strength}`,
            `Praezision ${enemy.precision}`,
            `Reaktion ${enemy.reaction}`,
            `Nerven ${enemy.nerves}`,
            `Intelligenz ${enemy.intelligence}`,
            `XP ${enemy.xpReward}`,
            `Haupthand ${getMainHand(enemy).name} (${formatWeaponStats(getMainHand(enemy))})`,
            `Nebenhand ${getOffHand(enemy)?.name ?? "Leer"}${getOffHand(enemy) ? ` (${formatOffHandStats(getOffHand(enemy))})` : ""}`,
            enemy.canChangeFloors ? "Kann Ebenen wechseln" : "Bleibt auf seiner Ebene",
            enemy.special,
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
          lines: [
            "Stellt 8 Lebenspunkte wieder her.",
            "Kann direkt getrunken oder ins Inventar gelegt werden.",
          ],
        },
      };
    }

    const weaponPickup = isVisible
      ? floorState.weapons?.find((weapon) => weapon.x === x && weapon.y === y)
      : null;
    if (weaponPickup) {
      return {
        type: "weapon",
        glyph: "",
        tooltip: {
          title: weaponPickup.item.name,
          lines: [
            weaponPickup.item.source,
            formatWeaponStats(weaponPickup.item),
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
        type: "weapon",
        glyph: "",
        tooltip: {
          title: offHandPickup.item.name,
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
          lines: [
            "Eine schwere Transportkiste aus dem Fundus.",
            "Tritt darauf, um sie aufzubrechen.",
          ],
        },
      };
    }

    if (floorState.stairsDown && floorState.stairsDown.x === x && floorState.stairsDown.y === y) {
      return {
        type: isVisible ? "stairs-down" : "stairs-down memory",
        glyph: TILE.STAIRS_DOWN,
        tooltip: isVisible ? {
          title: "Abwaertstreppe",
          lines: [
            "Fuehrt tiefer in den Dungeon.",
          ],
        } : null,
      };
    }

    if (floorState.stairsUp && floorState.stairsUp.x === x && floorState.stairsUp.y === y) {
      return {
        type: isVisible ? "stairs-up" : "stairs-up memory",
        glyph: TILE.STAIRS_UP,
        tooltip: isVisible ? {
          title: "Aufwaertstreppe",
          lines: [
            "Bringt dich zur vorherigen Ebene zurueck.",
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
        cell.textContent = tile.type === "floor" || tile.type === "wall" || tile.type === "chest" ? tile.glyph : "";

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
    renderLog,
    renderBoard,
    showFloatingText,
    showTooltip,
    moveTooltip,
    hideTooltip,
    tileAt,
  };
}
