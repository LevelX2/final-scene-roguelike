import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAvailableMonsterPool, createBranchLayoutGenerator, createStudioLayoutGenerator } from '../../src/dungeon/branch-layout.mjs';
import { createRunStudioTopology, getStudioTopologyNode } from '../../src/studio-topology.mjs';
import { shouldSpawnFloorShield, shouldSpawnFloorWeapon } from '../../src/balance.mjs';
import { MONSTER_CATALOG } from '../../src/content/catalogs/monsters.mjs';

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

      if (grid[nextY]?.[nextX] !== '.') {
        continue;
      }

      const door = doors.find((entry) => entry.x === nextX && entry.y === nextY);
      if (door && !door.isOpen && door.doorType === 'locked') {
        continue;
      }

      seen.add(key);
      queue.push({ x: nextX, y: nextY });
    }
  }

  return reachable;
}

function countFloorsOnVerticalLine(grid, x, fromY, toY) {
  let count = 0;
  for (let y = fromY; y <= toY; y += 1) {
    if (grid[y]?.[x] === '.') {
      count += 1;
    }
  }
  return count;
}

function countFloorsOnHorizontalLine(grid, y, fromX, toX) {
  let count = 0;
  for (let x = fromX; x <= toX; x += 1) {
    if (grid[y]?.[x] === '.') {
      count += 1;
    }
  }
  return count;
}

function findInteriorRoomIdsAt(level, position) {
  return level.rooms
    .filter((room) => room.interiorTiles.some((tile) => tile.x === position.x && tile.y === position.y))
    .map((room) => room.id);
}

function classifyAdjacentDoorArea(level, position) {
  const roomIds = findInteriorRoomIdsAt(level, position);
  if (roomIds.length > 0) {
    return `room:${roomIds[0]}`;
  }
  if (level.grid[position.y]?.[position.x] !== '.') {
    return null;
  }
  return 'open';
}

function createSeededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function createSeededRandomInt(random) {
  return (min, max) => min + Math.floor(random() * (max - min + 1));
}

function transitionsShareCorrespondingPosition(source, target, direction, level) {
  if (!source || !target || !level?.grid?.length || !level.grid[0]?.length) {
    return false;
  }

  const width = level.grid[0].length;
  const height = level.grid.length;

  if (direction === 'left') {
    return source.x === 0 && target.x === width - 1 && source.y === target.y;
  }
  if (direction === 'right') {
    return source.x === width - 1 && target.x === 0 && source.y === target.y;
  }
  if (direction === 'front') {
    return source.y === 0 && target.y === height - 1 && source.x === target.x;
  }
  if (direction === 'back') {
    return source.y === height - 1 && target.y === 0 && source.x === target.x;
  }

  return source.x === target.x && source.y === target.y;
}

function buildSequentialStudioRun(seed, floorCount = 12) {
  const topologyRandom = createSeededRandom(seed);
  const topology = createRunStudioTopology(createSeededRandomInt(topologyRandom), floorCount);

  const generationRandom = createSeededRandom(seed * 17);
  const { generator } = createStudioGeneratorHarness({
    randomChance: () => generationRandom(),
    randomInt: createSeededRandomInt(generationRandom),
  });

  const levels = {};
  const runArchetypeSequence = Array.from({ length: floorCount }, () => 'slasher');
  for (let floorNumber = 1; floorNumber <= floorCount; floorNumber += 1) {
    const level = generator.createDungeonLevel(floorNumber, {
      studioArchetypeId: 'slasher',
      studioTopologyNode: getStudioTopologyNode(topology, floorNumber),
      runArchetypeSequence,
    });
    levels[floorNumber] = level;

    const topologyNode = topology.nodes[floorNumber];
    if (topologyNode) {
      topologyNode.entryTransitionHint = level.entryAnchor?.transitionPosition
        ? { ...level.entryAnchor.transitionPosition }
        : null;
      topologyNode.exitTransitionHint = level.exitAnchor?.transitionPosition
        ? { ...level.exitAnchor.transitionPosition }
        : null;
    }

    const nextTopologyNode = topology.nodes[floorNumber + 1];
    if (nextTopologyNode && level.exitAnchor?.transitionPosition) {
      nextTopologyNode.entryTransitionHint = { ...level.exitAnchor.transitionPosition };
    }
  }

  return levels;
}

function findParallelDoorBypass(level) {
  const doorKeys = new Set(level.doors.map((door) => `${door.x},${door.y}`));

  for (const door of level.doors) {
    const north = classifyAdjacentDoorArea(level, { x: door.x, y: door.y - 1 });
    const south = classifyAdjacentDoorArea(level, { x: door.x, y: door.y + 1 });
    const west = classifyAdjacentDoorArea(level, { x: door.x - 1, y: door.y });
    const east = classifyAdjacentDoorArea(level, { x: door.x + 1, y: door.y });

    let axis = null;
    let pair = null;
    let parallelNeighbors = [];
    if (north && south && north !== south) {
      axis = 'ns';
      pair = [north, south].sort().join('|');
      parallelNeighbors = [
        { x: door.x - 1, y: door.y },
        { x: door.x + 1, y: door.y },
      ];
    } else if (west && east && west !== east) {
      axis = 'we';
      pair = [west, east].sort().join('|');
      parallelNeighbors = [
        { x: door.x, y: door.y - 1 },
        { x: door.x, y: door.y + 1 },
      ];
    } else {
      continue;
    }

    for (const neighbor of parallelNeighbors) {
      const neighborKey = `${neighbor.x},${neighbor.y}`;
      if (doorKeys.has(neighborKey) || level.grid[neighbor.y]?.[neighbor.x] !== '.') {
        continue;
      }

      if (axis === 'ns') {
        const neighborNorth = classifyAdjacentDoorArea(level, { x: neighbor.x, y: neighbor.y - 1 });
        const neighborSouth = classifyAdjacentDoorArea(level, { x: neighbor.x, y: neighbor.y + 1 });
        if (neighborNorth && neighborSouth && neighborNorth !== neighborSouth) {
          const neighborPair = [neighborNorth, neighborSouth].sort().join('|');
          if (neighborPair === pair) {
            return { door, neighbor, axis, pair };
          }
        }
        continue;
      }

      const neighborWest = classifyAdjacentDoorArea(level, { x: neighbor.x - 1, y: neighbor.y });
      const neighborEast = classifyAdjacentDoorArea(level, { x: neighbor.x + 1, y: neighbor.y });
      if (neighborWest && neighborEast && neighborWest !== neighborEast) {
        const neighborPair = [neighborWest, neighborEast].sort().join('|');
        if (neighborPair === pair) {
          return { door, neighbor, axis, pair };
        }
      }
    }
  }

  return null;
}

