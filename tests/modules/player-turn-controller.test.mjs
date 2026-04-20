import test from 'node:test';
import assert from 'node:assert/strict';
import { createActionScheduler } from '../../src/application/action-scheduler.mjs';
import { createPlayerTurnController } from '../../src/application/player-turn-controller.mjs';

function createHarness({
  player = { x: 5, y: 5 },
  grid = Array.from({ length: 12 }, () => Array(12).fill('.')),
  doors = [],
  showcases = [],
  enemies = [],
  weapon = null,
  options = {},
  previewCombatAttack = () => ({
    hitChance: 65,
    baseHitChance: 65,
    critChance: 0,
    coverPenalty: 0,
    coverGrade: 'clear',
    coverLabel: '',
  }),
  openDoor = () => {},
  takeEnemyTurn = () => {},
  hasNearbyEnemy = () => false,
  canActorMove = () => true,
} = {}) {
  const normalizedEnemies = enemies.map((enemy) => ({
    hp: 10,
    baseSpeed: 100,
    nextActionTime: 0,
    reaction: 1,
    statusEffects: [],
    ...enemy,
  }));
  const state = {
    gameOver: false,
    view: 'game',
    pendingChoice: null,
    pendingStairChoice: null,
    modals: {
      startOpen: false,
      inventoryOpen: false,
      studioTopologyOpen: false,
      runStatsOpen: false,
      optionsOpen: false,
      savegamesOpen: false,
      helpOpen: false,
      highscoresOpen: false,
    },
    player: {
      hp: 10,
      baseSpeed: 100,
      nextActionTime: 0,
      reaction: 3,
      statusEffects: [],
      ...player,
    },
    inventory: [],
    floor: 1,
    turn: 0,
    timelineTime: 0,
    options: {
      directFireOnSingleTarget: true,
      ...options,
    },
    targeting: {
      active: false,
      cursorX: 0,
      cursorY: 0,
    },
  };
  const floorState = {
    grid,
    visible: Array.from({ length: grid.length }, () => Array(grid[0].length).fill(true)),
    doors,
    showcases,
    enemies: normalizedEnemies,
    recentDeaths: [],
  };
  const messages = [];
  const attacks = [];
  const attackCalls = [];
  const playerActionCosts = [];
  const scheduler = createActionScheduler({
    getState: () => state,
    getCurrentFloorState: () => floorState,
  });

  const api = createPlayerTurnController({
    WIDTH: grid[0].length,
    HEIGHT: grid.length,
    TILE: { WALL: '#' },
    DOOR_TYPE: { LOCKED: 'locked' },
    getState: () => state,
    getCurrentFloorState: () => floorState,
    getDoorAt: (x, y, nextFloorState = floorState) =>
      nextFloorState.doors.find((door) => door.x === x && door.y === y) ?? null,
    getShowcaseAt: (x, y, nextFloorState = floorState) =>
      nextFloorState.showcases.find((showcase) => showcase.x === x && showcase.y === y) ?? null,
    openDoor,
    closeDoor: () => true,
    canPlayerOpenDoor: () => true,
    getDoorColorLabels: () => ({ adjective: 'gruene' }),
    manhattanDistance: (left, right) => Math.abs(left.x - right.x) + Math.abs(left.y - right.y),
    addMessage: (text) => messages.push(text),
    attackEnemy: (enemy, attackOptions) => {
      attacks.push(enemy);
      attackCalls.push({ enemy, options: attackOptions });
    },
    tryPickupLoot: () => false,
    tryUseStairs: () => false,
    detectNearbyTraps: () => {},
    maybeTriggerShowcaseAmbience: () => {},
    handleActorEnterTile: () => {},
    playStepSound: () => {},
    playLockedDoorSound: () => {},
    hasNearbyEnemy,
    takeEnemyTurn,
    canActorMove,
    hasLineOfSight: () => true,
    chebyshevDistance: (left, right) => Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y)),
    getCombatWeapon: () => weapon,
    previewCombatAttack,
    ...scheduler,
    scheduleActorNextTurn: (actor, actionCost) => {
      if (actor === state.player) {
        playerActionCosts.push(actionCost);
      }
      return scheduler.scheduleActorNextTurn(actor, actionCost);
    },
    processActorStatusEffects: () => ({ dead: false }),
    processActorContinuousTraps: () => {},
    processActorSafeRegeneration: () => {},
    processConsumableBuffs: () => {},
    applyPlayerNutritionTurnCost: () => {},
    renderSelf: () => {},
  });

  return {
    api,
    state,
    messages,
    attacks,
    attackCalls,
    floorState,
    playerActionCosts,
  };
}

