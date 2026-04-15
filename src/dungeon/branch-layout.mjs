import { shuffleList, weightedPick } from '../utils/random-tools.mjs';

const ROOM_TYPE_ORDER = [
  "weapon_room",
  "aggro_room",
  "calm_room",
  "canteen",
  "props_room",
  "costume_room",
  "hazard_room",
  "showcase_room",
];

const ROOM_TYPE_SPECS = {
  entry_room: {
    id: "entry_room",
    label: "Eingangsraum",
    maxCount: 1,
    minWidth: 8,
    minHeight: 8,
    maxWidth: 10,
    maxHeight: 10,
    preferredAttachment: "direct_main",
    allowedAttachments: ["direct_main"],
    maxChildren: 1,
    enemyFactor: 0.6,
    itemFactor: 0.6,
    foodFactor: 0.8,
    ambienceFactor: 0.5,
    trapFactor: 0.5,
    preferredPathRole: "main",
    isAnchorRoom: true,
    doorChance: 0,
  },
  connector_room: {
    id: "connector_room",
    label: "Zwischenraum",
    maxCount: 9,
    minWidth: 6,
    minHeight: 5,
    maxWidth: 12,
    maxHeight: 10,
    preferredAttachment: "sidearm_main",
    allowedAttachments: ["sidearm_main", "direct_main", "sidearm_room"],
    maxChildren: 4,
    enemyFactor: 0.8,
    itemFactor: 0.9,
    foodFactor: 0.9,
    ambienceFactor: 0.7,
    trapFactor: 0.7,
    preferredPathRole: "side",
    isConnectorRoom: true,
    doorChance: 0,
  },
  weapon_room: {
    id: "weapon_room",
    label: "Waffenraum",
    maxCount: 1,
    minWidth: 8,
    minHeight: 6,
    maxWidth: 10,
    maxHeight: 8,
    preferredAttachment: "direct_main",
    allowedAttachments: ["direct_main", "sidearm_main"],
    maxChildren: 0,
    enemyFactor: 1.1,
    itemFactor: 1.6,
    foodFactor: 0.7,
    ambienceFactor: 0.8,
    trapFactor: 0.9,
    preferredPathRole: "main",
    doorChance: 1,
  },
  aggro_room: {
    id: "aggro_room",
    label: "Aggroraum",
    maxCount: 2,
    minWidth: 8,
    minHeight: 6,
    maxWidth: 10,
    maxHeight: 8,
    preferredAttachment: "direct_main",
    allowedAttachments: ["direct_main", "sidearm_main"],
    maxChildren: 1,
    enemyFactor: 1.8,
    itemFactor: 1.0,
    foodFactor: 0.7,
    ambienceFactor: 0.7,
    trapFactor: 1.0,
    preferredPathRole: "main",
    doorChance: 0.35,
  },
  calm_room: {
    id: "calm_room",
    label: "Ruhiger Raum",
    maxCount: 2,
    minWidth: 8,
    minHeight: 6,
    maxWidth: 10,
    maxHeight: 8,
    preferredAttachment: "sidearm_main",
    allowedAttachments: ["sidearm_main", "direct_main", "sidearm_room"],
    maxChildren: 1,
    enemyFactor: 0.4,
    itemFactor: 0.9,
    foodFactor: 0.9,
    ambienceFactor: 0.8,
    trapFactor: 0.5,
    preferredPathRole: "side",
    doorChance: 0.3,
  },
  canteen: {
    id: "canteen",
    label: "Kantine",
    maxCount: 1,
    minWidth: 9,
    minHeight: 7,
    maxWidth: 12,
    maxHeight: 9,
    preferredAttachment: "sidearm_main",
    allowedAttachments: ["sidearm_main", "direct_main", "sidearm_room"],
    maxChildren: 1,
    enemyFactor: 0.5,
    itemFactor: 1.0,
    foodFactor: 2.2,
    ambienceFactor: 1.4,
    trapFactor: 0.6,
    preferredPathRole: "side",
    doorChance: 1,
  },
  props_room: {
    id: "props_room",
    label: "Requisitenraum",
    maxCount: 1,
    minWidth: 8,
    minHeight: 6,
    maxWidth: 11,
    maxHeight: 8,
    preferredAttachment: "flexible",
    allowedAttachments: ["direct_main", "sidearm_main", "sidearm_room"],
    maxChildren: 1,
    enemyFactor: 0.9,
    itemFactor: 1.5,
    foodFactor: 0.8,
    ambienceFactor: 1.3,
    trapFactor: 0.8,
    preferredPathRole: "flex",
    doorChance: 1,
  },
  costume_room: {
    id: "costume_room",
    label: "Kostuemraum",
    maxCount: 1,
    minWidth: 8,
    minHeight: 6,
    maxWidth: 10,
    maxHeight: 8,
    preferredAttachment: "flexible",
    allowedAttachments: ["direct_main", "sidearm_main"],
    maxChildren: 0,
    enemyFactor: 0.8,
    itemFactor: 1.3,
    foodFactor: 0.7,
    ambienceFactor: 1.2,
    trapFactor: 0.7,
    preferredPathRole: "flex",
    doorChance: 1,
  },
  hazard_room: {
    id: "hazard_room",
    label: "Gefahrenraum",
    maxCount: 2,
    minWidth: 8,
    minHeight: 6,
    maxWidth: 10,
    maxHeight: 8,
    preferredAttachment: "flexible",
    allowedAttachments: ["direct_main", "sidearm_main"],
    maxChildren: 0,
    enemyFactor: 1.0,
    itemFactor: 0.9,
    foodFactor: 0.6,
    ambienceFactor: 0.8,
    trapFactor: 1.8,
    preferredPathRole: "flex",
    doorChance: 1,
  },
  showcase_room: {
    id: "showcase_room",
    label: "Vitrinenraum",
    maxCount: 1,
    minWidth: 8,
    minHeight: 6,
    maxWidth: 11,
    maxHeight: 8,
    preferredAttachment: "sidearm_main",
    allowedAttachments: ["sidearm_main"],
    maxChildren: 0,
    enemyFactor: 0.4,
    itemFactor: 0.8,
    foodFactor: 0.7,
    ambienceFactor: 2.4,
    trapFactor: 0.4,
    preferredPathRole: "side",
    doorChance: 1,
  },
};

const ROOM_TYPE_CHANCES = {
  weapon_room: [0.55],
  aggro_room: [0.7, 0.25],
  calm_room: [0.55, 0.2],
  canteen: [0.45],
  props_room: [0.5],
  costume_room: [0.45],
  hazard_room: [0.55, 0.25],
  showcase_room: [0.3],
};

const MAIN_ATTACHMENT_PRIORITY = {
  main: ["direct_main", "sidearm_main"],
  side: ["sidearm_main", "direct_main", "sidearm_room"],
  flex: ["direct_main", "sidearm_main", "sidearm_room"],
};

const ROOM_FILL_PRIORITY = [
  "calm_room",
  "canteen",
  "props_room",
  "hazard_room",
  "aggro_room",
  "costume_room",
  "weapon_room",
  "showcase_room",
];

const SIDE_ORIENTATIONS = ["north", "south", "west", "east"];

function keyOf(x, y) {
  return `${x},${y}`;
}

function clonePosition(position) {
  return { x: position.x, y: position.y };
}

function parseKey(key) {
  const [x, y] = key.split(",").map((entry) => Number(entry));
  return { x, y };
}

function randomBetween(randomInt, min, max) {
  return randomInt(Math.min(min, max), Math.max(min, max));
}

function collectRoomAttemptOrder(randomChance) {
  const attempts = [];

  ROOM_TYPE_ORDER.forEach((roomTypeId) => {
    const chances = ROOM_TYPE_CHANCES[roomTypeId] ?? [];
    let firstSucceeded = false;

    chances.forEach((chance, index) => {
      if (index > 0 && !firstSucceeded) {
        return;
      }

      if (randomChance() <= chance) {
        attempts.push(roomTypeId);
        if (index === 0) {
          firstSucceeded = true;
        }
      }
    });
  });

  if (attempts.length < 3) {
    const missing = ROOM_TYPE_ORDER.filter((roomTypeId) => !attempts.includes(roomTypeId));
    attempts.push(...missing.slice(0, 3 - attempts.length));
  }

  return attempts;
}

function countPlacedRoomsByRole(state) {
  return state.rooms.reduce((counts, room) => {
    counts[room.role] = (counts[room.role] ?? 0) + 1;
    return counts;
  }, {});
}

function computeTargetThemeRoomCount(state, minimumCount) {
  const corridorStrength = Math.max(0, Math.round((state.mainCorridorKeys?.size ?? 0) / 24));
  return Math.max(minimumCount, Math.min(8, 4 + corridorStrength));
}

function buildRoomFillOrder(state, placedThemeRooms) {
  const placedCounts = countPlacedRoomsByRole(state);
  const alreadyPlacedRoles = new Set(placedThemeRooms.map((room) => room.role));
  const fillOrder = [];

  ROOM_FILL_PRIORITY.forEach((roomTypeId) => {
    const spec = ROOM_TYPE_SPECS[roomTypeId];
    if (!spec) {
      return;
    }

    const limit = Math.max(0, spec.maxCount ?? 1);
    const placedCount = placedCounts[roomTypeId] ?? 0;
    const remaining = Math.max(0, limit - placedCount);
    if (remaining <= 0) {
      return;
    }

    const initialCopies = alreadyPlacedRoles.has(roomTypeId)
      ? remaining
      : Math.max(0, remaining - (roomTypeId === "showcase_room" ? 1 : 0));

    for (let index = 0; index < initialCopies; index += 1) {
      fillOrder.push(roomTypeId);
    }

    if (!alreadyPlacedRoles.has(roomTypeId) && roomTypeId !== "showcase_room" && remaining > initialCopies) {
      fillOrder.push(roomTypeId);
    }
  });

  return fillOrder;
}

function getAttachmentTryOrder(spec) {
  if (spec.preferredAttachment === "flexible") {
    return MAIN_ATTACHMENT_PRIORITY[spec.preferredPathRole] ?? spec.allowedAttachments;
  }

  return [
    spec.preferredAttachment,
    ...spec.allowedAttachments.filter((attachment) => attachment !== spec.preferredAttachment),
  ];
}

function hasEligibleSidearmParents(state) {
  return state.rooms.some((room) => canRoomCarryChildren(room));
}

function getExpansionAttachmentTryOrder(state, spec) {
  const baseOrder = getAttachmentTryOrder(spec);
  if (!spec.allowedAttachments.includes("sidearm_room") || !hasEligibleSidearmParents(state)) {
    return baseOrder;
  }

  if (spec.preferredPathRole === "side" || spec.preferredPathRole === "flex") {
    return [
      "sidearm_room",
      ...baseOrder.filter((attachment) => attachment !== "sidearm_room"),
    ];
  }

  return baseOrder;
}

function sortCorridorTilesByDirection(mainCorridorTiles, direction) {
  const tiles = [...mainCorridorTiles];
  if (direction === "left") {
    return tiles.sort((left, right) => left.x - right.x || left.y - right.y);
  }
  if (direction === "right") {
    return tiles.sort((left, right) => right.x - left.x || left.y - right.y);
  }
  if (direction === "front") {
    return tiles.sort((left, right) => left.y - right.y || left.x - right.x);
  }
  if (direction === "back") {
    return tiles.sort((left, right) => right.y - left.y || left.x - right.x);
  }

  return tiles.sort((left, right) => left.x - right.x || left.y - right.y);
}