function createGeneratorHarness(options = {}) {
  const TILE = {
    WALL: '#',
    FLOOR: '.',
  };

  const generator = createBranchLayoutGenerator({
    WIDTH: 50,
    HEIGHT: 36,
    TILE,
    DOOR_TYPE: { NORMAL: 'normal', LOCKED: 'locked' },
    LOCK_COLORS: ['red', 'blue', 'green'],
    MONSTER_CATALOG: options.MONSTER_CATALOG ?? [],
    propCatalog: [
      { id: 'slasher-prop', archetype: 'slasher', name: 'Slasher-Prop', source: 'Test', description: 'Test.' },
      { id: 'global-prop', archetype: 'global', name: 'Global-Prop', source: 'Test', description: 'Test.' },
    ],
    randomChance: options.randomChance ?? (() => 0.5),
    randomInt: options.randomInt ?? ((min, max) => Math.floor((min + max) / 2)),
    createGrid: () => Array.from({ length: 36 }, () => Array(50).fill(TILE.WALL)),
    getState: () => ({ player: null }),
    createEnemy: options.createEnemy ?? (() => null),
    chooseWeightedMonster: options.chooseWeightedMonster ?? (() => null),
    createWeaponPickup: (item, x, y) => ({ item, x, y }),
    createOffHandPickup: (item, x, y) => ({ item, x, y }),
    createChestPickup: (content, x, y) => ({
      content: Array.isArray(content) ? content[0] ?? null : content,
      contents: Array.isArray(content) ? content : [content].filter(Boolean),
      x,
      y,
    }),
    createFoodPickup: (item, x, y) => ({ item, x, y }),
    createShowcase: (item, x, y) => ({ item, x, y }),
    createDoor: (x, y, config = {}) => ({ x, y, ...config, doorType: config.doorType ?? 'normal', isOpen: config.isOpen ?? false }),
    createKeyPickup: (color, x, y) => ({ x, y, item: { keyColor: color } }),
    chooseWeightedWeapon: () => null,
    chooseWeightedShield: () => null,
    rollChestContent: () => null,
    rollChestContents: options.rollChestContents ?? null,
    getFloorWeaponSpawnCount: () => 0,
    getEnemyCountForFloor: () => 0,
    getPotionCountForFloor: () => 0,
    getUnlockedMonsterRank: () => 0,
    shouldSpawnFloorWeapon: options.shouldSpawnFloorWeapon ?? (() => false),
    shouldSpawnFloorShield: options.shouldSpawnFloorShield ?? (() => false),
    shouldSpawnChest: options.shouldSpawnChest ?? (() => false),
    getChestCountForFloor: options.getChestCountForFloor ?? (() => 0),
    shouldPlaceLockedRoomChest: () => false,
    getLockedDoorCountForFloor: options.getLockedDoorCountForFloor ?? (() => 0),
    buildFoodItemsForBudget: options.buildFoodItemsForBudget ?? (() => []),
    rollFoodBudget: options.rollFoodBudget ?? (() => ({ totalBudget: 0 })),
    splitFoodBudget: options.splitFoodBudget ?? (() => ({ direct: 0, reserve: 0, containers: 0 })),
    rollMonsterPlannedDrop: () => null,
    buildTrapsForFloor: options.buildTrapsForFloor ?? (() => []),
    getContainerConfigForArchetype: () => ({ name: 'Kiste', assetId: 'crate' }),
    collectUsedShowcasePropIds: () => new Set(),
    computeReachableTilesWithBlockedPositions,
  });

  return { generator };
}

function createStudioGeneratorHarness(options = {}) {
  const TILE = {
    WALL: '#',
    FLOOR: '.',
  };

  const generator = createStudioLayoutGenerator({
    WIDTH: 50,
    HEIGHT: 36,
    TILE,
    DOOR_TYPE: { NORMAL: 'normal', LOCKED: 'locked' },
    LOCK_COLORS: ['red', 'blue', 'green'],
    MONSTER_CATALOG: options.MONSTER_CATALOG ?? [],
    propCatalog: [
      { id: 'slasher-prop', archetype: 'slasher', name: 'Slasher-Prop', source: 'Test', description: 'Test.' },
      { id: 'global-prop', archetype: 'global', name: 'Global-Prop', source: 'Test', description: 'Test.' },
    ],
    randomChance: options.randomChance ?? (() => 0.5),
    randomInt: options.randomInt ?? ((min, max) => Math.floor((min + max) / 2)),
    createGrid: () => Array.from({ length: 36 }, () => Array(50).fill(TILE.WALL)),
    getState: () => ({ player: null }),
    createEnemy: options.createEnemy ?? (() => null),
    chooseWeightedMonster: options.chooseWeightedMonster ?? (() => null),
    createWeaponPickup: (item, x, y) => ({ item, x, y }),
    createOffHandPickup: (item, x, y) => ({ item, x, y }),
    createChestPickup: (content, x, y) => ({
      content: Array.isArray(content) ? content[0] ?? null : content,
      contents: Array.isArray(content) ? content : [content].filter(Boolean),
      x,
      y,
    }),
    createFoodPickup: (item, x, y) => ({ item, x, y }),
    createPotionPickup: (item, x, y) => ({ item, x, y }),
    createShowcase: (item, x, y) => ({ item, x, y }),
    createDoor: (x, y, config = {}) => ({ x, y, ...config, doorType: config.doorType ?? 'normal', isOpen: config.isOpen ?? false }),
    createKeyPickup: (color, x, y) => ({ x, y, item: { keyColor: color } }),
    chooseWeightedWeapon: () => null,
    chooseWeightedShield: () => null,
    rollChestContent: () => null,
    rollChestContents: options.rollChestContents ?? null,
    getFloorWeaponSpawnCount: () => 0,
    getEnemyCountForFloor: () => 0,
    getPotionCountForFloor: () => 0,
    getUnlockedMonsterRank: () => 0,
    shouldSpawnFloorWeapon: options.shouldSpawnFloorWeapon ?? (() => false),
    shouldSpawnFloorShield: options.shouldSpawnFloorShield ?? (() => false),
    shouldSpawnChest: options.shouldSpawnChest ?? (() => false),
    getChestCountForFloor: options.getChestCountForFloor ?? (() => 0),
    shouldPlaceLockedRoomChest: options.shouldPlaceLockedRoomChest ?? (() => false),
    getLockedDoorCountForFloor: options.getLockedDoorCountForFloor ?? (() => 0),
    buildFoodItemsForBudget: options.buildFoodItemsForBudget ?? (() => []),
    rollFoodBudget: options.rollFoodBudget ?? (() => ({ totalBudget: 0 })),
    splitFoodBudget: options.splitFoodBudget ?? (() => ({ direct: 0, reserve: 0, containers: 0, monsters: 0, world: 0 })),
    rollMonsterPlannedDrop: () => null,
    buildTrapsForFloor: options.buildTrapsForFloor ?? (() => []),
    getContainerConfigForArchetype: () => ({ name: 'Kiste', assetId: 'crate' }),
    collectUsedShowcasePropIds: () => new Set(),
    computeReachableTilesWithBlockedPositions,
    cloneItemDef: () => null,
  });

  return { generator };
}

