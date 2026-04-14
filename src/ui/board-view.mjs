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
    formatWeaponDisplayName,
    formatWeaponReference,
    hasLineOfSight,
    isStraightShot,
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
    createRuntimeId,
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
            `Waffe ${formatWeaponReference(getMainHand(state.player), { article: "definite", grammaticalCase: "nominative" })} (${formatWeaponStats(getMainHand(state.player))})`,
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
            enemy.mainHand ? `Waffe: ${formatWeaponReference(enemy.mainHand, { article: "definite", grammaticalCase: "nominative" })}` : "Waffe: Unbewaffnet",
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
          title: formatWeaponDisplayName(weaponPickup.item),
          imageUrl: getWeaponIconAssetUrl(weaponPickup.item),
          imageClass: `tooltip-art-weapon ${getItemRarityClass(weaponPickup.item)}`,
          lines: [
            formatRarityLabel(weaponPickup.item.rarity ?? "common"),
            weaponPickup.item.source,
            `Kampflog: mit ${formatWeaponReference(weaponPickup.item, { article: "definite", grammaticalCase: "dative" })}`,
            formatWeaponStats(weaponPickup.item),
            weaponPickup.item.range && weaponPickup.item.range > 1 ? `Reichweite ${weaponPickup.item.range}` : 'Nahkampf',
            (weaponPickup.item.meleePenaltyHit ?? 0) < 0 ? `Nahkampfmalus ${weaponPickup.item.meleePenaltyHit}` : null,
            (weaponPickup.item.lightBonus ?? 0) > 0 ? `Lichtbonus +${weaponPickup.item.lightBonus}` : null,
            `Mods: ${getItemModifierSummary(weaponPickup.item)}`,
            weaponPickup.item.description,
          ].filter(Boolean),
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
      const chestImageUrl = chestPickup.containerAssetId
        ? `./assets/containers/${chestPickup.containerAssetId}.svg`
        : "./assets/chest.svg";
      return {
        type: `floor studio-${studioArchetypeId} chest`,
        glyph: TILE.CHEST,
        overlayImageUrl: chestImageUrl,
        tooltip: {
          title: chestPickup.containerName ?? "Requisitenkiste",
          imageUrl: chestImageUrl,
          imageClass: "tooltip-art-chest",
          lines: [
            "Ein thematischer Loot-Container dieses Studios.",
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

  function getTargetCursorState(x, y, state, floorState) {
    if (!state.targeting?.active) {
      return null;
    }

    const weapon = getMainHand(state.player);
    const enemy = floorState.enemies.find((entry) => entry.x === x && entry.y === y);
    if (!enemy || weapon.attackMode !== "ranged" || (weapon.range ?? 1) <= 1) {
      return "invalid";
    }

    const distance = Math.abs(enemy.x - state.player.x) + Math.abs(enemy.y - state.player.y);
    const hasRange = distance <= (weapon.range ?? 1);
    const hasAlignment = Boolean(isStraightShot?.(state.player.x, state.player.y, enemy.x, enemy.y));
    const hasSight = Boolean(hasLineOfSight?.(floorState, state.player.x, state.player.y, enemy.x, enemy.y));
    return hasRange && hasAlignment && hasSight ? "valid" : "invalid";
  }

  function renderBoard() {
    const state = getState();
    const floorState = getCurrentFloorState();
    boardElement.style.gridTemplateColumns = `repeat(${WIDTH}, ${TILE_SIZE}px)`;
    boardElement.style.gridTemplateRows = `repeat(${HEIGHT}, ${TILE_SIZE}px)`;
    boardElement.classList.toggle('targeting-mode', Boolean(state.targeting?.active));
    boardElement.innerHTML = "";

    for (let y = 0; y < HEIGHT; y += 1) {
      for (let x = 0; x < WIDTH; x += 1) {
        const tile = tileAt(x, y);
        const cell = document.createElement("div");
        cell.className = `tile ${tile.type}`;
        if (state.targeting?.active && state.targeting.cursorX === x && state.targeting.cursorY === y) {
          cell.classList.add('target-cursor');
          cell.classList.add(`target-cursor-${getTargetCursorState(x, y, state, floorState) ?? "invalid"}`);
        }
        if (state.targeting?.active) {
          cell.classList.add("targeting-clickable");
          cell.addEventListener("click", () => {
            const cursorState = getTargetCursorState(x, y, state, floorState);
            const alreadySelected = state.targeting?.cursorX === x && state.targeting?.cursorY === y;
            if (alreadySelected && cursorState === "valid") {
              confirmTargetAttack?.();
              return;
            }
            selectTargetTile?.(x, y, { confirmIfSame: false });
          });
        }
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

    state.boardEffects?.forEach((entry) => {
      const startX = BOARD_PADDING + entry.fromX * (TILE_SIZE + TILE_GAP) + TILE_SIZE / 2;
      const startY = BOARD_PADDING + entry.fromY * (TILE_SIZE + TILE_GAP) + TILE_SIZE / 2;
      const endX = BOARD_PADDING + entry.toX * (TILE_SIZE + TILE_GAP) + TILE_SIZE / 2;
      const endY = BOARD_PADDING + entry.toY * (TILE_SIZE + TILE_GAP) + TILE_SIZE / 2;
      const dx = endX - startX;
      const dy = endY - startY;
      const length = Math.max(10, Math.hypot(dx, dy));
      const angle = Math.atan2(dy, dx);

      const line = document.createElement("div");
      line.className = `projectile-effect-line ${entry.kind ?? "hero-shot"}`;
      line.style.left = `${startX}px`;
      line.style.top = `${startY}px`;
      line.style.width = `${length}px`;
      line.style.transform = `translateY(-50%) rotate(${angle}rad)`;
      if (entry.duration) {
        line.style.animationDuration = `${entry.duration}ms`;
      }
      boardElement.appendChild(line);

      const impact = document.createElement("div");
      impact.className = `projectile-effect-impact ${entry.kind ?? "hero-shot"}`;
      impact.style.left = `${endX}px`;
      impact.style.top = `${endY}px`;
      if (entry.duration) {
        impact.style.animationDuration = `${entry.duration}ms`;
      }
      boardElement.appendChild(impact);

      if (entry.flash) {
        const flash = document.createElement("div");
        flash.className = `projectile-effect-flash ${entry.kind ?? "hero-shot"}`;
        flash.style.left = `${BOARD_PADDING + entry.toX * (TILE_SIZE + TILE_GAP)}px`;
        flash.style.top = `${BOARD_PADDING + entry.toY * (TILE_SIZE + TILE_GAP)}px`;
        flash.style.width = `${TILE_SIZE}px`;
        flash.style.height = `${TILE_SIZE}px`;
        if (entry.duration) {
          flash.style.animationDuration = `${entry.duration}ms`;
        }
        boardElement.appendChild(flash);
      }
    });

    state.floatingTexts.forEach((entry) => {
      const text = document.createElement("div");
      text.className = `floating-text ${entry.kind}`;
      if (entry.title) {
        const title = document.createElement("div");
        title.className = "floating-text-title";
        title.textContent = entry.title;
        text.appendChild(title);

        const body = document.createElement("div");
        body.className = "floating-text-body";
        body.textContent = entry.text;
        text.appendChild(body);
      } else {
        text.textContent = entry.text;
      }
      text.style.left = `${BOARD_PADDING + entry.x * (TILE_SIZE + TILE_GAP) + 5}px`;
      text.style.top = `${BOARD_PADDING + entry.y * (TILE_SIZE + TILE_GAP) - 2}px`;
      if (entry.duration) {
        text.style.animationDuration = `${entry.duration}ms`;
      }
      boardElement.appendChild(text);
    });
  }

  function showFloatingText(x, y, text, kind, options = {}) {
    const state = getState();
    const id = createRuntimeId('floating-text');
    const duration = options.duration ?? 700;
    state.floatingTexts.push({ id, x, y, text, kind, title: options.title ?? "", duration });
    if (options.boardEffect) {
      const effectId = `${id}-board`;
      const effectDuration = options.boardEffect.duration ?? Math.min(duration, 420);
      state.boardEffects.push({
        id: effectId,
        fromX: options.boardEffect.fromX ?? x,
        fromY: options.boardEffect.fromY ?? y,
        toX: x,
        toY: y,
        kind: options.boardEffect.kind ?? "hero-shot",
        flash: options.boardEffect.flash ?? false,
        duration: effectDuration,
      });
      window.setTimeout(() => {
        const nextState = getState();
        nextState.boardEffects = (nextState.boardEffects ?? []).filter((entry) => entry.id !== effectId);
        renderSelf();
      }, effectDuration);
    }
    renderSelf();
    window.setTimeout(() => {
      const nextState = getState();
      nextState.floatingTexts = nextState.floatingTexts.filter((entry) => entry.id !== id);
      renderSelf();
    }, duration);
  }

  return {
    tileAt,
    renderBoard,
    showFloatingText,
  };
}
