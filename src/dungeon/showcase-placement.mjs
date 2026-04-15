export function createShowcasePlacementApi(context) {
  const {
    propCatalog,
    randomChance = Math.random,
    randomInt,
    createShowcase,
    collectUsedShowcasePropIds,
    getCardinalNeighbors,
    isTileWalkable,
    computeReachableTilesWithBlockedPositions,
    isPositionInsideRoom,
  } = context;

  function buildShowcasePropPool(studioArchetypeId, usedPropIds) {
    const archetypeSpecific = propCatalog.filter((prop) => prop.archetype === studioArchetypeId);
    const globalProps = propCatalog.filter((prop) => prop.archetype === 'global');
    const pools = [
      archetypeSpecific.filter((prop) => !usedPropIds.has(prop.id)),
      globalProps.filter((prop) => !usedPropIds.has(prop.id)),
      archetypeSpecific,
      globalProps,
    ];
    const ordered = [];

    pools.forEach((pool, poolIndex) => {
      for (const prop of pool) {
        const alreadySelected = ordered.some((entry) => entry.id === prop.id);
        if (alreadySelected && poolIndex < 2) {
          continue;
        }
        ordered.push(prop);
      }
    });

    return ordered;
  }

  function chooseShowcaseRooms(rooms, startRoomIndex, goalRoomIndex) {
    return rooms
      .map((room, index) => ({ room, index }))
      .filter(({ room, index }) =>
        room.width >= 5 &&
        room.height >= 5 &&
        index !== startRoomIndex &&
        index !== goalRoomIndex
      );
  }

  function getShowcaseCandidateTiles(grid, room, roomIndex, doors, occupied, stairsUp, stairsDown, startPosition) {
    const blockedKeys = new Set(occupied.map((entry) => `${entry.x},${entry.y}`));
    const avoidPoints = [
      startPosition,
      stairsUp,
      stairsDown,
      ...doors
        .filter((door) => door.roomIdA === roomIndex || door.roomIdB === roomIndex)
        .map((door) => ({ x: door.x, y: door.y })),
    ].filter(Boolean);

    const candidates = [];
    for (let y = room.y; y < room.y + room.height; y += 1) {
      for (let x = room.x; x < room.x + room.width; x += 1) {
        const key = `${x},${y}`;
        if (blockedKeys.has(key)) {
          continue;
        }

        const tooCloseToImportantTile = avoidPoints.some((point) =>
          Math.abs(point.x - x) + Math.abs(point.y - y) <= 1
        );
        if (tooCloseToImportantTile) {
          continue;
        }

        const walkableNeighbors = getCardinalNeighbors(x, y)
          .filter((neighbor) => isTileWalkable(grid, neighbor.x, neighbor.y));
        if (walkableNeighbors.length < 2) {
          continue;
        }

        const touchesOuterWall = getCardinalNeighbors(x, y)
          .some((neighbor) => !isTileWalkable(grid, neighbor.x, neighbor.y));
        const distanceToRoomCenter =
          Math.abs((room.x + Math.floor(room.width / 2)) - x) +
          Math.abs((room.y + Math.floor(room.height / 2)) - y);
        const edgeBias = touchesOuterWall ? 2 : 0;

        candidates.push({
          x,
          y,
          score: walkableNeighbors.length * 3 + edgeBias - distanceToRoomCenter * 0.15 + randomChance() * 0.75,
        });
      }
    }

    return candidates.sort((left, right) => right.score - left.score);
  }

  function placeShowcases({
    grid,
    rooms,
    startRoomIndex,
    goalRoomIndex,
    doors,
    occupied,
    stairsUp,
    stairsDown,
    startPosition,
    studioArchetypeId,
  }) {
    const showcases = [];
    const eligibleRooms = chooseShowcaseRooms(rooms, startRoomIndex, goalRoomIndex);
    if (!eligibleRooms.length) {
      return showcases;
    }

    const desiredCount = Math.max(
      2,
      Math.min(
        10,
        Math.round(eligibleRooms.length * (0.35 + randomChance() * 0.18)),
      ),
    );
    const shuffledRooms = [...eligibleRooms];
    for (let index = shuffledRooms.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(randomChance() * (index + 1));
      [shuffledRooms[index], shuffledRooms[swapIndex]] = [shuffledRooms[swapIndex], shuffledRooms[index]];
    }
    const usedPropIds = collectUsedShowcasePropIds();
    const propPool = buildShowcasePropPool(studioArchetypeId, usedPropIds);

    for (const { room, index } of shuffledRooms) {
      if (showcases.length >= desiredCount) {
        break;
      }

      const candidateTiles = getShowcaseCandidateTiles(
        grid,
        room,
        index,
        doors,
        occupied,
        stairsUp,
        stairsDown,
        startPosition,
      );
      if (!candidateTiles.length) {
        continue;
      }

      const baselineReachableTiles = computeReachableTilesWithBlockedPositions(
        grid,
        startPosition,
        doors,
        showcases,
      );
      const baselineReachableKeys = new Set(
        baselineReachableTiles.map((tile) => `${tile.x},${tile.y}`),
      );

      const candidate = candidateTiles[0];
      const reachableTiles = computeReachableTilesWithBlockedPositions(
        grid,
        startPosition,
        doors,
        [...showcases, candidate],
      );
      const reachableKeys = new Set(reachableTiles.map((tile) => `${tile.x},${tile.y}`));
      const roomStillReachable = reachableTiles.some((tile) => isPositionInsideRoom(tile, room));
      const candidateOnlyRemovesItself = [...baselineReachableKeys].every((key) => {
        if (key === `${candidate.x},${candidate.y}`) {
          return true;
        }
        return reachableKeys.has(key);
      });

      if (!roomStillReachable || !candidateOnlyRemovesItself) {
        continue;
      }

      const prop = propPool.find((entry) => !usedPropIds.has(entry.id))
        ?? propPool[randomInt(0, Math.max(0, propPool.length - 1))];
      if (!prop) {
        continue;
      }
      usedPropIds.add(prop.id);
      showcases.push(createShowcase(prop, candidate.x, candidate.y));
      occupied.push({ x: candidate.x, y: candidate.y });
    }

    return showcases;
  }

  return {
    chooseShowcaseRooms,
    getShowcaseCandidateTiles,
    placeShowcases,
  };
}