function computeDirectionalAnchorScore(state, tile, direction) {
  if (direction === "left") {
    return -tile.x;
  }
  if (direction === "right") {
    return tile.x;
  }
  if (direction === "front") {
    return -tile.y;
  }
  if (direction === "back") {
    return tile.y;
  }

  const bbox = state.gangBoundingBox ?? { x: 0, y: 0, width: state.WIDTH, height: state.HEIGHT };
  const centerX = bbox.x + Math.floor(bbox.width / 2);
  const centerY = bbox.y + Math.floor(bbox.height / 2);
  return -(Math.abs(tile.x - centerX) + Math.abs(tile.y - centerY));
}

function computeReservedDistanceScore(tile, reservedKeys) {
  if (!reservedKeys || reservedKeys.size === 0) {
    return 0;
  }

  let bestDistance = 0;
  reservedKeys.forEach((key) => {
    const reservedTile = parseKey(key);
    const distance = Math.abs(tile.x - reservedTile.x) + Math.abs(tile.y - reservedTile.y);
    if (distance > bestDistance) {
      bestDistance = distance;
    }
  });
  return bestDistance;
}

function computePreferredAnchorLineScore(tile, direction, preferredTransitionHint) {
  if (!preferredTransitionHint) {
    return 0;
  }

  if (direction === "left" || direction === "right") {
    return -Math.abs(tile.y - preferredTransitionHint.y);
  }
  if (direction === "front" || direction === "back") {
    return -Math.abs(tile.x - preferredTransitionHint.x);
  }

  return -(Math.abs(tile.x - preferredTransitionHint.x) + Math.abs(tile.y - preferredTransitionHint.y));
}

function sortTilesForAttachment(tiles, preferredPathRole) {
  const sorted = [...tiles];
  if (preferredPathRole === "main") {
    return sorted.sort((left, right) => left.x - right.x || left.y - right.y);
  }
  if (preferredPathRole === "side") {
    return sorted.sort((left, right) =>
      Math.abs(left.y - right.y) - Math.abs(left.x - right.x)
    );
  }
  return sorted;
}

function createMainCorridorBlueprint(randomInt, WIDTH, HEIGHT) {
  const corridorWidth = randomInt(0, 1) === 0 ? 2 : 3;
  const targetSum = randomBetween(randomInt, 43, 52);
  const bboxHeight = randomBetween(randomInt, 10, Math.min(15, targetSum - 28));
  const bboxWidth = targetSum - bboxHeight;
  const x = randomBetween(randomInt, 2, Math.max(2, WIDTH - bboxWidth - 3));
  const y = randomBetween(randomInt, 5, Math.max(5, HEIGHT - bboxHeight - 6));
  const left = x;
  const right = x + bboxWidth - 1;
  const top = y;
  const bottom = y + bboxHeight - 1;
  const bendCount = randomBetween(randomInt, 1, 2);
  const centerY = y + Math.floor((bboxHeight - corridorWidth) / 2);
  const startY = randomBetween(
    randomInt,
    Math.max(top + 1, centerY - 1),
    Math.min(bottom - corridorWidth + 1, centerY + 1),
  );
  const points = [{ x: left, y: startY }];

  let currentY = startY;
  for (let index = 0; index < bendCount; index += 1) {
    const remaining = bendCount - index;
    const minX = left + 6 + index * 7;
    const maxX = right - 6 - (remaining - 1) * 7;
    const bendX = randomBetween(randomInt, minX, Math.max(minX, maxX));
    points.push({ x: bendX, y: currentY });

    const swing = Math.max(2, Math.floor(bboxHeight / 4));
    const nextY = randomBetween(
      randomInt,
      Math.max(top + 1, currentY - swing),
      Math.min(bottom - corridorWidth + 1, currentY + swing),
    );
    if (nextY !== currentY) {
      currentY = nextY;
      points.push({ x: bendX, y: currentY });
    }
  }

  points.push({ x: right, y: currentY });

  return {
    corridorWidth,
    bbox: {
      x,
      y,
      width: bboxWidth,
      height: bboxHeight,
    },
    points,
  };
}

function carveWideSegment(state, start, end) {
  const horizontal = start.y === end.y;
  const corridorWidth = state.corridorWidth;

  if (horizontal) {
    const minX = Math.min(start.x, end.x);
    const maxX = Math.max(start.x, end.x);
    const top = start.y - Math.floor((corridorWidth - 1) / 2);

    for (let x = minX; x <= maxX; x += 1) {
      for (let offset = 0; offset < corridorWidth; offset += 1) {
        const y = top + offset;
        if (x < 1 || y < 1 || x >= state.WIDTH - 1 || y >= state.HEIGHT - 1) {
          continue;
        }
        state.grid[y][x] = state.TILE.FLOOR;
        state.mainCorridorKeys.add(keyOf(x, y));
      }
    }
    return;
  }

  const minY = Math.min(start.y, end.y);
  const maxY = Math.max(start.y, end.y);
  const left = start.x - Math.floor((corridorWidth - 1) / 2);

  for (let y = minY; y <= maxY; y += 1) {
    for (let offset = 0; offset < corridorWidth; offset += 1) {
      const x = left + offset;
      if (x < 1 || y < 1 || x >= state.WIDTH - 1 || y >= state.HEIGHT - 1) {
        continue;
      }
      state.grid[y][x] = state.TILE.FLOOR;
      state.mainCorridorKeys.add(keyOf(x, y));
    }
  }
}

function buildMainCorridor(state) {
  const blueprint = createMainCorridorBlueprint(state.randomInt, state.WIDTH, state.HEIGHT);
  state.corridorWidth = blueprint.corridorWidth;
  state.gangBoundingBox = blueprint.bbox;
  state.mainCorridorPoints = blueprint.points;

  for (let index = 1; index < blueprint.points.length; index += 1) {
    carveWideSegment(state, blueprint.points[index - 1], blueprint.points[index]);
  }
}

function selectAnchorPosition(state, direction, reservedKeys = new Set(), preferredTransitionHint = null) {
  const mainTiles = [...state.mainCorridorKeys]
    .map(parseKey)
    .filter((tile) => !reservedKeys.has(keyOf(tile.x, tile.y)));

  if (mainTiles.length === 0) {
    return null;
  }

  const sorted = sortCorridorTilesByDirection(mainTiles, direction);
  const ranked = sorted
    .map((tile, index) => ({
      tile,
      index,
      directionalScore: computeDirectionalAnchorScore(state, tile, direction),
      distanceScore: computeReservedDistanceScore(tile, reservedKeys),
      preferredLineScore: computePreferredAnchorLineScore(tile, direction, preferredTransitionHint),
    }))
    .sort((left, right) =>
      right.preferredLineScore - left.preferredLineScore ||
      right.distanceScore - left.distanceScore ||
      right.directionalScore - left.directionalScore ||
      left.index - right.index
    );

  return ranked[0]?.tile ?? null;
}

function createAnchorLabel(direction, style, isEntry) {
  if (style === "lift") {
    if (direction === "up" || direction === "down") {
      return direction === "up" ? "Lift hoch" : "Lift runter";
    }
    return isEntry ? "Lifteingang" : "Liftabgang";
  }

  if (style === "stairs") {
    if (direction === "up" || direction === "down") {
      return direction === "up" ? "Treppe hoch" : "Treppe runter";
    }
    return isEntry ? "Treppeneingang" : "Treppenabgang";
  }

  return isEntry ? "Eingang" : "Ausgang";
}

function carveAnchorApproach(state, start, end) {
  if (!start || !end) {
    return;
  }

  if (start.y === end.y) {
    const minX = Math.min(start.x, end.x);
    const maxX = Math.max(start.x, end.x);
    for (let x = minX; x <= maxX; x += 1) {
      if (x < 0 || x >= state.WIDTH || start.y < 0 || start.y >= state.HEIGHT) {
        continue;
      }
      state.grid[start.y][x] = state.TILE.FLOOR;
      state.mainCorridorKeys.add(keyOf(x, start.y));
    }
    return;
  }

  if (start.x === end.x) {
    const minY = Math.min(start.y, end.y);
    const maxY = Math.max(start.y, end.y);
    for (let y = minY; y <= maxY; y += 1) {
      if (start.x < 0 || start.x >= state.WIDTH || y < 0 || y >= state.HEIGHT) {
        continue;
      }
      state.grid[y][start.x] = state.TILE.FLOOR;
      state.mainCorridorKeys.add(keyOf(start.x, y));
    }
  }
}

