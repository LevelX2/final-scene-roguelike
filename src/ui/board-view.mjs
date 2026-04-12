export function createBoardView(context) {
  const {
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
  } = context;

  function tileAt(x, y) {
    const state = getState();
    const floorState = getCurrentFloorState();
    const studioArchetypeId = floorState?.studioArchetypeId ?? "slasher";
    const isVisible = Boolean(floorState.visible?.[y]?.[x]);
    const isExplored = Boolean(floorState.explored?.[y]?.[x]);

    if (!isVisible && !isExplored) {
      return { type: "unknown", glyph: "" };
    }

    if (state.player.x === x && state.player.y === y) {
      return {
        type: state.gameOver
          ? `floor studio-${studioArchetypeId} player dead`
          : `floor studio-${studioArchetypeId} player`,
        glyph: TILE.PLAYER,
        overlayImageUrl: getPlayerIconAssetUrl(state.player, state.gameOver),
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
        type: `floor studio-${studioArchetypeId} enemy monster-${enemy.id}`,
        glyph: TILE.ENEMY,
        overlayImageUrl: getMonsterIconAssetUrl(enemy),
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
        type: `floor studio-${studioArchetypeId} potion`,
        glyph: TILE.POTION,
        overlayImageUrl: getPotionIconAssetUrl({ type: "potion" }),
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
        type: `floor studio-${studioArchetypeId} key key-${keyPickup.item.keyColor}`,
        glyph: TILE.KEY,
        overlayImageUrl: getKeyIconAssetUrl(keyPickup.item),
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
        type: `floor studio-${studioArchetypeId} food`,
        glyph: "",
        overlayImageUrl: getFoodIconAssetUrl(foodPickup.item),
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
        type: `floor studio-${studioArchetypeId} ${door.isOpen ? "door-open" : "door-closed"}${locked ? ` lock-${door.lockColor}` : ""}${isVisible ? "" : " memory"}`,
        glyph: door.isOpen ? TILE.DOOR_OPEN : TILE.DOOR_CLOSED,
        overlayImageUrl: getDoorIconAssetUrl(door),
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
        type: `floor studio-${studioArchetypeId} weapon-drop ${getItemRarityClass(weaponPickup.item)}`,
        glyph: "",
        overlayImageUrl: getWeaponIconAssetUrl(weaponPickup.item),
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
        type: `floor studio-${studioArchetypeId} weapon-drop offhand-drop ${getItemRarityClass(offHandPickup.item)}`,
        glyph: "",
        overlayImageUrl: getOffHandIconAssetUrl(offHandPickup.item),
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
        type: `floor studio-${studioArchetypeId} chest`,
        glyph: TILE.CHEST,
        overlayImageUrl: "./assets/chest.svg",
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
        type: `${isVisible ? `floor studio-${studioArchetypeId}` : `floor memory studio-${studioArchetypeId}`} trap trap-${trap.type} ${trapStateClass}${isVisible ? "" : " memory"}`.trim(),
        glyph: trapGlyph,
        overlayImageUrl: getTrapIconAssetUrl(trap),
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
        type: `floor studio-${studioArchetypeId} showcase${isVisible ? "" : " memory"}`,
        glyph: TILE.SHOWCASE,
        overlayImageUrl: getShowcaseIconAssetUrl(showcase.item),
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
        type: isVisible
          ? `floor studio-${studioArchetypeId} stairs-down`
          : `floor memory studio-${studioArchetypeId} stairs-down memory`,
        glyph: TILE.STAIRS_DOWN,
        overlayImageUrl: "./assets/stairs-down.svg",
        tooltip: isVisible ? {
          title: "Übergang",
          imageUrl: "./assets/stairs-down.svg",
          imageClass: "tooltip-art-stairs tooltip-art-stairs-down",
          lines: [
            "Führt dich tiefer in den Studiokomplex.",
          ],
        } : null,
      };
    }

    if (floorState.stairsUp && floorState.stairsUp.x === x && floorState.stairsUp.y === y) {
      return {
        type: isVisible
          ? `floor studio-${studioArchetypeId} stairs-up`
          : `floor memory studio-${studioArchetypeId} stairs-up memory`,
        glyph: TILE.STAIRS_UP,
        overlayImageUrl: "./assets/stairs-up.svg",
        tooltip: isVisible ? {
          title: "Rückweg",
          imageUrl: "./assets/stairs-up.svg",
          imageClass: "tooltip-art-stairs tooltip-art-stairs-up",
          lines: [
            "Bringt dich in ein früheres Studio zurück.",
          ],
        } : null,
      };
    }

    if (floorState.grid[y][x] === TILE.WALL) {
      return { type: isVisible ? "wall" : "wall memory", glyph: TILE.WALL };
    }

    return {
      type: isVisible
        ? `floor studio-${studioArchetypeId}`
        : `floor memory studio-${studioArchetypeId}`,
      glyph: "",
    };
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
        if (tile.overlayImageUrl) {
          cell.classList.add("has-overlay");
          cell.style.setProperty("--tile-overlay-image", `url("${tile.overlayImageUrl}")`);
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
    tileAt,
    renderBoard,
    showFloatingText,
  };
}
