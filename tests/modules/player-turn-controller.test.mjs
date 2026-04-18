import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlayerTurnController } from '../../src/application/player-turn-controller.mjs';

function createHarness({
  player = { x: 5, y: 5 },
  grid = Array.from({ length: 12 }, () => Array(12).fill('.')),
  doors = [],
  showcases = [],
  enemies = [],
} = {}) {
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
    player: { ...player },
    turn: 0,
  };
  const floorState = {
    grid,
    doors,
    showcases,
    enemies,
  };
  const messages = [];
  const attacks = [];

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
    openDoor: () => {},
    closeDoor: () => true,
    canPlayerOpenDoor: () => true,
    getDoorColorLabels: () => ({ adjective: 'gruene' }),
    manhattanDistance: (left, right) => Math.abs(left.x - right.x) + Math.abs(left.y - right.y),
    addMessage: (text) => messages.push(text),
    attackEnemy: (enemy) => attacks.push(enemy),
    tryPickupLoot: () => false,
    tryUseStairs: () => false,
    detectNearbyTraps: () => {},
    maybeTriggerShowcaseAmbience: () => {},
    handleActorEnterTile: () => {},
    playStepSound: () => {},
    playLockedDoorSound: () => {},
    hasNearbyEnemy: () => false,
    moveEnemies: () => {},
    canActorMove: () => true,
    hasLineOfSight: () => true,
    isStraightShot: () => true,
    getCombatWeapon: () => null,
    processRoundStatusEffects: () => {},
    processContinuousTraps: () => {},
    processSafeRegeneration: () => {},
    applyPlayerNutritionTurnCost: () => {},
    renderSelf: () => {},
  });

  return {
    api,
    state,
    messages,
    attacks,
  };
}

test('player-turn-controller blocks diagonal movement through a double-blocked corner', () => {
  const grid = Array.from({ length: 12 }, () => Array(12).fill('.'));
  grid[5][6] = '#';
  grid[6][5] = '#';
  const harness = createHarness({ grid });

  harness.api.movePlayer(1, 1);

  assert.deepEqual(harness.state.player, { x: 5, y: 5 });
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
  assert.equal(harness.attacks[0], enemy);
  assert.deepEqual(harness.state.player, { x: 5, y: 5 });
  assert.equal(harness.state.turn, 1);
});

test('player-turn-controller does not open closed doors diagonally', () => {
  const harness = createHarness({
    doors: [{ x: 6, y: 6, isOpen: false, doorType: 'normal' }],
  });

  harness.api.movePlayer(1, 1);

  assert.deepEqual(harness.state.player, { x: 5, y: 5 });
  assert.equal(
    harness.messages.some((entry) => entry.includes('nicht diagonal aufdrücken')),
    true,
  );
  assert.equal(harness.state.turn, 0);
});