test('player-turn-controller blocks diagonal movement through a double-blocked corner', () => {
  const grid = Array.from({ length: 12 }, () => Array(12).fill('.'));
  grid[5][6] = '#';
  grid[6][5] = '#';
  const harness = createHarness({ grid });

  harness.api.movePlayer(1, 1);

  assert.equal(harness.state.player.x, 5);
  assert.equal(harness.state.player.y, 5);
  assert.equal(
    harness.messages.some((entry) => entry.includes('Die Ecke ist zu eng')),
    true,
  );
  assert.equal(harness.state.turn, 0);
});

test('player-turn-controller allows diagonal melee attacks against adjacent enemies', () => {
  const enemy = { id: 'diag-target', x: 6, y: 6 };
  const harness = createHarness({ enemies: [enemy] });

  harness.api.movePlayer(1, 1);

  assert.equal(harness.attacks.length, 1);
  assert.equal(harness.attacks[0].id, enemy.id);
  assert.equal(harness.state.player.x, 5);
  assert.equal(harness.state.player.y, 5);
  assert.equal(harness.state.turn, 1);
});

test('player-turn-controller does not open closed doors diagonally', () => {
  const harness = createHarness({
    doors: [{ x: 6, y: 6, isOpen: false, doorType: 'normal' }],
  });

  harness.api.movePlayer(1, 1);

  assert.equal(harness.state.player.x, 5);
  assert.equal(harness.state.player.y, 5);
  assert.equal(
    harness.messages.some((entry) => entry.includes('nicht diagonal aufdrücken')),
    true,
  );
  assert.equal(harness.state.turn, 0);
});

test('player-turn-controller fires immediately when only one ranged target is valid and the option is enabled', () => {
  const enemy = { id: 'single-target', x: 5, y: 2 };
  const harness = createHarness({
    enemies: [enemy],
    weapon: {
      id: 'test-pistol',
      attackMode: 'ranged',
      range: 6,
    },
    options: {
      directFireOnSingleTarget: true,
    },
  });

  harness.api.cycleTargetMode();

  assert.equal(harness.attacks.length, 1);
  assert.equal(harness.attacks[0].id, 'single-target');
  assert.equal(harness.attackCalls[0].options.distance, 3);
  assert.equal(harness.state.targeting.active, false);
  assert.equal(harness.state.turn, 1);
});

test('player-turn-controller keeps the target mode when direct fire on a single target is disabled', () => {
  const enemy = { id: 'single-target', x: 5, y: 2 };
  const harness = createHarness({
    enemies: [enemy],
    weapon: {
      id: 'test-pistol',
      attackMode: 'ranged',
      range: 6,
    },
    options: {
      directFireOnSingleTarget: false,
    },
  });

  harness.api.cycleTargetMode();

  assert.equal(harness.attacks.length, 0);
  assert.equal(harness.state.targeting.active, true);
  assert.equal(harness.state.targeting.cursorX, 5);
  assert.equal(harness.state.targeting.cursorY, 2);
  assert.equal(harness.state.turn, 0);
});

test('player-turn-controller keeps the target mode when the only target has corner cover despite direct fire being enabled', () => {
  const enemy = { id: 'covered-target', x: 5, y: 2 };
  const harness = createHarness({
    enemies: [enemy],
    weapon: {
      id: 'test-pistol',
      attackMode: 'ranged',
      range: 6,
    },
    options: {
      directFireOnSingleTarget: true,
    },
    previewCombatAttack: () => ({
      hitChance: 50,
      baseHitChance: 65,
      critChance: 0,
      coverPenalty: 15,
      coverGrade: 'partial',
      coverLabel: 'Teildeckung',
    }),
  });

  harness.api.cycleTargetMode();

  assert.equal(harness.attacks.length, 0);
  assert.equal(harness.state.targeting.active, true);
  assert.equal(harness.state.targeting.cursorX, 5);
  assert.equal(harness.state.targeting.cursorY, 2);
  assert.equal(harness.state.turn, 0);
});