test('branch layout prefers phase-one standard monsters of the active studio archetype', () => {
  const available = buildAvailableMonsterPool(
    [
      {
        id: 'fantasy-standard',
        archetypeId: 'fantasy',
        spawnGroup: 'standard',
        rank: 1,
      },
      {
        id: 'slasher-standard',
        archetypeId: 'slasher',
        spawnGroup: 'standard',
        rank: 1,
      },
      {
        id: 'legacy-fallback',
        rank: 1,
      },
    ],
    1,
    'slasher',
  );

  assert.deepEqual(available.map((monster) => monster.id), ['slasher-standard']);
});

test('branch layout broadens a floor-one archetype pool up to three standard monsters', () => {
  const available = buildAvailableMonsterPool(
    [
      {
        id: 'fantasy-rank-1',
        archetypeId: 'fantasy',
        spawnGroup: 'standard',
        rank: 1,
        spawnWeight: 10,
      },
      {
        id: 'fantasy-rank-2',
        archetypeId: 'fantasy',
        spawnGroup: 'standard',
        rank: 2,
        spawnWeight: 9,
      },
      {
        id: 'fantasy-rank-3',
        archetypeId: 'fantasy',
        spawnGroup: 'standard',
        rank: 3,
        spawnWeight: 8,
      },
      {
        id: 'fantasy-rank-4',
        archetypeId: 'fantasy',
        spawnGroup: 'standard',
        rank: 4,
        spawnWeight: 7,
      },
    ],
    1,
    'fantasy',
  );

  assert.deepEqual(available.map((monster) => monster.id), [
    'fantasy-rank-1',
    'fantasy-rank-2',
    'fantasy-rank-3',
  ]);
});

test('branch layout gives slasher floor one at least three standard monster candidates', () => {
  const available = buildAvailableMonsterPool(
    MONSTER_CATALOG,
    1,
    'slasher',
  );

  const availableIds = available.map((monster) => monster.id);
  assert.ok(availableIds.length >= 3);
  assert.ok(availableIds.includes('slasher-kellerkreatur'));
  assert.ok(availableIds.includes('slasher-kultist'));
  assert.ok(availableIds.includes('slasher-wahnsinniger-hausmeister'));
});

test('balance allows a small amount of equipment to appear on floor one', () => {
  assert.equal(shouldSpawnFloorWeapon(1, 0.2), true);
  assert.equal(shouldSpawnFloorWeapon(1, 0.8), false);
  assert.equal(shouldSpawnFloorShield(1, 0.1), true);
  assert.equal(shouldSpawnFloorShield(1, 0.3), false);
});

test('branch layout can bundle multiple items into the same spawned chest', () => {
  const { generator } = createStudioGeneratorHarness({
    shouldSpawnChest: () => true,
    getChestCountForFloor: () => 1,
    rollChestContents: () => ([
      {
        type: 'weapon',
        item: {
          type: 'weapon',
          id: 'bundle-blade',
          name: 'Bündelklinge',
          damage: 3,
          hitBonus: 1,
        },
      },
    ]),
    buildFoodItemsForBudget: () => ([
      {
        type: 'food',
        id: 'bundle-ration',
        name: 'Bündelration',
        nutritionRestore: 25,
      },
    ]),
    rollFoodBudget: () => ({ totalBudget: 40 }),
    splitFoodBudget: () => ({ direct: 0, reserve: 0, containers: 40, monsters: 0, world: 0 }),
  });

  const level = generator.createDungeonLevel(3, {
    studioArchetypeId: 'slasher',
    studioTopologyNode: {
      floorNumber: 3,
      position: { x: 0, y: 0, z: 0 },
      entryDirection: 'left',
      entryTransitionStyle: 'passage',
      exitDirection: 'right',
      exitTransitionStyle: 'passage',
    },
    runArchetypeSequence: ['slasher', 'slasher', 'slasher'],
  });

  assert.equal(level.chests.length, 1);
  assert.deepEqual(level.chests[0].contents.map((entry) => entry.item?.name), ['Bündelklinge', 'Bündelration']);
});

test('branch layout keeps the main corridor bounding box horizontally dominant', () => {
  const { generator } = createGeneratorHarness();
  const level = generator.createDungeonLevel(1, {
    studioArchetypeId: 'slasher',
    studioTopologyNode: {
      floorNumber: 1,
      position: { x: 0, y: 0, z: 0 },
      entryDirection: 'left',
      entryTransitionStyle: 'passage',
      exitDirection: 'right',
      exitTransitionStyle: 'passage',
    },
    runArchetypeSequence: ['slasher'],
  });

  assert.ok(level.gangBoundingBox.width > level.gangBoundingBox.height);
});

