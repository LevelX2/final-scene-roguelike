export function createDungeonSpatialApi(context) {
  const {
    WIDTH,
    HEIGHT,
    TILE,
    DOOR_TYPE,
    createDoor,
    getState,
  } = context;

  function collectUsedShowcasePropIds() {
    const state = getState();
    if (!state?.floors) {
      return new Set();
    }

    const usedPropIds = new Set();
    Object.values(state.floors).forEach((floorState) => {
      (floorState?.showcases ?? []).forEach((showcase) => {
        const propId = showcase?.item?.id;
        if (propId) {
          usedPropIds.add(propId);
        }
      });
    });
    return usedPropIds;
  }

  function getRoomCenter(room) {
    return {
      x: room.x + Math.floor(room.width / 2),
      y: room.y + Math.floor(room.height / 2),
    };
  }

  function getCardinalNeighbors(x, y) {
    return [
      { x: x + 1, y },
      { x: x - 1, y },
      { x, y: y + 1 },
      { x, y: y - 1 },
    ];
  }

  function clampToRoom(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function getRoomConnectionPoint(room, target) {
    const center = getRoomCenter(room);
    const deltaX = target.x - center.x;
    const deltaY = target.y - center.y;

    if (Math.abs(deltaX) >= Math.abs(deltaY)) {
      return {
        x: deltaX >= 0 ? room.x + room.width - 1 : room.x,
        y: clampToRoom(target.y, room.y, room.y + room.height - 1),
      };
    }

    return {
      x: clampToRoom(target.x, room.x, room.x + room.width - 1),
      y: deltaY >= 0 ? room.y + room.height - 1 : room.y,
    };
  }

  function isPositionInsideRoom(position, room) {
    return (
      position.x >= room.x &&
      position.x < room.x + room.width &&
      position.y >= room.y &&
      position.y < room.y + room.height
    );
  }

  function buildTunnelPath(start, end) {
    const path = [{ x: start.x, y: start.y }];
    let x = start.x;
    let y = start.y;

    while (x !== end.x) {
      x += x < end.x ? 1 : -1;
      path.push({ x, y });
    }

    while (y !== end.y) {
      y += y < end.y ? 1 : -1;
      path.push({ x, y });
    }

    return path;
  }

  function isWallOrOutside(grid, x, y) {
    return x < 0 || y < 0 || x >= WIDTH || y >= HEIGHT || grid[y][x] === TILE.WALL;
  }

  function isTileWalkable(grid, x, y) {
    return x >= 0 && y >= 0 && x < WIDTH && y < HEIGHT && grid[y][x] === TILE.FLOOR;
  }

  function isValidDoorSlot(grid, x, y) {
    if (grid[y]?.[x] !== TILE.FLOOR) {
      return false;
    }

    const wallsLeftRight = isWallOrOutside(grid, x - 1, y) && isWallOrOutside(grid, x + 1, y);
    const wallsUpDown = isWallOrOutside(grid, x, y - 1) && isWallOrOutside(grid, x, y + 1);
    return wallsLeftRight || wallsUpDown;
  }

  function getDoorCandidate(grid, previous, current, roomIdA, roomIdB, tunnelPath = null) {
    const path = tunnelPath ?? buildTunnelPath(getRoomCenter(previous), getRoomCenter(current));

    for (let index = 1; index < path.length; index += 1) {
      const currentStep = path[index];
      const previousStep = path[index - 1];
      const entersCurrentRoom =
        isPositionInsideRoom(currentStep, current) &&
        !isPositionInsideRoom(previousStep, current);

      if (entersCurrentRoom) {
        const slotCandidates = path
          .map((step, candidateIndex) => ({
            ...step,
            distanceToEntry: Math.abs(candidateIndex - (index - 1)),
          }))
          .filter((step) => isValidDoorSlot(grid, step.x, step.y))
          .sort((left, right) => left.distanceToEntry - right.distanceToEntry);

        if (slotCandidates.length > 0) {
          return createDoor(slotCandidates[0].x, slotCandidates[0].y, { roomIdA, roomIdB });
        }

        return null;
      }
    }

    return null;
  }

  function computeReachableTiles(grid, startPosition, doors) {
    const queue = [startPosition];
    const seen = new Set([`${startPosition.x},${startPosition.y}`]);
    const reachable = [];

    while (queue.length > 0) {
      const current = queue.shift();
      reachable.push(current);

      for (const direction of [
        { x: 1, y: 0 },
        { x: -1, y: 0 },
        { x: 0, y: 1 },
        { x: 0, y: -1 },
      ]) {
        const nextX = current.x + direction.x;
        const nextY = current.y + direction.y;
        const key = `${nextX},${nextY}`;

        if (seen.has(key)) {
          continue;
        }

        if (nextX < 0 || nextY < 0 || nextX >= WIDTH || nextY >= HEIGHT) {
          continue;
        }

        if (grid[nextY][nextX] !== TILE.FLOOR) {
          continue;
        }

        const door = doors.find((entry) => entry.x === nextX && entry.y === nextY);
        if (door && !door.isOpen && door.doorType === DOOR_TYPE.LOCKED) {
          continue;
        }

        seen.add(key);
        queue.push({ x: nextX, y: nextY });
      }
    }

    return reachable;
  }

  function computeReachableTilesWithBlockedPositions(grid, startPosition, doors, blockedPositions = []) {
    const blocked = new Set(blockedPositions.map((position) => `${position.x},${position.y}`));
    const queue = [startPosition];
    const seen = new Set([`${startPosition.x},${startPosition.y}`]);
    const reachable = [];

    while (queue.length > 0) {
      const current = queue.shift();
      reachable.push(current);

      for (const direction of [
        { x: 1, y: 0 },
        { x: -1, y: 0 },
        { x: 0, y: 1 },
        { x: 0, y: -1 },
      ]) {
        const nextX = current.x + direction.x;
        const nextY = current.y + direction.y;
        const key = `${nextX},${nextY}`;

        if (seen.has(key) || blocked.has(key)) {
          continue;
        }

        if (!isTileWalkable(grid, nextX, nextY)) {
          continue;
        }

        const door = doors.find((entry) => entry.x === nextX && entry.y === nextY);
        if (door && !door.isOpen && door.doorType === DOOR_TYPE.LOCKED) {
          continue;
        }

        seen.add(key);
        queue.push({ x: nextX, y: nextY });
      }
    }

    return reachable;
  }

  function hasReachableMatchingKey(grid, startPosition, doors, keys, lockedDoor) {
    if (!lockedDoor || lockedDoor.doorType !== DOOR_TYPE.LOCKED) {
      return true;
    }

    const reachableKeys = computeReachableTiles(grid, startPosition, doors);
    return reachableKeys.some((tile) =>
      keys.some((entry) =>
        entry.x === tile.x &&
        entry.y === tile.y &&
        entry.item.keyColor === lockedDoor.lockColor &&
        entry.item.keyFloor != null
      )
    );
  }

  function isLockedRoomSealed(grid, startPosition, doors, room, lockedDoor) {
    if (!room || !lockedDoor) {
      return false;
    }

    const simulatedDoors = doors.map((door) =>
      door === lockedDoor
        ? {
            ...door,
            isOpen: false,
            doorType: DOOR_TYPE.LOCKED,
          }
        : door
    );
    const reachableTiles = computeReachableTiles(grid, startPosition, simulatedDoors);

    return !reachableTiles.some((tile) => isPositionInsideRoom(tile, room));
  }

  return {
    collectUsedShowcasePropIds,
    getRoomCenter,
    getCardinalNeighbors,
    clampToRoom,
    getRoomConnectionPoint,
    isPositionInsideRoom,
    buildTunnelPath,
    isWallOrOutside,
    isTileWalkable,
    isValidDoorSlot,
    getDoorCandidate,
    computeReachableTiles,
    computeReachableTilesWithBlockedPositions,
    hasReachableMatchingKey,
    isLockedRoomSealed,
  };
}