function addRoomOpening(state, room, position) {
  state.grid[position.y][position.x] = state.TILE.FLOOR;
  room.floorTiles.push(clonePosition(position));
  room.doorTiles.push(clonePosition(position));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getAnchorRoomLineRange(state, direction, size) {
  if (direction === "left" || direction === "right") {
    return {
      min: 1,
      max: state.HEIGHT - size - 1,
    };
  }

  return {
    min: 1,
    max: state.WIDTH - size - 1,
  };
}

function resolveAnchorRoomOffset(state, direction, size, line) {
  const { min, max } = getAnchorRoomLineRange(state, direction, size);
  if (min > max) {
    return null;
  }

  const preferred = clamp(line - Math.floor(size / 2), min, max);
  const validMin = Math.max(min, line - size + 2);
  const validMax = Math.min(max, line - 1);
  if (validMin > validMax) {
    return null;
  }

  return clamp(preferred, validMin, validMax);
}

function buildSideAnchorRoomBounds(state, direction, dimensions, line) {
  if (direction === "left") {
    const y = resolveAnchorRoomOffset(state, direction, dimensions.height, line);
    if (y == null) {
      return null;
    }
    return { x: 0, y, width: dimensions.width, height: dimensions.height };
  }

  if (direction === "right") {
    const y = resolveAnchorRoomOffset(state, direction, dimensions.height, line);
    if (y == null) {
      return null;
    }
    return {
      x: state.WIDTH - dimensions.width,
      y,
      width: dimensions.width,
      height: dimensions.height,
    };
  }

  if (direction === "front") {
    const x = resolveAnchorRoomOffset(state, direction, dimensions.width, line);
    if (x == null) {
      return null;
    }
    return { x, y: 0, width: dimensions.width, height: dimensions.height };
  }

  if (direction === "back") {
    const x = resolveAnchorRoomOffset(state, direction, dimensions.width, line);
    if (x == null) {
      return null;
    }
    return {
      x,
      y: state.HEIGHT - dimensions.height,
      width: dimensions.width,
      height: dimensions.height,
    };
  }

  return null;
}

function appendAxisPath(path, from, to) {
  if (from.x === to.x) {
    const step = from.y < to.y ? 1 : -1;
    for (let y = from.y + step; y !== to.y + step; y += step) {
      path.push({ x: from.x, y });
    }
    return;
  }

  if (from.y === to.y) {
    const step = from.x < to.x ? 1 : -1;
    for (let x = from.x + step; x !== to.x + step; x += step) {
      path.push({ x, y: from.y });
    }
  }
}

function buildSideAnchorPath(roomOpening, corridorPosition, direction, line) {
  const path = [];

  if (direction === "left" || direction === "right") {
    const firstTarget = { x: corridorPosition.x, y: line };
    appendAxisPath(path, roomOpening, firstTarget);
    appendAxisPath(path, firstTarget, corridorPosition);
    return path;
  }

  const firstTarget = { x: line, y: corridorPosition.y };
  appendAxisPath(path, roomOpening, firstTarget);
  appendAxisPath(path, firstTarget, corridorPosition);
  return path;
}

function buildBentPath(start, end, axisOrder = ["horizontal", "vertical"]) {
  const path = [];
  let current = { ...start };

  axisOrder.forEach((axis) => {
    const target = axis === "horizontal"
      ? { x: end.x, y: current.y }
      : { x: current.x, y: end.y };
    appendAxisPath(path, current, target);
    current = target;
  });

  appendAxisPath(path, current, end);
  return path;
}

function canClaimFlexibleAnchorPath(state, path, corridorPosition) {
  for (const tile of path) {
    if (
      (tile.x === corridorPosition.x && tile.y === corridorPosition.y) ||
      state.mainCorridorKeys.has(keyOf(tile.x, tile.y))
    ) {
      continue;
    }

    if (!isInsideRoomPlacementArea(state, tile.x, tile.y)) {
      return false;
    }

    const key = keyOf(tile.x, tile.y);
    if (state.roomBlockKeys.has(key) || state.sideCorridorKeys.has(key)) {
      return false;
    }
  }

  return true;
}

function buildSideAnchorConnectionGeometry(state, roomBounds, direction, line, corridorPosition) {
  const path = [];

  if (direction === "left") {
    const roomOpening = { x: roomBounds.x + roomBounds.width - 1, y: line };
    const transitionPosition = { x: 0, y: line };
    const outerOpening = { x: roomBounds.x, y: line };
    const position = { x: roomBounds.x + 1, y: line };
    path.push(...buildSideAnchorPath(roomOpening, corridorPosition, direction, line));

    return { roomOpening, transitionPosition, outerOpening, position, path };
  }

  if (direction === "right") {
    const roomOpening = { x: roomBounds.x, y: line };
    const transitionPosition = { x: state.WIDTH - 1, y: line };
    const outerOpening = { x: roomBounds.x + roomBounds.width - 1, y: line };
    const position = { x: roomBounds.x + roomBounds.width - 2, y: line };
    path.push(...buildSideAnchorPath(roomOpening, corridorPosition, direction, line));

    return { roomOpening, transitionPosition, outerOpening, position, path };
  }

  if (direction === "front") {
    const roomOpening = { x: line, y: roomBounds.y + roomBounds.height - 1 };
    const transitionPosition = { x: line, y: 0 };
    const outerOpening = { x: line, y: roomBounds.y };
    const position = { x: line, y: roomBounds.y + 1 };
    path.push(...buildSideAnchorPath(roomOpening, corridorPosition, direction, line));

    return { roomOpening, transitionPosition, outerOpening, position, path };
  }

  const roomOpening = { x: line, y: roomBounds.y };
  const transitionPosition = { x: line, y: state.HEIGHT - 1 };
  const outerOpening = { x: line, y: roomBounds.y + roomBounds.height - 1 };
  const position = { x: line, y: roomBounds.y + roomBounds.height - 2 };
  path.push(...buildSideAnchorPath(roomOpening, corridorPosition, direction, line));

  return { roomOpening, transitionPosition, outerOpening, position, path };
}

function canClaimAnchorConnectionPath(state, path, corridorPosition) {
  return canClaimFlexibleAnchorPath(state, path, corridorPosition);
}

function isInsideAnchorRoomArea(state, x, y) {
  return isInsideRoomPlacementArea(state, x, y);
}

function canClaimAnchorRoomTile(state, x, y) {
  return canClaimRoomTile(state, x, y);
}

function canPlaceAnchorRoomBounds(state, roomBounds) {
  if (!isInsideAnchorRoomArea(state, roomBounds.x, roomBounds.y) ||
    !isInsideAnchorRoomArea(state, roomBounds.x + roomBounds.width - 1, roomBounds.y + roomBounds.height - 1)) {
    return false;
  }

  for (let y = roomBounds.y; y < roomBounds.y + roomBounds.height; y += 1) {
    for (let x = roomBounds.x; x < roomBounds.x + roomBounds.width; x += 1) {
      if (!canClaimAnchorRoomTile(state, x, y)) {
        return false;
      }
    }
  }

  return true;
}

function buildAnchorRoomDimensionAttempts(spec) {
  const attempts = [];
  const minWidth = Math.min(spec.minWidth, 4);
  const minHeight = Math.min(spec.minHeight, 4);
  for (let width = spec.maxWidth; width >= minWidth; width -= 1) {
    for (let height = spec.maxHeight; height >= minHeight; height -= 1) {
      attempts.push({ width, height });
    }
  }
  return attempts;
}

function createSideAnchorRoomGeometry(state, corridorPosition, direction) {
  const spec = ROOM_TYPE_SPECS.entry_room;
  const preferredTransitionHint = state.currentAnchorTransitionHint ?? null;
  const line = preferredTransitionHint
    ? ((direction === "left" || direction === "right")
      ? preferredTransitionHint.y
      : preferredTransitionHint.x)
    : ((direction === "left" || direction === "right")
      ? corridorPosition.y
      : corridorPosition.x);

  for (const dimensions of buildAnchorRoomDimensionAttempts(spec)) {
    const roomBounds = buildSideAnchorRoomBounds(state, direction, dimensions, line);
    if (!roomBounds || !canPlaceAnchorRoomBounds(state, roomBounds)) {
      continue;
    }

    const geometry = buildSideAnchorConnectionGeometry(state, roomBounds, direction, line, corridorPosition);
    if (!geometry || !canClaimAnchorConnectionPath(state, geometry.path, corridorPosition)) {
      continue;
    }

    const room = createRoomRecord(spec, roomBounds);
    room.id = state.rooms.length;
    room.attachmentType = geometry.path.length > 0 ? "anchor_sidearm" : "anchor_main";
    room.mainConnected = true;
    room.anchor = clonePosition(corridorPosition);
    room.attachmentOrientation = direction;
    room.sideCorridorLength = geometry.path.length;
    room.anchorKind = "entry_exit_room";

    paintRoom(state, room);
    addRoomOpening(state, room, geometry.roomOpening);
    addRoomOpening(state, room, geometry.outerOpening);
    const approachPath = geometry.path.filter((tile) => !state.mainCorridorKeys.has(keyOf(tile.x, tile.y)));
    if (approachPath.length > 0) {
      carveSideCorridor(state, approachPath);
    }
    state.rooms.push(room);

    return {
      position: geometry.position,
      transitionPosition: geometry.transitionPosition,
      roomId: room.id,
      implementation: approachPath.length > 0 ? "entry_room_sidearm" : "entry_room_direct",
    };
  }

  return null;
}

function createSideAnchorGeometry(state, corridorPosition, direction) {
  if (!corridorPosition) {
    return null;
  }

  const roomGeometry = createSideAnchorRoomGeometry(state, corridorPosition, direction);
  if (roomGeometry) {
    return roomGeometry;
  }

  if (direction === "left") {
    const transitionPosition = { x: 0, y: corridorPosition.y };
    carveAnchorApproach(state, transitionPosition, corridorPosition);
    return {
      position: { x: 1, y: corridorPosition.y },
      transitionPosition,
    };
  }

  if (direction === "right") {
    const transitionPosition = { x: state.WIDTH - 1, y: corridorPosition.y };
    carveAnchorApproach(state, transitionPosition, corridorPosition);
    return {
      position: { x: state.WIDTH - 2, y: corridorPosition.y },
      transitionPosition,
    };
  }

  if (direction === "front") {
    const transitionPosition = { x: corridorPosition.x, y: 0 };
    carveAnchorApproach(state, transitionPosition, corridorPosition);
    return {
      position: { x: corridorPosition.x, y: 1 },
      transitionPosition,
    };
  }

  if (direction === "back") {
    const transitionPosition = { x: corridorPosition.x, y: state.HEIGHT - 1 };
    carveAnchorApproach(state, transitionPosition, corridorPosition);
    return {
      position: { x: corridorPosition.x, y: state.HEIGHT - 2 },
      transitionPosition,
    };
  }

  return {
    position: corridorPosition,
    transitionPosition: corridorPosition,
  };
}

function cardinalVectorForDirection(direction) {
  if (direction === "north") {
    return { x: 0, y: -1 };
  }
  if (direction === "south") {
    return { x: 0, y: 1 };
  }
  if (direction === "west") {
    return { x: -1, y: 0 };
  }
  return { x: 1, y: 0 };
}

function resolveVerticalAnchorAxis(state, corridorPosition) {
  const hasWest = state.mainCorridorKeys.has(keyOf(corridorPosition.x - 1, corridorPosition.y));
  const hasEast = state.mainCorridorKeys.has(keyOf(corridorPosition.x + 1, corridorPosition.y));
  const hasNorth = state.mainCorridorKeys.has(keyOf(corridorPosition.x, corridorPosition.y - 1));
  const hasSouth = state.mainCorridorKeys.has(keyOf(corridorPosition.x, corridorPosition.y + 1));

  if ((hasWest || hasEast) && !(hasNorth || hasSouth)) {
    return "horizontal";
  }
  if ((hasNorth || hasSouth) && !(hasWest || hasEast)) {
    return "vertical";
  }
  return "mixed";
}

function canExtendVerticalAnchorPath(state, corridorPosition, direction, length) {
  const vector = cardinalVectorForDirection(direction);
  const path = [];

  for (let step = 1; step <= length; step += 1) {
    const x = corridorPosition.x + vector.x * step;
    const y = corridorPosition.y + vector.y * step;
    if (!isInsideRoomPlacementArea(state, x, y)) {
      return null;
    }

    const key = keyOf(x, y);
    if (state.roomBlockKeys.has(key) || state.sideCorridorKeys.has(key)) {
      return null;
    }

    const inMainCorridor = state.mainCorridorKeys.has(key);
    if (step === length && inMainCorridor) {
      return null;
    }

    path.push({ x, y, inMainCorridor });
    if (!inMainCorridor) {
      return {
        position: { x, y },
        transitionPosition: { x, y },
        path,
      };
    }
  }

  return null;
}

function createPreferredVerticalAnchorGeometry(state, corridorPosition, preferredTransitionHint) {
  if (!preferredTransitionHint) {
    return null;
  }

  if (!isInsideRoomPlacementArea(state, preferredTransitionHint.x, preferredTransitionHint.y)) {
    return null;
  }

  const targetKey = keyOf(preferredTransitionHint.x, preferredTransitionHint.y);
  if (state.roomBlockKeys.has(targetKey) || state.sideCorridorKeys.has(targetKey)) {
    return null;
  }

  const pathVariants = [
    buildBentPath(corridorPosition, preferredTransitionHint, ["horizontal", "vertical"]),
    buildBentPath(corridorPosition, preferredTransitionHint, ["vertical", "horizontal"]),
  ];

  for (const path of pathVariants) {
    if (!canClaimFlexibleAnchorPath(state, path, corridorPosition)) {
      continue;
    }

    path.forEach((tile) => {
      if (!state.mainCorridorKeys.has(keyOf(tile.x, tile.y))) {
        state.grid[tile.y][tile.x] = state.TILE.FLOOR;
        state.sideCorridorKeys.add(keyOf(tile.x, tile.y));
      }
    });

    return {
      position: { ...preferredTransitionHint },
      transitionPosition: { ...preferredTransitionHint },
      path,
    };
  }

  return null;
}

function createVerticalAnchorGeometry(state, corridorPosition, preferredTransitionHint = null) {
  const preferredGeometry = createPreferredVerticalAnchorGeometry(state, corridorPosition, preferredTransitionHint);
  if (preferredGeometry) {
    return preferredGeometry;
  }

  const axis = resolveVerticalAnchorAxis(state, corridorPosition);
  const preferredDirections = axis === "horizontal"
    ? ["north", "south", "west", "east"]
    : axis === "vertical"
      ? ["west", "east", "north", "south"]
      : ["north", "south", "west", "east"];

  for (const direction of preferredDirections) {
    for (let length = 1; length <= 2; length += 1) {
      const geometry = canExtendVerticalAnchorPath(state, corridorPosition, direction, length);
      if (!geometry) {
        continue;
      }

      geometry.path.forEach((tile) => {
        if (!tile.inMainCorridor) {
          state.grid[tile.y][tile.x] = state.TILE.FLOOR;
          state.sideCorridorKeys.add(keyOf(tile.x, tile.y));
        }
      });

      return geometry;
    }
  }

  return {
    position: corridorPosition,
    transitionPosition: corridorPosition,
  };
}

function placeAnchor(state, direction, transitionStyle, reservedKeys, isEntry, preferredTransitionHint = null) {
  const corridorPosition = selectAnchorPosition(state, direction, reservedKeys, preferredTransitionHint);
  if (!corridorPosition) {
    return null;
  }

  state.currentAnchorTransitionHint = preferredTransitionHint;
  const geometry = (direction === "left" || direction === "right" || direction === "front" || direction === "back")
    ? createSideAnchorGeometry(state, corridorPosition, direction)
    : ((direction === "up" || direction === "down")
      ? createVerticalAnchorGeometry(state, corridorPosition, preferredTransitionHint)
      : {
          position: corridorPosition,
          transitionPosition: corridorPosition,
        })
    ;
  state.currentAnchorTransitionHint = null;

  if (!geometry?.position || !geometry?.transitionPosition) {
    return null;
  }

  reservedKeys.add(keyOf(corridorPosition.x, corridorPosition.y));
  return {
    position: geometry.position,
    transitionPosition: geometry.transitionPosition,
    corridorPosition,
    direction,
    transitionStyle: transitionStyle ?? "passage",
    implementation: geometry.implementation ?? "direct",
    roomId: geometry.roomId ?? null,
    label: createAnchorLabel(direction, transitionStyle ?? "passage", isEntry),
  };
}

function chooseRoomDimensions(spec, randomInt) {
  return {
    width: randomBetween(randomInt, spec.minWidth, spec.maxWidth),
    height: randomBetween(randomInt, spec.minHeight, spec.maxHeight),
  };
}

function isInsidePlayableArea(state, x, y) {
  return x >= 1 && y >= 1 && x < state.WIDTH - 1 && y < state.HEIGHT - 1;
}

function isInsideRoomPlacementArea(state, x, y) {
  return x >= 0 && y >= 0 && x < state.WIDTH && y < state.HEIGHT;
}

function canClaimTile(state, x, y, allowedOverlapKeys = null) {
  if (!isInsideRoomPlacementArea(state, x, y)) {
    return false;
  }

  const key = keyOf(x, y);
  if (allowedOverlapKeys?.has(key)) {
    return !state.roomBlockKeys.has(key) && !state.sideCorridorKeys.has(key);
  }
  return !state.roomBlockKeys.has(key) &&
    !state.mainCorridorKeys.has(key) &&
    !state.sideCorridorKeys.has(key);
}

function canClaimRoomTile(state, x, y, allowedOverlapKeys = null) {
  if (!isInsideRoomPlacementArea(state, x, y)) {
    return false;
  }

  const key = keyOf(x, y);
  if (allowedOverlapKeys?.has(key)) {
    return !state.roomBlockKeys.has(key) && !state.sideCorridorKeys.has(key);
  }

  return !state.roomBlockKeys.has(key) &&
    !state.mainCorridorKeys.has(key) &&
    !state.sideCorridorKeys.has(key);
}

function canPlaceRoomBounds(state, roomBounds, allowedOverlapKeys = null) {
  if (!isInsideRoomPlacementArea(state, roomBounds.x, roomBounds.y) ||
    !isInsideRoomPlacementArea(state, roomBounds.x + roomBounds.width - 1, roomBounds.y + roomBounds.height - 1)) {
    return false;
  }

  for (let y = roomBounds.y; y < roomBounds.y + roomBounds.height; y += 1) {
    for (let x = roomBounds.x; x < roomBounds.x + roomBounds.width; x += 1) {
      if (!canClaimRoomTile(state, x, y, allowedOverlapKeys)) {
        return false;
      }
    }
  }

  return true;
}

function collectWallDoorCandidates(roomBounds, orientation) {
  const candidates = [];
  if (orientation === "north" || orientation === "south") {
    const y = orientation === "north"
      ? roomBounds.y
      : roomBounds.y + roomBounds.height - 1;
    for (let x = roomBounds.x + 1; x <= roomBounds.x + roomBounds.width - 2; x += 1) {
      candidates.push({ x, y });
    }
    return candidates;
  }

  const x = orientation === "west"
    ? roomBounds.x
    : roomBounds.x + roomBounds.width - 1;
  for (let y = roomBounds.y + 1; y <= roomBounds.y + roomBounds.height - 2; y += 1) {
    candidates.push({ x, y });
  }
  return candidates;
}

function createRoomBoundsFromDoor(door, dimensions, orientation) {
  if (orientation === "north") {
    return {
      x: door.x - Math.floor(dimensions.width / 2),
      y: door.y - dimensions.height + 1,
      width: dimensions.width,
      height: dimensions.height,
    };
  }
  if (orientation === "south") {
    return {
      x: door.x - Math.floor(dimensions.width / 2),
      y: door.y,
      width: dimensions.width,
      height: dimensions.height,
    };
  }
  if (orientation === "west") {
    return {
      x: door.x - dimensions.width + 1,
      y: door.y - Math.floor(dimensions.height / 2),
      width: dimensions.width,
      height: dimensions.height,
    };
  }

  return {
    x: door.x,
    y: door.y - Math.floor(dimensions.height / 2),
    width: dimensions.width,
    height: dimensions.height,
  };
}

function corridorDirectionForOrientation(orientation) {
  if (orientation === "north") {
    return { x: 0, y: -1 };
  }
  if (orientation === "south") {
    return { x: 0, y: 1 };
  }
  if (orientation === "west") {
    return { x: -1, y: 0 };
  }
  return { x: 1, y: 0 };
}

function getPerpendicularOrientations(orientation) {
  if (orientation === "north" || orientation === "south") {
    return ["west", "east"];
  }
  return ["north", "south"];
}

function oppositeOrientation(orientation) {
  if (orientation === "north") {
    return "south";
  }
  if (orientation === "south") {
    return "north";
  }
  if (orientation === "west") {
    return "east";
  }
  return "west";
}

function paintRoom(state, room) {
  room.floorTiles = [];
  room.interiorTiles = [];
  room.blockTiles = [];

  for (let y = room.y; y < room.y + room.height; y += 1) {
    for (let x = room.x; x < room.x + room.width; x += 1) {
      const key = keyOf(x, y);
      state.roomBlockKeys.add(key);
      room.blockTiles.push({ x, y });

      const isInterior = x > room.x &&
        x < room.x + room.width - 1 &&
        y > room.y &&
        y < room.y + room.height - 1;

      if (isInterior) {
        state.grid[y][x] = state.TILE.FLOOR;
        room.floorTiles.push({ x, y });
        room.interiorTiles.push({ x, y });
      }
    }
  }
}

function addDoor(state, room, position, config = {}) {
  state.grid[position.y][position.x] = state.TILE.FLOOR;
  room.floorTiles.push(clonePosition(position));
  room.doorTiles.push(clonePosition(position));
  const door = state.createDoor(position.x, position.y, {
    roomIdA: config.roomIdA ?? null,
    roomIdB: config.roomIdB ?? room.id,
  });
  state.doors.push(door);
  room.doorIds.push(state.doors.length - 1);
  return door;
}

function addOpening(state, room, position) {
  state.grid[position.y][position.x] = state.TILE.FLOOR;
  room.floorTiles.push(clonePosition(position));
  room.doorTiles.push(clonePosition(position));
  return null;
}

function addRoomConnection(state, room, position, shouldUseDoor, config = {}) {
  if (shouldUseDoor) {
    return addDoor(state, room, position, config);
  }
  return addOpening(state, room, position);
}

function carveSideCorridor(state, path) {
  path.forEach((tile) => {
    state.grid[tile.y][tile.x] = state.TILE.FLOOR;
    state.sideCorridorKeys.add(keyOf(tile.x, tile.y));
  });
}

function buildStraightCorridorPath(sourceTile, orientation, corridorLength) {
  const vector = corridorDirectionForOrientation(orientation);
  const corridorPath = [];

  for (let step = 1; step <= corridorLength; step += 1) {
    corridorPath.push({
      x: sourceTile.x + vector.x * step,
      y: sourceTile.y + vector.y * step,
    });
  }

  return corridorPath;
}

function buildBentCorridorPath(sourceTile, bendOrientation, finalOrientation, bendLength, finalLength) {
  const bendVector = corridorDirectionForOrientation(bendOrientation);
  const finalVector = corridorDirectionForOrientation(finalOrientation);
  const path = [];
  let current = { x: sourceTile.x, y: sourceTile.y };

  for (let step = 0; step < bendLength; step += 1) {
    current = {
      x: current.x + bendVector.x,
      y: current.y + bendVector.y,
    };
    path.push({ ...current });
  }

  for (let step = 0; step < finalLength; step += 1) {
    current = {
      x: current.x + finalVector.x,
      y: current.y + finalVector.y,
    };
    path.push({ ...current });
  }

  return path;
}

function createRoomRecord(spec, roomBounds) {
  return {
    id: null,
    role: spec.id,
    label: spec.label,
    x: roomBounds.x,
    y: roomBounds.y,
    width: roomBounds.width,
    height: roomBounds.height,
    attachmentType: null,
    preferredPathRole: spec.preferredPathRole,
    maxChildren: spec.maxChildren,
    childrenCount: 0,
    mainConnected: false,
    overlayRole: null,
    floorTiles: [],
    interiorTiles: [],
    doorTiles: [],
    doorIds: [],
    blockTiles: [],
  };
}

function canRoomCarryChildren(room) {
  return room.childrenCount < room.maxChildren &&
    (room.mainConnected || room.role === "connector_room");
}

function computeAttachmentOpportunityScore(state, sourceTile, orientation, maxDepth = 8) {
  const vector = corridorDirectionForOrientation(orientation);
  const perpendiculars = getPerpendicularOrientations(orientation);
  let score = 0;

  for (let step = 1; step <= maxDepth; step += 1) {
    const x = sourceTile.x + vector.x * step;
    const y = sourceTile.y + vector.y * step;
    if (!isInsideRoomPlacementArea(state, x, y)) {
      break;
    }

    const key = keyOf(x, y);
    if (state.roomBlockKeys.has(key) || state.mainCorridorKeys.has(key) || state.sideCorridorKeys.has(key)) {
      break;
    }

    score += 3;
    for (const sideOrientation of perpendiculars) {
      const sideVector = corridorDirectionForOrientation(sideOrientation);
      const sideX = x + sideVector.x;
      const sideY = y + sideVector.y;
      if (!isInsideRoomPlacementArea(state, sideX, sideY)) {
        continue;
      }
      const sideKey = keyOf(sideX, sideY);
      if (
        !state.roomBlockKeys.has(sideKey) &&
        !state.mainCorridorKeys.has(sideKey) &&
        !state.sideCorridorKeys.has(sideKey)
      ) {
        score += 1;
      }
    }
  }

  return score;
}

function buildOrderedMainAttachmentCandidates(state, spec) {
  return shuffleList(
    sortTilesForAttachment([...state.mainCorridorKeys].map(parseKey), spec.preferredPathRole),
    state.randomChance,
  )
    .flatMap((sourceTile) =>
      shuffleList([...SIDE_ORIENTATIONS], state.randomChance).map((orientation) => ({
        sourceTile,
        orientation,
        score: computeAttachmentOpportunityScore(state, sourceTile, orientation),
      }))
    )
    .sort((left, right) => right.score - left.score)
    .slice(0, 48);
}

function shouldUseDoorForSpec(state, spec) {
  const chance = spec.doorChance ?? 1;
  if (chance <= 0) {
    return false;
  }
  if (chance >= 1) {
    return true;
  }
  return state.randomChance() <= chance;
}

function shouldUseDoorForRoom(state, room) {
  const spec = ROOM_TYPE_SPECS[room.role];
  if (!spec) {
    return true;
  }
  return shouldUseDoorForSpec(state, spec);
}

function resolveConnectionDoorPlan(state, spec, attachmentType, parentRoom = null) {
  const childDoor = shouldUseDoorForSpec(state, spec);
  if (!parentRoom || attachmentType !== "sidearm_room") {
    return {
      parentDoor: false,
      childDoor,
    };
  }

  if (childDoor) {
    return {
      parentDoor: false,
      childDoor: true,
    };
  }

  return {
    parentDoor: shouldUseDoorForRoom(state, parentRoom),
    childDoor: false,
  };
}

function buildRoomFromAttachment(
  state,
  spec,
  attachmentType,
  sourceTile,
  orientation,
  corridorLength = 0,
  parentRoom = null,
  pathConfig = null,
) {
  const corridorPath = pathConfig?.path
    ? pathConfig.path.map((tile) => ({ x: tile.x, y: tile.y }))
    : buildStraightCorridorPath(sourceTile, orientation, corridorLength);
  const finalOrientation = pathConfig?.finalOrientation ?? orientation;
  const vector = corridorDirectionForOrientation(finalOrientation);

  if (corridorPath.some((tile) => !canClaimTile(state, tile.x, tile.y))) {
    return null;
  }

  for (let dimensionAttempt = 0; dimensionAttempt < 6; dimensionAttempt += 1) {
    const dimensions = chooseRoomDimensions(spec, state.randomInt);
    const anchorTile = corridorPath[corridorPath.length - 1] ?? sourceTile;
    const door = {
      x: anchorTile.x + vector.x,
      y: anchorTile.y + vector.y,
    };
    const roomBounds = createRoomBoundsFromDoor(door, dimensions, finalOrientation);
    const allowedOverlapKeys = attachmentType === "direct_main"
      ? new Set([keyOf(door.x, door.y)])
      : null;

    if (!canPlaceRoomBounds(state, roomBounds, allowedOverlapKeys)) {
      continue;
    }

    if (!collectWallDoorCandidates(roomBounds, oppositeOrientation(finalOrientation))
      .some((candidate) => candidate.x === door.x && candidate.y === door.y)) {
      continue;
    }

    const room = createRoomRecord(spec, roomBounds);
    room.id = state.rooms.length;
    room.attachmentType = attachmentType;
    room.mainConnected = attachmentType !== "sidearm_room";
    room.parentRoomId = parentRoom?.id ?? null;
    room.anchor = clonePosition(sourceTile);
    room.attachmentOrientation = finalOrientation;
    room.sideCorridorLength = corridorPath.length;
    const doorPlan = resolveConnectionDoorPlan(state, spec, attachmentType, parentRoom);

    paintRoom(state, room);
    if (corridorPath.length > 0) {
      carveSideCorridor(state, corridorPath);
    }

    if (parentRoom) {
      addRoomConnection(state, parentRoom, clonePosition(sourceTile), doorPlan.parentDoor, {
        roomIdA: parentRoom.id,
        roomIdB: room.id,
      });
      parentRoom.childrenCount += 1;
    }

    addRoomConnection(state, room, door, doorPlan.childDoor, {
      roomIdA: parentRoom?.id ?? null,
      roomIdB: room.id,
    });

    state.rooms.push(room);
    return room;
  }

  return null;
}

function tryPlaceDirectMainRoom(state, spec) {
  for (const { sourceTile, orientation } of buildOrderedMainAttachmentCandidates(state, spec)) {
      const room = buildRoomFromAttachment(
        state,
        spec,
        "direct_main",
        sourceTile,
        orientation,
        0,
        null,
      );
      if (room) {
        return room;
      }
  }

  return null;
}

function tryPlaceSidearmMainRoom(state, spec) {
  for (const { sourceTile, orientation } of buildOrderedMainAttachmentCandidates(state, spec)) {
      for (let corridorLength = 1; corridorLength <= 6; corridorLength += 1) {
        const room = buildRoomFromAttachment(
          state,
          spec,
          "sidearm_main",
          sourceTile,
          orientation,
          corridorLength,
          null,
        );
        if (room) {
          return room;
        }
      }

      for (const bendOrientation of shuffleList(getPerpendicularOrientations(orientation), state.randomChance)) {
        for (let bendLength = 1; bendLength <= 3; bendLength += 1) {
          for (let corridorLength = 1; corridorLength <= 6; corridorLength += 1) {
            const room = buildRoomFromAttachment(
              state,
              spec,
              "sidearm_main",
              sourceTile,
              orientation,
              0,
              null,
              {
                path: buildBentCorridorPath(sourceTile, bendOrientation, orientation, bendLength, corridorLength),
                finalOrientation: orientation,
              },
            );
            if (room) {
              return room;
            }
          }
        }
      }
  }

  return null;
}

function chooseParentDoorSource(state, parentRoom, orientation, randomChance) {
  const candidates = collectWallDoorCandidates(parentRoom, orientation).filter((candidate) =>
    !parentRoom.doorTiles.some((doorTile) => doorTile.x === candidate.x && doorTile.y === candidate.y)
  );
  if (candidates.length === 0) {
    return null;
  }

  return shuffleList(candidates, randomChance)
    .sort((left, right) =>
      computeAttachmentOpportunityScore(state, right, orientation) - computeAttachmentOpportunityScore(state, left, orientation)
    )[0];
}

function getSidearmParentPriority(room) {
  let score = 0;
  if (room.attachmentType === "sidearm_main") {
    score += 6;
  } else if (room.attachmentType === "direct_main") {
    score += 3;
  } else if (room.role === "connector_room") {
    score += 5;
  }
  score += Math.min(4, room.sideCorridorLength ?? 0);
  score += Math.min(2, room.childrenCount ?? 0);
  return score;
}

function getSidearmOrientationOrder(parentRoom, randomChance) {
  const remaining = shuffleList(
    SIDE_ORIENTATIONS.filter((orientation) => orientation !== parentRoom.attachmentOrientation),
    randomChance,
  );

  if (!parentRoom.attachmentOrientation) {
    return remaining;
  }

  return [parentRoom.attachmentOrientation, ...remaining];
}

function tryPlaceSidearmRoom(state, spec) {
  const parentCandidates = shuffleList(
    state.rooms.filter((room) =>
      canRoomCarryChildren(room)
    ),
    state.randomChance,
  ).sort((left, right) => getSidearmParentPriority(right) - getSidearmParentPriority(left));

  for (const parentRoom of parentCandidates) {
    const orientations = getSidearmOrientationOrder(parentRoom, state.randomChance)
      .map((orientation) => ({
        orientation,
        score: computeAttachmentOpportunityScore(
          state,
          parentRoom.anchor ?? parentRoom.floorTiles[0] ?? { x: parentRoom.x, y: parentRoom.y },
          orientation,
        ),
      }))
      .sort((left, right) => right.score - left.score)
      .map((entry) => entry.orientation);

    for (const orientation of orientations) {
      const sourceTile = chooseParentDoorSource(state, parentRoom, orientation, state.randomChance);
      if (!sourceTile) {
        continue;
      }

      for (let corridorLength = 1; corridorLength <= 6; corridorLength += 1) {
        const room = buildRoomFromAttachment(
          state,
          spec,
          "sidearm_room",
          sourceTile,
          orientation,
          corridorLength,
          parentRoom,
        );
        if (room) {
          return room;
        }
      }

      for (const bendOrientation of shuffleList(getPerpendicularOrientations(orientation), state.randomChance)) {
        for (let bendLength = 1; bendLength <= 3; bendLength += 1) {
          for (let corridorLength = 1; corridorLength <= 6; corridorLength += 1) {
            const room = buildRoomFromAttachment(
              state,
              spec,
              "sidearm_room",
              sourceTile,
              orientation,
              0,
              parentRoom,
              {
                path: buildBentCorridorPath(sourceTile, bendOrientation, orientation, bendLength, corridorLength),
                finalOrientation: orientation,
              },
            );
            if (room) {
              return room;
            }
          }
        }
      }
    }
  }

  return null;
}

function placeConnectorRooms(state) {
  const spec = ROOM_TYPE_SPECS.connector_room;
  if (!spec) {
    return [];
  }

  const desiredCount = randomBetween(state.randomInt, 1, Math.min(5, spec.maxCount ?? 1));
  const placedRooms = [];

  for (let attempt = 0; attempt < desiredCount; attempt += 1) {
    let placedRoom = null;
    for (const attachment of getAttachmentTryOrder(spec)) {
      if (attachment === "direct_main") {
        placedRoom = tryPlaceDirectMainRoom(state, spec);
      } else if (attachment === "sidearm_main") {
        placedRoom = tryPlaceSidearmMainRoom(state, spec);
      }

      if (placedRoom) {
        placedRooms.push(placedRoom);
        break;
      }
    }

    if (!placedRoom) {
      break;
    }
  }

  return placedRooms;
}

function topOffConnectorRooms(state) {
  const spec = ROOM_TYPE_SPECS.connector_room;
  if (!spec) {
    return [];
  }

  const placedCounts = countPlacedRoomsByRole(state);
  const remaining = Math.max(0, (spec.maxCount ?? 0) - (placedCounts.connector_room ?? 0));
  const placedRooms = [];

  for (let attempt = 0; attempt < remaining; attempt += 1) {
    let placedRoom = null;
    for (const attachment of getExpansionAttachmentTryOrder(state, spec)) {
      if (attachment === "direct_main") {
        placedRoom = tryPlaceDirectMainRoom(state, spec);
      } else if (attachment === "sidearm_main") {
        placedRoom = tryPlaceSidearmMainRoom(state, spec);
      } else if (attachment === "sidearm_room") {
        placedRoom = tryPlaceSidearmRoom(state, spec);
      }

      if (placedRoom) {
        placedRooms.push(placedRoom);
        break;
      }
    }

    if (!placedRoom) {
      break;
    }
  }

  return placedRooms;
}

function isLoopEligibleRoom(room) {
  if (!room || room.overlayRole != null) {
    return false;
  }

  if (room.role === "entry_room" || room.role === "showcase_room") {
    return false;
  }

  return room.role === "connector_room" || room.attachmentType !== "direct_main";
}

function getRoomCenter(room) {
  return {
    x: room.x + Math.floor(room.width / 2),
    y: room.y + Math.floor(room.height / 2),
  };
}

function getPreferredLoopOrientations(fromRoom, toRoom) {
  const fromCenter = getRoomCenter(fromRoom);
  const toCenter = getRoomCenter(toRoom);
  const dx = toCenter.x - fromCenter.x;
  const dy = toCenter.y - fromCenter.y;

  if (Math.abs(dx) >= Math.abs(dy)) {
    return [
      dx >= 0 ? "east" : "west",
      dy >= 0 ? "south" : "north",
    ];
  }

  return [
    dy >= 0 ? "south" : "north",
    dx >= 0 ? "east" : "west",
  ];
}

function collectLoopOpeningCandidates(room, orientation) {
  return collectWallDoorCandidates(room, orientation).filter((candidate) =>
    !room.doorTiles.some((doorTile) =>
      Math.abs(doorTile.x - candidate.x) + Math.abs(doorTile.y - candidate.y) <= 1
    )
  );
}

function buildLoopPathBetweenOpenings(leftOpening, rightOpening, bendOrder = ["horizontal", "vertical"]) {
  if (leftOpening.x === rightOpening.x || leftOpening.y === rightOpening.y) {
    return buildBentPath(leftOpening, rightOpening, ["horizontal", "vertical"]);
  }
  return buildBentPath(leftOpening, rightOpening, bendOrder);
}

function canClaimLoopPath(state, path, startOpening, endOpening) {
  for (const tile of path) {
    const isStart = tile.x === startOpening.x && tile.y === startOpening.y;
    const isEnd = tile.x === endOpening.x && tile.y === endOpening.y;
    if (isStart || isEnd) {
      continue;
    }

    if (!canClaimTile(state, tile.x, tile.y)) {
      return false;
    }
  }

  return true;
}

function tryCreateRoomLoopConnection(state, roomA, roomB) {
  const preferredA = getPreferredLoopOrientations(roomA, roomB);
  const preferredB = getPreferredLoopOrientations(roomB, roomA);

  for (const orientationA of preferredA) {
    const candidatesA = collectLoopOpeningCandidates(roomA, orientationA);
    if (candidatesA.length === 0) {
      continue;
    }

    for (const orientationB of preferredB) {
      const candidatesB = collectLoopOpeningCandidates(roomB, orientationB);
      if (candidatesB.length === 0) {
        continue;
      }

      for (const openingA of shuffleList(candidatesA, state.randomChance)) {
        for (const openingB of shuffleList(candidatesB, state.randomChance)) {
          const directDistance = Math.abs(openingA.x - openingB.x) + Math.abs(openingA.y - openingB.y);
          if (directDistance > 18) {
            continue;
          }

          const pathVariants = [
            buildLoopPathBetweenOpenings(openingA, openingB, ["horizontal", "vertical"]),
            buildLoopPathBetweenOpenings(openingA, openingB, ["vertical", "horizontal"]),
          ];

          for (const path of pathVariants) {
            if (!canClaimLoopPath(state, path, openingA, openingB)) {
              continue;
            }

            carveSideCorridor(state, path.filter((tile) =>
              !(tile.x === openingA.x && tile.y === openingA.y) &&
              !(tile.x === openingB.x && tile.y === openingB.y)
            ));
            addOpening(state, roomA, openingA);
            addOpening(state, roomB, openingB);
            const connection = {
              roomIdA: roomA.id,
              roomIdB: roomB.id,
              openingA: clonePosition(openingA),
              openingB: clonePosition(openingB),
              path: path.map(clonePosition),
            };
            state.extraLoopConnections.push(connection);
            return connection;
          }
        }
      }
    }
  }

  return null;
}

function addPeripheralRoomLoops(state) {
  const eligibleRooms = state.rooms.filter(isLoopEligibleRoom);
  if (eligibleRooms.length < 2) {
    return [];
  }

  const desiredCount = randomBetween(state.randomInt, 1, 5);
  const pairCandidates = [];

  for (let leftIndex = 0; leftIndex < eligibleRooms.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < eligibleRooms.length; rightIndex += 1) {
      const roomA = eligibleRooms[leftIndex];
      const roomB = eligibleRooms[rightIndex];
      const centerA = getRoomCenter(roomA);
      const centerB = getRoomCenter(roomB);
      const distance = Math.abs(centerA.x - centerB.x) + Math.abs(centerA.y - centerB.y);

      pairCandidates.push({
        roomA,
        roomB,
        distance,
      });
    }
  }

  const orderedPairs = shuffleList(pairCandidates, state.randomChance)
    .sort((left, right) => left.distance - right.distance);
  const usedPairs = new Set();
  const connections = [];

  for (const pair of orderedPairs) {
    if (connections.length >= desiredCount) {
      break;
    }

    const pairKey = `${Math.min(pair.roomA.id, pair.roomB.id)}:${Math.max(pair.roomA.id, pair.roomB.id)}`;
    if (usedPairs.has(pairKey)) {
      continue;
    }

    const connection = tryCreateRoomLoopConnection(state, pair.roomA, pair.roomB);
    if (!connection) {
      continue;
    }

    usedPairs.add(pairKey);
    connections.push(connection);
  }

  return connections;
}