test('branch layout places vertical transitions in a niche beside the corridor', () => {
  const { generator } = createGeneratorHarness();
  const level = generator.createDungeonLevel(2, {
    studioArchetypeId: 'slasher',
    studioTopologyNode: {
      floorNumber: 2,
      position: { x: 0, y: 0, z: 1 },
      entryDirection: 'down',
      entryTransitionStyle: 'lift',
      exitDirection: 'up',
      exitTransitionStyle: 'lift',
    },
    runArchetypeSequence: ['slasher', 'slasher'],
  });

  assert.notDeepEqual(level.exitAnchor.position, level.exitAnchor.corridorPosition);
  assert.deepEqual(level.exitAnchor.position, level.exitAnchor.transitionPosition);
  assert.deepEqual(level.stairsDown, level.exitAnchor.transitionPosition);
});

test('branch layout prefers an outer entry room over a long straight edge corridor when there is space', () => {
  const { generator } = createGeneratorHarness({
    randomInt: (min, max) => max,
  });
  const level = generator.createDungeonLevel(1, {
    studioArchetypeId: 'slasher',
    studioTopologyNode: {
      floorNumber: 1,
      position: { x: 0, y: 0, z: 0 },
      entryDirection: 'left',
      entryTransitionStyle: 'passage',
      exitDirection: 'right',
      exitTransitionStyle: 'passage',
    },
    runArchetypeSequence: ['slasher'],
  });

  const entryRoom = level.rooms.find((room) => room.id === level.entryAnchor.roomId);
  assert.equal(level.entryAnchor.implementation, 'entry_room_direct');
  assert.equal(level.entryAnchor.transitionPosition.x, 0);
  assert.equal(level.entryAnchor.position.x, 1);
  assert.equal(entryRoom?.x, 0);
  assert.equal(entryRoom?.role, 'entry_room');
});

test('branch layout also prefers an outer exit room on the top edge when there is space', () => {
  const { generator } = createGeneratorHarness({
    randomInt: (min, max) => max,
  });
  const level = generator.createDungeonLevel(2, {
    studioArchetypeId: 'slasher',
    studioTopologyNode: {
      floorNumber: 2,
      position: { x: 0, y: 1, z: 0 },
      entryDirection: 'left',
      entryTransitionStyle: 'passage',
      exitDirection: 'front',
      exitTransitionStyle: 'passage',
    },
    runArchetypeSequence: ['slasher', 'slasher'],
  });

  const exitRoom = level.rooms.find((room) => room.id === level.exitAnchor.roomId);
  assert.ok(level.exitAnchor.implementation.startsWith('entry_room'));
  assert.equal(level.exitAnchor.transitionPosition.y, 0);
  assert.equal(level.exitAnchor.position.y, 1);
  assert.equal(exitRoom?.y, 0);
  assert.equal(exitRoom?.role, 'entry_room');
});

test('studio generator can build a hub layout with hub metadata and anchors', () => {
  const { generator } = createStudioGeneratorHarness();
  const level = generator.createDungeonLevel(2, {
    layoutId: 'hub',
    studioArchetypeId: 'slasher',
    studioTopologyNode: {
      floorNumber: 2,
      position: { x: 0, y: 0, z: 0 },
      entryDirection: 'left',
      entryTransitionStyle: 'passage',
      exitDirection: 'right',
      exitTransitionStyle: 'passage',
    },
    runArchetypeSequence: ['slasher', 'slasher'],
  });

  assert.equal(level.layoutId, 'hub');
  assert.equal(level.layoutVariant, null);
  assert.ok(level.layoutMetadata?.hubCore);
  assert.ok(level.layoutMetadata?.hubArmCount >= 3);
  assert.ok(level.layoutMetadata?.hubArmCount <= 5);
  assert.ok(level.entryAnchor);
  assert.ok(level.exitAnchor);
});

test('studio generator can build an open ring variant with a recorded open side', () => {
  const { generator } = createStudioGeneratorHarness();
  const level = generator.createDungeonLevel(3, {
    layoutId: 'ring',
    layoutVariant: 'open',
    studioArchetypeId: 'slasher',
    studioTopologyNode: {
      floorNumber: 3,
      position: { x: 0, y: 0, z: 0 },
      entryDirection: 'left',
      entryTransitionStyle: 'passage',
      exitDirection: 'right',
      exitTransitionStyle: 'passage',
    },
    runArchetypeSequence: ['slasher', 'slasher', 'slasher'],
  });

  assert.equal(level.layoutId, 'ring');
  assert.equal(level.layoutVariant, 'open');
  assert.ok(['left', 'right'].includes(level.layoutMetadata?.ringOpenSide));
  assert.ok(level.gangBoundingBox?.width >= 1);
});

test('studio generator keeps exit reachable when locked rooms are added to a ring layout', () => {
  const { generator } = createStudioGeneratorHarness({
    randomChance: () => 0.1,
    randomInt: (min, max) => min,
    getLockedDoorCountForFloor: () => 2,
  });
  const level = generator.createDungeonLevel(5, {
    layoutId: 'ring',
    layoutVariant: 'closed',
    studioArchetypeId: 'slasher',
    studioTopologyNode: {
      floorNumber: 5,
      position: { x: 0, y: 0, z: 0 },
      entryDirection: 'left',
      entryTransitionStyle: 'passage',
      exitDirection: 'right',
      exitTransitionStyle: 'passage',
    },
    runArchetypeSequence: ['slasher', 'slasher', 'slasher', 'slasher', 'slasher'],
  });

  const reachable = computeReachableTilesWithBlockedPositions(
    level.grid,
    level.startPosition,
    level.doors,
  );
  const reachableKeys = new Set(reachable.map((tile) => `${tile.x},${tile.y}`));
  assert.ok(reachableKeys.has(`${level.exitAnchor.position.x},${level.exitAnchor.position.y}`));
});

test('studio generator keeps a hinted left-side anchor on the exact edge row', () => {
  const { generator } = createStudioGeneratorHarness({
    randomChance: () => 0.3,
    randomInt: (min, max) => Math.floor((min + max) / 2),
  });
  const level = generator.createDungeonLevel(4, {
    layoutId: 'hub',
    studioArchetypeId: 'slasher',
    studioTopologyNode: {
      floorNumber: 4,
      position: { x: 0, y: 0, z: 0 },
      entryDirection: 'left',
      entryTransitionStyle: 'passage',
      entryTransitionHint: { x: 0, y: 9 },
      exitDirection: 'right',
      exitTransitionStyle: 'passage',
    },
    runArchetypeSequence: ['slasher', 'slasher', 'slasher', 'slasher'],
  });

  assert.equal(level.entryAnchor.transitionPosition.x, 0);
  assert.equal(level.entryAnchor.transitionPosition.y, 9);
});

