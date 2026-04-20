import test from 'node:test';
import assert from 'node:assert/strict';
import { createVisibilityService } from '../../src/application/visibility-service.mjs';

function createGrid(width, height, fill = false) {
  return Array.from({ length: height }, () => Array.from({ length: width }, () => fill));
}

function createFloorState(layout) {
  return {
    grid: layout.map((row) => [...row]),
    explored: createGrid(layout[0].length, layout.length, false),
    visible: createGrid(layout[0].length, layout.length, false),
    doors: [],
    showcases: [],
  };
}

function createVisibilityHarness(layout, player = { x: 2, y: 2 }, { doors = [] } = {}) {
  const floorState = createFloorState(layout);
  floorState.doors = doors.map((door) => ({ ...door }));
  const state = { player };
  return {
    floorState,
    state,
    api: createVisibilityService({
      WIDTH: layout[0].length,
      HEIGHT: layout.length,
      VISION_RADIUS: 8,
      TILE: { WALL: '#' },
      getState: () => state,
      getCurrentFloorState: () => floorState,
      getDoorAt: (x, y, nextFloorState = floorState) =>
        nextFloorState.doors.find((door) => door.x === x && door.y === y) ?? null,
      isDoorClosed: (door) => Boolean(door) && !door.isOpen,
      createGrid,
      getEquippedLightBonus: () => 0,
    }),
  };
}

test('visibility-service evaluates mirrored direct diagonals symmetrically', () => {
  const { api, floorState } = createVisibilityHarness([
    '#######',
    '#.#.#.#',
    '#.....#',
    '#.#@#.#',
    '#.....#',
    '#.#.#.#',
    '#######',
  ].map((row) => row.replace('@', '.')));

  assert.equal(api.hasLineOfSight(floorState, 3, 3, 2, 2), true);
  assert.equal(api.hasLineOfSight(floorState, 3, 3, 4, 2), true);
  assert.equal(api.hasLineOfSight(floorState, 3, 3, 2, 4), true);
  assert.equal(api.hasLineOfSight(floorState, 3, 3, 4, 4), true);
});

test('visibility-service blocks a diagonal when both corner tiles are opaque', () => {
  const { api, floorState } = createVisibilityHarness([
    '#####',
    '#...#',
    '#...#',
    '#...#',
    '#####',
  ]);

  floorState.grid[2][3] = '#';
  floorState.grid[1][2] = '#';

  assert.equal(api.hasLineOfSight(floorState, 2, 2, 3, 1), false);
  assert.equal(api.hasLineOfSight(floorState, 3, 1, 2, 2), false);
});

test('visibility-service updateVisibility keeps mirrored diagonal wall reveals consistent', () => {
  const layout = [
    '#######',
    '#.....#',
    '#.#.#.#',
    '#..@..#',
    '#.#.#.#',
    '#.....#',
    '#######',
  ];
  const player = { x: 3, y: 3 };
  const { api, floorState, state } = createVisibilityHarness(
    layout.map((row) => row.replace('@', '.')),
    player,
  );

  api.updateVisibility();

  assert.equal(floorState.visible[2][2], true);
  assert.equal(floorState.visible[2][4], true);
  assert.equal(floorState.visible[4][2], true);
  assert.equal(floorState.visible[4][4], true);
  assert.equal(state.player.x, 3);
});

test('visibility-service reveals doors next to visible floors like structural wall edges', () => {
  const layout = [
    '#####',
    '#...#',
    '#...#',
    '#...#',
    '#####',
  ];
  const { api, floorState } = createVisibilityHarness(
    layout,
    { x: 2, y: 3 },
    { doors: [{ x: 3, y: 2, isOpen: false, doorType: 'normal' }] },
  );

  floorState.grid[2][2] = '#';
  floorState.grid[3][3] = '#';

  assert.equal(api.hasLineOfSight(floorState, 2, 3, 3, 2), false);

  api.updateVisibility();

  assert.equal(floorState.visible[2][3], true);
  assert.equal(floorState.explored[2][3], true);
});