function pickThemeRooms(state, minimumCount = 3) {
  const roomsToAttempt = collectRoomAttemptOrder(state.randomChance);
  const placedThemeRooms = [];
  state.lastThemeAttemptOrder = [...roomsToAttempt];

  for (const roomTypeId of roomsToAttempt) {
    const spec = ROOM_TYPE_SPECS[roomTypeId];
    const attachments = getAttachmentTryOrder(spec);
    let placedRoom = null;

    for (const attachment of attachments) {
      if (attachment === "direct_main") {
        placedRoom = tryPlaceDirectMainRoom(state, spec);
      } else if (attachment === "sidearm_main") {
        placedRoom = tryPlaceSidearmMainRoom(state, spec);
      } else if (attachment === "sidearm_room") {
        placedRoom = tryPlaceSidearmRoom(state, spec);
      }

      if (placedRoom) {
        placedThemeRooms.push(placedRoom);
        break;
      }
    }
  }

  const targetThemeCount = computeTargetThemeRoomCount(state, minimumCount);
  if (placedThemeRooms.length < targetThemeCount) {
    const fillOrder = buildRoomFillOrder(state, placedThemeRooms);
    let progress = true;

    while (placedThemeRooms.length < targetThemeCount && progress) {
      progress = false;

      for (const roomTypeId of fillOrder) {
        if (placedThemeRooms.length >= targetThemeCount) {
          break;
        }

        const placedCounts = countPlacedRoomsByRole(state);
        const spec = ROOM_TYPE_SPECS[roomTypeId];
        if (!spec || (placedCounts[roomTypeId] ?? 0) >= (spec.maxCount ?? 1)) {
          continue;
        }

        let placedRoom = null;
        for (const attachment of getExpansionAttachmentTryOrder(state, spec)) {
          if (attachment === "direct_main") {
            placedRoom = tryPlaceDirectMainRoom(state, spec);
          } else if (attachment === "sidearm_main") {
            placedRoom = tryPlaceSidearmMainRoom(state, spec);
          } else if (attachment === "sidearm_room") {
            placedRoom = tryPlaceSidearmRoom(state, spec);
          }

          if (placedRoom) {
            placedThemeRooms.push(placedRoom);
            progress = true;
            break;
          }
        }
      }
    }
  }

  state.lastPlacedThemeRoomRoles = placedThemeRooms.map((room) => room.role);
  return placedThemeRooms.length >= minimumCount ? placedThemeRooms : null;
}