test('studio generator can repeatedly build readable mixed layouts', () => {
  const { generator } = createStudioGeneratorHarness({
    randomChance: () => 0.42,
    randomInt: (min, max) => Math.floor((min + max) / 2),
  });

  const built = [];
  for (let floorNumber = 1; floorNumber <= 6; floorNumber += 1) {
    const layoutId = floorNumber % 3 === 1 ? 'branch' : floorNumber % 3 === 2 ? 'hub' : 'ring';
    const layoutVariant = layoutId === 'ring'
      ? (floorNumber % 2 === 0 ? 'open' : 'closed')
      : null;
    const level = generator.createDungeonLevel(floorNumber, {
      layoutId,
      layoutVariant,
      studioArchetypeId: 'slasher',
      studioTopologyNode: {
        floorNumber,
        position: { x: floorNumber, y: 0, z: 0 },
        entryDirection: 'left',
        entryTransitionStyle: 'passage',
        exitDirection: 'right',
        exitTransitionStyle: 'passage',
      },
      runArchetypeSequence: Array.from({ length: floorNumber }, () => 'slasher'),
    });
    built.push(level);
  }

  assert.equal(built.length, 6);
  assert.ok(built.every((level) => level.entryAnchor && level.exitAnchor));
  assert.ok(built.every((level) => level.rooms.length >= 3));
});

test('studio generator repeatedly builds a fully connected hub core with valid arms', () => {
  let successfulHubLayouts = 0;
  for (let run = 0; run < 8; run += 1) {
    const offset = run % 3;
    const { generator } = createStudioGeneratorHarness({
      randomChance: () => 0.41 + offset * 0.05,
      randomInt: (min, max) => Math.min(max, Math.floor((min + max) / 2) + offset),
    });
    const level = generator.createDungeonLevel(run + 1, {
      layoutId: 'hub',
      studioArchetypeId: 'slasher',
      studioTopologyNode: {
        floorNumber: run + 1,
        position: { x: run, y: 0, z: 0 },
        entryDirection: 'left',
        entryTransitionStyle: 'passage',
        exitDirection: 'right',
        exitTransitionStyle: 'passage',
      },
      runArchetypeSequence: Array.from({ length: run + 1 }, () => 'slasher'),
    });

    assert.notEqual(level.layoutFailureReason, 'primary-structure-validation');

    if (level.layoutId === 'hub') {
      successfulHubLayouts += 1;
      const hubCore = level.layoutMetadata?.hubCore;
      assert.equal(level.layoutFailureReason, null);
      assert.ok(hubCore);
      assert.ok(level.layoutMetadata?.hubArmCount >= 3);
      assert.ok(level.layoutMetadata?.hubArmCount <= 5);

      for (let y = hubCore.y; y < hubCore.y + hubCore.height; y += 1) {
        for (let x = hubCore.x; x < hubCore.x + hubCore.width; x += 1) {
          assert.equal(level.grid[y][x], '.');
        }
      }

      level.layoutMetadata.hubArms.forEach((arm) => {
        assert.equal(level.grid[arm.start.y][arm.start.x], '.');
        assert.equal(level.grid[arm.end.y][arm.end.x], '.');
      });
    }
  }

  assert.ok(successfulHubLayouts >= 4);
});

test('studio generator repeatedly builds closed rings with readable side walls', () => {
  const { generator } = createStudioGeneratorHarness({
    randomChance: () => 0.37,
    randomInt: (min, max) => Math.floor((min + max) / 2),
  });

  for (let run = 0; run < 6; run += 1) {
    const level = generator.createDungeonLevel(run + 1, {
      layoutId: 'ring',
      layoutVariant: 'closed',
      studioArchetypeId: 'slasher',
      studioTopologyNode: {
        floorNumber: run + 1,
        position: { x: run, y: 0, z: 0 },
        entryDirection: 'left',
        entryTransitionStyle: 'passage',
        exitDirection: 'right',
        exitTransitionStyle: 'passage',
      },
      runArchetypeSequence: Array.from({ length: run + 1 }, () => 'slasher'),
    });

    const bounds = level.layoutMetadata?.ringBounds;
    assert.equal(level.layoutId, 'ring');
    assert.equal(level.layoutVariant, 'closed');
    assert.equal(level.layoutFailureReason, null);
    assert.ok(bounds);

    const leftCount = countFloorsOnVerticalLine(level.grid, bounds.x, bounds.y, bounds.y + bounds.height - 1);
    const rightCount = countFloorsOnVerticalLine(level.grid, bounds.x + bounds.width - 1, bounds.y, bounds.y + bounds.height - 1);
    const topCount = countFloorsOnHorizontalLine(level.grid, bounds.y, bounds.x, bounds.x + bounds.width - 1);
    const bottomCount = countFloorsOnHorizontalLine(level.grid, bounds.y + bounds.height - 1, bounds.x, bounds.x + bounds.width - 1);

    assert.ok(leftCount >= Math.floor(bounds.height * 0.6));
    assert.ok(rightCount >= Math.floor(bounds.height * 0.6));
    assert.ok(topCount >= Math.floor(bounds.width * 0.6));
    assert.ok(bottomCount >= Math.floor(bounds.width * 0.6));
  }
});

test('studio generator repeatedly builds open rings with only one weakened side', () => {
  const { generator } = createStudioGeneratorHarness({
    randomChance: () => 0.29,
    randomInt: (min, max) => Math.floor((min + max) / 2),
  });

  for (let run = 0; run < 6; run += 1) {
    const level = generator.createDungeonLevel(run + 1, {
      layoutId: 'ring',
      layoutVariant: 'open',
      studioArchetypeId: 'slasher',
      studioTopologyNode: {
        floorNumber: run + 1,
        position: { x: run, y: 0, z: 0 },
        entryDirection: 'left',
        entryTransitionStyle: 'passage',
        exitDirection: 'right',
        exitTransitionStyle: 'passage',
      },
      runArchetypeSequence: Array.from({ length: run + 1 }, () => 'slasher'),
    });

    const bounds = level.layoutMetadata?.ringBounds;
    const openSide = level.layoutMetadata?.ringOpenSide;
    assert.equal(level.layoutId, 'ring');
    assert.equal(level.layoutVariant, 'open');
    assert.equal(level.layoutFailureReason, null);
    assert.ok(bounds);
    assert.ok(['left', 'right'].includes(openSide));

    const leftCount = countFloorsOnVerticalLine(level.grid, bounds.x, bounds.y, bounds.y + bounds.height - 1);
    const rightCount = countFloorsOnVerticalLine(level.grid, bounds.x + bounds.width - 1, bounds.y, bounds.y + bounds.height - 1);
    const openCount = openSide === 'left' ? leftCount : rightCount;
    const closedCount = openSide === 'left' ? rightCount : leftCount;

    assert.ok(openCount < closedCount);
    assert.ok(closedCount >= Math.floor(bounds.height * 0.6));
  }
});

