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
    lineOfSightVisible: createGrid(layout[0].length, layout.length, false),
    visible: createGrid(layout[0].length, layout.length, false),
    doors: [],
    showcases: [],
  };
}

function createVisibilityHarness(layout, player = { x: 2, y: 2 }, { doors = [], visionRadius = 8 } = {}) {
  const floorState = createFloorState(layout);
  floorState.doors = doors.map((door) => ({ ...door }));
  const state = { player };
  return {
    floorState,
    state,
    api: createVisibilityService({
      WIDTH: layout[0].length,
      HEIGHT: layout.length,
      VISION_RADIUS: visionRadius,
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
  assert.equal(api.hasProjectileLine(floorState, 2, 2, 3, 1), false);
});

test('visibility-service can see horse-jump floor tiles around a narrow corridor opening', () => {
  const layout = [
    '#######',
    '###.###',
    '###.###',
    '###.###',
    '##...##',
    '##...##',
    '#######',
  ];
  const player = { x: 3, y: 3 };
  const { api, floorState } = createVisibilityHarness(
    layout.map((row) => row.replace('@', '.')),
    player,
    { visionRadius: 4 },
  );

  api.updateVisibility();

  assert.equal(floorState.lineOfSightVisible[5][2], true);
  assert.equal(floorState.lineOfSightVisible[5][4], true);
  assert.equal(api.hasLineOfSight(floorState, 3, 3, 2, 5), true);
  assert.equal(api.hasLineOfSight(floorState, 3, 3, 4, 5), true);
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

test('visibility-service reveals off-axis structural walls next to visible floors orthogonally', () => {
  const layout = [
    '#####',
    '##..#',
    '#.@.#',
    '#...#',
    '#####',
  ];
  const { api, floorState } = createVisibilityHarness(
    layout.map((row) => row.replace('@', '.')),
    { x: 2, y: 2 },
    { visionRadius: 1 },
  );

  api.updateVisibility();

  assert.equal(floorState.lineOfSightVisible[1][1], false);
  assert.equal(floorState.visible[1][1], true);
  assert.equal(floorState.explored[1][1], true);
});

test('visibility-service does not brighten far side walls from a lone distant visible tile', () => {
  const layout = [
    '###########',
    '#.........#',
    '#.........#',
    '###.....###',
    '###.....###',
    '####...####',
    '####.@.####',
    '###########',
  ];
  const { api, floorState } = createVisibilityHarness(
    layout.map((row) => row.replace('@', '.')),
    { x: 5, y: 6 },
    { visionRadius: 5 },
  );

  api.updateVisibility();

  assert.equal(floorState.lineOfSightVisible[4][2], false);
  assert.equal(floorState.visible[5][2], false);
  assert.equal(floorState.visible[5][8], false);
  assert.equal(floorState.visible[3][2], true);
  assert.equal(floorState.visible[3][8], true);
});

test('visibility-service reveals diagonal structural room corners when both orthogonal supports are structural', () => {
  const layout = [
    '#####',
    '#...#',
    '#.@##',
    '#.###',
    '#####',
  ];
  const { api, floorState } = createVisibilityHarness(
    layout.map((row) => row.replace('@', '.')),
    { x: 2, y: 2 },
    { visionRadius: 1 },
  );

  api.updateVisibility();

  assert.equal(floorState.lineOfSightVisible[3][3], false);
  assert.equal(floorState.visible[3][3], true);
});

test('visibility-service reveals outer room corners when both orthogonal supports are already visible floors', () => {
  const layout = [
    '######',
    '#....#',
    '#.@..#',
    '#....#',
    '#...##',
    '######',
  ];
  const { api, floorState } = createVisibilityHarness(
    layout.map((row) => row.replace('@', '.')),
    { x: 2, y: 2 },
    { visionRadius: 3 },
  );

  api.updateVisibility();

  assert.equal(floorState.lineOfSightVisible[4][4], false);
  assert.equal(floorState.visible[3][4], true);
  assert.equal(floorState.visible[4][3], true);
  assert.equal(floorState.visible[4][4], true);
});

test('visibility-service reveals a wall corner below a visible door silhouette', () => {
  const layout = [
    '#####',
    '#.@.#',
    '#####',
    '#####',
  ];
  const { api, floorState } = createVisibilityHarness(
    layout.map((row) => row.replace('@', '.')),
    { x: 2, y: 1 },
    { visionRadius: 1, doors: [{ x: 3, y: 1, isOpen: false, doorType: 'normal' }] },
  );

  api.updateVisibility();

  assert.equal(floorState.visible[1][3], true);
  assert.equal(floorState.lineOfSightVisible[2][3], false);
  assert.equal(floorState.visible[2][3], true);
});

test('visibility-service does not chain structural reveal through an already revealed door', () => {
  const layout = [
    '######',
    '#....#',
    '#....#',
    '#....#',
    '######',
  ];
  const { api, floorState } = createVisibilityHarness(
    layout,
    { x: 1, y: 2 },
    { visionRadius: 2, doors: [{ x: 3, y: 1, isOpen: false, doorType: 'normal' }] },
  );

  floorState.grid[1][4] = '#';

  api.updateVisibility();

  assert.equal(floorState.lineOfSightVisible[1][3], false);
  assert.equal(floorState.visible[1][3], true);
  assert.equal(floorState.visible[1][4], false);
});

test('visibility-service does not reveal structural tiles beyond the radius on the player axis', () => {
  const layout = [
    '#####',
    '#...#',
    '#.@.#',
    '#...#',
    '#####',
  ];
  const { api, floorState } = createVisibilityHarness(
    layout.map((row) => row.replace('@', '.')),
    { x: 2, y: 2 },
    { visionRadius: 1 },
  );

  api.updateVisibility();

  assert.equal(floorState.lineOfSightVisible[0][2], false);
  assert.equal(floorState.visible[0][2], false);
  assert.equal(floorState.explored[0][2], false);
});

test('visibility-service keeps structural silhouette tiles out of tactical perception', () => {
  const layout = [
    '#####',
    '##..#',
    '#.@.#',
    '#...#',
    '#####',
  ];
  const { api, floorState } = createVisibilityHarness(
    layout.map((row) => row.replace('@', '.')),
    { x: 2, y: 2 },
    { visionRadius: 1 },
  );

  api.updateVisibility();

  assert.equal(floorState.visible[1][1], true);
  assert.equal(floorState.lineOfSightVisible[1][1], false);
  assert.equal(api.canPerceive(floorState, 2, 2, 1, 1), false);
});

test('visibility-service limits player tactical perception to the configured vision radius', () => {
  const layout = [
    '.............',
    '.............',
    '.............',
    '.............',
    '.............',
    '.............',
    '.............',
    '.............',
    '.............',
    '.............',
    '.............',
    '.............',
    '.............',
  ];
  const player = { x: 6, y: 6 };
  const { api, floorState } = createVisibilityHarness(layout, player, { visionRadius: 5 });

  assert.equal(api.canPerceive(floorState, 6, 6, 11, 6), true);
  assert.equal(api.canPerceive(floorState, 6, 6, 12, 6), false);
});

test('visibility-service uses a circle-like radius in open space instead of a square', () => {
  const layout = [
    '.............',
    '.............',
    '.............',
    '.............',
    '.............',
    '.............',
    '.............',
    '.............',
    '.............',
    '.............',
    '.............',
    '.............',
    '.............',
  ];
  const player = { x: 6, y: 6 };
  const { api, floorState } = createVisibilityHarness(layout, player, { visionRadius: 5 });

  api.updateVisibility();

  assert.equal(floorState.lineOfSightVisible[6][11], true); // straight east, distance 5
  assert.equal(floorState.lineOfSightVisible[3][10], true); // 3-4-5 triangle
  assert.equal(floorState.lineOfSightVisible[2][10], false); // diagonal corner of the old square
  assert.equal(floorState.lineOfSightVisible[1][6], true); // straight north, distance 5
});

test('visibility-service keeps diagonal-only structure hidden in raw sight before orthogonal reveal applies', () => {
  const layout = [
    '#####',
    '#...#',
    '#...#',
    '#...#',
    '#####',
  ];
  const { api, floorState } = createVisibilityHarness(
    layout,
    { x: 1, y: 3 },
    { doors: [{ x: 3, y: 1, isOpen: false, doorType: 'normal' }] },
  );

  floorState.grid[2][1] = '#';
  floorState.grid[3][2] = '#';

  assert.equal(api.hasLineOfSight(floorState, 1, 3, 2, 2), false);

  api.updateVisibility();

  assert.equal(floorState.lineOfSightVisible[1][3], false);
  assert.equal(floorState.visible[1][3], true);
});