function chooseShowcaseProps(propCatalog, usedIds, studioArchetypeId, targetCount, randomChance) {
  const archetypeSpecific = propCatalog.filter((prop) => prop.archetype === studioArchetypeId);
  const globalProps = propCatalog.filter((prop) => prop.archetype === "global");
  const pools = [
    shuffleList(archetypeSpecific.filter((prop) => !usedIds.has(prop.id)), randomChance),
    shuffleList(globalProps.filter((prop) => !usedIds.has(prop.id)), randomChance),
    shuffleList(archetypeSpecific, randomChance),
    shuffleList(globalProps, randomChance),
  ];
  const selected = [];
  const seenIds = new Set();

  pools.forEach((pool, poolIndex) => {
    for (const prop of pool) {
      if (selected.length >= targetCount) {
        break;
      }
      if (poolIndex < 2 && seenIds.has(prop.id)) {
        continue;
      }
      selected.push(prop);
      seenIds.add(prop.id);
    }
  });

  return selected.slice(0, targetCount);
}

function getOrthogonalNeighbors(position) {
  return [
    { x: position.x + 1, y: position.y },
    { x: position.x - 1, y: position.y },
    { x: position.x, y: position.y + 1 },
    { x: position.x, y: position.y - 1 },
  ];
}

function buildTileKeySet(tiles) {
  return new Set(tiles.map((tile) => keyOf(tile.x, tile.y)));
}

