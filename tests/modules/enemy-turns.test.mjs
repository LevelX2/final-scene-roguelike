import test from 'node:test';
import assert from 'node:assert/strict';
import { createEnemyTurnApi } from '../../src/ai/enemy-turns.mjs';

function createGrid(width, height, fill = '.') {
  return Array.from({ length: height }, () => Array(width).fill(fill));
}

function createMask(width, height, fill = false) {
  return Array.from({ length: height }, () => Array(width).fill(fill));
}

function createEnemyTurnHarness({ enemy, floorState, player }) {
  const state = {
    player,
    gameOver: false,
    safeRestTurns: 0,
  };
  const messages = [];
  let doorOpenSoundCount = 0;

  const api = createEnemyTurnApi({
    WIDTH: floorState.grid[0].length,
    HEIGHT: floorState.grid.length,
    TILE: { FLOOR: '.' },
    DOOR_TYPE: { LOCKED: 'locked' },
    getState: () => state,
    getCurrentFloorState: () => floorState,
    getDoorAt: (x, y, nextFloorState = floorState) =>
      nextFloorState?.doors?.find((door) => door.x === x && door.y === y) ?? null,
    getOffHand: () => null,
    resolveCombatAttack: () => ({ hit: false, dodged: false, blocked: false, damage: 0, defeated: false }),
    resolveBlock: () => false,
    hasLineOfSight: () => false,
    isStraightShot: () => false,
    canActorMove: () => true,
    tryApplyWeaponEffects: () => null,
    addMessage: (text, tone) => messages.push({ text, tone }),
    showFloatingText: () => {},
    createDeathCause: () => null,
    playPlayerHitSound: () => {},
    playDodgeSound: () => {},
    playDeathSound: () => {},
    playDoorOpenSound: () => { doorOpenSoundCount += 1; },
    saveHighscoreIfNeeded: () => {},
    showDeathModal: () => {},
    noteMonsterEncounter: () => {},
    handleActorEnterTile: () => {},
    manhattanDistance: (left, right) => Math.abs(left.x - right.x) + Math.abs(left.y - right.y),
    randomChance: () => 0.99,
  });

  return {
    api,
    state,
    messages,
    getDoorOpenSoundCount: () => doorOpenSoundCount,
  };
}

function createDoorOpeningScenario({ doorVisible = false, playerPosition = { x: 2, y: 2 } } = {}) {
  const enemy = {
    id: 'noir-jager',
    name: 'Noir-Jaeger',
    x: 15,
    y: 2,
    originX: 15,
    originY: 2,
    behavior: 'hunter',
    behaviorLabel: 'Jaeger',
    mobility: 'roaming',
    retreatProfile: 'none',
    healingProfile: 'none',
    temperament: 'stoic',
    aggro: true,
    aggroRadius: 8,
    canOpenDoors: true,
    canChangeFloors: false,
    hp: 10,
    maxHp: 10,
    strength: 2,
    precision: 3,
    reaction: 3,
    nerves: 2,
    intelligence: 2,
    idleTarget: null,
    idleTargetType: null,
    idlePlanAge: 0,
    recentRoomHistory: [],
    recentDoorHistory: [],
    recentMovePositions: [],
    recentAggroPositions: [],
    statusEffects: [],
    turnsSinceHit: 0,
    isRetreating: false,
    description: 'Nur fuer Tests.',
    temperamentHint: 'Nur fuer Tests.',
    special: 'Nur fuer Tests.',
    mainHand: null,
    offHand: null,
  };

  const floorState = {
    grid: createGrid(20, 5, '.'),
    enemies: [enemy],
    doors: [{ x: 14, y: 2, doorType: 'normal', isOpen: false }],
    rooms: [],
    showcases: [],
    visible: createMask(20, 5, false),
  };
  floorState.visible[2][14] = doorVisible;

  return {
    enemy,
    floorState,
    player: { ...playerPosition, hp: 20, maxHp: 20 },
  };
}

test('enemy idle movement avoids immediate two-tile ping-pong when target path is blocked', () => {
  const enemy = {
    id: 'noir-gangster-schuetze',
    name: 'Gangster-Schuetze',
    x: 3,
    y: 3,
    originX: 3,
    originY: 3,
    behavior: 'wanderer',
    behaviorLabel: 'Schuetze',
    mobility: 'roaming',
    retreatProfile: 'cowardly',
    healingProfile: 'slow',
    temperament: 'restless',
    aggro: false,
    aggroRadius: 1,
    canOpenDoors: true,
    canChangeFloors: false,
    hp: 10,
    maxHp: 10,
    strength: 2,
    precision: 3,
    reaction: 3,
    nerves: 2,
    intelligence: 2,
    idleTarget: { x: 3, y: 5 },
    idleTargetType: 'corridor',
    idlePlanAge: 0,
    recentRoomHistory: [],
    recentDoorHistory: [],
    recentMovePositions: [{ x: 4, y: 3 }, { x: 3, y: 3 }],
    recentAggroPositions: [],
    statusEffects: [],
    turnsSinceHit: 0,
    isRetreating: false,
    description: 'Nur fuer Tests.',
    temperamentHint: 'Nur fuer Tests.',
    special: 'Nur fuer Tests.',
    mainHand: null,
    offHand: null,
  };

  const grid = createGrid(7, 7, '#');
  grid[3][2] = '.';
  grid[3][3] = '.';
  grid[3][4] = '.';
  grid[5][3] = '.';
  const floorState = {
    grid,
    enemies: [enemy],
    doors: [],
    rooms: [],
    showcases: [],
  };

  const { api } = createEnemyTurnHarness({
    enemy,
    floorState,
    player: { x: 0, y: 0, hp: 20, maxHp: 20 },
  });

  api.moveEnemies();

  assert.equal(enemy.x, 2);
  assert.equal(enemy.y, 3);
});

test('enemy door opening logs when the doorway is visible or close enough to hear', () => {
  const hiddenScenario = createDoorOpeningScenario({
    doorVisible: false,
    playerPosition: { x: 0, y: 2 },
  });
  const hiddenHarness = createEnemyTurnHarness(hiddenScenario);

  hiddenHarness.api.moveEnemies();

  assert.equal(hiddenScenario.enemy.x, 14);
  assert.equal(hiddenScenario.floorState.doors[0].isOpen, true);
  assert.equal(hiddenHarness.messages.length, 0);
  assert.equal(hiddenHarness.getDoorOpenSoundCount(), 0);

  const nearbyScenario = createDoorOpeningScenario({
    doorVisible: false,
    playerPosition: { x: 5, y: 2 },
  });
  const nearbyHarness = createEnemyTurnHarness(nearbyScenario);

  nearbyHarness.api.moveEnemies();

  assert.equal(nearbyScenario.enemy.x, 14);
  assert.equal(nearbyScenario.floorState.doors[0].isOpen, true);
  assert.equal(
    nearbyHarness.messages.some((entry) => entry.text.includes('oeffnet eine Tuer.')),
    true,
  );
  assert.equal(nearbyHarness.getDoorOpenSoundCount(), 1);

  const visibleScenario = createDoorOpeningScenario({ doorVisible: true });
  const visibleHarness = createEnemyTurnHarness(visibleScenario);

  visibleHarness.api.moveEnemies();

  assert.equal(visibleScenario.enemy.x, 14);
  assert.equal(visibleScenario.floorState.doors[0].isOpen, true);
  assert.equal(
    visibleHarness.messages.some((entry) => entry.text.includes('oeffnet eine Tuer.')),
    true,
  );
  assert.equal(visibleHarness.getDoorOpenSoundCount(), 1);
});
