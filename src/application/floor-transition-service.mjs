export function createFloorTransitionService(context) {
  const {
    getState,
    getCurrentFloorState,
    createDungeonLevel,
    detectNearbyTraps,
    maybeTriggerShowcaseAmbience,
    manhattanDistance,
    addMessage,
    formatStudioLabel,
    formatArchetypeLabel,
    buildStudioAnnouncement,
    getArchetypeForFloor,
    playStudioAnnouncement,
    showStairChoice,
    renderSelf,
  } = context;

  function ensureFloorExists(floorNumber) {
    const state = getState();
    if (!state.floors[floorNumber]) {
      state.floors[floorNumber] = createDungeonLevel(floorNumber, {
        studioArchetypeId: getArchetypeForFloor(state.runArchetypeSequence, floorNumber),
        runArchetypeSequence: state.runArchetypeSequence,
      });
    }
  }

  function transferFloorFollower(fromFloor, targetFloor, sourceStair, targetStair) {
    const state = getState();
    const sourceFloor = state.floors[fromFloor];
    const destinationFloor = state.floors[targetFloor];
    if (!sourceFloor || !destinationFloor || !sourceStair || !targetStair) {
      return null;
    }

    const follower = sourceFloor.enemies.find((enemy) =>
      enemy.canChangeFloors &&
      enemy.aggro &&
      manhattanDistance(enemy, sourceStair) <= 2
    );

    if (!follower) {
      return null;
    }

    const occupied = destinationFloor.enemies.some((enemy) => enemy.x === targetStair.x && enemy.y === targetStair.y) ||
      (state.player.x === targetStair.x && state.player.y === targetStair.y);
    if (occupied) {
      return null;
    }

    sourceFloor.enemies = sourceFloor.enemies.filter((enemy) => enemy !== follower);
    follower.x = targetStair.x;
    follower.y = targetStair.y;
    follower.originX = targetStair.x;
    follower.originY = targetStair.y;
    destinationFloor.enemies.push(follower);
    return follower;
  }

  function moveToFloor(direction) {
    const state = getState();
    const currentFloorState = getCurrentFloorState();
    const targetFloor = state.floor + direction;
    state.safeRestTurns = 0;
    const sourceStair = direction > 0 ? currentFloorState.stairsDown : currentFloorState.stairsUp;
    const isFirstVisit = !state.visitedFloors.includes(targetFloor);

    if (direction > 0) {
      ensureFloorExists(targetFloor);
      state.floor = targetFloor;
      state.deepestFloor = Math.max(state.deepestFloor, state.floor);
      const targetStair = state.floors[targetFloor].stairsUp
        ? state.floors[targetFloor].stairsUp
        : state.floors[targetFloor].startPosition;
      state.player.x = targetStair.x;
      state.player.y = targetStair.y;
      detectNearbyTraps();
      maybeTriggerShowcaseAmbience();
      const follower = transferFloorFollower(targetFloor - 1, targetFloor, sourceStair, targetStair);
      addMessage(`Du betrittst ${formatStudioLabel(state.floor)}.`, "important");
      addMessage(formatArchetypeLabel(state.floors[targetFloor].studioArchetypeId), "important");
      if (isFirstVisit) {
        state.visitedFloors.push(targetFloor);
        const announcement = buildStudioAnnouncement(state.floor, state.floors[targetFloor].studioArchetypeId);
        addMessage(announcement, "important");
        playStudioAnnouncement(announcement);
      }
      if (follower) {
        addMessage(`${follower.name} folgt dir über die Treppe.`, "danger");
      }
      return true;
    }

    if (direction < 0 && currentFloorState.stairsUp && state.floor > 1) {
      state.floor = targetFloor;
      const targetStair = state.floors[targetFloor].stairsDown;
      state.player.x = targetStair.x;
      state.player.y = targetStair.y;
      detectNearbyTraps();
      maybeTriggerShowcaseAmbience();
      const follower = transferFloorFollower(targetFloor + 1, targetFloor, sourceStair, targetStair);
      addMessage(`Du kehrst in ${formatStudioLabel(state.floor)} zurück.`, "important");
      addMessage(formatArchetypeLabel(state.floors[targetFloor].studioArchetypeId), "important");
      if (follower) {
        addMessage(`${follower.name} setzt dir weiter nach.`, "danger");
      }
      return true;
    }

    return false;
  }

  function tryUseStairs() {
    const state = getState();
    const floorState = getCurrentFloorState();

    if (floorState.stairsDown && floorState.stairsDown.x === state.player.x && floorState.stairsDown.y === state.player.y) {
      showStairChoice({
        direction: 1,
        title: "Übergang",
        text: `Du stehst an einem Übergang. Möchtest du ${formatStudioLabel(state.floor + 1)} betreten oder hier bleiben?`,
        confirmLabel: "Betreten",
        stayLabel: "Hier bleiben",
      });
      renderSelf();
      return true;
    }

    if (floorState.stairsUp && floorState.stairsUp.x === state.player.x && floorState.stairsUp.y === state.player.y) {
      showStairChoice({
        direction: -1,
        title: "Übergang",
        text: `Du stehst an einem Übergang. Möchtest du in ${formatStudioLabel(state.floor - 1)} zurückkehren oder hier bleiben?`,
        confirmLabel: "Zurückkehren",
        stayLabel: "Hier bleiben",
      });
      renderSelf();
      return true;
    }

    return false;
  }

  return {
    ensureFloorExists,
    transferFloorFollower,
    moveToFloor,
    tryUseStairs,
  };
}
