import { PROP_CATALOG } from './data.mjs';
import {
  NON_ICONIC_MONSTER_WEIGHT_BONUS,
  ICONIC_MONSTER_WEIGHT_PENALTY,
  ENEMY_HP_PER_SCALE,
  ENEMY_XP_PER_SCALE,
  ENEMY_STRENGTH_SCALE_STEP,
  ENEMY_PRECISION_SCALE_STEP,
  ENEMY_REACTION_SCALE_STEP,
  ENEMY_NERVES_SCALE_STEP,
  ENEMY_INTELLIGENCE_SCALE_STEP,
  ENEMY_AGGRO_RADIUS_CAP,
  MONSTER_VARIANT_TIERS,
  MONSTER_VARIANT_MODIFIERS,
  getMonsterVariantWeights,
  getEnemyScaleForFloor,
  shouldSpawnFloorShield,
} from './balance.mjs';
import { createDungeonEquipmentRolls } from './dungeon/equipment-rolls.mjs';
import { createDungeonEnemyFactory } from './dungeon/enemy-factory.mjs';
import { createDungeonPickupFactory } from './dungeon/pickup-factory.mjs';
import { createShowcasePlacementApi } from './dungeon/showcase-placement.mjs';
import { createDungeonSpatialApi } from './dungeon/spatial-helpers.mjs';
import { getArchetypeForFloor } from './studio-theme.mjs';
import { createWeaponGenerationService } from './application/weapon-generation-service.mjs';
import { getContainerConfigForArchetype } from './content/catalogs/studio-archetypes.mjs';