function chooseFreeRoomTile(state, room, options = {}) {
  const candidates = shuffleList(
    room.interiorTiles.filter((tile) => {
      const tileKey = keyOf(tile.x, tile.y);
      return !state.occupiedSpawnKeys.has(tileKey) &&
        !room.doorTiles.some((door) => door.x === tile.x && door.y === tile.y);
    }),
    state.randomChance,
  );
  const selected = candidates[0] ?? null;
  if (selected && options.reserveOnly) {
    state.occupiedSpawnKeys.add(keyOf(selected.x, selected.y));
  }
  return selected;
}

function placeShowcasesInShowcaseRoom(state, room, studioArchetypeId) {
  if (!room) {
    return;
  }

  const usedPropIds = state.collectUsedShowcasePropIds();
  const roomFloorKeys = buildTileKeySet(room.floorTiles);
  const candidateTiles = shuffleList(
    room.interiorTiles.filter((tile) =>
      !room.doorTiles.some((door) => door.x === tile.x && door.y === tile.y)
    ),
    state.randomChance,
  );
  const selectedTiles = [];
  const claimedTriggerKeys = new Set();

  for (const tile of candidateTiles) {
    const triggerNeighbors = getOrthogonalNeighbors(tile)
      .filter((neighbor) => roomFloorKeys.has(keyOf(neighbor.x, neighbor.y)))
    const triggerKeys = triggerNeighbors.map((neighbor) => keyOf(neighbor.x, neighbor.y));

    if (triggerKeys.length === 0 || triggerKeys.some((triggerKey) => claimedTriggerKeys.has(triggerKey))) {
      continue;
    }

    const currentBlockedPositions = [...state.showcases, ...selectedTiles];
    const baselineReachableKeys = buildTileKeySet(
      state.computeReachableTilesWithBlockedPositions(
        state.grid,
        state.startPosition,
        state.doors,
        currentBlockedPositions,
      ),
    );
    const blockedPositions = [...currentBlockedPositions, tile];
    const reachableKeys = buildTileKeySet(
      state.computeReachableTilesWithBlockedPositions(
        state.grid,
        state.startPosition,
        state.doors,
        blockedPositions,
      ),
    );
    const roomStillReachable = room.floorTiles.some((floorTile) => reachableKeys.has(keyOf(floorTile.x, floorTile.y)));
    const triggerNeighborsRemainReachable = triggerNeighbors.every((neighbor) => reachableKeys.has(keyOf(neighbor.x, neighbor.y)));
    const candidateOnlyRemovesShowcaseTiles = [...baselineReachableKeys].every((reachableKey) => {
      if (reachableKey === keyOf(tile.x, tile.y)) {
        return true;
      }
      return reachableKeys.has(reachableKey);
    });

    if (!roomStillReachable || !triggerNeighborsRemainReachable || !candidateOnlyRemovesShowcaseTiles) {
      continue;
    }

    selectedTiles.push(tile);
    triggerKeys.forEach((triggerKey) => claimedTriggerKeys.add(triggerKey));
    if (selectedTiles.length >= 3) {
      break;
    }
  }

  const props = chooseShowcaseProps(
    state.propCatalog,
    usedPropIds,
    studioArchetypeId,
    selectedTiles.length,
    state.randomChance,
  );

  selectedTiles.forEach((tile, index) => {
    const prop = props[index];
    if (!prop) {
      return;
    }
    const showcase = state.createShowcase(prop, tile.x, tile.y);
    showcase.id = showcase.item.id;
    showcase.roomId = room.id;
    state.showcases.push(showcase);
    state.occupiedSpawnKeys.add(keyOf(tile.x, tile.y));
  });
}

