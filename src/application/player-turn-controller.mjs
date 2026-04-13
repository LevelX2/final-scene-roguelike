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
    isStraightShot,
    getCombatWeapon,
    processRoundStatusEffects,
    processContinuousTraps,
    processSafeRegeneration,
    applyPlayerNutritionTurnCost,
    renderSelf,
  } = context;

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
    renderSelf();
  }

  function tryCloseAdjacentDoor() {
    const state = getState();
    if (state.gameOver || state.view !== "game" || state.modals.startOpen || state.pendingChoice || state.pendingStairChoice || state.modals.inventoryOpen || state.modals.runStatsOpen || state.modals.optionsOpen || state.modals.helpOpen || state.modals.highscoresOpen) {
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
      manhattanDistance(door, state.player) === 1
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
    if (state.gameOver || state.view !== "game" || state.modals.startOpen || state.pendingChoice || state.pendingStairChoice || state.modals.inventoryOpen || state.modals.runStatsOpen || state.modals.helpOpen || state.modals.highscoresOpen) {
      return;
    }

    const floorState = getCurrentFloorState();
    const targetX = state.player.x + dx;
    const targetY = state.player.y + dy;

    if (targetX < 0 || targetX >= WIDTH || targetY < 0 || targetY >= HEIGHT) {
      return;
    }

    if (floorState.grid[targetY][targetX] === TILE.WALL) {
      addMessage("Nur kalter Stein. Dort kommst du nicht durch.");
      renderSelf();
      return;
    }

    const door = getDoorAt(targetX, targetY, floorState);
    if (door && !door.isOpen) {
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
    if (state.gameOver || state.view !== "game" || state.modals.startOpen || state.pendingChoice || state.pendingStairChoice || state.modals.inventoryOpen || state.modals.runStatsOpen || state.modals.helpOpen || state.modals.highscoresOpen) {
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
      !state.modals.runStatsOpen &&
      !state.modals.helpOpen &&
      !state.modals.highscoresOpen &&
      weapon?.attackMode === 'ranged' &&
      (weapon?.range ?? 1) > 1,
    );
  }

  function enterTargetMode() {
    const state = getState();
    if (!canEnterTargetMode()) {
      addMessage('Mit dieser Waffe kannst du gerade keinen Zielmodus öffnen.', 'danger');
      renderSelf();
      return;
    }

    const floorState = getCurrentFloorState();
    const weapon = getCombatWeapon(state.player);
    const enemies = (floorState.enemies ?? [])
      .filter((enemy) => {
        const distance = manhattanDistance(enemy, state.player);
        return (
          distance <= (weapon.range ?? 1) &&
          isStraightShot?.(state.player.x, state.player.y, enemy.x, enemy.y) &&
          hasLineOfSight?.(floorState, state.player.x, state.player.y, enemy.x, enemy.y)
        );
      })
      .sort((left, right) => manhattanDistance(left, state.player) - manhattanDistance(right, state.player));
    const initialTarget = enemies[0] ?? { x: state.player.x, y: state.player.y };

    state.targeting.active = true;
    state.targeting.cursorX = initialTarget.x;
    state.targeting.cursorY = initialTarget.y;
    addMessage(
      enemies.length > 0
        ? 'Zielmodus aktiv: Bewege das Fadenkreuz und bestätige mit Enter.'
        : 'Zielmodus aktiv: Kein Ziel in gerader Linie und Sichtweite. Richte das Fadenkreuz aus oder brich mit Esc ab.',
      'important',
    );
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

  function confirmTargetAttack() {
    const state = getState();
    if (!state.targeting?.active) {
      return;
    }

    const floorState = getCurrentFloorState();
    const weapon = getCombatWeapon(state.player);
    const enemy = floorState.enemies.find((entry) => entry.x === state.targeting.cursorX && entry.y === state.targeting.cursorY);
    if (!enemy) {
      addMessage('Dort steht kein Ziel.');
      renderSelf();
      return;
    }

    const distance = manhattanDistance(enemy, state.player);
    if (
      distance > (weapon.range ?? 1) ||
      !isStraightShot?.(state.player.x, state.player.y, enemy.x, enemy.y) ||
      !hasLineOfSight?.(floorState, state.player.x, state.player.y, enemy.x, enemy.y)
    ) {
      addMessage('Dieses Ziel liegt nicht sauber in gerader Linie, Reichweite oder Sichtlinie.', 'danger');
      renderSelf();
      return;
    }

    state.targeting.active = false;
    attackEnemy(enemy, { distance });
    endTurn({ actionType: 'other' });
  }

  return {
    endTurn,
    tryCloseAdjacentDoor,
    movePlayer,
    handleWait,
    enterTargetMode,
    cancelTargetMode,
    moveTargetCursor,
    confirmTargetAttack,
  };
}