export function createDungeonApi(context) {
  const {
    WIDTH,
    HEIGHT,
    ROOM_ATTEMPTS,
    MIN_ROOM_SIZE,
    MAX_ROOM_SIZE,
    TILE,
    MONSTER_CATALOG,
    OFFHAND_CATALOG,
    PROP_CATALOG: propCatalog = PROP_CATALOG,
    DOOR_TYPE,
    LOCK_COLORS,
    buildFoodItemsForBudget,
    rollFoodBudget,
    splitFoodBudget,
    rollMonsterPlannedDrop,
    getLockedDoorCountForFloor,
    buildTrapsForFloor,
    randomInt,
    createGrid,
    carveRoom,
    carveTunnel,
    roomsOverlap,
    cloneOffHandItem,
    generateEquipmentItem,
    getState,
  } = context;

  const pickupFactory = createDungeonPickupFactory({
    DOOR_TYPE,
    cloneOffHandItem,
  });

  const {
    createWeaponPickup,
    createOffHandPickup,
    createChestPickup,
    createFoodPickup,
    createShowcase,
    cloneWeapon,
    createDoor,
    createKeyPickup,
  } = pickupFactory;

  const equipmentRolls = createDungeonEquipmentRolls({
    OFFHAND_CATALOG,
    cloneWeapon,
    cloneOffHandItem,
    generateEquipmentItem,
    getState,
    createLootWeapon: (...args) => weaponGenerationService.createLootWeapon(...args),
  });

  const {
    weightedPick,
    buildAvailableWeaponsForFloor,
    chooseWeightedWeapon,
    buildAvailableShieldsForFloor,
    chooseWeightedShield,
    rollChestContent,
  } = equipmentRolls;

  const weaponGenerationService = createWeaponGenerationService({
    randomInt,
    generateEquipmentItem,
    getState,
  });

  const {
    createEnemy,
    chooseWeightedMonster,
  } = createDungeonEnemyFactory({
    OFFHAND_CATALOG,
    cloneOffHandItem,
    createMonsterWeapon: (...args) => weaponGenerationService.createMonsterWeapon(...args),
    randomInt,
    getEnemyScaleForFloor,
    ENEMY_HP_PER_SCALE,
    ENEMY_XP_PER_SCALE,
    ENEMY_STRENGTH_SCALE_STEP,
    ENEMY_PRECISION_SCALE_STEP,
    ENEMY_REACTION_SCALE_STEP,
    ENEMY_NERVES_SCALE_STEP,
    ENEMY_INTELLIGENCE_SCALE_STEP,
    ENEMY_AGGRO_RADIUS_CAP,
    MONSTER_VARIANT_TIERS,
    MONSTER_VARIANT_MODIFIERS,
    getMonsterVariantWeights,
    NON_ICONIC_MONSTER_WEIGHT_BONUS,
    ICONIC_MONSTER_WEIGHT_PENALTY,
  });

  const {
    collectUsedShowcasePropIds,
    getRoomCenter,
    getCardinalNeighbors,
    clampToRoom,
    getRoomConnectionPoint,
    isPositionInsideRoom,
    isTileWalkable,
    isValidDoorSlot,
    getDoorCandidate,
    computeReachableTiles,
    computeReachableTilesWithBlockedPositions,
    hasReachableMatchingKey,
    isLockedRoomSealed,
  } = createDungeonSpatialApi({
    WIDTH,
    HEIGHT,
    TILE,
    DOOR_TYPE,
    createDoor,
    getState,
  });

  const showcasePlacementApi = createShowcasePlacementApi({
    propCatalog,
    randomInt,
    createShowcase,
    collectUsedShowcasePropIds,
    getCardinalNeighbors,
    isTileWalkable,
    computeReachableTilesWithBlockedPositions,
    isPositionInsideRoom,
  });

  const {
    chooseShowcaseRooms,
    getShowcaseCandidateTiles,
    placeShowcases,
  } = showcasePlacementApi;

  function rollLayoutProfile() {
    return weightedPick([
      {
        weight: 4,
        value: {
          id: "branchy",
          roomWeights: { hub: 4, side: 4, hallH: 2, hallV: 2, pocket: 2 },
          targetRooms: { min: 13, max: 18 },
          clusterChance: 0.52,
          kinkChance: 0.18,
          extraConnections: { min: 0, max: 1 },
        },
      },
      {
        weight: 3,
        value: {
          id: "clustered",
          roomWeights: { hub: 4, side: 3, hallH: 1, hallV: 1, pocket: 4 },
          targetRooms: { min: 14, max: 20 },
          clusterChance: 0.72,
          kinkChance: 0.24,
          extraConnections: { min: 0, max: 2 },
        },
      },
      {
        weight: 3,
        value: {
          id: "sprawling",
          roomWeights: { hub: 3, side: 3, hallH: 3, hallV: 3, pocket: 1 },
          targetRooms: { min: 12, max: 17 },
          clusterChance: 0.44,
          kinkChance: 0.34,
          extraConnections: { min: 1, max: 2 },
        },
      },
    ]);
  }

  function createRoomTemplate(profile) {
    const archetype = weightedPick([
      { weight: profile.roomWeights.hub, value: "hub" },
      { weight: profile.roomWeights.side, value: "side" },
      { weight: profile.roomWeights.hallH, value: "hallH" },
      { weight: profile.roomWeights.hallV, value: "hallV" },
      { weight: profile.roomWeights.pocket, value: "pocket" },
    ]);

    if (archetype === "hub") {
      return {
        category: "hub",
        width: randomInt(Math.max(6, MIN_ROOM_SIZE + 2), Math.max(7, MAX_ROOM_SIZE + 1)),
        height: randomInt(Math.max(6, MIN_ROOM_SIZE + 1), Math.max(7, MAX_ROOM_SIZE + 1)),
      };
    }

    if (archetype === "side") {
      return {
        category: "side",
        width: randomInt(MIN_ROOM_SIZE, Math.max(MIN_ROOM_SIZE, MAX_ROOM_SIZE - 1)),
        height: randomInt(MIN_ROOM_SIZE, Math.max(MIN_ROOM_SIZE, MAX_ROOM_SIZE - 1)),
      };
    }

    if (archetype === "hallH") {
      return {
        category: "hall",
        width: randomInt(Math.max(7, MIN_ROOM_SIZE + 3), Math.max(9, MAX_ROOM_SIZE + 3)),
        height: randomInt(4, 5),
      };
    }

    if (archetype === "hallV") {
      return {
        category: "hall",
        width: randomInt(4, 5),
        height: randomInt(Math.max(7, MIN_ROOM_SIZE + 3), Math.max(9, MAX_ROOM_SIZE + 3)),
      };
    }

    return {
      category: "pocket",
      width: randomInt(3, 4),
      height: randomInt(3, 4),
    };
  }

  function tryPlaceRoomNearAnchor(template, anchorRoom) {
    const direction = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
    ][randomInt(0, 3)];
    const gap = randomInt(2, 5);
    const lateralJitter = randomInt(-3, 3);
    let x = 1;
    let y = 1;

    if (direction.x !== 0) {
      x = direction.x > 0
        ? anchorRoom.x + anchorRoom.width + gap
        : anchorRoom.x - template.width - gap;
      y = anchorRoom.y + Math.floor(anchorRoom.height / 2) - Math.floor(template.height / 2) + lateralJitter;
    } else {
      x = anchorRoom.x + Math.floor(anchorRoom.width / 2) - Math.floor(template.width / 2) + lateralJitter;
      y = direction.y > 0
        ? anchorRoom.y + anchorRoom.height + gap
        : anchorRoom.y - template.height - gap;
    }

    x = Math.max(1, Math.min(WIDTH - template.width - 2, x));
    y = Math.max(1, Math.min(HEIGHT - template.height - 2, y));

    return {
      ...template,
      x,
      y,
    };
  }

  function getRoomDistance(a, b) {
    const centerA = getRoomCenter(a);
    const centerB = getRoomCenter(b);
    return Math.abs(centerA.x - centerB.x) + Math.abs(centerA.y - centerB.y);
  }

  function chooseStartRoomIndex(rooms) {
    const sorted = rooms
      .map((room, index) => ({ room, index }))
      .sort((left, right) => left.room.x - right.room.x);
    const leftSlice = sorted.slice(0, Math.max(1, Math.ceil(sorted.length / 3)));
    const boardMidY = Math.floor(HEIGHT / 2);
    leftSlice.sort((left, right) =>
      Math.abs(getRoomCenter(left.room).y - boardMidY) - Math.abs(getRoomCenter(right.room).y - boardMidY) ||
      (right.room.width * right.room.height) - (left.room.width * left.room.height)
    );
    return leftSlice[0]?.index ?? 0;
  }

  function chooseAsymmetricConnectionPoint(room, target, forceAxis = null) {
    const center = getRoomCenter(room);
    const deltaX = target.x - center.x;
    const deltaY = target.y - center.y;
    const axis = forceAxis ?? (Math.abs(deltaX) >= Math.abs(deltaY) ? "x" : "y");

    if (axis === "x") {
      const edgeX = deltaX >= 0 ? room.x + room.width - 1 : room.x;
      const minY = room.y;
      const maxY = room.y + room.height - 1;
      const baseY = clampToRoom(target.y, minY, maxY);
      const jitteredY = clampToRoom(baseY + randomInt(-Math.floor(room.height / 3), Math.floor(room.height / 3)), minY, maxY);
      return { x: edgeX, y: jitteredY };
    }

    const edgeY = deltaY >= 0 ? room.y + room.height - 1 : room.y;
    const minX = room.x;
    const maxX = room.x + room.width - 1;
    const baseX = clampToRoom(target.x, minX, maxX);
    const jitteredX = clampToRoom(baseX + randomInt(-Math.floor(room.width / 3), Math.floor(room.width / 3)), minX, maxX);
    return { x: jitteredX, y: edgeY };
  }

  function appendLineSegment(path, from, to) {
    let x = from.x;
    let y = from.y;
    if (path.length === 0 || path[path.length - 1].x !== x || path[path.length - 1].y !== y) {
      path.push({ x, y });
    }

    while (x !== to.x) {
      x += x < to.x ? 1 : -1;
      path.push({ x, y });
    }

    while (y !== to.y) {
      y += y < to.y ? 1 : -1;
      path.push({ x, y });
    }
  }

  function buildConnectionPath(start, end, profile) {
    const path = [];
    const horizontalFirst = Math.abs(end.x - start.x) >= Math.abs(end.y - start.y)
      ? Math.random() < 0.7
      : Math.random() < 0.35;
    const useKink = Math.random() < profile.kinkChance && Math.abs(end.x - start.x) > 4 && Math.abs(end.y - start.y) > 4;

    if (!useKink) {
      if (horizontalFirst) {
        appendLineSegment(path, start, { x: end.x, y: start.y });
        appendLineSegment(path, { x: end.x, y: start.y }, end);
      } else {
        appendLineSegment(path, start, { x: start.x, y: end.y });
        appendLineSegment(path, { x: start.x, y: end.y }, end);
      }
      return path;
    }

    if (horizontalFirst) {
      const midX = randomInt(
        Math.min(start.x, end.x) + 1,
        Math.max(start.x, end.x) - 1,
      );
      const midY = clampToRoom(
        start.y + Math.sign(end.y - start.y) * randomInt(1, Math.max(1, Math.abs(end.y - start.y) - 1)),
        1,
        HEIGHT - 2,
      );
      appendLineSegment(path, start, { x: midX, y: start.y });
      appendLineSegment(path, { x: midX, y: start.y }, { x: midX, y: midY });
      appendLineSegment(path, { x: midX, y: midY }, { x: end.x, y: midY });
      appendLineSegment(path, { x: end.x, y: midY }, end);
    } else {
      const midY = randomInt(
        Math.min(start.y, end.y) + 1,
        Math.max(start.y, end.y) - 1,
      );
      const midX = clampToRoom(
        start.x + Math.sign(end.x - start.x) * randomInt(1, Math.max(1, Math.abs(end.x - start.x) - 1)),
        1,
        WIDTH - 2,
      );
      appendLineSegment(path, start, { x: start.x, y: midY });
      appendLineSegment(path, { x: start.x, y: midY }, { x: midX, y: midY });
      appendLineSegment(path, { x: midX, y: midY }, { x: midX, y: end.y });
      appendLineSegment(path, { x: midX, y: end.y }, end);
    }

    return path;
  }

  function carvePath(grid, path) {
    path.forEach(({ x, y }) => {
      if (x >= 0 && y >= 0 && x < WIDTH && y < HEIGHT) {
        grid[y][x] = TILE.FLOOR;
      }
    });
  }

  function createRoomConnectionEdge(rooms, roomIdA, roomIdB, profile) {
    const roomA = rooms[roomIdA];
    const roomB = rooms[roomIdB];
    const centerA = getRoomCenter(roomA);
    const centerB = getRoomCenter(roomB);
    const axis = Math.abs(centerA.x - centerB.x) >= Math.abs(centerA.y - centerB.y) ? "x" : "y";
    const start = chooseAsymmetricConnectionPoint(roomA, centerB, axis);
    const end = chooseAsymmetricConnectionPoint(roomB, centerA, axis);
    return {
      roomIdA,
      roomIdB,
      path: buildConnectionPath(start, end, profile),
    };
  }

  function buildMainTreeEdges(rooms, startRoomIndex, profile) {
    const connected = new Set([startRoomIndex]);
    const edges = [];

    while (connected.size < rooms.length) {
      const candidates = [];

      rooms.forEach((room, roomIndex) => {
        if (connected.has(roomIndex)) {
          return;
        }

        connected.forEach((connectedIndex) => {
          const sourceRoom = rooms[connectedIndex];
          const distance = getRoomDistance(sourceRoom, room);
          const categoryPenalty = room.category === "pocket" ? -1 : room.category === "hall" ? 1 : 0;
          candidates.push({
            roomIdA: connectedIndex,
            roomIdB: roomIndex,
            score: distance + categoryPenalty,
          });
        });
      });

      candidates.sort((left, right) => left.score - right.score);
      const candidate = candidates[randomInt(0, Math.min(3, candidates.length - 1))];
      edges.push(createRoomConnectionEdge(rooms, candidate.roomIdA, candidate.roomIdB, profile));
      connected.add(candidate.roomIdB);
    }

    return edges;
  }

  function buildRoomAdjacency(edges, roomCount) {
    const adjacency = Array.from({ length: roomCount }, () => []);
    edges.forEach((edge) => {
      adjacency[edge.roomIdA].push(edge.roomIdB);
      adjacency[edge.roomIdB].push(edge.roomIdA);
    });
    return adjacency;
  }

  function findFarthestRoom(startRoomIndex, adjacency) {
    const queue = [{ roomId: startRoomIndex, distance: 0 }];
    const seen = new Set([startRoomIndex]);
    let farthest = queue[0];

    while (queue.length > 0) {
      const current = queue.shift();
      if (current.distance > farthest.distance) {
        farthest = current;
      }

      adjacency[current.roomId].forEach((nextRoomId) => {
        if (seen.has(nextRoomId)) {
          return;
        }
        seen.add(nextRoomId);
        queue.push({ roomId: nextRoomId, distance: current.distance + 1 });
      });
    }

    return farthest.roomId;
  }

  function findRoomPath(startRoomId, endRoomId, adjacency) {
    const queue = [startRoomId];
    const previous = new Map([[startRoomId, null]]);

    while (queue.length > 0) {
      const roomId = queue.shift();
      if (roomId === endRoomId) {
        break;
      }

      adjacency[roomId].forEach((nextRoomId) => {
        if (previous.has(nextRoomId)) {
          return;
        }
        previous.set(nextRoomId, roomId);
        queue.push(nextRoomId);
      });
    }

    const path = [];
    let cursor = endRoomId;
    while (cursor != null) {
      path.unshift(cursor);
      cursor = previous.get(cursor) ?? null;
    }
    return path;
  }

  function pathAlreadyConnected(roomIdA, roomIdB, edges) {
    return edges.some((edge) =>
      (edge.roomIdA === roomIdA && edge.roomIdB === roomIdB) ||
      (edge.roomIdA === roomIdB && edge.roomIdB === roomIdA)
    );
  }

  function scoreProposedPath(grid, path) {
    let reusedTiles = 0;
    let adjacentFloors = 0;

    path.forEach(({ x, y }, index) => {
      if (grid[y]?.[x] === TILE.FLOOR) {
        reusedTiles += 1;
      }

      const previous = path[index - 1];
      const next = path[index + 1];
      const isHorizontal = previous && next ? previous.y === y && next.y === y : false;
      const neighbors = isHorizontal
        ? [{ x, y: y - 1 }, { x, y: y + 1 }]
        : [{ x: x - 1, y }, { x: x + 1, y }];

      neighbors.forEach((neighbor) => {
        if (grid[neighbor.y]?.[neighbor.x] === TILE.FLOOR) {
          adjacentFloors += 1;
        }
      });
    });

    return {
      reusedTiles,
      adjacentFloors,
    };
  }

  function buildExtraEdges(rooms, baseEdges, profile, grid) {
    const extraEdges = [];
    const targetExtraEdges = randomInt(profile.extraConnections.min, profile.extraConnections.max);
    const adjacency = buildRoomAdjacency(baseEdges, rooms.length);
    const candidates = [];

    for (let roomIdA = 0; roomIdA < rooms.length; roomIdA += 1) {
      for (let roomIdB = roomIdA + 1; roomIdB < rooms.length; roomIdB += 1) {
        if (pathAlreadyConnected(roomIdA, roomIdB, baseEdges)) {
          continue;
        }

        const treePath = findRoomPath(roomIdA, roomIdB, adjacency);
        if (treePath.length < 4) {
          continue;
        }

        const distance = getRoomDistance(rooms[roomIdA], rooms[roomIdB]);
        if (distance < 10 || distance > 24) {
          continue;
        }

        const edge = createRoomConnectionEdge(rooms, roomIdA, roomIdB, profile);
        const score = scoreProposedPath(grid, edge.path);
        if (score.reusedTiles > 4 || score.adjacentFloors > edge.path.length * 0.7) {
          continue;
        }

        candidates.push({
          edge,
          score: distance + score.reusedTiles * 4 + score.adjacentFloors,
        });
      }
    }

    candidates
      .sort((left, right) => left.score - right.score)
      .slice(0, targetExtraEdges * 3)
      .forEach(({ edge }) => {
        if (extraEdges.length >= targetExtraEdges) {
          return;
        }

        if (pathAlreadyConnected(edge.roomIdA, edge.roomIdB, [...baseEdges, ...extraEdges])) {
          return;
        }

        carvePath(grid, edge.path);
        extraEdges.push(edge);
      });

    return extraEdges;
  }

  function assignLockedDoors({
    floorNumber,
    grid,
    rooms,
    doors,
    keys,
    occupied,
    entryPosition,
    stairsUp,
    stairsDown,
  }) {
    const targetLockedDoorCount = getLockedDoorCountForFloor(floorNumber);
    if (targetLockedDoorCount <= 0) {
      return [];
    }

    const eligibleCandidates = [...doors]
      .filter((door) => {
        const room = rooms[door.roomIdB];
        return room &&
          !isPositionInsideRoom(entryPosition, room) &&
          !isPositionInsideRoom(stairsDown, room) &&
          (!stairsUp || !isPositionInsideRoom(stairsUp, room)) &&
          isLockedRoomSealed(grid, entryPosition, doors, room, door);
      })
      .sort((left, right) => (right.roomIdB ?? -1) - (left.roomIdB ?? -1));

    if (!eligibleCandidates.length) {
      return [];
    }

    const shuffledCandidates = [...eligibleCandidates].sort(() => Math.random() - 0.5);
    const selectedDoors = [];
    const usedRoomIds = new Set();

    for (const candidate of shuffledCandidates) {
      if (selectedDoors.length >= targetLockedDoorCount) {
        break;
      }

      if (usedRoomIds.has(candidate.roomIdB)) {
        continue;
      }

      const lockColor = LOCK_COLORS[randomInt(0, LOCK_COLORS.length - 1)];
      candidate.doorType = DOOR_TYPE.LOCKED;
      candidate.lockColor = lockColor;

      const room = rooms[candidate.roomIdB];
      const allSelectedStillSealed = [...selectedDoors, candidate].every((door) =>
        isLockedRoomSealed(grid, entryPosition, doors, rooms[door.roomIdB], door)
      );
      const reachableTiles = computeReachableTiles(grid, entryPosition, doors)
        .filter((tile) => !doors.some((door) => door.x === tile.x && door.y === tile.y))
        .filter((tile) => !occupied.some((entry) => entry.x === tile.x && entry.y === tile.y));

      if (!room || !allSelectedStillSealed || reachableTiles.length < selectedDoors.length + 1) {
        candidate.doorType = DOOR_TYPE.NORMAL;
        candidate.lockColor = null;
        continue;
      }

      selectedDoors.push(candidate);
      usedRoomIds.add(candidate.roomIdB);
    }

    if (!selectedDoors.length) {
      return [];
    }

    const keyTiles = computeReachableTiles(grid, entryPosition, doors)
      .filter((tile) => !doors.some((door) => door.x === tile.x && door.y === tile.y))
      .filter((tile) => !occupied.some((entry) => entry.x === tile.x && entry.y === tile.y));

    if (keyTiles.length < selectedDoors.length) {
      selectedDoors.forEach((door) => {
        door.doorType = DOOR_TYPE.NORMAL;
        door.lockColor = null;
      });
      return [];
    }

    const availableKeyTiles = [...keyTiles];
    selectedDoors.forEach((door) => {
      const tileIndex = randomInt(0, availableKeyTiles.length - 1);
      const [keyPosition] = availableKeyTiles.splice(tileIndex, 1);
      keys.push(createKeyPickup(door.lockColor, keyPosition.x, keyPosition.y, floorNumber));
      occupied.push(keyPosition);
    });

    return selectedDoors;
  }

  function createDungeonLevel(floorNumber, options = {}) {
    const grid = createGrid();
    const rooms = [];
    const studioArchetypeId = options.studioArchetypeId
      ?? getArchetypeForFloor(getState()?.runArchetypeSequence ?? [], floorNumber);
    const layoutProfile = rollLayoutProfile();
    const targetRoomCount = randomInt(
      layoutProfile.targetRooms.min,
      layoutProfile.targetRooms.max,
    );
    const placementAttempts = Math.max(ROOM_ATTEMPTS, targetRoomCount * 8);

    for (let attempt = 0; attempt < placementAttempts && rooms.length < targetRoomCount; attempt += 1) {
      const template = rooms.length === 0
        ? {
            category: "hub",
            width: randomInt(Math.max(6, MIN_ROOM_SIZE + 2), Math.max(7, MAX_ROOM_SIZE + 1)),
            height: randomInt(Math.max(6, MIN_ROOM_SIZE + 1), Math.max(7, MAX_ROOM_SIZE + 1)),
          }
        : createRoomTemplate(layoutProfile);
      let room;

      if (rooms.length === 0) {
        room = {
          ...template,
          x: randomInt(2, Math.max(2, Math.floor(WIDTH / 6))),
          y: randomInt(
            2,
            Math.max(2, HEIGHT - template.height - 3),
          ),
        };
      } else if (Math.random() < layoutProfile.clusterChance) {
        const anchorRoom = rooms[randomInt(0, rooms.length - 1)];
        room = tryPlaceRoomNearAnchor(template, anchorRoom);
      } else {
        room = {
          ...template,
          x: randomInt(1, WIDTH - template.width - 2),
          y: randomInt(1, HEIGHT - template.height - 2),
        };
      }

      if (rooms.some((existing) => roomsOverlap(existing, room))) {
        continue;
      }

      carveRoom(grid, room);
      rooms.push(room);
    }

    if (rooms.length === 0) {
      const fallbackRoom = { x: 4, y: 4, width: 10, height: 8, category: "hub" };
      carveRoom(grid, fallbackRoom);
      rooms.push(fallbackRoom);
    }

    const startRoomIndex = chooseStartRoomIndex(rooms);
    const mainEdges = rooms.length > 1
      ? buildMainTreeEdges(rooms, startRoomIndex, layoutProfile)
      : [];
    mainEdges.forEach((edge) => carvePath(grid, edge.path));
    const extraEdges = rooms.length > 2
      ? buildExtraEdges(rooms, mainEdges, layoutProfile, grid)
      : [];
    const connectionEdges = [...mainEdges, ...extraEdges];
    const adjacency = buildRoomAdjacency(connectionEdges, rooms.length);
    const goalRoomIndex = rooms.length > 1
      ? findFarthestRoom(startRoomIndex, adjacency)
      : startRoomIndex;

    const occupied = [];
    const startRoom = rooms[startRoomIndex];
    const goalRoom = rooms[goalRoomIndex];

    function markOccupied(position) {
      if (!position) {
        return;
      }

      if (!occupied.some((entry) => entry.x === position.x && entry.y === position.y)) {
        occupied.push(position);
      }
    }

    function getRoomFloorTiles(room) {
      const tiles = [];
      for (let y = room.y; y < room.y + room.height; y += 1) {
        for (let x = room.x; x < room.x + room.width; x += 1) {
          if (grid[y][x] === TILE.FLOOR) {
            tiles.push({ x, y });
          }
        }
      }
      return tiles;
    }

    function chooseFreeTileInRoom(room) {
      const center = getRoomCenter(room);
      const roomTiles = getRoomFloorTiles(room)
        .filter((tile) => !occupied.some((entry) => entry.x === tile.x && entry.y === tile.y))
        .sort((left, right) =>
          (Math.abs(left.x - center.x) + Math.abs(left.y - center.y)) -
          (Math.abs(right.x - center.x) + Math.abs(right.y - center.y))
        );
      return roomTiles[0] ?? null;
    }

    const stairsUp = options.stairsUp ?? (floorNumber > 1 ? chooseFreeTileInRoom(startRoom) : null);
    const startPosition = stairsUp ?? chooseFreeTileInRoom(startRoom) ?? {
      x: startRoom.x + Math.floor(startRoom.width / 2),
      y: startRoom.y + Math.floor(startRoom.height / 2),
    };
    markOccupied(startPosition);

    function nextFloorPosition(preferredRooms = null) {
      if (preferredRooms) {
        for (const room of preferredRooms) {
          const preferredTile = chooseFreeTileInRoom(room);
          if (preferredTile) {
            markOccupied(preferredTile);
            return preferredTile;
          }
        }
      }

      let position;
      do {
        position = {
          x: randomInt(1, WIDTH - 2),
          y: randomInt(1, HEIGHT - 2),
        };
      } while (
        grid[position.y][position.x] !== TILE.FLOOR ||
        occupied.some((item) => item.x === position.x && item.y === position.y)
      );
      markOccupied(position);
      return position;
    }

    markOccupied(stairsUp);
    const stairsDown = options.stairsDown ?? nextFloorPosition([goalRoom]);
    const entryPosition = stairsUp ?? startPosition;
    const enemies = [];
    const potions = [];
    const weapons = [];
      const offHands = [];
      const chests = [];
    const foods = [];
    const keys = [];
    const doors = [];
    const showcases = [];
    const traps = [];
    const enemyCount = context.getEnemyCountForFloor(floorNumber);
    const potionCount = context.getPotionCountForFloor(floorNumber);
    const unlockedMonsterRank = context.getUnlockedMonsterRank(floorNumber, MONSTER_CATALOG);
      const availableMonsters = MONSTER_CATALOG.filter((monster) => monster.rank <= unlockedMonsterRank);
      const availableWeapons = buildAvailableWeaponsForFloor(floorNumber, unlockedMonsterRank);
      const availableShields = buildAvailableShieldsForFloor(floorNumber);
      const bonusChestWeapons = buildAvailableWeaponsForFloor(
        floorNumber + 1,
        context.getUnlockedMonsterRank(floorNumber + 1, MONSTER_CATALOG),
      );
      const bonusChestShields = buildAvailableShieldsForFloor(floorNumber + 1);
    const floorSeenCounts = {};
      const state = getState();
      const foodBudget = splitFoodBudget(rollFoodBudget(randomInt).totalBudget);

      markOccupied(stairsDown);

      const candidateConnections = connectionEdges
        .map((edge) => ({
          ...edge,
          door: getDoorCandidate(
            grid,
            rooms[edge.roomIdA],
            rooms[edge.roomIdB],
            edge.roomIdA,
            edge.roomIdB,
            edge.path,
          ),
        }))
        .filter((connection) => {
          if (!connection.door) {
            return false;
          }
          const { x, y } = connection.door;
          return (
            isValidDoorSlot(grid, x, y) &&
            !occupied.some((entry) => entry.x === x && entry.y === y)
          );
        });

      const doorTargetCount = candidateConnections.length === 0
        ? 0
        : Math.max(
          1,
          Math.min(
            candidateConnections.length,
            Math.floor(candidateConnections.length * (0.22 + Math.random() * 0.18)),
          ),
        );
      const shuffledCandidates = [...candidateConnections].sort(() => Math.random() - 0.5);

      for (const connection of shuffledCandidates.slice(0, doorTargetCount)) {
        doors.push(connection.door);
        markOccupied({ x: connection.door.x, y: connection.door.y });
      }

      showcases.push(...placeShowcases({
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
      }));

      traps.push(
        ...buildTrapsForFloor({
          floorNumber,
          grid,
          occupied,
          doors,
          stairsUp,
          stairsDown,
        }),
      );

      for (let i = 0; i < enemyCount; i += 1) {
        const monster = chooseWeightedMonster(
          availableMonsters,
          floorNumber,
          state?.seenMonsterCounts ?? {},
          floorSeenCounts,
        );
        floorSeenCounts[monster.id] = (floorSeenCounts[monster.id] ?? 0) + 1;
        if (state?.seenMonsterCounts) {
          state.seenMonsterCounts[monster.id] = (state.seenMonsterCounts[monster.id] ?? 0) + 1;
        }
        const enemy = createEnemy(nextFloorPosition(), floorNumber, monster, { sourceArchetypeId: studioArchetypeId });
        const plannedDrop = rollMonsterPlannedDrop(enemy.id, foodBudget.monsters);
        if (plannedDrop) {
          enemy.lootDrop = {
            itemId: plannedDrop.itemId,
            item: plannedDrop.item,
          };
          foodBudget.monsters = Math.max(0, foodBudget.monsters - plannedDrop.spentBudget);
        }
        enemies.push(enemy);
      }

      for (let i = 0; i < potionCount; i += 1) {
        potions.push(nextFloorPosition());
      }

      for (const foodItem of buildFoodItemsForBudget(foodBudget.world)) {
        const pos = nextFloorPosition();
        foods.push(createFoodPickup(foodItem, pos.x, pos.y));
      }

      if (context.shouldSpawnFloorWeapon(floorNumber)) {
        const weaponCount = weaponGenerationService.getFloorWeaponSpawnCount(floorNumber);
        for (let index = 0; index < weaponCount; index += 1) {
          const weapon = chooseWeightedWeapon(availableWeapons, state?.player, {
            floorNumber,
            dropSourceTag: 'floor-weapon',
            runArchetypeSequence: options.runArchetypeSequence ?? state?.runArchetypeSequence ?? [],
          });
          if (!weapon) {
            continue;
          }
          const pos = nextFloorPosition();
          weapons.push(createWeaponPickup(weapon, pos.x, pos.y));
        }
      }

      if (shouldSpawnFloorShield(floorNumber)) {
        const shield = chooseWeightedShield(availableShields, state?.player);
        if (shield) {
          const pos = nextFloorPosition();
          offHands.push(createOffHandPickup(generateEquipmentItem(shield, {
            floorNumber,
            dropSourceTag: "floor-shield",
          }), pos.x, pos.y));
        }
      }

      if (context.shouldSpawnChest(floorNumber)) {
        const chestCount = context.getChestCountForFloor(floorNumber);
        for (let i = 0; i < chestCount; i += 1) {
          const pos = nextFloorPosition();
          const containerConfig = getContainerConfigForArchetype(studioArchetypeId);
          chests.push(createChestPickup(
            rollChestContent(floorNumber, availableWeapons, availableShields, {
              dropSourceTag: 'chest',
              runArchetypeSequence: options.runArchetypeSequence ?? state?.runArchetypeSequence ?? [],
            }),
            pos.x,
            pos.y,
            {
              containerName: containerConfig.name,
              containerAssetId: containerConfig.assetId,
            },
          ));
        }
      }

      for (const foodItem of buildFoodItemsForBudget(foodBudget.containers)) {
        const pos = nextFloorPosition();
        const containerConfig = getContainerConfigForArchetype(studioArchetypeId);
        chests.push(createChestPickup({ type: "food", item: foodItem }, pos.x, pos.y, {
          containerName: containerConfig.name,
          containerAssetId: containerConfig.assetId,
        }));
      }

      const lockedDoors = assignLockedDoors({
        floorNumber,
        grid,
        rooms,
        doors,
        keys,
        occupied,
        entryPosition,
        stairsUp,
        stairsDown,
      });
      lockedDoors.forEach((lockedDoor) => {
        const lockedRoom = rooms[lockedDoor.roomIdB];
        if (!lockedRoom) {
          return;
        }

        const lockedRoomTiles = [];
        for (let y = lockedRoom.y; y < lockedRoom.y + lockedRoom.height; y += 1) {
          for (let x = lockedRoom.x; x < lockedRoom.x + lockedRoom.width; x += 1) {
            if (
              !occupied.some((entry) => entry.x === x && entry.y === y) &&
              !doors.some((door) => door.x === x && door.y === y)
            ) {
              lockedRoomTiles.push({ x, y });
            }
          }
        }

        if (lockedRoomTiles.length > 0 && context.shouldPlaceLockedRoomChest()) {
          const chestPosition = lockedRoomTiles[randomInt(0, lockedRoomTiles.length - 1)];
          const containerConfig = getContainerConfigForArchetype(studioArchetypeId);
          chests.push(createChestPickup(
            rollChestContent(floorNumber + 1, bonusChestWeapons, bonusChestShields, {
              dropSourceTag: 'locked-room-chest',
              boostSpecial: true,
              runArchetypeSequence: options.runArchetypeSequence ?? state?.runArchetypeSequence ?? [],
            }),
            chestPosition.x,
            chestPosition.y,
            {
              containerName: containerConfig.name,
              containerAssetId: containerConfig.assetId,
            },
          ));
          markOccupied(chestPosition);
        }
      });

      return {
        floorNumber,
        studioArchetypeId,
        grid,
        rooms,
        startPosition,
        stairsUp,
        stairsDown,
        enemies,
        potions,
        foods,
        weapons,
        offHands,
          chests,
          keys,
          doors,
          showcases,
          showcaseAmbienceSeen: {},
          traps,
          explored: Array.from({ length: HEIGHT }, () => Array(WIDTH).fill(false)),
          visible: Array.from({ length: HEIGHT }, () => Array(WIDTH).fill(false)),
        };
  }

  return {
    createEnemy,
    createWeaponPickup,
    createOffHandPickup,
    createChestPickup,
    createFoodPickup,
    createShowcase,
    createKeyPickup,
    createDoor,
    rollChestContent,
    cloneWeapon,
    createDungeonLevel,
  };
}