test('player-turn-controller lets a very fast player act twice before a very slow enemy catches up', () => {
  const enemy = { id: 'slow-target', x: 9, y: 9, hp: 10, nextActionTime: 0, baseSpeed: 180, reaction: 1, statusEffects: [] };
  const state = {
    gameOver: false,
    view: 'game',
    pendingChoice: null,
    pendingStairChoice: null,
    modals: {
      startOpen: false,
      inventoryOpen: false,
      studioTopologyOpen: false,
      runStatsOpen: false,
      optionsOpen: false,
      savegamesOpen: false,
      helpOpen: false,
      highscoresOpen: false,
    },
    player: { x: 5, y: 5, hp: 10, baseSpeed: 80, nextActionTime: 0, reaction: 4, statusEffects: [] },
    turn: 0,
    timelineTime: 0,
  };
  const floorState = {
    grid: Array.from({ length: 12 }, () => Array(12).fill('.')),
    doors: [],
    showcases: [],
    enemies: [enemy],
  };
  let enemyTurns = 0;
  const scheduler = createActionScheduler({
    getState: () => state,
    getCurrentFloorState: () => floorState,
  });

  const api = createPlayerTurnController({
    WIDTH: 12,
    HEIGHT: 12,
    TILE: { WALL: '#' },
    DOOR_TYPE: { LOCKED: 'locked' },
    getState: () => state,
    getCurrentFloorState: () => floorState,
    getDoorAt: () => null,
    getShowcaseAt: () => null,
    openDoor: () => {},
    closeDoor: () => true,
    canPlayerOpenDoor: () => true,
    getDoorColorLabels: () => ({ adjective: 'gruene' }),
    manhattanDistance: (left, right) => Math.abs(left.x - right.x) + Math.abs(left.y - right.y),
    addMessage: () => {},
    attackEnemy: () => {},
    tryPickupLoot: () => false,
    tryUseStairs: () => false,
    detectNearbyTraps: () => {},
    maybeTriggerShowcaseAmbience: () => {},
    handleActorEnterTile: () => {},
    playStepSound: () => {},
    playLockedDoorSound: () => {},
    hasNearbyEnemy: () => false,
    takeEnemyTurn: () => { enemyTurns += 1; },
    canActorMove: () => true,
    hasLineOfSight: () => true,
    chebyshevDistance: (left, right) => Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y)),
    getCombatWeapon: () => null,
    ...scheduler,
    processActorStatusEffects: () => ({ dead: false }),
    processActorContinuousTraps: () => {},
    processActorSafeRegeneration: () => {},
    processConsumableBuffs: () => {},
    applyPlayerNutritionTurnCost: () => {},
    renderSelf: () => {},
  });

  api.handleWait();
  assert.equal(enemyTurns, 1);
  assert.equal(state.turn, 1);

  api.handleWait();
  assert.equal(enemyTurns, 1);
  assert.equal(state.turn, 2);

  api.handleWait();
  assert.equal(enemyTurns, 2);
  assert.equal(state.turn, 3);
});

test('player-turn-controller prunes expired death markers at end of turn', () => {
  const harness = createHarness();
  harness.floorState.recentDeaths = [
    { x: 4, y: 4, expiresAfterTurn: 0, markerAssetId: 'death-mark' },
    { x: 5, y: 4, expiresAfterTurn: 1, markerAssetId: 'death-mark' },
    { x: 6, y: 4, expiresAfterTurn: 3, markerAssetId: 'death-mark' },
  ];

  harness.api.handleWait();

  assert.deepEqual(harness.floorState.recentDeaths, [
    { x: 5, y: 4, expiresAfterTurn: 1, markerAssetId: 'death-mark' },
    { x: 6, y: 4, expiresAfterTurn: 3, markerAssetId: 'death-mark' },
  ]);
});

