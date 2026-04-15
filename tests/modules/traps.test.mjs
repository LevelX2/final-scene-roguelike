import test from 'node:test';
import assert from 'node:assert/strict';
import { createTrapsApi } from '../../src/traps.mjs';

function createTrapApiHarness(randomChance = () => 0.5) {
  return createTrapsApi({
    randomInt: (min, max) => min,
    randomChance,
    getState: () => ({ player: { x: 0, y: 0 } }),
    getCurrentFloorState: () => ({ traps: [], enemies: [] }),
    addMessage: () => {},
    showFloatingText: () => {},
    healPlayer: () => {},
    refreshNutritionState: () => {},
    grantExperience: () => {},
    createDeathCause: () => 'test',
    saveHighscoreIfNeeded: () => null,
    showDeathModal: () => {},
    playDeathSound: () => {},
  });
}

function createOpenGrid(width, height) {
  return Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) =>
      x === 0 || y === 0 || x === width - 1 || y === height - 1 ? '#' : '.'
    )
  );
}

test('trap generation can still produce completely quiet studios', () => {
  const trapsApi = createTrapApiHarness(() => 0);
  const grid = createOpenGrid(12, 12);

  const floorOne = trapsApi.buildTrapsForFloor({
    floorNumber: 1,
    grid,
    occupied: [],
    doors: [],
    stairsUp: null,
    stairsDown: null,
    walkableArea: 100,
  });
  const quietFloorThree = trapsApi.buildTrapsForFloor({
    floorNumber: 3,
    grid,
    occupied: [],
    doors: [],
    stairsUp: null,
    stairsDown: null,
    walkableArea: 100,
  });

  assert.equal(floorOne.length, 0);
  assert.equal(quietFloorThree.length, 0);
});

test('trap generation gains extra budget from larger reachable floor area', () => {
  const trapsApi = createTrapApiHarness(() => 0.5);
  const smallGrid = createOpenGrid(12, 12);
  const largeGrid = createOpenGrid(18, 18);

  const compactFloor = trapsApi.buildTrapsForFloor({
    floorNumber: 6,
    grid: smallGrid,
    occupied: [],
    doors: [],
    stairsUp: null,
    stairsDown: null,
    walkableArea: 100,
  });
  const sprawlingFloor = trapsApi.buildTrapsForFloor({
    floorNumber: 6,
    grid: largeGrid,
    occupied: [],
    doors: [],
    stairsUp: null,
    stairsDown: null,
    walkableArea: 230,
  });

  assert.equal(compactFloor.length, 7);
  assert.equal(sprawlingFloor.length, 10);
});