function chooseWeightedRoom(state, factorKey, options = {}) {
  const entries = state.rooms
    .filter((room) => {
      if (options.excludeShowcaseRoom && room.role === "showcase_room") {
        return false;
      }
      if (options.excludeLockedBonus && room.overlayRole === "locked_bonus") {
        return false;
      }
      return room.interiorTiles.some((tile) => !state.occupiedSpawnKeys.has(keyOf(tile.x, tile.y)));
    })
    .map((room) => ({
      room,
      weight: Math.max(0.1, (ROOM_TYPE_SPECS[room.role]?.[factorKey] ?? 1) * room.interiorTiles.length),
    }));

  return weightedPick(entries, state.randomChance)?.room ?? null;
}

function assignLockedOverlays(state, floorNumber, studioArchetypeId, playerState, runArchetypeSequence) {
  const candidateLockedRooms = shuffleList(
    state.rooms.filter((room) =>
      room.attachmentType === "sidearm_main" &&
      room.childrenCount === 0 &&
      room.doorIds.length === 1 &&
      room.doorTiles.length === 1 &&
      room.role !== "showcase_room" &&
      room.role !== "connector_room" &&
      room.role !== "entry_room"
    ),
    state.randomChance,
  );
  const candidateKeyRooms = shuffleList(
    state.rooms.filter((room) =>
      room.role !== "showcase_room" &&
      room.role !== "connector_room" &&
      room.role !== "entry_room"
    ),
    state.randomChance,
  );
  const desiredLockedCount = Math.min(
    3,
    state.getLockedDoorCountForFloor(floorNumber),
    candidateLockedRooms.length,
  );

  for (let index = 0; index < desiredLockedCount; index += 1) {
    const lockedRoom = candidateLockedRooms[index];
    const matchingKeyRoom = candidateKeyRooms.find((room) =>
      room.id !== lockedRoom.id &&
      room.overlayRole == null
    );
    if (!lockedRoom || !matchingKeyRoom) {
      break;
    }

    const door = state.doors[lockedRoom.doorIds[0]];
    if (!door) {
      continue;
    }

    const lockColor = state.LOCK_COLORS[index % state.LOCK_COLORS.length];
    door.doorType = state.DOOR_TYPE.LOCKED;
    door.lockColor = lockColor;
    lockedRoom.overlayRole = "locked_bonus";
    lockedRoom.lockColor = lockColor;

    matchingKeyRoom.overlayRole = matchingKeyRoom.overlayRole ?? "key_room";
    matchingKeyRoom.keyColor = lockColor;
    const keyTile = chooseFreeRoomTile(state, matchingKeyRoom, { reserveOnly: true });
    if (keyTile) {
      state.keys.push(state.createKeyPickup(lockColor, keyTile.x, keyTile.y, floorNumber));
    }

    if (state.shouldPlaceLockedRoomChest()) {
      const chestTile = chooseFreeRoomTile(state, lockedRoom, { reserveOnly: true });
      if (chestTile) {
        const containerConfig = state.getContainerConfigForArchetype(studioArchetypeId);
        state.chests.push(state.createChestPickup(
          state.rollChestContent(floorNumber + 1, playerState, {
            dropSourceTag: "locked-room-chest",
            preferredArchetypeId: studioArchetypeId,
            boostSpecial: true,
            runArchetypeSequence,
          }),
          chestTile.x,
          chestTile.y,
          {
            containerName: containerConfig.name,
            containerAssetId: containerConfig.assetId,
          },
        ));
      }
    }
  }
}

function placeWorldContent(state, floorNumber, studioArchetypeId, playerState, runArchetypeSequence) {
  const foodBudget = state.splitFoodBudget(state.rollFoodBudget(state.randomInt).totalBudget);
  const floorSeenCounts = {};
  const unlockedMonsterRank = state.getUnlockedMonsterRank(floorNumber, state.MONSTER_CATALOG);
  const availableMonsters = state.MONSTER_CATALOG.filter((monster) => monster.rank <= unlockedMonsterRank);

  for (let index = 0; index < state.getEnemyCountForFloor(floorNumber); index += 1) {
    const room = chooseWeightedRoom(state, "enemyFactor", { excludeLockedBonus: true });
    const tile = room ? chooseFreeRoomTile(state, room, { reserveOnly: true }) : null;
    if (!tile) {
      continue;
    }

    const monster = state.chooseWeightedMonster(
      availableMonsters,
      floorNumber,
      state.getState()?.seenMonsterCounts ?? {},
      floorSeenCounts,
    );
    floorSeenCounts[monster.id] = (floorSeenCounts[monster.id] ?? 0) + 1;
    if (state.getState()?.seenMonsterCounts) {
      state.getState().seenMonsterCounts[monster.id] = (state.getState().seenMonsterCounts[monster.id] ?? 0) + 1;
    }

    const enemy = state.createEnemy(tile, floorNumber, monster, { sourceArchetypeId: studioArchetypeId });
    const plannedDrop = state.rollMonsterPlannedDrop(enemy.id, foodBudget.monsters);
    if (plannedDrop) {
      enemy.lootDrop = {
        itemId: plannedDrop.itemId,
        item: plannedDrop.item,
      };
      foodBudget.monsters = Math.max(0, foodBudget.monsters - plannedDrop.spentBudget);
    }
    state.enemies.push(enemy);
  }

  for (let index = 0; index < state.getPotionCountForFloor(floorNumber); index += 1) {
    const room = chooseWeightedRoom(state, "itemFactor", { excludeLockedBonus: true });
    const tile = room ? chooseFreeRoomTile(state, room, { reserveOnly: true }) : null;
    if (tile) {
      const potion = state.cloneItemDef?.("healing-potion");
      if (potion) {
        state.potions.push(state.createPotionPickup(potion, tile.x, tile.y));
      }
    }
  }

  for (const foodItem of state.buildFoodItemsForBudget(foodBudget.world)) {
    const room = chooseWeightedRoom(state, "foodFactor", { excludeLockedBonus: true });
    const tile = room ? chooseFreeRoomTile(state, room, { reserveOnly: true }) : null;
    if (tile) {
      state.foods.push(state.createFoodPickup(foodItem, tile.x, tile.y));
    }
  }

  if (state.shouldSpawnFloorWeapon(floorNumber)) {
    const weaponCount = state.getFloorWeaponSpawnCount(floorNumber);
    for (let index = 0; index < weaponCount; index += 1) {
      const room = chooseWeightedRoom(state, "itemFactor", { excludeLockedBonus: true });
      const tile = room ? chooseFreeRoomTile(state, room, { reserveOnly: true }) : null;
      if (!tile) {
        continue;
      }
      const weapon = state.chooseWeightedWeapon(playerState, {
        floorNumber,
        dropSourceTag: "floor-weapon",
        preferredArchetypeId: studioArchetypeId,
        runArchetypeSequence,
      });
      if (weapon) {
        state.weapons.push(state.createWeaponPickup(weapon, tile.x, tile.y));
      }
    }
  }

  if (state.shouldSpawnFloorShield(floorNumber)) {
    const room = chooseWeightedRoom(state, "itemFactor", { excludeLockedBonus: true });
    const tile = room ? chooseFreeRoomTile(state, room, { reserveOnly: true }) : null;
    if (tile) {
      const shield = state.chooseWeightedShield(playerState, {
        floorNumber,
        dropSourceTag: "floor-shield",
        preferredArchetypeId: studioArchetypeId,
        runArchetypeSequence,
      });
      if (shield) {
        state.offHands.push(state.createOffHandPickup(shield, tile.x, tile.y));
      }
    }
  }

  if (state.shouldSpawnChest(floorNumber)) {
    const containerConfig = state.getContainerConfigForArchetype(studioArchetypeId);
    for (let index = 0; index < state.getChestCountForFloor(floorNumber); index += 1) {
      const room = chooseWeightedRoom(state, "itemFactor", { excludeLockedBonus: true });
      const tile = room ? chooseFreeRoomTile(state, room, { reserveOnly: true }) : null;
      if (!tile) {
        continue;
      }
      state.chests.push(state.createChestPickup(
        state.rollChestContent(floorNumber, playerState, {
          dropSourceTag: "chest",
          preferredArchetypeId: studioArchetypeId,
          runArchetypeSequence,
        }),
        tile.x,
        tile.y,
        {
          containerName: containerConfig.name,
          containerAssetId: containerConfig.assetId,
        },
      ));
    }

    for (const foodItem of state.buildFoodItemsForBudget(foodBudget.containers)) {
      const room = chooseWeightedRoom(state, "foodFactor", { excludeLockedBonus: true });
      const tile = room ? chooseFreeRoomTile(state, room, { reserveOnly: true }) : null;
      if (tile) {
        state.chests.push(state.createChestPickup(
          { type: "food", item: foodItem },
          tile.x,
          tile.y,
          {
            containerName: containerConfig.name,
            containerAssetId: containerConfig.assetId,
          },
        ));
      }
    }
  }

  const trapSeedOccupied = [...state.occupiedSpawnKeys].map(parseKey);
  const builtTraps = state.buildTrapsForFloor({
    floorNumber,
    grid: state.grid,
    occupied: trapSeedOccupied,
    doors: state.doors,
    stairsUp: state.stairsUp,
    stairsDown: state.stairsDown,
  });
  builtTraps.forEach((trap) => {
    const room = chooseWeightedRoom(state, "trapFactor", { excludeLockedBonus: true });
    const tile = room ? chooseFreeRoomTile(state, room, { reserveOnly: true }) : null;
    if (!tile) {
      return;
    }
    trap.x = tile.x;
    trap.y = tile.y;
    state.traps.push(trap);
  });
}