test('generated doors separate exactly two local area classes without corner ambiguity', () => {
  const { generator } = createStudioGeneratorHarness({
    randomChance: () => 0.27,
    randomInt: (min, max) => Math.floor((min + max) / 2),
    getLockedDoorCountForFloor: () => 1,
  });

  const levels = [
    generator.createDungeonLevel(3, {
      layoutId: 'branch',
      studioArchetypeId: 'slasher',
      studioTopologyNode: {
        floorNumber: 3,
        position: { x: 0, y: 0, z: 0 },
        entryDirection: 'left',
        entryTransitionStyle: 'passage',
        exitDirection: 'right',
        exitTransitionStyle: 'passage',
      },
      runArchetypeSequence: ['slasher', 'slasher', 'slasher'],
    }),
    generator.createDungeonLevel(4, {
      layoutId: 'hub',
      studioArchetypeId: 'slasher',
      studioTopologyNode: {
        floorNumber: 4,
        position: { x: 1, y: 0, z: 0 },
        entryDirection: 'left',
        entryTransitionStyle: 'passage',
        exitDirection: 'right',
        exitTransitionStyle: 'passage',
      },
      runArchetypeSequence: ['slasher', 'slasher', 'slasher', 'slasher'],
    }),
    generator.createDungeonLevel(5, {
      layoutId: 'ring',
      layoutVariant: 'closed',
      studioArchetypeId: 'slasher',
      studioTopologyNode: {
        floorNumber: 5,
        position: { x: 2, y: 0, z: 0 },
        entryDirection: 'left',
        entryTransitionStyle: 'passage',
        exitDirection: 'right',
        exitTransitionStyle: 'passage',
      },
      runArchetypeSequence: ['slasher', 'slasher', 'slasher', 'slasher', 'slasher'],
    }),
  ];

  levels.forEach((level) => {
    level.doors.forEach((door) => {
      const adjacent = [
        { x: door.x, y: door.y - 1, direction: 'north' },
        { x: door.x, y: door.y + 1, direction: 'south' },
        { x: door.x - 1, y: door.y, direction: 'west' },
        { x: door.x + 1, y: door.y, direction: 'east' },
      ]
        .map((entry) => ({
          ...entry,
          areaId: classifyAdjacentDoorArea(level, entry),
        }))
        .filter((entry) => entry.areaId != null);

      const uniqueAreaIds = [...new Set(adjacent.map((entry) => entry.areaId))];
      assert.equal(uniqueAreaIds.length, 2);
    });
  });
});

test('branch layout does not leave a parallel open bypass next to a door choke point', () => {
  for (const seed of [1, 2, 6, 10, 24]) {
    const random = createSeededRandom(seed);
    const { generator } = createStudioGeneratorHarness({
      randomChance: () => random(),
      randomInt: (min, max) => min + Math.floor(random() * (max - min + 1)),
    });

    const level = generator.createDungeonLevel(4, {
      layoutId: 'branch',
      studioArchetypeId: 'slasher',
      studioTopologyNode: {
        floorNumber: 4,
        position: { x: 0, y: 0, z: 0 },
        entryDirection: 'left',
        entryTransitionStyle: 'passage',
        exitDirection: 'right',
        exitTransitionStyle: 'passage',
      },
      runArchetypeSequence: ['slasher', 'slasher', 'slasher', 'slasher'],
    });

    assert.equal(
      findParallelDoorBypass(level),
      null,
      `seed ${seed} generated a door next to an equally open parallel passage`,
    );
  }
});

test('branch layout keeps entry and exit transition tiles distinct', () => {
  for (let seed = 1; seed <= 40; seed += 1) {
    const random = createSeededRandom(seed);
    const { generator } = createStudioGeneratorHarness({
      randomChance: () => random(),
      randomInt: (min, max) => min + Math.floor(random() * (max - min + 1)),
    });

    const level = generator.createDungeonLevel(2, {
      layoutId: 'branch',
      studioArchetypeId: 'action',
      studioTopologyNode: {
        floorNumber: 2,
        position: { x: 1, y: 0, z: 0 },
        entryDirection: 'left',
        entryTransitionStyle: 'passage',
        exitDirection: 'up',
        exitTransitionStyle: 'lift',
      },
      runArchetypeSequence: ['action', 'action'],
    });

    assert.notDeepEqual(
      level.entryAnchor.transitionPosition ?? level.entryAnchor.position,
      level.exitAnchor.transitionPosition ?? level.exitAnchor.position,
      `seed ${seed} generated overlapping entry/exit transition tiles`,
    );
    assert.notDeepEqual(
      level.entryAnchor.position,
      level.exitAnchor.position,
      `seed ${seed} generated overlapping entry/exit anchor positions`,
    );
  }
});

test('sequential studios keep adjacent transitions on the same corresponding position', () => {
  for (let seed = 1; seed <= 12; seed += 1) {
    const levels = buildSequentialStudioRun(seed, 12);

    for (let floorNumber = 1; floorNumber < 12; floorNumber += 1) {
      const sourceLevel = levels[floorNumber];
      const targetLevel = levels[floorNumber + 1];
      const sourceTransition = sourceLevel.exitAnchor?.transitionPosition ?? sourceLevel.stairsDown;
      const targetTransition = targetLevel.entryAnchor?.transitionPosition ?? targetLevel.stairsUp;
      const sourceDirection = sourceLevel.exitAnchor?.direction ?? null;

      assert.equal(
        transitionsShareCorrespondingPosition(sourceTransition, targetTransition, sourceDirection, sourceLevel),
        true,
        `run seed ${seed} floor ${floorNumber} lost transition correspondence for ${sourceDirection}: ${JSON.stringify(sourceTransition)} -> ${JSON.stringify(targetTransition)}`,
      );
    }
  }
});

