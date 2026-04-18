import { evaluateTargetSelection, getTargetHintLabel, getVisibleTargetSelections, isTargetModeWeapon } from './targeting-service.mjs';

export function createPlayerTurnController(context) {
  const {
    WIDTH,
    HEIGHT,
    TILE,
    DOOR_TYPE,
    getState,
    getCurrentFloorState,
    getDoorAt,
    getShowcaseAt,
    openDoor,
    closeDoor,
    canPlayerOpenDoor,
    getDoorColorLabels,
    manhattanDistance,
    addMessage,
    attackEnemy,
    tryPickupLoot,
    tryUseStairs,
    detectNearbyTraps,
    maybeTriggerShowcaseAmbience,
    handleActorEnterTile,
    playStepSound,
    playLockedDoorSound,
    hasNearbyEnemy,
    moveEnemies,
    canActorMove,
    hasLineOfSight,
    chebyshevDistance,
    getCombatWeapon,
    processRoundStatusEffects,
    processContinuousTraps,
    processSafeRegeneration,
    processConsumableBuffs,
    applyPlayerNutritionTurnCost,
    renderSelf,
  } = context;

  function isMovementBlockingTile(x, y, floorState) {
    if (x < 0 || x >= WIDTH || y < 0 || y >= HEIGHT) {
      return true;
    }

    if (floorState.grid[y][x] === TILE.WALL) {
      return true;
    }

    if (getShowcaseAt(x, y, floorState)) {
      return true;
    }

    const door = getDoorAt(x, y, floorState);
    return Boolean(door && !door.isOpen);
  }

  function isOrthogonallyAdjacent(left, right) {
    return manhattanDistance(left, right) === 1;
  }

  function isDiagonalStep(dx, dy) {
    return dx !== 0 && dy !== 0;
  }

  function endTurn({ skipEnemyMove = false, actionType = "other" } = {}) {
    const state = getState();
    state.turn += 1;
    if (!state.gameOver) {
      applyPlayerNutritionTurnCost();
    }
    if (!state.gameOver && !skipEnemyMove) {
      moveEnemies();
    }
    if (!state.gameOver) {
      processRoundStatusEffects?.();
    }
    if (!state.gameOver) {
      processContinuousTraps();
    }
    if (!state.gameOver) {
      processSafeRegeneration(actionType);
    }
    if (!state.gameOver) {
      processConsumableBuffs?.();
    }
    renderSelf();
  }

  function tryCloseAdjacentDoor() {
    const state = getState();
    if (state.gameOver || state.view !== "game" || state.modals.startOpen || state.pendingChoice || state.pendingStairChoice || state.modals.inventoryOpen || state.modals.studioTopologyOpen || state.modals.runStatsOpen || state.modals.optionsOpen || state.modals.savegamesOpen || state.modals.helpOpen || state.modals.highscoresOpen) {
      return;
    }

    if (!canActorMove?.(state.player)) {
      addMessage("Du bist zu sehr festgesetzt, um dich zu bewegen.", "danger");
      endTurn({ actionType: "other" });
      return;
    }

    const floorState = getCurrentFloorState();
    const adjacentDoors = (floorState.doors ?? []).filter((door) =>
      door.isOpen &&
      isOrthogonallyAdjacent(door, state.player)
    );

    if (adjacentDoors.length === 0) {
      addMessage("Keine offene Tür direkt neben dir.");
      renderSelf();
      return;
    }

    const targetDoor = adjacentDoors[0];
    if (!closeDoor(targetDoor)) {
      addMessage("Die Tür lässt sich gerade nicht schließen.");
      renderSelf();
      return;
    }

    addMessage("Du ziehst die Tür wieder zu.", "important");
    endTurn({ actionType: "other" });
  }

  function movePlayer(dx, dy) {
    const state = getState();
    if (state.gameOver || state.view !== "game" || state.modals.startOpen || state.pendingChoice || state.pendingStairChoice || state.modals.inventoryOpen || state.modals.studioTopologyOpen || state.modals.runStatsOpen || state.modals.optionsOpen || state.modals.savegamesOpen || state.modals.helpOpen || state.modals.highscoresOpen) {
      return;
    }

    const floorState = getCurrentFloorState();
    const targetX = state.player.x + dx;
    const targetY = state.player.y + dy;

    if (targetX < 0 || targetX >= WIDTH || targetY < 0 || targetY >= HEIGHT) {
      return;
    }

    if (
      dx !== 0 &&
      dy !== 0 &&
      isMovementBlockingTile(state.player.x + dx, state.player.y, floorState) &&
      isMovementBlockingTile(state.player.x, state.player.y + dy, floorState)
    ) {
      addMessage("Die Ecke ist zu eng, um dich diagonal hindurchzuzwängen.");
      renderSelf();
      return;
    }

    if (floorState.grid[targetY][targetX] === TILE.WALL) {
      addMessage("Nur kalter Stein. Dort kommst du nicht durch.");
      renderSelf();
      return;
    }

    const door = getDoorAt(targetX, targetY, floorState);
    if (door && !door.isOpen) {
      if (isDiagonalStep(dx, dy)) {
        addMessage("Eine Tür kannst du nicht diagonal aufdrücken.");
        renderSelf();
        return;
      }

      if (!canPlayerOpenDoor(door)) {
        playLockedDoorSound();
        const hasWrongFloorKey = state.inventory.some((item) =>
          item.type === "key" &&
          item.keyColor === door.lockColor &&
          item.keyFloor !== state.floor
        );
        addMessage(
          hasWrongFloorKey
            ? `Die ${getDoorColorLabels(door.lockColor).adjective} Tür reagiert nicht auf deinen Schlüssel aus einem anderen Studio.`
            : `Die ${getDoorColorLabels(door.lockColor).adjective} Tür bleibt verschlossen.`,
        );
        renderSelf();
        return;
      }

      openDoor(door, "player");
    }

    if (getShowcaseAt(targetX, targetY, floorState)) {
      addMessage("Eine Glasvitrine versperrt dir hier den Weg.");
      renderSelf();
      return;
    }

    const enemy = floorState.enemies.find((entry) => entry.x === targetX && entry.y === targetY);
    if (enemy) {
      attackEnemy(enemy);
      endTurn({ actionType: "other" });
      return;
    }

    state.player.x = targetX;
    state.player.y = targetY;
    playStepSound();

    handleActorEnterTile(state.player);
    if (state.gameOver) {
      renderSelf();
      return;
    }

    detectNearbyTraps();
    maybeTriggerShowcaseAmbience();

    if (tryPickupLoot()) {
      return;
    }

    if (tryUseStairs()) {
      return;
    }

    endTurn({ actionType: "move" });
  }

  function handleWait() {
    const state = getState();
    if (state.gameOver || state.view !== "game" || state.modals.startOpen || state.pendingChoice || state.pendingStairChoice || state.modals.inventoryOpen || state.modals.studioTopologyOpen || state.modals.runStatsOpen || state.modals.optionsOpen || state.modals.savegamesOpen || state.modals.helpOpen || state.modals.highscoresOpen) {
      return;
    }

    if (hasNearbyEnemy()) {
      addMessage("Du wartest, aber in der Nähe ist noch Gefahr.");
    } else {
      addMessage("Du horchst in die Dunkelheit und sammelst langsam wieder Kraft.");
    }

    playStepSound();
    detectNearbyTraps();
    endTurn({ actionType: "wait" });
  }

  function canEnterTargetMode() {
    const state = getState();
    const weapon = getCombatWeapon?.(state.player);
    return Boolean(
      !state.gameOver &&
      state.view === 'game' &&
      !state.modals.startOpen &&
      !state.pendingChoice &&
      !state.pendingStairChoice &&
      !state.modals.inventoryOpen &&
      !state.modals.studioTopologyOpen &&
      !state.modals.runStatsOpen &&
      !state.modals.optionsOpen &&
      !state.modals.savegamesOpen &&
      !state.modals.helpOpen &&
      !state.modals.highscoresOpen &&
      isTargetModeWeapon(weapon),
    );
  }

  function getVisibleTargetData(state = getState()) {
    const floorState = getCurrentFloorState();
    const weapon = getCombatWeapon(state.player);

    return {
      floorState,
      weapon,
      ...getVisibleTargetSelections({
        state,
        floorState,
        weapon,
        rangeDistance: chebyshevDistance,
        hasLineOfSight,
      }),
    };
  }

  function enterTargetMode() {
    const state = getState();
    if (!canEnterTargetMode()) {
      addMessage('Mit dieser Waffe kannst du gerade keinen Zielmodus öffnen.', 'danger');
      renderSelf();
      return;
    }

    const { allVisibleTargets, validTargets } = getVisibleTargetData(state);
    const initialTarget = validTargets[0]?.enemy ?? allVisibleTargets[0]?.enemy ?? { x: state.player.x, y: state.player.y };

    state.targeting.active = true;
    state.targeting.cursorX = initialTarget.x;
    state.targeting.cursorY = initialTarget.y;
    addMessage(
      validTargets.length > 0
        ? 'Zielmodus aktiv: Bewege das Fadenkreuz und bestätige mit Enter.'
        : `Zielmodus aktiv: ${getTargetHintLabel(validTargets[0] ?? allVisibleTargets[0] ?? null)}. Richte das Fadenkreuz aus oder brich mit T ab.`,
      'important',
    );
    renderSelf();
  }

  function cycleTargetMode() {
    const state = getState();
    if (!canEnterTargetMode()) {
      addMessage('Mit dieser Waffe kannst du gerade keinen Zielmodus öffnen.', 'danger');
      renderSelf();
      return;
    }

    const { validTargets } = getVisibleTargetData(state);
    if (validTargets.length === 0) {
      state.targeting.active = false;
      addMessage('Kein gueltiges Ziel in Reichweite oder Sichtlinie.');
      renderSelf();
      return;
    }

    const wasActive = Boolean(state.targeting?.active);
    const currentIndex = wasActive
      ? validTargets.findIndex((target) =>
          target.enemy?.x === state.targeting.cursorX &&
          target.enemy?.y === state.targeting.cursorY,
        )
      : -1;

    if (currentIndex === validTargets.length - 1) {
      state.targeting.active = false;
      renderSelf();
      return;
    }

    const nextTarget = validTargets[currentIndex >= 0 ? currentIndex + 1 : 0]?.enemy;
    if (!nextTarget) {
      state.targeting.active = false;
      renderSelf();
      return;
    }

    state.targeting.active = true;
    state.targeting.cursorX = nextTarget.x;
    state.targeting.cursorY = nextTarget.y;

    renderSelf();
  }

  function cancelTargetMode() {
    const state = getState();
    if (!state.targeting?.active) {
      return;
    }
    state.targeting.active = false;
    renderSelf();
  }

  function moveTargetCursor(dx, dy) {
    const state = getState();
    if (!state.targeting?.active) {
      return;
    }

    state.targeting.cursorX = Math.max(0, Math.min(WIDTH - 1, state.targeting.cursorX + dx));
    state.targeting.cursorY = Math.max(0, Math.min(HEIGHT - 1, state.targeting.cursorY + dy));
    renderSelf();
  }

  function selectTargetTile(x, y, { confirmIfSame = false } = {}) {
    const state = getState();
    if (!state.targeting?.active) {
      return;
    }

    const clampedX = Math.max(0, Math.min(WIDTH - 1, x));
    const clampedY = Math.max(0, Math.min(HEIGHT - 1, y));
    const isSameTile = state.targeting.cursorX === clampedX && state.targeting.cursorY === clampedY;

    state.targeting.cursorX = clampedX;
    state.targeting.cursorY = clampedY;
    renderSelf();

    if (confirmIfSame && isSameTile) {
      confirmTargetAttack();
    }
  }

  function confirmTargetAttack() {
    const state = getState();
    if (!state.targeting?.active) {
      return;
    }

    const floorState = getCurrentFloorState();
    const weapon = getCombatWeapon(state.player);
    const targetSelection = evaluateTargetSelection({
      state,
      floorState,
      weapon,
      x: state.targeting.cursorX,
      y: state.targeting.cursorY,
      rangeDistance: chebyshevDistance,
      hasLineOfSight,
    });

    if (!targetSelection.enemy) {
      addMessage('Dort steht kein Ziel.');
      renderSelf();
      return;
    }

    if (!targetSelection.valid) {
      addMessage('Dieses Ziel liegt nicht sauber in Reichweite oder Sichtlinie.', 'danger');
      renderSelf();
      return;
    }

    state.targeting.active = false;
    attackEnemy(targetSelection.enemy, { distance: targetSelection.distance });
    endTurn({ actionType: 'other' });
  }

  return {
    endTurn,
    tryCloseAdjacentDoor,
    movePlayer,
    handleWait,
    enterTargetMode,
    cycleTargetMode,
    cancelTargetMode,
    moveTargetCursor,
    selectTargetTile,
    confirmTargetAttack,
  };
}