test('player-turn-controller charges door movement as 150 percent of the actors normal action cost', () => {
  const door = { x: 6, y: 5, isOpen: false, doorType: 'normal' };
  let openedByPlayer = false;
  const harness = createHarness({
    player: { x: 5, y: 5, baseSpeed: 80 },
    doors: [door],
    openDoor: (nextDoor) => {
      nextDoor.isOpen = true;
      openedByPlayer = true;
    },
  });

  harness.api.movePlayer(1, 0);

  assert.equal(openedByPlayer, true);
  assert.equal(door.isOpen, true);
  assert.equal(harness.state.player.x, 6);
  assert.equal(harness.state.player.y, 5);
  assert.deepEqual(harness.playerActionCosts, [150]);
  assert.equal(harness.state.player.nextActionTime, 120);
});

test('player-turn-controller processes off-floor actors without letting them target the player after a floor change', () => {
  const offFloorEnemy = {
    id: 'off-floor-raider',
    x: 2,
    y: 2,
    hp: 10,
    baseSpeed: 80,
    nextActionTime: 0,
    reaction: 2,
    statusEffects: [],
  };
  const currentFloorEnemy = {
    id: 'current-floor-guard',
    x: 8,
    y: 8,
    hp: 10,
    baseSpeed: 140,
    nextActionTime: 140,
    reaction: 1,
    statusEffects: [],
  };
  const state = {
    gameOver: false,
    view: 'game',
    floor: 2,
    pendingChoice: null,
    pendingStairChoice: null,
    modals: {
      startOpen: false,
      inventoryOpen: false,
      studioTopologyOpen: false,
      runStatsOpen: false,
      optionsOpen: false,
      savegamesOpen: false,
      helpOpen: false,
      highscoresOpen: false,
    },
    player: { x: 5, y: 5, hp: 10, baseSpeed: 100, nextActionTime: 0, reaction: 4, statusEffects: [] },
    turn: 0,
    timelineTime: 0,
    floors: {
      1: {
        grid: Array.from({ length: 12 }, () => Array(12).fill('.')),
        doors: [],
        showcases: [],
        enemies: [offFloorEnemy],
      },
      2: {
        grid: Array.from({ length: 12 }, () => Array(12).fill('.')),
        doors: [],
        showcases: [],
        enemies: [currentFloorEnemy],
      },
    },
  };
  const enemyTurns = [];
  const scheduler = createActionScheduler({
    getState: () => state,
    getCurrentFloorState: () => state.floors[state.floor],
  });

  const api = createPlayerTurnController({
    WIDTH: 12,
    HEIGHT: 12,
    TILE: { WALL: '#' },
    DOOR_TYPE: { LOCKED: 'locked' },
    getState: () => state,
    getCurrentFloorState: () => state.floors[state.floor],
    getDoorAt: () => null,
    getShowcaseAt: () => null,
    openDoor: () => {},
    closeDoor: () => true,
    canPlayerOpenDoor: () => true,
    getDoorColorLabels: () => ({ adjective: 'gruene' }),
    manhattanDistance: (left, right) => Math.abs(left.x - right.x) + Math.abs(left.y - right.y),
    addMessage: () => {},
    attackEnemy: () => {},
    tryPickupLoot: () => false,
    tryUseStairs: () => false,
    detectNearbyTraps: () => {},
    maybeTriggerShowcaseAmbience: () => {},
    handleActorEnterTile: () => {},
    playStepSound: () => {},
    playLockedDoorSound: () => {},
    hasNearbyEnemy: () => false,
    takeEnemyTurn: (enemy, options = {}) => {
      enemyTurns.push({
        enemyId: enemy.id,
        canTargetPlayer: options.canTargetPlayer,
      });
    },
    canActorMove: () => true,
    hasLineOfSight: () => true,
    chebyshevDistance: (left, right) => Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y)),
    getCombatWeapon: () => null,
    ...scheduler,
    processActorStatusEffects: () => ({ dead: false }),
    processActorContinuousTraps: () => {},
    processActorSafeRegeneration: () => {},
    processConsumableBuffs: () => {},
    applyPlayerNutritionTurnCost: () => {},
    renderSelf: () => {},
  });

  api.handleWait();

  assert.deepEqual(enemyTurns, [
    { enemyId: 'off-floor-raider', canTargetPlayer: false },
    { enemyId: 'off-floor-raider', canTargetPlayer: false },
  ]);
  assert.equal(state.turn, 1);
  assert.equal(state.player.nextActionTime, 100);
  assert.equal(offFloorEnemy.nextActionTime, 160);
  assert.equal(currentFloorEnemy.nextActionTime, 140);
});
