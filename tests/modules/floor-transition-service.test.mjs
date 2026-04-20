import test from 'node:test';
import assert from 'node:assert/strict';
import { createFloorTransitionService } from '../../src/application/floor-transition-service.mjs';

function createHarness({
  timelineTime = 0,
  existingFloors = {},
  createDungeonLevel = () => ({
    grid: Array.from({ length: 6 }, () => Array(6).fill('.')),
    enemies: [],
    stairsUp: { x: 1, y: 1 },
    stairsDown: { x: 4, y: 4 },
  }),
} = {}) {
  const state = {
    floor: 1,
    deepestFloor: 1,
    timelineTime,
    runSeed: 12345,
    runArchetypeSequence: ['alpha', 'beta', 'gamma'],
    runStudioTopology: null,
    visitedFloors: [1],
    safeRestTurns: 0,
    player: { x: 1, y: 1 },
    floors: {
      1: {
        grid: Array.from({ length: 6 }, () => Array(6).fill('.')),
        enemies: [],
        stairsUp: { x: 1, y: 1 },
        stairsDown: { x: 4, y: 4 },
        ...existingFloors[1],
      },
      ...existingFloors,
    },
  };

  const service = createFloorTransitionService({
    getState: () => state,
    getCurrentFloorState: () => state.floors[state.floor],
    createDungeonLevel,
    randomInt: () => 0,
    detectNearbyTraps: () => {},
    maybeTriggerShowcaseAmbience: () => {},
    manhattanDistance: (left, right) => Math.abs(left.x - right.x) + Math.abs(left.y - right.y),
    addMessage: () => {},
    formatStudioLabel: (floor) => `Studio ${floor}`,
    formatArchetypeLabel: (label) => label ?? 'Unbekannt',
    buildStudioAnnouncement: () => 'Ansage',
    getArchetypeForFloor: (sequence, floorNumber) => sequence[floorNumber - 1] ?? 'fallback',
    playStudioAnnouncement: () => {},
    showStairChoice: () => {},
    renderSelf: () => {},
  });

  return { state, service };
}

test('floor-transition-service anchors newly generated enemies to the current timeline time', () => {
  const { state, service } = createHarness({
    timelineTime: 240,
    createDungeonLevel: () => ({
      grid: Array.from({ length: 6 }, () => Array(6).fill('.')),
      enemies: [
        { id: 'fresh-raider', x: 2, y: 2, nextActionTime: 0 },
        { id: 'fresh-brute', x: 3, y: 3, nextActionTime: 15 },
      ],
      stairsUp: { x: 1, y: 1 },
      stairsDown: { x: 4, y: 4 },
    }),
  });

  service.ensureFloorExists(2);

  assert.deepEqual(
    state.floors[2].enemies.map((enemy) => enemy.nextActionTime),
    [240, 240],
  );
});

test('floor-transition-service keeps existing floor timelines untouched on revisit', () => {
  const { state, service } = createHarness({
    timelineTime: 240,
    existingFloors: {
      2: {
        grid: Array.from({ length: 6 }, () => Array(6).fill('.')),
        enemies: [
          { id: 'stored-raider', x: 2, y: 2, nextActionTime: 310 },
        ],
        stairsUp: { x: 1, y: 1 },
        stairsDown: { x: 4, y: 4 },
      },
    },
  });

  service.ensureFloorExists(2);

  assert.equal(state.floors[2].enemies[0].nextActionTime, 310);
});
