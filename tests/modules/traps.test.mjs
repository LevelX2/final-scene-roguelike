import test from 'node:test';
import assert from 'node:assert/strict';
import { createTrapsApi } from '../../src/traps.mjs';

function createTrapApiHarness(randomChance = () => 0.5) {
  return createTrapsApi({
    randomInt: (min, _max) => min,
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
    playTrapTriggerSound: () => {},
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

function createTrapPerceptionHarness({
  randomChance = () => 0.99,
  visible = [],
} = {}) {
  const messages = [];
  const floatingTexts = [];
  const trapSounds = [];
  const state = {
    player: { x: 1, y: 1, hp: 10 },
    damageTaken: 0,
    damageDealt: 0,
    kills: 0,
    killStats: {},
  };
  const floorState = {
    traps: [],
    enemies: [],
    visible,
  };

  const trapsApi = createTrapsApi({
    randomInt: (min, _max) => min,
    randomChance,
    getState: () => state,
    getCurrentFloorState: () => floorState,
    addMessage: (text, tone = '') => messages.push({ text, tone }),
    showFloatingText: (...args) => floatingTexts.push(args),
    healPlayer: () => {},
    refreshNutritionState: () => {},
    grantExperience: () => {},
    createDeathCause: () => 'test',
    saveHighscoreIfNeeded: () => null,
    showDeathModal: () => {},
    playDeathSound: () => {},
    playTrapTriggerSound: (options) => trapSounds.push(options),
  });

  return {
    trapsApi,
    state,
    floorState,
    messages,
    floatingTexts,
    trapSounds,
  };
}

test('enemy-triggered traps stay silent outside the player view', () => {
  const harness = createTrapPerceptionHarness({
    visible: Array.from({ length: 5 }, () => Array(5).fill(false)),
  });
  const trap = {
    id: 'hidden-floor-trap',
    name: 'Testfalle',
    visibility: 'hidden',
    state: 'active',
    trigger: 'on_enter',
    resetMode: 'single_use',
    affectsPlayer: true,
    affectsEnemies: true,
    x: 3,
    y: 3,
    reactDifficulty: null,
    effect: { damage: 4 },
  };
  const enemy = { id: 'enemy', name: 'Testgegner', x: 3, y: 3, hp: 10 };

  harness.floorState.traps.push(trap);
  harness.floorState.enemies.push(enemy);

  const triggered = harness.trapsApi.handleActorEnterTile(enemy, harness.floorState);

  assert.equal(triggered, true);
  assert.equal(harness.messages.length, 0);
  assert.equal(harness.floatingTexts.length, 0);
  assert.equal(harness.trapSounds.length, 0);
});

test('enemy-triggered traps remain visible in the log and on the board when in sight', () => {
  const visible = Array.from({ length: 5 }, () => Array(5).fill(false));
  visible[3][3] = true;
  const harness = createTrapPerceptionHarness({ visible });
  const trap = {
    id: 'visible-floor-trap',
    name: 'Testfalle',
    visibility: 'hidden',
    state: 'active',
    trigger: 'on_enter',
    resetMode: 'single_use',
    affectsPlayer: true,
    affectsEnemies: true,
    x: 3,
    y: 3,
    reactDifficulty: null,
    effect: { damage: 4 },
  };
  const enemy = { id: 'enemy', name: 'Testgegner', x: 3, y: 3, hp: 10 };

  harness.floorState.traps.push(trap);
  harness.floorState.enemies.push(enemy);

  const triggered = harness.trapsApi.handleActorEnterTile(enemy, harness.floorState);

  assert.equal(triggered, true);
  assert.equal(harness.messages.length, 1);
  assert.match(harness.messages[0].text, /Schaden durch Testfalle/);
  assert.equal(harness.floatingTexts.length, 1);
  assert.equal(harness.floatingTexts[0][0], 3);
  assert.equal(harness.floatingTexts[0][1], 3);
  assert.equal(harness.trapSounds.length, 0);
});

test('player-triggered traps play an audible cue on hit', () => {
  const harness = createTrapPerceptionHarness();
  const trap = {
    id: 'player-floor-trap',
    name: 'Verdeckte Falltür',
    type: 'floor',
    visibility: 'hidden',
    state: 'active',
    trigger: 'on_enter',
    resetMode: 'single_use',
    affectsPlayer: true,
    affectsEnemies: true,
    x: 1,
    y: 1,
    reactDifficulty: null,
    effect: { damage: 5 },
  };

  harness.floorState.traps.push(trap);

  const triggered = harness.trapsApi.handleActorEnterTile(harness.state.player, harness.floorState);

  assert.equal(triggered, true);
  assert.equal(harness.trapSounds.length, 1);
  assert.deepEqual(harness.trapSounds[0], { trapType: 'floor', avoided: false });
});

test('player-triggered traps play an audible cue on avoidance', () => {
  const harness = createTrapPerceptionHarness({
    randomChance: () => 0,
  });
  harness.state.player.reaction = 10;
  const trap = {
    id: 'player-avoid-trap',
    name: 'Testfalle',
    type: 'floor',
    visibility: 'hidden',
    state: 'active',
    trigger: 'on_enter',
    resetMode: 'single_use',
    affectsPlayer: true,
    affectsEnemies: true,
    x: 1,
    y: 1,
    detectDifficulty: 99,
    reactDifficulty: 0,
    effect: { damage: 4 },
  };

  harness.floorState.traps.push(trap);

  const triggered = harness.trapsApi.handleActorEnterTile(harness.state.player, harness.floorState);

  assert.equal(triggered, true);
  assert.equal(harness.trapSounds.length, 1);
  assert.deepEqual(harness.trapSounds[0], { trapType: 'floor', avoided: true });
});

test('continuous hazards can be processed for a single actor without ticking everyone else', () => {
  const harness = createTrapPerceptionHarness();
  const enemy = { id: 'enemy', name: 'Testgegner', x: 3, y: 3, hp: 10, turnsSinceHit: 2 };
  harness.state.player.x = 1;
  harness.state.player.y = 1;
  harness.floorState.enemies.push(enemy);
  harness.floorState.traps.push({
    id: 'hazard',
    name: 'Funkenkabel',
    type: 'hazard',
    visibility: 'visible',
    state: 'active',
    trigger: 'continuous',
    resetMode: 'persistent',
    affectsPlayer: true,
    affectsEnemies: true,
    x: 3,
    y: 3,
    effect: { damage: 2 },
  });

  harness.trapsApi.processActorContinuousTraps(enemy, harness.floorState);

  assert.equal(enemy.hp, 8);
  assert.equal(harness.state.player.hp, 10);
  assert.equal(enemy.turnsSinceHit, 0);
});
