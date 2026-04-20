import { evaluateTargetSelection, getTargetHintLabel } from '../application/targeting-service.mjs';
import { areVoiceAnnouncementsForcedOff } from '../application/test-mode.mjs';
import { getHealingFamily, getHealingOverlayLabel, getHealingTypeLabel } from '../content/catalogs/consumables.mjs';

export function createRenderCycleApi(context) {
  const {
    TILE_SIZE = 28,
    getState,
    syncTestApi,
    getPlayerCombatSummary,
    getCurrentStudioArchetypeId,
    getCurrentFloorState,
    getCombatWeapon,
    updateVisibility,
    hideTooltip,
    renderBoard,
    formatStudioWithArchetype,
    depthTitleElement,
    playerPanelTitleElement,
    getHeroClassAssets,
    topbarHpElement,
    topbarLevelElement,
    topbarLevelFillElement,
    topbarDamageElement,
    topbarHitElement,
    topbarCritElement,
    topbarBlockElement,
    topbarFoodElement,
    topbarStatusSummaryElement,
    targetModeHintElement,
    healOverlayElement,
    healOverlayItemsElement,
    healOverlayNameElement,
    healOverlayTypeElement,
    healOverlayEffectElement,
    openTargetModeButton,
    confirmTargetModeButton,
    topbarFoodCardElement,
    getActorStatusDisplay,
    getHealingConsumableGroups,
    getHealingOverlayState,
    selectHealingOverlayFamily,
    useHealingConsumableByFamily,
    getHungerStateLabel,
    HUNGER_STATE,
    renderPlayerSheet,
    renderEnemySheet,
    renderInventory,
    renderHighscores,
    renderRunStats,
    renderStudioTopology,
    renderLog,
    boardElement,
    boardViewportElement,
    boardScalerElement,
    startScreenElement,
    gameHeaderElement,
    startFreshRunButton,
    inventoryModalElement,
    inventoryItemsPanelElement,
    inventoryHeroPanelElement,
    studioTopologyModalElement,
    runStatsModalElement,
    debugInfoModalElement,
    optionsModalElement,
    savegamesModalElement,
    helpModalElement,
    highscoresModalElement,
    startModalElement,
    gameShellElement,
    stairsModalElement,
    deathModalElement,
    toggleStepSoundElement,
    toggleDeathSoundElement,
    toggleVoiceAnnouncementsElement,
    toggleDecorativeOverlaysElement,
    toggleDecorativeOverlayDebugLogElement,
    toggleDecorativeOverlayDebugMaskElement,
    showcaseAnnouncementModeElement,
    uiScaleRangeElement,
    uiScaleValueElement,
    studioZoomRangeElement,
    studioZoomRangeValueElement,
    tooltipScaleRangeElement,
    tooltipScaleValueElement,
    studioZoomValueElement,
    enemyPanelModeElement,
    toggleEnemyPanelModeButtonElement,
    inventoryItemsTabButtonElement,
    inventoryHeroTabButtonElement,
    openDebugInfoButtonElement,
    updateSavegameControls,
    collapsibleCards,
    updatePotionChoiceSelection,
    refreshContainerLootModal,
    refreshDebugInfoModal,
    chebyshevDistance,
    hasLineOfSight,
  } = context;

  let lastBoardViewportSignature = "";
  let lastEffectiveStudioZoom = null;
  let lastViewKey = "";

  function formatPercent(value) {
    return `${Math.round((value ?? 1) * 100)}%`;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function snapBoardZoom(rawZoom) {
    if (!(rawZoom > 0)) {
      return rawZoom;
    }

    const devicePixelRatio = typeof window !== "undefined"
      ? Math.max(1, window.devicePixelRatio || 1)
      : 1;
    const zoomUnit = 1 / (TILE_SIZE * devicePixelRatio);
    if (rawZoom <= zoomUnit) {
      return rawZoom;
    }

    const snappedZoom = Math.floor(rawZoom / zoomUnit) * zoomUnit;
    return snappedZoom > 0 ? snappedZoom : rawZoom;
  }

  function getBoardMetrics(state) {
    if (!boardElement || !boardViewportElement || !boardScalerElement) {
      return null;
    }

    const naturalBoardWidth = boardElement.offsetWidth;
    const naturalBoardHeight = boardElement.offsetHeight;
    const viewportWidth = boardViewportElement.clientWidth;
    const viewportHeight = boardViewportElement.clientHeight;

    if (!naturalBoardWidth || !naturalBoardHeight || !viewportWidth || !viewportHeight) {
      return null;
    }

    const fitScale = Math.min(
      viewportWidth / naturalBoardWidth,
      viewportHeight / naturalBoardHeight,
    );
    const relativeZoom = state.options?.studioZoom ?? 1;
    const desiredZoom = fitScale * relativeZoom;
    const effectiveZoom = snapBoardZoom(desiredZoom);

    return {
      naturalBoardWidth,
      naturalBoardHeight,
      viewportWidth,
      viewportHeight,
      fitScale,
      relativeZoom,
      desiredZoom,
      effectiveZoom,
      scaledBoardWidth: naturalBoardWidth * effectiveZoom,
      scaledBoardHeight: naturalBoardHeight * effectiveZoom,
    };
  }

  function getScrollBounds(metrics) {
    return {
      maxLeft: Math.max(0, metrics.scaledBoardWidth - metrics.viewportWidth),
      maxTop: Math.max(0, metrics.scaledBoardHeight - metrics.viewportHeight),
    };
  }

  function centerViewportOnPoint(boardX, boardY, metrics) {
    const { maxLeft, maxTop } = getScrollBounds(metrics);
    boardViewportElement.scrollLeft = clamp(
      boardX * metrics.effectiveZoom - (metrics.viewportWidth / 2),
      0,
      maxLeft,
    );
    boardViewportElement.scrollTop = clamp(
      boardY * metrics.effectiveZoom - (metrics.viewportHeight / 2),
      0,
      maxTop,
    );
  }

  function syncViewportZoom(state) {
    const uiScale = state.options.uiScale ?? 1;
    const tooltipScale = state.options.tooltipScale ?? 1;
    const studioZoom = state.options.studioZoom ?? 1;
    const metrics = getBoardMetrics(state);
    const effectiveStudioZoom = metrics?.effectiveZoom ?? studioZoom;
    document.documentElement.style.setProperty("--ui-scale", String(uiScale));
    document.documentElement.style.setProperty("--studio-zoom", String(effectiveStudioZoom));
    document.documentElement.style.setProperty("--tooltip-scale", String(tooltipScale));

    if (uiScaleRangeElement) {
      uiScaleRangeElement.value = String(Math.round(uiScale * 100));
    }
    if (uiScaleValueElement) {
      uiScaleValueElement.textContent = formatPercent(uiScale);
    }
    if (studioZoomRangeElement) {
      studioZoomRangeElement.value = String(Math.round(studioZoom * 100));
    }
    if (studioZoomRangeValueElement) {
      studioZoomRangeValueElement.textContent = formatPercent(studioZoom);
    }
    if (studioZoomValueElement) {
      studioZoomValueElement.textContent = formatPercent(studioZoom);
    }
    if (tooltipScaleRangeElement) {
      tooltipScaleRangeElement.value = String(Math.round(tooltipScale * 100));
    }
    if (tooltipScaleValueElement) {
      tooltipScaleValueElement.textContent = formatPercent(tooltipScale);
    }
    if (enemyPanelModeElement) {
      enemyPanelModeElement.value = state.options.enemyPanelMode ?? "detailed";
    }
    if (toggleEnemyPanelModeButtonElement) {
      const enemyPanelCompact = (state.options.enemyPanelMode ?? "detailed") === "compact";
      toggleEnemyPanelModeButtonElement.textContent = enemyPanelCompact
        ? "Details"
        : "Kompakt";
      toggleEnemyPanelModeButtonElement.setAttribute(
        "title",
        enemyPanelCompact ? "Gegneransicht detaillierter zeigen" : "Gegneransicht kompakter schalten",
      );
    }
  }

  function syncBoardViewport(state) {
    if (!boardElement || !boardViewportElement || !boardScalerElement || state.view !== "game") {
      lastBoardViewportSignature = "";
      lastEffectiveStudioZoom = null;
      lastViewKey = "";
      return;
    }

    if (state.pendingContainerLoot) {
      return;
    }

    const metrics = getBoardMetrics(state);
    if (!metrics) {
      return;
    }

    document.documentElement.style.setProperty("--studio-zoom", String(metrics.effectiveZoom));
    boardScalerElement.style.width = `${metrics.scaledBoardWidth}px`;
    boardScalerElement.style.height = `${metrics.scaledBoardHeight}px`;

    const playerTile = boardElement.querySelector(".tile.player");
    const playerCell = playerTile?.closest(".tile-cell") ?? playerTile;
    if (!playerCell) {
      return;
    }

    const playerBoardX = playerCell.offsetLeft + (playerCell.offsetWidth / 2);
    const playerBoardY = playerCell.offsetTop + (playerCell.offsetHeight / 2);
    const playerCenterX = playerBoardX * metrics.effectiveZoom;
    const playerCenterY = playerBoardY * metrics.effectiveZoom;
    const edgeBufferX = Math.max(84, metrics.viewportWidth * 0.22);
    const edgeBufferY = Math.max(84, metrics.viewportHeight * 0.22);
    const currentLeft = boardViewportElement.scrollLeft;
    const currentTop = boardViewportElement.scrollTop;
    const currentRight = currentLeft + metrics.viewportWidth;
    const currentBottom = currentTop + metrics.viewportHeight;
    const viewKey = `${state.floor}:${state.turn}:${state.player.x}:${state.player.y}`;
    const viewportSignature = [
      metrics.viewportWidth,
      metrics.viewportHeight,
      metrics.naturalBoardWidth,
      metrics.naturalBoardHeight,
      Math.round(metrics.effectiveZoom * 1000),
    ].join(":");
    const viewportChanged = viewportSignature !== lastBoardViewportSignature;
    const zoomChanged = lastEffectiveStudioZoom !== null && Math.abs(lastEffectiveStudioZoom - metrics.effectiveZoom) > 0.001;
    const shouldHardCenter = !lastViewKey || viewportChanged || zoomChanged;

    if (shouldHardCenter) {
      centerViewportOnPoint(playerBoardX, playerBoardY, metrics);
    } else {
      if (playerCenterX - currentLeft < edgeBufferX || currentRight - playerCenterX < edgeBufferX) {
        centerViewportOnPoint(playerBoardX, playerBoardY, metrics);
      }

      if (playerCenterY - currentTop < edgeBufferY || currentBottom - playerCenterY < edgeBufferY) {
        centerViewportOnPoint(playerBoardX, playerBoardY, metrics);
      }
    }

    lastBoardViewportSignature = viewportSignature;
    lastEffectiveStudioZoom = metrics.effectiveZoom;
    lastViewKey = viewKey;
  }

  function render() {
    const state = getState();
    hideTooltip?.();
    syncTestApi();
    syncViewportZoom(state);
    const combatSummary = getPlayerCombatSummary();
    const activeStatusEffects = getActorStatusDisplay(state.player);
    const hungerClass = `state-${String(state.player.hungerState ?? HUNGER_STATE.NORMAL).toLowerCase()}`;
    const currentStudioArchetypeId = getCurrentStudioArchetypeId();
    const inGameView = state.view === "game";
    updateVisibility();
    renderBoard();
    depthTitleElement.textContent = formatStudioWithArchetype(state.floor, currentStudioArchetypeId);
    playerPanelTitleElement.textContent = state.player.name;
    playerPanelTitleElement.style.setProperty("--hero-class-icon", `url("${getHeroClassAssets(state.player.classId).iconUrl}")`);
    topbarHpElement.textContent = combatSummary.hp;
    topbarLevelElement.textContent = combatSummary.level;
    topbarDamageElement.textContent = combatSummary.damage;
    topbarHitElement.textContent = combatSummary.hit;
    topbarCritElement.textContent = combatSummary.crit;
    topbarBlockElement.textContent = combatSummary.block;
    topbarFoodElement.textContent = getHungerStateLabel(state.player.hungerState);
    const xpPercent = state.player.xpToNext > 0
      ? Math.max(0, Math.min(100, (state.player.xp / state.player.xpToNext) * 100))
      : 0;
    if (topbarLevelFillElement) {
      topbarLevelFillElement.style.width = `${xpPercent}%`;
    }
    topbarFoodCardElement.className = `board-stat-pill ${hungerClass}`;

    const statusSummary = activeStatusEffects
      .map((effect) => `${effect.label}${effect.duration > 0 ? ` ${effect.duration}` : ""}`)
      .join(" | ");
    topbarStatusSummaryElement.textContent = statusSummary;
    topbarStatusSummaryElement.classList.toggle("ui-hidden", !statusSummary);

    const floorState = getCurrentFloorState();
    const targetingActive = Boolean(state.targeting?.active);
    const targetingWeapon = targetingActive ? getCombatWeapon?.(state.player) : null;
    const targetSelection = targetingActive
      ? evaluateTargetSelection({
          state,
          floorState,
          weapon: targetingWeapon,
          x: state.targeting.cursorX,
          y: state.targeting.cursorY,
          rangeDistance: chebyshevDistance,
          hasLineOfSight,
        })
      : null;
    const targetIsValid = Boolean(targetSelection?.valid);
    const targetHint = targetingActive ? getTargetHintLabel(targetSelection) : "";
    openTargetModeButton.textContent = "Zielen";
    openTargetModeButton.setAttribute("aria-pressed", String(targetingActive));
    openTargetModeButton.classList.toggle("targeting-active", targetingActive);
    confirmTargetModeButton.classList.toggle("ui-hidden", !targetingActive);
    confirmTargetModeButton.disabled = !targetIsValid;
    confirmTargetModeButton.textContent = targetIsValid ? "Schießen" : "Kein Schuss";
    if (healOverlayElement && healOverlayItemsElement && healOverlayNameElement && healOverlayTypeElement && healOverlayEffectElement) {
      const healOverlayAnchorElement = healOverlayElement.parentElement;
      const healOverlayState = getHealingOverlayState?.() ?? { open: false, selectedFamilyId: null };
      const healingGroups = getHealingConsumableGroups?.() ?? [];
      const showHealOverlay = Boolean(healOverlayState.open && healingGroups.length > 0);
      const healHintActive = showHealOverlay && !targetingActive;
      targetModeHintElement.innerHTML = targetingActive
        ? `<span>Zielmodus</span><strong>${targetHint}</strong>`
        : healHintActive
          ? `<span>Heilauswahl</span><strong>Enter benutzt · Esc/H schließt</strong>`
          : `<span>Zielmodus</span><strong>-</strong>`;
      targetModeHintElement.classList.toggle("ui-hidden", !(targetingActive || healHintActive));
      targetModeHintElement.classList.toggle("heal-selection-pill", healHintActive);
      if (showHealOverlay) {
        boardViewportElement?.classList.add("heal-overlay-active");
        healOverlayAnchorElement?.classList.add("heal-overlay-active");
      } else {
        boardViewportElement?.classList.remove("heal-overlay-active");
        healOverlayAnchorElement?.classList.remove("heal-overlay-active");
      }
      healOverlayElement.classList.toggle("ui-hidden", !showHealOverlay);
      healOverlayElement.setAttribute("aria-hidden", String(!showHealOverlay));
      healOverlayItemsElement.innerHTML = "";

      const selectedGroup = healingGroups.find((group) => group.familyId === healOverlayState.selectedFamilyId) ?? healingGroups[0] ?? null;
      healingGroups.forEach((group) => {
        const button = document.createElement("button");
        button.className = "heal-overlay-item";
        button.type = "button";
        if (group.familyId === selectedGroup?.familyId) {
          button.classList.add("selected");
        }
        button.addEventListener("mouseenter", () => selectHealingOverlayFamily?.(group.familyId, { render: true }));
        button.addEventListener("click", () => useHealingConsumableByFamily?.(group.familyId));

        const icon = document.createElement("span");
        icon.className = "heal-overlay-icon";
        icon.style.backgroundImage = `url("${group.item.iconAssetPath || "./assets/consumables/potion.svg"}")`;

        const count = document.createElement("span");
        count.className = "heal-overlay-count";
        count.textContent = `x${group.count}`;

        button.appendChild(icon);
        button.appendChild(count);
        healOverlayItemsElement.appendChild(button);
      });

      const selectedFamily = getHealingFamily(selectedGroup?.familyId);
      healOverlayNameElement.textContent = getHealingOverlayLabel(selectedGroup?.item ?? null);
      healOverlayTypeElement.textContent = getHealingTypeLabel(selectedGroup?.item?.healType ?? selectedFamily?.healType);
      healOverlayEffectElement.textContent = selectedGroup?.item?.effectDescriptionDe ?? selectedFamily?.effectDescriptionDe ?? "";
    } else {
      targetModeHintElement.innerHTML = targetingActive
        ? `<span>Zielmodus</span><strong>${targetHint}</strong>`
        : `<span>Zielmodus</span><strong>-</strong>`;
      targetModeHintElement.classList.toggle("ui-hidden", !targetingActive);
      targetModeHintElement.classList.remove("heal-selection-pill");
      boardViewportElement?.classList.remove("heal-overlay-active");
      healOverlayElement?.parentElement?.classList.remove("heal-overlay-active");
    }

    renderPlayerSheet();
    renderEnemySheet();
    renderInventory();
    renderHighscores();
    renderRunStats();
    renderStudioTopology();
    renderLog();
    const inventoryView = state.preferences?.inventoryView === "hero" ? "hero" : "items";
    const showInventoryItems = inventoryView === "items";
    const debugRevealActive = Boolean(floorState?.debugReveal);
    if (!debugRevealActive && state.modals.debugInfoOpen) {
      state.modals.debugInfoOpen = false;
    }
    startScreenElement?.classList.toggle("ui-hidden", inGameView);
    gameHeaderElement?.classList.toggle("ui-hidden", !inGameView);
    startFreshRunButton?.classList.toggle("ui-hidden", !state.gameOver);
    inventoryModalElement?.classList.toggle("hidden", !state.modals.inventoryOpen);
    inventoryModalElement?.setAttribute("aria-hidden", String(!state.modals.inventoryOpen));
    inventoryItemsPanelElement?.classList.toggle("ui-hidden", !showInventoryItems);
    inventoryItemsPanelElement?.setAttribute("aria-hidden", String(!showInventoryItems));
    inventoryHeroPanelElement?.classList.toggle("ui-hidden", showInventoryItems);
    inventoryHeroPanelElement?.setAttribute("aria-hidden", String(showInventoryItems));
    inventoryItemsTabButtonElement?.classList.toggle("active", showInventoryItems);
    inventoryHeroTabButtonElement?.classList.toggle("active", !showInventoryItems);
    inventoryItemsTabButtonElement?.setAttribute("aria-selected", String(showInventoryItems));
    inventoryHeroTabButtonElement?.setAttribute("aria-selected", String(!showInventoryItems));
    studioTopologyModalElement?.classList.toggle("hidden", !state.modals.studioTopologyOpen);
    studioTopologyModalElement?.setAttribute("aria-hidden", String(!state.modals.studioTopologyOpen));
    runStatsModalElement?.classList.toggle("hidden", !state.modals.runStatsOpen);
    runStatsModalElement?.setAttribute("aria-hidden", String(!state.modals.runStatsOpen));
    openDebugInfoButtonElement?.classList.toggle("ui-hidden", !(inGameView && debugRevealActive));
    debugInfoModalElement?.classList.toggle("hidden", !state.modals.debugInfoOpen);
    debugInfoModalElement?.setAttribute("aria-hidden", String(!state.modals.debugInfoOpen));
    if (state.modals.debugInfoOpen) {
      refreshDebugInfoModal?.();
    }
    optionsModalElement?.classList.toggle("hidden", !state.modals.optionsOpen);
    optionsModalElement?.setAttribute("aria-hidden", String(!state.modals.optionsOpen));
    savegamesModalElement?.classList.toggle("hidden", !state.modals.savegamesOpen);
    savegamesModalElement?.setAttribute("aria-hidden", String(!state.modals.savegamesOpen));
    helpModalElement?.classList.toggle("hidden", !state.modals.helpOpen);
    helpModalElement?.setAttribute("aria-hidden", String(!state.modals.helpOpen));
    highscoresModalElement?.classList.toggle("hidden", !state.modals.highscoresOpen);
    highscoresModalElement?.setAttribute("aria-hidden", String(!state.modals.highscoresOpen));
    startModalElement?.classList.toggle("hidden", !state.modals.startOpen);
    startModalElement?.setAttribute("aria-hidden", String(!state.modals.startOpen));
    gameShellElement?.classList.toggle("prestart-hidden", !inGameView);
    stairsModalElement?.classList.toggle("hidden", !state.pendingStairChoice);
    stairsModalElement?.setAttribute("aria-hidden", String(!state.pendingStairChoice));
    if (deathModalElement) {
      deathModalElement.classList.contains("hidden")
        ? deathModalElement.setAttribute("aria-hidden", "true")
        : deathModalElement.setAttribute("aria-hidden", "false");
    }
    if (toggleStepSoundElement) {
      toggleStepSoundElement.checked = state.options.stepSound;
    }
    if (toggleDeathSoundElement) {
      toggleDeathSoundElement.checked = state.options.deathSound;
    }
    if (toggleVoiceAnnouncementsElement) {
      const voiceAnnouncementsForcedOff = areVoiceAnnouncementsForcedOff();
      toggleVoiceAnnouncementsElement.checked = !voiceAnnouncementsForcedOff && state.options.voiceAnnouncements;
      toggleVoiceAnnouncementsElement.disabled = voiceAnnouncementsForcedOff;
    }
    if (toggleDecorativeOverlaysElement) {
      toggleDecorativeOverlaysElement.checked = state.options.decorativeOverlaysEnabled ?? true;
    }
    if (toggleDecorativeOverlayDebugLogElement) {
      toggleDecorativeOverlayDebugLogElement.checked = Boolean(state.options.decorativeOverlayDebugLog);
    }
    if (toggleDecorativeOverlayDebugMaskElement) {
      toggleDecorativeOverlayDebugMaskElement.checked = Boolean(state.options.decorativeOverlayDebugMask);
    }
    if (showcaseAnnouncementModeElement) {
      showcaseAnnouncementModeElement.value = state.options.showcaseAnnouncementMode ?? "floating-text";
    }
    updateSavegameControls();
    refreshContainerLootModal?.();
    syncBoardViewport(state);
    (collapsibleCards ?? []).filter(Boolean).forEach((card) => {
      const key = card.dataset.collapsible;
      if (key === "player") {
        const mode = state.collapsedCards.player ?? "summary";
        card.classList.toggle("collapsed", mode === "hidden");
        card.classList.toggle("player-summary", mode === "summary");
        card.classList.toggle("player-hidden", mode === "hidden");
      } else {
        const collapsed = key === "log"
          ? (state.collapsedCards.log === "hidden" || state.collapsedCards.log === true)
          : Boolean(state.collapsedCards[key]);
        card.classList.toggle("collapsed", collapsed);
        if (key === "log") {
          card.classList.toggle("log-hidden", collapsed);
        }
      }
      const button = card.querySelector(".collapse-btn");
      if (button) {
        if (key === "player") {
          const mode = state.collapsedCards.player ?? "summary";
          const collapsed = mode === "hidden";
          button.textContent = collapsed ? "v" : "^";
          button.setAttribute("aria-label", collapsed ? "Spielerpanel anzeigen" : "Spielerpanel ausblenden");
          button.setAttribute("title", collapsed ? "Spielerpanel anzeigen" : "Spielerpanel ausblenden");
        } else if (key === "log") {
          const collapsed = state.collapsedCards.log === "hidden" || state.collapsedCards.log === true;
          button.textContent = collapsed ? "v" : "^";
          button.setAttribute("aria-label", collapsed ? "Log anzeigen" : "Log ausblenden");
          button.setAttribute("title", collapsed ? "Log anzeigen" : "Log ausblenden");
        } else {
          const collapsed = Boolean(state.collapsedCards[key]);
          button.textContent = collapsed ? "v" : "^";
          button.setAttribute("aria-label", collapsed ? "Gegnerpanel anzeigen" : "Gegnerpanel ausblenden");
          button.setAttribute("title", collapsed ? "Gegnerpanel anzeigen" : "Gegnerpanel ausblenden");
        }
      }
    });
    updatePotionChoiceSelection();
  }

  let pendingResizeFrame = null;
  if (typeof window !== "undefined") {
    window.addEventListener("resize", () => {
      if (pendingResizeFrame !== null) {
        window.cancelAnimationFrame(pendingResizeFrame);
      }
      pendingResizeFrame = window.requestAnimationFrame(() => {
        pendingResizeFrame = null;
        render();
      });
    });
  }

  return {
    render,
  };
}
