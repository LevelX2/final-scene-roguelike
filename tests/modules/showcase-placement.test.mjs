import test from 'node:test';
import assert from 'node:assert/strict';
import { createShowcasePlacementApi } from '../../src/dungeon/showcase-placement.mjs';

function createFloorGrid(width, height) {
  return Array.from({ length: height }, () => Array(width).fill('.'));
}

function getCardinalNeighbors(x, y) {
  return [
    { x: x + 1, y },
    { x: x - 1, y },
    { x, y: y + 1 },
    { x, y: y - 1 },
  ];
}

function isTileWalkable(grid, x, y) {
  return grid[y]?.[x] === '.';
}

function computeReachableTilesWithBlockedPositions(grid, startPosition, doors, blockedPositions) {
  const blocked = new Set((blockedPositions ?? []).map((entry) => `${entry.x},${entry.y}`));
  const queue = [startPosition];
  const seen = new Set([`${startPosition.x},${startPosition.y}`]);
  const reachable = [{ x: startPosition.x, y: startPosition.y }];

  while (queue.length > 0) {
    const current = queue.shift();
    for (const neighbor of getCardinalNeighbors(current.x, current.y)) {
      const key = `${neighbor.x},${neighbor.y}`;
      if (seen.has(key) || blocked.has(key) || !isTileWalkable(grid, neighbor.x, neighbor.y)) {
        continue;
      }

      seen.add(key);
      reachable.push(neighbor);
      queue.push(neighbor);
    }
  }

  return reachable;
}

function isPositionInsideRoom(position, room) {
  return position.x >= room.x &&
    position.x < room.x + room.width &&
    position.y >= room.y &&
    position.y < room.y + room.height;
}

test('showcase-placement only picks archetype-matching or global display cases', () => {
  const propCatalog = [
    { id: 'western-prop', archetype: 'western', name: 'Western', source: 'Test', description: 'Western.' },
    { id: 'slasher-prop', archetype: 'slasher', name: 'Slasher', source: 'Test', description: 'Slasher.' },
    { id: 'global-prop', archetype: 'global', name: 'Global', source: 'Test', description: 'Global.' },
  ];

  const api = createShowcasePlacementApi({
    propCatalog,
    randomInt: (min) => min,
    createShowcase: (prop, x, y) => ({ x, y, item: { ...prop } }),
    collectUsedShowcasePropIds: () => new Set(),
    getCardinalNeighbors,
    isTileWalkable,
    computeReachableTilesWithBlockedPositions,
    isPositionInsideRoom,
  });

  const grid = createFloorGrid(18, 12);
  const rooms = [
    { x: 1, y: 1, width: 5, height: 5 },
    { x: 12, y: 1, width: 5, height: 5 },
    { x: 1, y: 6, width: 6, height: 5 },
    { x: 10, y: 6, width: 6, height: 5 },
  ];

  const showcases = api.placeShowcases({
    grid,
    rooms,
    startRoomIndex: 0,
    goalRoomIndex: 1,
    doors: [],
    occupied: [],
    stairsUp: null,
    stairsDown: null,
    startPosition: { x: 2, y: 2 },
    studioArchetypeId: 'western',
  });

  assert.ok(showcases.length > 0);
  assert.ok(showcases.every((showcase) =>
    showcase.item.archetype === 'western' || showcase.item.archetype === 'global'
  ));
  assert.ok(showcases.every((showcase) => showcase.item.archetype !== 'slasher'));
});

test('showcase-placement falls back to other unused props before repeating themed ones', () => {
  const propCatalog = [
    { id: 'western-prop', archetype: 'western', name: 'Western', source: 'Test', description: 'Western.' },
    { id: 'global-prop', archetype: 'global', name: 'Global', source: 'Test', description: 'Global.' },
    { id: 'slasher-prop', archetype: 'slasher', name: 'Slasher', source: 'Test', description: 'Slasher.' },
  ];

  const api = createShowcasePlacementApi({
    propCatalog,
    randomInt: (min) => min,
    createShowcase: (prop, x, y) => ({ x, y, item: { ...prop } }),
    collectUsedShowcasePropIds: () => new Set(['western-prop', 'global-prop']),
    getCardinalNeighbors,
    isTileWalkable,
    computeReachableTilesWithBlockedPositions,
    isPositionInsideRoom,
  });

  const grid = createFloorGrid(18, 12);
  const rooms = [
    { x: 1, y: 1, width: 5, height: 5 },
    { x: 12, y: 1, width: 5, height: 5 },
    { x: 1, y: 6, width: 6, height: 5 },
    { x: 10, y: 6, width: 6, height: 5 },
  ];

  const showcases = api.placeShowcases({
    grid,
    rooms,
    startRoomIndex: 0,
    goalRoomIndex: 1,
    doors: [],
    occupied: [],
    stairsUp: null,
    stairsDown: null,
    startPosition: { x: 2, y: 2 },
    studioArchetypeId: 'western',
  });

  assert.ok(showcases.length > 0);
  assert.ok(showcases.some((showcase) => showcase.item.id === 'slasher-prop'));
});