test('branch layout can place second-row rooms off an already connected side room', () => {
  const { generator } = createGeneratorHarness({
    randomChance: () => 0.1,
  });
  const level = generator.createDungeonLevel(3, {
    studioArchetypeId: 'slasher',
    studioTopologyNode: {
      floorNumber: 3,
      position: { x: 1, y: 0, z: 0 },
      entryDirection: 'left',
      entryTransitionStyle: 'passage',
      exitDirection: 'right',
      exitTransitionStyle: 'passage',
    },
    runArchetypeSequence: ['slasher', 'slasher', 'slasher'],
  });

  assert.ok(level.rooms.some((room) => room.attachmentType === 'sidearm_room'));
});

test('branch layout places open connector rooms before the themed branches fan out', () => {
  const { generator } = createGeneratorHarness({
    randomChance: () => 0.1,
    randomInt: (min, max) => min,
  });
  const level = generator.createDungeonLevel(4, {
    studioArchetypeId: 'slasher',
    studioTopologyNode: {
      floorNumber: 4,
      position: { x: 2, y: 0, z: 0 },
      entryDirection: 'left',
      entryTransitionStyle: 'passage',
      exitDirection: 'right',
      exitTransitionStyle: 'passage',
    },
    runArchetypeSequence: ['slasher', 'slasher', 'slasher', 'slasher'],
  });

  const connectorRooms = level.rooms.filter((room) => room.role === 'connector_room');
  assert.equal(level.layoutId, 'branch');
  assert.ok(connectorRooms.length >= 1);
  assert.ok(connectorRooms.every((room) => room.doorIds.length === 0));
});

test('branch layout can add a dedicated trap room on deeper floors', () => {
  const { generator } = createGeneratorHarness({
    randomChance: () => 0.1,
    randomInt: (min, max) => min,
  });
  const level = generator.createDungeonLevel(5, {
    studioArchetypeId: 'slasher',
    studioTopologyNode: {
      floorNumber: 5,
      position: { x: 4, y: 0, z: 0 },
      entryDirection: 'left',
      entryTransitionStyle: 'passage',
      exitDirection: 'right',
      exitTransitionStyle: 'passage',
    },
    runArchetypeSequence: ['slasher', 'slasher', 'slasher', 'slasher', 'slasher'],
  });

  const trapRoom = level.rooms.find((room) => room.role === 'trap_room');
  assert.ok(trapRoom);
  assert.equal(trapRoom.label, 'Fallenraum');
});

test('branch layout can place traps on corridors, not only inside rooms', () => {
  const { generator } = createGeneratorHarness({
    randomChance: () => 0.99,
    randomInt: (min, max) => min,
    buildTrapsForFloor: () => (
      [
        {
          id: 'test-trap-corridor',
          type: 'floor',
          visibility: 'hidden',
          state: 'active',
          trigger: 'on_enter',
          resetMode: 'single_use',
          affectsPlayer: true,
          affectsEnemies: true,
          x: 0,
          y: 0,
          effect: { damage: 4 },
        },
      ]
    ),
  });
  const level = generator.createDungeonLevel(6, {
    studioArchetypeId: 'slasher',
    studioTopologyNode: {
      floorNumber: 6,
      position: { x: 5, y: 0, z: 0 },
      entryDirection: 'left',
      entryTransitionStyle: 'passage',
      exitDirection: 'right',
      exitTransitionStyle: 'passage',
    },
    runArchetypeSequence: ['slasher', 'slasher', 'slasher', 'slasher', 'slasher', 'slasher'],
  });

  const trap = level.traps[0];
  assert.ok(trap);
  const trapInsideRoom = level.rooms.some((room) =>
    room.interiorTiles.some((tile) => tile.x === trap.x && tile.y === trap.y)
  );

  assert.equal(trapInsideRoom, false);
});

test('branch layout can top off additional connector rooms after themed placement', () => {
  const { generator } = createGeneratorHarness({
    randomChance: () => 0.2,
    randomInt: (min, max) => min,
  });
  const level = generator.createDungeonLevel(4, {
    studioArchetypeId: 'slasher',
    studioTopologyNode: {
      floorNumber: 4,
      position: { x: 2, y: 0, z: 0 },
      entryDirection: 'left',
      entryTransitionStyle: 'passage',
      exitDirection: 'right',
      exitTransitionStyle: 'passage',
    },
    runArchetypeSequence: ['slasher', 'slasher', 'slasher', 'slasher'],
  });

  const connectorRooms = level.rooms.filter((room) => room.role === 'connector_room');
  assert.equal(level.layoutId, 'branch');
  assert.ok(connectorRooms.length > 1);
});

test('branch layout lets connector rooms carry further side branches', () => {
  const { generator } = createGeneratorHarness({
    randomChance: () => 0.1,
    randomInt: (min, max) => min,
  });
  const level = generator.createDungeonLevel(4, {
    studioArchetypeId: 'slasher',
    studioTopologyNode: {
      floorNumber: 4,
      position: { x: 2, y: 0, z: 0 },
      entryDirection: 'left',
      entryTransitionStyle: 'passage',
      exitDirection: 'right',
      exitTransitionStyle: 'passage',
    },
    runArchetypeSequence: ['slasher', 'slasher', 'slasher', 'slasher'],
  });

  const connectorParents = level.rooms.filter((room) =>
    room.role === 'connector_room' &&
    level.rooms.some((child) => child.parentRoomId === room.id)
  );

  assert.equal(level.layoutId, 'branch');
  assert.ok(connectorParents.length >= 1);
});

test('branch layout can add peripheral loop connections between normal side rooms', () => {
  const { generator } = createGeneratorHarness({
    randomChance: () => 0.1,
    randomInt: (min, max) => min,
  });
  const level = generator.createDungeonLevel(5, {
    studioArchetypeId: 'slasher',
    studioTopologyNode: {
      floorNumber: 5,
      position: { x: 3, y: 0, z: 0 },
      entryDirection: 'left',
      entryTransitionStyle: 'passage',
      exitDirection: 'right',
      exitTransitionStyle: 'passage',
    },
    runArchetypeSequence: ['slasher', 'slasher', 'slasher', 'slasher', 'slasher'],
  });

  assert.equal(level.layoutId, 'branch');
  assert.ok((level.extraLoopConnections ?? []).length >= 1);
});

