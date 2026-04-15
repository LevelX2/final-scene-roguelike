import { formatMonsterReference } from '../text/combat-phrasing.mjs';
import { ensureRunStudioTopology, getStudioTopologyNode } from '../studio-topology.mjs';

export function createFloorTransitionService(context) {
  const {
    getState,
    getCurrentFloorState,
    createDungeonLevel,
    randomInt,
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

  function cloneHint(position) {
    return position ? { x: position.x, y: position.y } : null;
  }

  function syncTopologyAnchorHints(topology, floorNumber, floorState) {
    if (!topology?.nodes || !floorState) {
      return;
    }

    const node = topology.nodes[floorNumber];
    if (node) {
      node.entryTransitionHint = cloneHint(floorState.entryAnchor?.transitionPosition ?? floorState.stairsUp);
      node.exitTransitionHint = cloneHint(floorState.exitAnchor?.transitionPosition ?? floorState.stairsDown);
    }

    const previousNode = topology.nodes[floorNumber - 1];
    if (previousNode && !previousNode.exitTransitionHint && floorState.entryAnchor?.transitionPosition) {
      previousNode.exitTransitionHint = cloneHint(floorState.entryAnchor.transitionPosition);
    }

    const nextNode = topology.nodes[floorNumber + 1];
    if (nextNode && floorState.exitAnchor?.transitionPosition) {
      nextNode.entryTransitionHint = cloneHint(floorState.exitAnchor.transitionPosition);
    }
  }

  function getAnchorInteractionPosition(anchor, fallback) {
    return anchor?.transitionPosition ?? anchor?.position ?? fallback ?? null;
  }

  function getAnchorSpawnPosition(anchor, fallback) {
    return anchor?.position ?? fallback ?? null;
  }

  function ensureFloorExists(floorNumber) {
    const state = getState();
    state.runStudioTopology = ensureRunStudioTopology(
      state.runStudioTopology,
      floorNumber + 1,
      randomInt,
    );
    if (!state.floors[floorNumber]) {
      state.floors[floorNumber] = createDungeonLevel(floorNumber, {
        studioArchetypeId: getArchetypeForFloor(state.runArchetypeSequence, floorNumber),
        runArchetypeSequence: state.runArchetypeSequence,
        studioTopologyNode: getStudioTopologyNode(state.runStudioTopology, floorNumber),
      });
      syncTopologyAnchorHints(state.runStudioTopology, floorNumber, state.floors[floorNumber]);
    }
  }

  function isWalkableFollowerTile(floorState, position) {
    return floorState?.grid?.[position.y]?.[position.x] === '.';
  }

  function isOccupiedFollowerTile(floorState, position) {
    const state = getState();
    return floorState.enemies.some((enemy) => enemy.x === position.x && enemy.y === position.y) ||
      (state.player.x === position.x && state.player.y === position.y);
  }

  function findFollowerDestination(destinationFloor, targetStair) {
    const candidates = [
      targetStair,
      { x: targetStair.x + 1, y: targetStair.y },
      { x: targetStair.x - 1, y: targetStair.y },
      { x: targetStair.x, y: targetStair.y + 1 },
      { x: targetStair.x, y: targetStair.y - 1 },
      { x: targetStair.x + 1, y: targetStair.y + 1 },
      { x: targetStair.x + 1, y: targetStair.y - 1 },
      { x: targetStair.x - 1, y: targetStair.y + 1 },
      { x: targetStair.x - 1, y: targetStair.y - 1 },
    ];

    return candidates.find((position) =>
      isWalkableFollowerTile(destinationFloor, position) &&
      !isOccupiedFollowerTile(destinationFloor, position)
    ) ?? null;
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

    const destination = findFollowerDestination(destinationFloor, targetStair);
    if (!destination) {
      return null;
    }

    sourceFloor.enemies = sourceFloor.enemies.filter((enemy) => enemy !== follower);
    follower.x = destination.x;
    follower.y = destination.y;
    follower.originX = destination.x;
    follower.originY = destination.y;
    destinationFloor.enemies.push(follower);
    return follower;
  }

  function formatFollowerLabel(follower) {
    return formatMonsterReference(follower, {
      article: 'definite',
      grammaticalCase: 'nominative',
      capitalize: true,
    });
  }

  function moveToFloor(direction) {
    const state = getState();
    const currentFloorState = getCurrentFloorState();
    const targetFloor = state.floor + direction;
    state.safeRestTurns = 0;
    const sourceStair = direction > 0
      ? getAnchorInteractionPosition(currentFloorState.exitAnchor, currentFloorState.stairsDown)
      : getAnchorInteractionPosition(currentFloorState.entryAnchor, currentFloorState.stairsUp);
    const isFirstVisit = !state.visitedFloors.includes(targetFloor);

    if (direction > 0) {
      ensureFloorExists(targetFloor);
      state.floor = targetFloor;
      state.deepestFloor = Math.max(state.deepestFloor, state.floor);
      const targetInteraction = getAnchorInteractionPosition(state.floors[targetFloor].entryAnchor, state.floors[targetFloor].stairsUp)
        ?? state.floors[targetFloor].startPosition;
      const targetSpawn = getAnchorSpawnPosition(state.floors[targetFloor].entryAnchor, state.floors[targetFloor].startPosition)
        ?? targetInteraction;
      state.player.x = targetSpawn.x;
      state.player.y = targetSpawn.y;
      detectNearbyTraps();
      maybeTriggerShowcaseAmbience();
      const follower = transferFloorFollower(targetFloor - 1, targetFloor, sourceStair, targetInteraction);
      addMessage(`Du betrittst ${formatStudioLabel(state.floor)}. ${formatArchetypeLabel(state.floors[targetFloor].studioArchetypeId)}`, 'important');
      if (isFirstVisit) {
        state.visitedFloors.push(targetFloor);
        const announcement = buildStudioAnnouncement(state.floor, state.floors[targetFloor].studioArchetypeId);
        addMessage(announcement, 'important');
        playStudioAnnouncement(announcement);
      }
      if (follower) {
        addMessage(`${formatFollowerLabel(follower)} folgt dir über die Treppe.`, 'danger');
      }
      return true;
    }

    if (direction < 0 && (currentFloorState.entryAnchor?.position ?? currentFloorState.stairsUp) && state.floor > 1) {
      state.floor = targetFloor;
      const targetInteraction = getAnchorInteractionPosition(state.floors[targetFloor].exitAnchor, state.floors[targetFloor].stairsDown);
      const targetSpawn = getAnchorSpawnPosition(state.floors[targetFloor].exitAnchor, targetInteraction);
      state.player.x = targetSpawn.x;
      state.player.y = targetSpawn.y;
      detectNearbyTraps();
      maybeTriggerShowcaseAmbience();
      const follower = transferFloorFollower(targetFloor + 1, targetFloor, sourceStair, targetInteraction);
      addMessage(`Du kehrst in ${formatStudioLabel(state.floor)} zurück. ${formatArchetypeLabel(state.floors[targetFloor].studioArchetypeId)}`, 'important');
      if (follower) {
        addMessage(`${formatFollowerLabel(follower)} setzt dir weiter nach.`, 'danger');
      }
      return true;
    }

    return false;
  }

  function tryUseStairs() {
    const state = getState();
    const floorState = getCurrentFloorState();
    const exitPosition = getAnchorInteractionPosition(floorState.exitAnchor, floorState.stairsDown);
    const entryPosition = getAnchorInteractionPosition(floorState.entryAnchor, floorState.stairsUp);

    if (exitPosition && exitPosition.x === state.player.x && exitPosition.y === state.player.y) {
      showStairChoice({
        direction: 1,
        title: 'Übergang',
        text: `Du stehst an einem Übergang. Möchtest du ${formatStudioLabel(state.floor + 1)} betreten oder hier bleiben?`,
        confirmLabel: 'Betreten',
        stayLabel: 'Hier bleiben',
      });
      renderSelf();
      return true;
    }

    if (entryPosition && state.floor > 1 && entryPosition.x === state.player.x && entryPosition.y === state.player.y) {
      showStairChoice({
        direction: -1,
        title: 'Übergang',
        text: `Du stehst an einem Übergang. Möchtest du in ${formatStudioLabel(state.floor - 1)} zurückkehren oder hier bleiben?`,
        confirmLabel: 'Zurückkehren',
        stayLabel: 'Hier bleiben',
      });
      renderSelf();
      return true;
    }

    return false;
  }

  function debugRevealOrAdvanceStudio() {
    const state = getState();
    const floorState = getCurrentFloorState();
    if (!floorState) {
      return false;
    }

    if (!floorState.debugReveal) {
      floorState.debugReveal = true;
      renderSelf();
      return true;
    }

    ensureFloorExists(state.floor + 1);
    moveToFloor(1);
    const nextFloorState = getCurrentFloorState();
    if (nextFloorState) {
      nextFloorState.debugReveal = true;
    }
    renderSelf();
    return true;
  }

  return {
    ensureFloorExists,
    transferFloorFollower,
    moveToFloor,
    tryUseStairs,
    debugRevealOrAdvanceStudio,
  };
}