function createLayoutState(context, floorNumber, studioArchetypeId, topologyNode) {
  return {
    ...context,
    floorNumber,
    studioArchetypeId,
    topologyNode,
    grid: context.createGrid(),
    rooms: [],
    doors: [],
    enemies: [],
    potions: [],
    foods: [],
    weapons: [],
    offHands: [],
    chests: [],
    keys: [],
    traps: [],
    showcases: [],
    extraLoopConnections: [],
    roomBlockKeys: new Set(),
    mainCorridorKeys: new Set(),
    sideCorridorKeys: new Set(),
    occupiedSpawnKeys: new Set(),
    lastThemeAttemptOrder: [],
    lastPlacedThemeRoomRoles: [],
    corridorWidth: 2,
    gangBoundingBox: null,
    mainCorridorPoints: [],
    entryAnchor: null,
    exitAnchor: null,
    stairsUp: null,
    stairsDown: null,
    startPosition: null,
  };
}

function forcePlaceRoom(state, roomTypeId, roomBounds, doorPosition, attachmentType, corridorPath = [], parentRoom = null) {
  const spec = ROOM_TYPE_SPECS[roomTypeId];
  const room = createRoomRecord(spec, roomBounds);
  room.id = state.rooms.length;
  room.attachmentType = attachmentType;
  room.mainConnected = attachmentType !== "sidearm_room";
  room.parentRoomId = parentRoom?.id ?? null;
  room.sideCorridorLength = corridorPath.length;

  paintRoom(state, room);
  if (corridorPath.length > 0) {
    carveSideCorridor(state, corridorPath);
  }
  if (parentRoom) {
    addDoor(state, parentRoom, corridorPath[0] ?? doorPosition, {
      roomIdA: parentRoom.id,
      roomIdB: room.id,
    });
    parentRoom.childrenCount += 1;
  }
  addDoor(state, room, doorPosition, {
    roomIdA: parentRoom?.id ?? null,
    roomIdB: room.id,
  });
  state.rooms.push(room);
  return room;
}

function buildFallbackDungeonLevel(context, floorNumber, studioArchetypeId, topologyNode, runArchetypeSequence, playerState) {
  const state = createLayoutState(context, floorNumber, studioArchetypeId, topologyNode);
  state.corridorWidth = 2;
  state.gangBoundingBox = { x: 5, y: 12, width: 40, height: 12 };
  carveWideSegment(state, { x: 5, y: 17 }, { x: 44, y: 17 });

  const reservedAnchorKeys = new Set();
  state.entryAnchor = placeAnchor(
    state,
    topologyNode?.entryDirection ?? "left",
    topologyNode?.entryTransitionStyle ?? "passage",
    reservedAnchorKeys,
    true,
    topologyNode?.entryTransitionHint ?? null,
  ) ?? {
    position: { x: 6, y: 17 },
    direction: topologyNode?.entryDirection ?? "left",
    transitionStyle: topologyNode?.entryTransitionStyle ?? "passage",
    implementation: "direct",
    label: createAnchorLabel(topologyNode?.entryDirection ?? "left", topologyNode?.entryTransitionStyle ?? "passage", true),
  };
  state.exitAnchor = placeAnchor(
    state,
    topologyNode?.exitDirection ?? "right",
    topologyNode?.exitTransitionStyle ?? "passage",
    reservedAnchorKeys,
    false,
    topologyNode?.exitTransitionHint ?? null,
  ) ?? {
    position: { x: 43, y: 17 },
    direction: topologyNode?.exitDirection ?? "right",
    transitionStyle: topologyNode?.exitTransitionStyle ?? "passage",
    implementation: "direct",
    label: createAnchorLabel(topologyNode?.exitDirection ?? "right", topologyNode?.exitTransitionStyle ?? "passage", false),
  };
  state.startPosition = clonePosition(state.entryAnchor.position);
  state.stairsUp = clonePosition(state.entryAnchor.transitionPosition ?? state.entryAnchor.position);
  state.stairsDown = clonePosition(state.exitAnchor.transitionPosition ?? state.exitAnchor.position);
  state.occupiedSpawnKeys.add(keyOf(state.startPosition.x, state.startPosition.y));
  state.occupiedSpawnKeys.add(keyOf(state.stairsUp.x, state.stairsUp.y));
  state.occupiedSpawnKeys.add(keyOf(state.exitAnchor.position.x, state.exitAnchor.position.y));
  state.occupiedSpawnKeys.add(keyOf(state.stairsDown.x, state.stairsDown.y));

  forcePlaceRoom(
    state,
    "weapon_room",
    { x: 8, y: 9, width: 10, height: 8 },
    { x: 12, y: 16 },
    "direct_main",
  );
  forcePlaceRoom(
    state,
    "aggro_room",
    { x: 20, y: 19, width: 10, height: 8 },
    { x: 24, y: 19 },
    "direct_main",
  );
  forcePlaceRoom(
    state,
    "calm_room",
    { x: 31, y: 7, width: 9, height: 8 },
    { x: 35, y: 14 },
    "sidearm_main",
    [{ x: 35, y: 16 }, { x: 35, y: 15 }],
  );

  assignLockedOverlays(state, floorNumber, studioArchetypeId, playerState, runArchetypeSequence);
  placeWorldContent(state, floorNumber, studioArchetypeId, playerState, runArchetypeSequence);

  return {
    layoutId: "branch_fallback",
    floorNumber,
    studioArchetypeId,
    grid: state.grid,
    rooms: state.rooms,
    startPosition: state.startPosition,
    stairsUp: state.stairsUp,
    stairsDown: state.stairsDown,
    entryAnchor: state.entryAnchor,
    exitAnchor: state.exitAnchor,
    corridorWidth: state.corridorWidth,
    gangBoundingBox: state.gangBoundingBox,
    topologyNode,
    enemies: state.enemies,
    potions: state.potions,
    foods: state.foods,
    weapons: state.weapons,
    offHands: state.offHands,
    chests: state.chests,
    keys: state.keys,
    doors: state.doors,
    showcases: state.showcases,
    extraLoopConnections: state.extraLoopConnections,
    showcaseAmbienceSeen: {},
    traps: state.traps,
    explored: Array.from({ length: state.HEIGHT }, () => Array(state.WIDTH).fill(false)),
    visible: Array.from({ length: state.HEIGHT }, () => Array(state.WIDTH).fill(false)),
  };
}

export function createBranchLayoutGenerator(context) {
  function createDungeonLevel(floorNumber, options = {}) {
    const studioArchetypeId = options.studioArchetypeId;
    const topologyNode = options.studioTopologyNode ?? null;
    const runArchetypeSequence = options.runArchetypeSequence ?? [];
    const playerState = context.getState()?.player ?? null;
    let lastFailureReason = "unknown";

    for (let attempt = 0; attempt < 120; attempt += 1) {
      const state = createLayoutState(context, floorNumber, studioArchetypeId, topologyNode);
      buildMainCorridor(state);

      const reservedAnchorKeys = new Set();
      state.entryAnchor = placeAnchor(
        state,
        topologyNode?.entryDirection ?? "front",
        topologyNode?.entryTransitionStyle ?? "passage",
        reservedAnchorKeys,
        true,
        topologyNode?.entryTransitionHint ?? null,
      );
      state.exitAnchor = placeAnchor(
        state,
        topologyNode?.exitDirection ?? "right",
        topologyNode?.exitTransitionStyle ?? "passage",
        reservedAnchorKeys,
        false,
        topologyNode?.exitTransitionHint ?? null,
      );

      if (!state.entryAnchor || !state.exitAnchor) {
        lastFailureReason = "anchor-placement";
        options.onAttemptFailure?.({
          attempt,
          reason: lastFailureReason,
          corridorWidth: state.corridorWidth,
          gangBoundingBox: state.gangBoundingBox ? { ...state.gangBoundingBox } : null,
          entryAnchor: state.entryAnchor ? { ...state.entryAnchor, position: { ...state.entryAnchor.position } } : null,
          exitAnchor: state.exitAnchor ? { ...state.exitAnchor, position: { ...state.exitAnchor.position } } : null,
        });
        continue;
      }

  state.startPosition = clonePosition(state.entryAnchor.position);
  state.stairsUp = clonePosition(state.entryAnchor.transitionPosition ?? state.entryAnchor.position);
  state.stairsDown = clonePosition(state.exitAnchor.transitionPosition ?? state.exitAnchor.position);
  state.occupiedSpawnKeys.add(keyOf(state.startPosition.x, state.startPosition.y));
  state.occupiedSpawnKeys.add(keyOf(state.stairsUp.x, state.stairsUp.y));
  state.occupiedSpawnKeys.add(keyOf(state.exitAnchor.position.x, state.exitAnchor.position.y));
  state.occupiedSpawnKeys.add(keyOf(state.stairsDown.x, state.stairsDown.y));

      placeConnectorRooms(state);

      const themeRooms = pickThemeRooms(state, 3);
      if (!themeRooms) {
        lastFailureReason = "theme-room-placement";
        options.onAttemptFailure?.({
          attempt,
          reason: lastFailureReason,
          themeAttemptOrder: [...state.lastThemeAttemptOrder],
          placedThemeRoomRoles: [...state.lastPlacedThemeRoomRoles],
          corridorWidth: state.corridorWidth,
          gangBoundingBox: state.gangBoundingBox ? { ...state.gangBoundingBox } : null,
          entryAnchor: state.entryAnchor ? { ...state.entryAnchor, position: { ...state.entryAnchor.position } } : null,
          exitAnchor: state.exitAnchor ? { ...state.exitAnchor, position: { ...state.exitAnchor.position } } : null,
        });
        continue;
      }

      const showcaseRoom = themeRooms.find((room) => room.role === "showcase_room") ?? null;
      topOffConnectorRooms(state);
      addPeripheralRoomLoops(state);
      placeShowcasesInShowcaseRoom(state, showcaseRoom, studioArchetypeId);
      assignLockedOverlays(state, floorNumber, studioArchetypeId, playerState, runArchetypeSequence);
      placeWorldContent(state, floorNumber, studioArchetypeId, playerState, runArchetypeSequence);

      return {
        layoutId: "branch",
        layoutFailureReason: null,
        floorNumber,
        studioArchetypeId,
        grid: state.grid,
        rooms: state.rooms,
        startPosition: state.startPosition,
        stairsUp: state.stairsUp,
        stairsDown: state.stairsDown,
        entryAnchor: state.entryAnchor,
        exitAnchor: state.exitAnchor,
        corridorWidth: state.corridorWidth,
        gangBoundingBox: state.gangBoundingBox,
        topologyNode,
        enemies: state.enemies,
        potions: state.potions,
        foods: state.foods,
        weapons: state.weapons,
        offHands: state.offHands,
        chests: state.chests,
        keys: state.keys,
        doors: state.doors,
        showcases: state.showcases,
        extraLoopConnections: state.extraLoopConnections,
        showcaseAmbienceSeen: {},
        traps: state.traps,
        explored: Array.from({ length: state.HEIGHT }, () => Array(state.WIDTH).fill(false)),
        visible: Array.from({ length: state.HEIGHT }, () => Array(state.WIDTH).fill(false)),
      };
    }

    const fallbackLevel = buildFallbackDungeonLevel(
      context,
      floorNumber,
      studioArchetypeId,
      topologyNode,
      runArchetypeSequence,
      playerState,
    );
    fallbackLevel.layoutFailureReason = lastFailureReason;
    return fallbackLevel;
  }

  return {
    createDungeonLevel,
  };
}