test('branch layout allows ordinary themed rooms to place their outer wall on the map edge', () => {
  const { generator } = createGeneratorHarness({
    randomChance: () => 0.1,
    randomInt: (min, max) => min,
  });
  const level = generator.createDungeonLevel(5, {
    studioArchetypeId: 'slasher',
    studioTopologyNode: {
      floorNumber: 5,
      position: { x: 0, y: 0, z: 0 },
      entryDirection: 'left',
      entryTransitionStyle: 'passage',
      exitDirection: 'right',
      exitTransitionStyle: 'passage',
    },
    runArchetypeSequence: ['slasher', 'slasher', 'slasher', 'slasher', 'slasher'],
  });

  const edgeThemeRoom = level.rooms.find((room) =>
    room.role !== 'entry_room' &&
    (room.x === 0 || room.y === 0 || room.x + room.width === 50 || room.y + room.height === 36)
  );
  assert.ok(edgeThemeRoom);
});

test('branch layout allows a side corridor to run directly along the map edge', () => {
  const { generator } = createGeneratorHarness({
    randomChance: () => 0.1,
    randomInt: (min, max) => min,
  });
  const level = generator.createDungeonLevel(6, {
    studioArchetypeId: 'slasher',
    studioTopologyNode: {
      floorNumber: 6,
      position: { x: 0, y: 0, z: 0 },
      entryDirection: 'left',
      entryTransitionStyle: 'passage',
      exitDirection: 'right',
      exitTransitionStyle: 'passage',
    },
    runArchetypeSequence: ['slasher', 'slasher', 'slasher', 'slasher', 'slasher', 'slasher'],
  });

  const edgeCorridorTile = level.grid.flatMap((row, y) =>
    row.map((tile, x) => ({ x, y, tile }))
  ).find(({ x, y, tile }) => {
    if (tile !== '.') {
      return false;
    }
    if (!(x === 0 || y === 0 || x === 49 || y === 35)) {
      return false;
    }
    return !level.rooms.some((room) => x >= room.x && x < room.x + room.width && y >= room.y && y < room.y + room.height);
  });

  assert.ok(edgeCorridorTile);
});

test('branch layout can keep a vertical transition on the exact hinted edge position', () => {
  const { generator } = createGeneratorHarness({
    randomChance: () => 0.95,
    randomInt: (min, max) => Math.floor((min + max) / 2),
  });
  const level = generator.createDungeonLevel(7, {
    studioArchetypeId: 'slasher',
    studioTopologyNode: {
      floorNumber: 7,
      position: { x: 0, y: 0, z: 1 },
      entryDirection: 'down',
      entryTransitionStyle: 'lift',
      entryTransitionHint: { x: 24, y: 35 },
      exitDirection: 'up',
      exitTransitionStyle: 'lift',
      exitTransitionHint: { x: 24, y: 0 },
    },
    runArchetypeSequence: ['slasher', 'slasher', 'slasher', 'slasher', 'slasher', 'slasher', 'slasher'],
  });

  assert.deepEqual(level.exitAnchor.transitionPosition, { x: 24, y: 0 });
  assert.equal(level.stairsDown.y, 0);
});

test('branch layout scatters fallback showcases across ordinary rooms when no showcase room exists', () => {
  const { generator } = createGeneratorHarness({
    randomChance: () => 0.95,
    randomInt: (min, max) => {
      if (min === 0 && max === 4) {
        return 3;
      }
      return Math.floor((min + max) / 2);
    },
  });
  const level = generator.createDungeonLevel(5, {
    studioArchetypeId: 'slasher',
    studioTopologyNode: {
      floorNumber: 5,
      position: { x: 0, y: 0, z: 0 },
      entryDirection: 'left',
      entryTransitionStyle: 'passage',
      exitDirection: 'right',
      exitTransitionStyle: 'passage',
    },
    runArchetypeSequence: ['slasher', 'slasher', 'slasher', 'slasher', 'slasher'],
  });

  const showcaseRoom = level.rooms.find((room) => room.role === 'showcase_room');
  assert.equal(showcaseRoom, undefined);
  assert.equal(level.showcases.length, 3);

  const showcaseRoomIds = new Set(level.showcases.map((showcase) => showcase.roomId));
  assert.equal(showcaseRoomIds.size, level.showcases.length);

  const showcaseRooms = level.showcases.map((showcase) =>
    level.rooms.find((room) => room.id === showcase.roomId)
  );
  assert.ok(showcaseRooms.every((room) =>
    room &&
    room.role !== 'entry_room' &&
    room.role !== 'connector_room' &&
    room.role !== 'showcase_room' &&
    room.overlayRole == null
  ));
});

test('generated showcases keep at least one interior tile of distance from room exits', () => {
  const chanceValues = [0.18, 0.27, 0.41, 0.58];
  let levelWithShowcases = null;

  for (const chanceValue of chanceValues) {
    const { generator } = createStudioGeneratorHarness({
      randomChance: () => chanceValue,
      randomInt: (min, max) => Math.floor((min + max) / 2),
    });
    const level = generator.createDungeonLevel(5, {
      layoutId: 'hub',
      studioArchetypeId: 'slasher',
      studioTopologyNode: {
        floorNumber: 5,
        position: { x: 0, y: 0, z: 0 },
        entryDirection: 'left',
        entryTransitionStyle: 'passage',
        exitDirection: 'right',
        exitTransitionStyle: 'passage',
      },
      runArchetypeSequence: ['slasher', 'slasher', 'slasher', 'slasher', 'slasher'],
    });

    if (level.showcases.length > 0) {
      levelWithShowcases = level;
      break;
    }
  }

  assert.ok(levelWithShowcases);

  levelWithShowcases.showcases.forEach((showcase) => {
    const room = levelWithShowcases.rooms.find((entry) => entry.id === showcase.roomId);
    assert.ok(room);
    const tooCloseToDoor = room.doorTiles.some((door) =>
      Math.abs(door.x - showcase.x) + Math.abs(door.y - showcase.y) <= 1
    );
    assert.equal(tooCloseToDoor, false);
  });
});
