export const STUDIO_DIRECTIONS = [
  "left",
  "right",
  "front",
  "back",
  "up",
  "down",
];

export const STUDIO_DIRECTION_VECTORS = {
  left: { x: -1, y: 0, z: 0 },
  right: { x: 1, y: 0, z: 0 },
  front: { x: 0, y: -1, z: 0 },
  back: { x: 0, y: 1, z: 0 },
  up: { x: 0, y: 0, z: 1 },
  down: { x: 0, y: 0, z: -1 },
};

export const OPPOSITE_STUDIO_DIRECTION = {
  left: "right",
  right: "left",
  front: "back",
  back: "front",
  up: "down",
  down: "up",
};

function createPositionKey(position) {
  return `${position.x},${position.y},${position.z}`;
}

function clonePosition(position) {
  return {
    x: Number(position?.x) || 0,
    y: Number(position?.y) || 0,
    z: Number(position?.z) || 0,
  };
}

function translatePosition(position, direction) {
  const vector = STUDIO_DIRECTION_VECTORS[direction];
  return {
    x: position.x + vector.x,
    y: position.y + vector.y,
    z: position.z + vector.z,
  };
}

function transitionStyleForDirection(direction, randomInt) {
  if (direction === "up" || direction === "down") {
    return randomInt(0, 1) === 0 ? "stairs" : "lift";
  }

  return "passage";
}

function shuffleDirections(randomInt, blockedDirections = []) {
  const blocked = new Set(blockedDirections);
  const pool = STUDIO_DIRECTIONS.filter((direction) => !blocked.has(direction));
  for (let index = pool.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(0, index);
    [pool[index], pool[swapIndex]] = [pool[swapIndex], pool[index]];
  }
  return pool;
}

function createNode(floorNumber, position, entryDirection = null, entryTransitionStyle = null) {
  return {
    floorNumber,
    position: clonePosition(position),
    entryDirection,
    entryTransitionStyle,
    entryTransitionHint: null,
    exitDirection: null,
    exitTransitionStyle: null,
    exitTransitionHint: null,
  };
}

export function createRunStudioTopology(randomInt, floorCount = 10) {
  const topology = {
    nodes: {
      1: createNode(1, { x: 0, y: 0, z: 0 }, "left", "passage"),
    },
    occupied: {
      "0,0,0": 1,
    },
    generatedToFloor: 1,
  };

  ensureRunStudioTopology(topology, floorCount, randomInt);
  return topology;
}

function tryBuildSegment({
  startFloor,
  stepsRemaining,
  currentPosition,
  occupiedKeys,
  randomInt,
  blockedFirstDirection = null,
}) {
  if (stepsRemaining <= 0) {
    return [];
  }

  const directionOrder = shuffleDirections(
    randomInt,
    blockedFirstDirection ? [blockedFirstDirection] : [],
  );

  for (const direction of directionOrder) {
    const nextPosition = translatePosition(currentPosition, direction);
    const nextKey = createPositionKey(nextPosition);
    if (occupiedKeys.has(nextKey)) {
      continue;
    }

    occupiedKeys.add(nextKey);
    const nextFloor = startFloor + 1;
    const segmentTail = tryBuildSegment({
      startFloor: nextFloor,
      stepsRemaining: stepsRemaining - 1,
      currentPosition: nextPosition,
      occupiedKeys,
      randomInt,
      blockedFirstDirection: null,
    });

    if (segmentTail || stepsRemaining === 1) {
      return [{
        floorNumber: nextFloor,
        direction,
        position: nextPosition,
      }, ...(segmentTail ?? [])];
    }

    occupiedKeys.delete(nextKey);
  }

  return null;
}

export function ensureRunStudioTopology(topology, floorCount, randomInt) {
  const targetFloor = Math.max(1, Number(floorCount) || 1);
  if (!topology?.nodes || !topology?.occupied) {
    return createRunStudioTopology(randomInt, targetFloor);
  }

  let generatedToFloor = Math.max(1, Number(topology.generatedToFloor) || 1);
  if (generatedToFloor >= targetFloor) {
    return topology;
  }

  const occupiedKeys = new Set(Object.keys(topology.occupied));
  const startNode = topology.nodes[generatedToFloor];
  const blockedFirstDirection = generatedToFloor === 1 ? startNode?.entryDirection ?? null : null;
  const segment = tryBuildSegment({
    startFloor: generatedToFloor,
    stepsRemaining: targetFloor - generatedToFloor,
    currentPosition: clonePosition(startNode?.position),
    occupiedKeys,
    randomInt,
    blockedFirstDirection,
  });

  if (!segment) {
    throw new Error(`Unable to generate a valid studio topology segment up to floor ${targetFloor}.`);
  }

  for (const step of segment) {
    const previousNode = topology.nodes[step.floorNumber - 1];
    const style = transitionStyleForDirection(step.direction, randomInt);
    previousNode.exitDirection = step.direction;
    previousNode.exitTransitionStyle = style;

    topology.nodes[step.floorNumber] = createNode(
      step.floorNumber,
      step.position,
      OPPOSITE_STUDIO_DIRECTION[step.direction],
      style,
    );
    topology.occupied[createPositionKey(step.position)] = step.floorNumber;
    generatedToFloor = step.floorNumber;
  }

  topology.generatedToFloor = generatedToFloor;
  return topology;
}

export function getStudioTopologyNode(topology, floorNumber) {
  return topology?.nodes?.[floorNumber] ?? null;
}

export function getStudioTransitionLabel(style, direction) {
  if (style === "lift") {
    return direction === "up" || direction === "down"
      ? direction === "up" ? "Lift hoch" : "Lift runter"
      : "Lift";
  }

  if (style === "stairs") {
    return direction === "up" || direction === "down"
      ? direction === "up" ? "Treppe hoch" : "Treppe runter"
      : "Treppe";
  }

  return "Durchgang";
}

export function normalizeRunStudioTopology(topology, randomInt, minimumFloor = 10) {
  if (!topology?.nodes || typeof topology.nodes !== "object") {
    return createRunStudioTopology(randomInt, minimumFloor);
  }

  const normalized = {
    nodes: {},
    occupied: {},
    generatedToFloor: 0,
  };

  const floors = Object.keys(topology.nodes)
    .map((entry) => Math.max(1, Number(entry) || 1))
    .sort((left, right) => left - right);

  floors.forEach((floorNumber) => {
    const node = topology.nodes[floorNumber];
    if (!node) {
      return;
    }

    normalized.nodes[floorNumber] = {
      floorNumber,
      position: clonePosition(node.position),
      entryDirection: node.entryDirection ?? null,
      entryTransitionStyle: node.entryTransitionStyle ?? (floorNumber === 1 ? "passage" : null),
      entryTransitionHint: node.entryTransitionHint ? { ...node.entryTransitionHint } : null,
      exitDirection: node.exitDirection ?? null,
      exitTransitionStyle: node.exitTransitionStyle ?? null,
      exitTransitionHint: node.exitTransitionHint ? { ...node.exitTransitionHint } : null,
    };
    normalized.occupied[createPositionKey(normalized.nodes[floorNumber].position)] = floorNumber;
    normalized.generatedToFloor = floorNumber;
  });

  if (!normalized.nodes[1]) {
    return createRunStudioTopology(randomInt, minimumFloor);
  }

  return ensureRunStudioTopology(
    normalized,
    Math.max(minimumFloor, normalized.generatedToFloor),
    randomInt,
  );
}
