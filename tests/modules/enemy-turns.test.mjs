import test from 'node:test';
import assert from 'node:assert/strict';
import { createEnemyTurnApi } from '../../src/ai/enemy-turns.mjs';

function createGrid(width, height, fill = '.') {
  return Array.from({ length: height }, () => Array(width).fill(fill));
}

function createMask(width, height, fill = false) {
  return Array.from({ length: height }, () => Array(width).fill(fill));
}

function createEnemyTurnHarness({ enemy, floorState, player, randomChance = () => 0.99 }) {
  const state = {
    player,
    gameOver: false,
    safeRestTurns: 0,
  };
  const messages = [];
  const floatingTexts = [];
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
    showFloatingText: (x, y, text, kind, options = {}) => {
      floatingTexts.push({ x, y, text, kind, options });
    },
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
    randomChance,
  });

  return {
    api,
    state,
    messages,
    floatingTexts,
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

function createRetreatScenario({
  retreatProfile,
  intelligence,
  hp,
  maxHp = 10,
  playerHp = 20,
  playerMaxHp = 20,
  strength = 2,
  mainHand = null,
  enemyPosition = { x: 4, y: 2 },
  playerPosition = { x: 2, y: 2 },
  isRetreating = false,
}) {
  const enemy = {
    id: `retreat-${retreatProfile}`,
    name: 'Retreat Test',
    x: enemyPosition.x,
    y: enemyPosition.y,
    originX: enemyPosition.x,
    originY: enemyPosition.y,
    behavior: 'hunter',
    behaviorLabel: 'Test',
    mobility: 'roaming',
    retreatProfile,
    healingProfile: 'none',
    temperament: 'stoic',
    aggro: true,
    aggroRadius: 6,
    canOpenDoors: false,
    canChangeFloors: false,
    hp,
    maxHp,
    strength,
    precision: 3,
    reaction: 3,
    nerves: 2,
    intelligence,
    idleTarget: null,
    idleTargetType: null,
    idlePlanAge: 0,
    recentRoomHistory: [],
    recentDoorHistory: [],
    recentMovePositions: [],
    recentAggroPositions: [],
    patrolRoute: [],
    patrolRouteIndex: 0,
    statusEffects: [],
    turnsSinceHit: 0,
    isRetreating,
    description: 'Nur fuer Tests.',
    temperamentHint: 'Nur fuer Tests.',
    special: 'Nur fuer Tests.',
    mainHand,
    offHand: null,
  };

  const grid = createGrid(8, 5, '#');
  for (let x = 1; x <= 6; x += 1) {
    grid[2][x] = '.';
  }

  const floorState = {
    grid,
    enemies: [enemy],
    doors: [],
    rooms: [],
    showcases: [],
    visible: createMask(8, 5, false),
  };

  return {
    enemy,
    floorState,
    player: { x: playerPosition.x, y: playerPosition.y, hp: playerHp, maxHp: playerMaxHp },
  };
}

function createBaseEnemy(overrides = {}) {
  return {
    id: 'test-enemy',
    name: 'Test Enemy',
    x: 1,
    y: 1,
    originX: 1,
    originY: 1,
    behavior: 'wanderer',
    behaviorLabel: 'Test',
    mobility: 'roaming',
    retreatProfile: 'none',
    healingProfile: 'none',
    temperament: 'patrol',
    aggro: false,
    aggroRadius: 1,
    canOpenDoors: false,
    canChangeFloors: false,
    hp: 12,
    maxHp: 12,
    strength: 2,
    precision: 2,
    reaction: 2,
    nerves: 2,
    intelligence: 2,
    idleTarget: null,
    idleTargetType: null,
    idlePlanAge: 0,
    recentRoomHistory: [],
    recentDoorHistory: [],
    recentMovePositions: [],
    recentAggroPositions: [],
    patrolRoute: [],
    patrolRouteIndex: 0,
    patrolBlockedTurns: 0,
    statusEffects: [],
    turnsSinceHit: 0,
    isRetreating: false,
    description: 'Nur fuer Tests.',
    temperamentHint: 'Nur fuer Tests.',
    special: 'Nur fuer Tests.',
    mainHand: null,
    offHand: null,
    ...overrides,
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

test('cowardly enemies can retreat even with minimal intelligence', () => {
  const scenario = createRetreatScenario({
    retreatProfile: 'cowardly',
    intelligence: 1,
    hp: 5,
    maxHp: 10,
    playerHp: 20,
    playerMaxHp: 20,
  });

  const { api } = createEnemyTurnHarness(scenario);

  api.moveEnemies();

  assert.equal(scenario.enemy.isRetreating, true);
  assert.equal(scenario.enemy.x, 5);
  assert.equal(scenario.enemy.y, 2);
});

test('cowardly enemies can keep retreating from a slightly longer distance once disengaging', () => {
  const scenario = createRetreatScenario({
    retreatProfile: 'cowardly',
    intelligence: 1,
    hp: 4,
    maxHp: 10,
    playerHp: 20,
    playerMaxHp: 20,
    enemyPosition: { x: 5, y: 2 },
    playerPosition: { x: 1, y: 2 },
    isRetreating: true,
  });

  const { api } = createEnemyTurnHarness(scenario);

  api.moveEnemies();

  assert.equal(scenario.enemy.isRetreating, true);
  assert.equal(scenario.enemy.x, 6);
  assert.equal(scenario.enemy.y, 2);
});

test('cowardly kultist profile does not retreat above six of eleven hp', () => {
  const enemy = createBaseEnemy({
    id: 'slasher-kultist-threshold-test',
    name: 'Kultist',
    x: 4,
    y: 2,
    originX: 4,
    originY: 2,
    behavior: 'trickster',
    mobility: 'roaming',
    retreatProfile: 'cowardly',
    healingProfile: 'lurking',
    aggro: true,
    aggroRadius: 5,
    hp: 7,
    maxHp: 11,
    strength: 1,
    precision: 4,
    reaction: 4,
    nerves: 2,
    intelligence: 5,
  });

  const grid = createGrid(8, 5, '#');
  for (let x = 1; x <= 6; x += 1) {
    grid[2][x] = '.';
  }

  const floorState = {
    grid,
    enemies: [enemy],
    doors: [],
    rooms: [],
    showcases: [],
    visible: createMask(8, 5, false),
  };

  const { api } = createEnemyTurnHarness({
    enemy,
    floorState,
    player: { x: 2, y: 2, hp: 20, maxHp: 20 },
  });

  api.moveEnemies();

  assert.equal(enemy.isRetreating, false);
  assert.equal(enemy.x, 3);
  assert.equal(enemy.y, 2);
});

test('roaming lurking enemies can drop aggro at long range and resume healing', () => {
  const enemy = createBaseEnemy({
    id: 'slasher-kultist-test',
    name: 'Kultist',
    x: 2,
    y: 2,
    originX: 2,
    originY: 2,
    behavior: 'trickster',
    mobility: 'roaming',
    retreatProfile: 'cowardly',
    healingProfile: 'lurking',
    aggro: true,
    aggroRadius: 5,
    hp: 3,
    maxHp: 11,
    intelligence: 5,
    turnsSinceHit: 2,
  });

  const grid = createGrid(24, 6, '#');
  for (let y = 1; y <= 4; y += 1) {
    for (let x = 1; x <= 22; x += 1) {
      grid[y][x] = '.';
    }
  }

  const floorState = {
    grid,
    enemies: [enemy],
    doors: [],
    rooms: [{ id: 'long-hall', x: 1, y: 1, width: 22, height: 4 }],
    showcases: [],
    visible: createMask(24, 6, false),
  };

  const { api } = createEnemyTurnHarness({
    enemy,
    floorState,
    player: { x: 20, y: 2, hp: 20, maxHp: 20 },
    randomChance: () => 0.99,
  });

  api.moveEnemies();
  assert.equal(enemy.aggro, false);
  assert.equal(enemy.hp, 3);

  api.moveEnemies();
  assert.equal(enemy.hp, 4);
});

test('cautious enemies begin retreating before dropping to critical slivers', () => {
  const scenario = createRetreatScenario({
    retreatProfile: 'cautious',
    intelligence: 3,
    hp: 4,
    maxHp: 10,
    playerHp: 18,
    playerMaxHp: 20,
  });

  const { api } = createEnemyTurnHarness(scenario);

  api.moveEnemies();

  assert.equal(scenario.enemy.isRetreating, true);
  assert.equal(scenario.enemy.x, 5);
  assert.equal(scenario.enemy.y, 2);
});

test('enemies keep pressing when they can plausibly finish the player in two hits', () => {
  const scenario = createRetreatScenario({
    retreatProfile: 'cowardly',
    intelligence: 2,
    hp: 4,
    maxHp: 10,
    playerHp: 6,
    playerMaxHp: 20,
    strength: 2,
    mainHand: { damage: 1, attackMode: 'melee' },
  });

  const { api } = createEnemyTurnHarness(scenario);

  api.moveEnemies();

  assert.equal(scenario.enemy.isRetreating, false);
  assert.equal(scenario.enemy.x, 3);
  assert.equal(scenario.enemy.y, 2);
});

test('retreat movement avoids immediate left-right ping-pong when two escape steps are equally viable', () => {
  const enemy = createBaseEnemy({
    id: 'retreat-ping-pong',
    x: 3,
    y: 3,
    originX: 3,
    originY: 3,
    behavior: 'hunter',
    mobility: 'roaming',
    retreatProfile: 'cowardly',
    temperament: 'erratic',
    aggro: true,
    hp: 3,
    maxHp: 10,
    intelligence: 1,
    recentMovePositions: [{ x: 2, y: 3 }, { x: 3, y: 3 }],
  });

  const grid = createGrid(7, 7, '#');
  grid[3][2] = '.';
  grid[3][3] = '.';
  grid[3][4] = '.';
  grid[4][3] = '.';

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
    player: { x: 3, y: 2, hp: 20, maxHp: 20 },
    randomChance: () => 0.1,
  });

  api.moveEnemies();

  assert.notDeepEqual({ x: enemy.x, y: enemy.y }, { x: 2, y: 3 });
});

test('roaming idle movement picks a real reachable waypoint in open space', () => {
  const enemy = {
    id: 'creature-feature-bio-experiment',
    name: 'Bio-Experiment',
    x: 2,
    y: 2,
    originX: 2,
    originY: 2,
    behavior: 'trickster',
    behaviorLabel: 'Experiment',
    mobility: 'roaming',
    retreatProfile: 'none',
    healingProfile: 'lurking',
    temperament: 'erratic',
    aggro: false,
    aggroRadius: 1,
    canOpenDoors: false,
    canChangeFloors: false,
    hp: 12,
    maxHp: 12,
    strength: 2,
    precision: 3,
    reaction: 3,
    nerves: 2,
    intelligence: 3,
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

  const grid = createGrid(12, 12, '#');
  for (let y = 1; y <= 10; y += 1) {
    for (let x = 1; x <= 10; x += 1) {
      grid[y][x] = '.';
    }
  }

  const floorState = {
    grid,
    enemies: [enemy],
    doors: [],
    rooms: [{ id: 'lab-room', x: 1, y: 1, width: 10, height: 10 }],
    showcases: [],
  };

  const { api } = createEnemyTurnHarness({
    enemy,
    floorState,
    player: { x: 11, y: 11, hp: 20, maxHp: 20 },
    randomChance: () => 0.5,
  });

  api.moveEnemies();

  assert.equal(enemy.idleTargetType, 'waypoint');
  assert.ok(enemy.idleTarget);
  assert.ok(Math.abs(enemy.idleTarget.x - enemy.originX) + Math.abs(enemy.idleTarget.y - enemy.originY) >= 4);
});

test('dormant patrol guards can generate and follow a small patrol route', () => {
  const enemy = {
    id: 'fantasy-skelettwaechter',
    name: 'Skelettwaechter',
    x: 3,
    y: 3,
    originX: 3,
    originY: 3,
    behavior: 'dormant',
    behaviorLabel: 'Waechter',
    mobility: 'local',
    retreatProfile: 'none',
    healingProfile: 'none',
    temperament: 'patrol',
    aggro: false,
    aggroRadius: 1,
    canOpenDoors: false,
    canChangeFloors: false,
    hp: 12,
    maxHp: 12,
    strength: 2,
    precision: 2,
    reaction: 2,
    nerves: 2,
    intelligence: 2,
    idleTarget: null,
    idleTargetType: null,
    idlePlanAge: 0,
    recentRoomHistory: [],
    recentDoorHistory: [],
    recentMovePositions: [],
    recentAggroPositions: [],
    patrolRoute: [],
    patrolRouteIndex: 0,
    statusEffects: [],
    turnsSinceHit: 0,
    isRetreating: false,
    description: 'Nur fuer Tests.',
    temperamentHint: 'Nur fuer Tests.',
    special: 'Nur fuer Tests.',
    mainHand: null,
    offHand: null,
  };

  const grid = createGrid(10, 10, '#');
  for (let y = 2; y <= 7; y += 1) {
    for (let x = 2; x <= 7; x += 1) {
      grid[y][x] = '.';
    }
  }

  const floorState = {
    grid,
    enemies: [enemy],
    doors: [],
    rooms: [{ id: 'guard-room', x: 2, y: 2, width: 6, height: 6 }],
    showcases: [],
  };

  const { api } = createEnemyTurnHarness({
    enemy,
    floorState,
    player: { x: 0, y: 0, hp: 20, maxHp: 20 },
    randomChance: () => 0.1,
  });

  api.moveEnemies();

  assert.equal(enemy.idleTargetType, 'patrol');
  assert.ok(Array.isArray(enemy.patrolRoute));
  assert.ok(enemy.patrolRoute.length >= 2);
  assert.notDeepEqual(
    enemy.patrolRoute.map((entry) => `${entry.x},${entry.y}`),
    [],
  );
  assert.equal(enemy.x === enemy.originX && enemy.y === enemy.originY, false);
});

test('patrol enemies can temporarily step aside when another patrol blocks the corridor', () => {
  const blockingEnemy = {
    id: 'social-drama-klinikordner',
    name: 'Klinikordner',
    x: 4,
    y: 2,
    originX: 4,
    originY: 2,
    behavior: 'dormant',
    behaviorLabel: 'Ordner',
    mobility: 'local',
    retreatProfile: 'none',
    healingProfile: 'slow',
    temperament: 'patrol',
    aggro: false,
    aggroRadius: 1,
    canOpenDoors: false,
    canChangeFloors: false,
    hp: 12,
    maxHp: 12,
    strength: 2,
    precision: 2,
    reaction: 2,
    nerves: 2,
    intelligence: 2,
    idleTarget: { x: 2, y: 2 },
    idleTargetType: 'patrol',
    idlePlanAge: 0,
    recentRoomHistory: [],
    recentDoorHistory: [],
    recentMovePositions: [],
    recentAggroPositions: [],
    patrolRoute: [{ x: 2, y: 2 }, { x: 4, y: 2 }],
    patrolRouteIndex: 0,
    patrolBlockedTurns: 0,
    statusEffects: [],
    turnsSinceHit: 0,
    isRetreating: false,
    description: 'Nur fuer Tests.',
    temperamentHint: 'Nur fuer Tests.',
    special: 'Nur fuer Tests.',
    mainHand: null,
    offHand: null,
  };

  const enemy = {
    id: 'social-drama-fanatischer-hausmeister',
    name: 'Fanatischer Hausmeister',
    x: 3,
    y: 2,
    originX: 3,
    originY: 2,
    behavior: 'dormant',
    behaviorLabel: 'Hausmeister',
    mobility: 'local',
    retreatProfile: 'none',
    healingProfile: 'slow',
    temperament: 'patrol',
    aggro: false,
    aggroRadius: 1,
    canOpenDoors: false,
    canChangeFloors: false,
    hp: 12,
    maxHp: 12,
    strength: 2,
    precision: 2,
    reaction: 2,
    nerves: 2,
    intelligence: 2,
    idleTarget: { x: 5, y: 2 },
    idleTargetType: 'patrol',
    idlePlanAge: 0,
    recentRoomHistory: [],
    recentDoorHistory: [],
    recentMovePositions: [],
    recentAggroPositions: [],
    patrolRoute: [{ x: 5, y: 2 }, { x: 3, y: 2 }],
    patrolRouteIndex: 0,
    patrolBlockedTurns: 0,
    statusEffects: [],
    turnsSinceHit: 0,
    isRetreating: false,
    description: 'Nur fuer Tests.',
    temperamentHint: 'Nur fuer Tests.',
    special: 'Nur fuer Tests.',
    mainHand: null,
    offHand: null,
  };

  const grid = createGrid(8, 6, '#');
  grid[2][2] = '.';
  grid[2][3] = '.';
  grid[2][4] = '.';
  grid[2][5] = '.';
  grid[1][3] = '.';
  grid[1][4] = '.';

  const floorState = {
    grid,
    enemies: [enemy, blockingEnemy],
    doors: [],
    rooms: [{ id: 'corridor-room', x: 2, y: 1, width: 4, height: 2 }],
    showcases: [],
  };

  const { api } = createEnemyTurnHarness({
    enemy,
    floorState,
    player: { x: 0, y: 0, hp: 20, maxHp: 20 },
    randomChance: () => 0.1,
  });

  api.moveEnemies();

  assert.equal(enemy.x, 4);
  assert.equal(enemy.y, 1);
  assert.notEqual(enemy.y, 2);
});

test('patrol enemies can resolve opposite traffic in a one-tile corridor by using a side pocket', () => {
  const leftEnemy = createBaseEnemy({
    id: 'left-patrol',
    x: 3,
    y: 2,
    originX: 3,
    originY: 2,
    behavior: 'dormant',
    mobility: 'local',
    idleTarget: { x: 5, y: 2 },
    idleTargetType: 'patrol',
    patrolRoute: [{ x: 5, y: 2 }, { x: 3, y: 2 }],
  });
  const rightEnemy = createBaseEnemy({
    id: 'right-patrol',
    x: 5,
    y: 2,
    originX: 5,
    originY: 2,
    behavior: 'dormant',
    mobility: 'local',
    idleTarget: { x: 3, y: 2 },
    idleTargetType: 'patrol',
    patrolRoute: [{ x: 3, y: 2 }, { x: 5, y: 2 }],
  });

  const grid = createGrid(9, 6, '#');
  grid[2][3] = '.';
  grid[2][4] = '.';
  grid[2][5] = '.';
  grid[1][4] = '.';

  const floorState = {
    grid,
    enemies: [leftEnemy, rightEnemy],
    doors: [],
    rooms: [{ id: 'traffic-room', x: 3, y: 1, width: 3, height: 2 }],
    showcases: [],
  };

  const { api } = createEnemyTurnHarness({
    enemy: leftEnemy,
    floorState,
    player: { x: 0, y: 0, hp: 20, maxHp: 20 },
    randomChance: () => 0.1,
  });

  api.moveEnemies();

  assert.equal(leftEnemy.x, 4);
  assert.equal(leftEnemy.y, 1);
  assert.ok(
    leftEnemy.idleTargetType === null || leftEnemy.idleTargetType === 'patrol-bypass',
  );
});

test('patrol enemies prefer to clear a T-junction instead of clogging the stem', () => {
  const junctionGuard = createBaseEnemy({
    id: 'junction-guard',
    x: 4,
    y: 3,
    originX: 4,
    originY: 3,
    behavior: 'dormant',
    mobility: 'local',
    idleTarget: { x: 4, y: 1 },
    idleTargetType: 'patrol',
    patrolRoute: [{ x: 4, y: 1 }, { x: 4, y: 3 }],
  });
  const blockingGuard = createBaseEnemy({
    id: 'blocking-guard',
    x: 4,
    y: 2,
    originX: 4,
    originY: 2,
    behavior: 'dormant',
    mobility: 'local',
    idleTarget: { x: 4, y: 4 },
    idleTargetType: 'patrol',
    patrolRoute: [{ x: 4, y: 4 }, { x: 4, y: 2 }],
  });

  const grid = createGrid(9, 7, '#');
  grid[1][4] = '.';
  grid[2][4] = '.';
  grid[3][3] = '.';
  grid[3][4] = '.';
  grid[3][5] = '.';
  grid[4][4] = '.';

  const floorState = {
    grid,
    enemies: [junctionGuard, blockingGuard],
    doors: [],
    rooms: [{ id: 'junction-room', x: 3, y: 1, width: 3, height: 4 }],
    showcases: [],
  };

  const { api } = createEnemyTurnHarness({
    enemy: junctionGuard,
    floorState,
    player: { x: 0, y: 0, hp: 20, maxHp: 20 },
    randomChance: () => 0.1,
  });

  api.moveEnemies();

  assert.equal(junctionGuard.y, 3);
  assert.ok(junctionGuard.x === 3 || junctionGuard.x === 5);
});

test('roaming enemies can still progress when a patrol guard occupies the direct tile ahead', () => {
  const roamingEnemy = createBaseEnemy({
    id: 'roaming-worker',
    x: 3,
    y: 2,
    originX: 3,
    originY: 2,
    behavior: 'wanderer',
    mobility: 'roaming',
    temperament: 'restless',
    idleTarget: { x: 6, y: 2 },
    idleTargetType: 'waypoint',
  });
  const patrolGuard = createBaseEnemy({
    id: 'patrol-guard',
    x: 4,
    y: 2,
    originX: 4,
    originY: 2,
    behavior: 'dormant',
    mobility: 'local',
    idleTarget: { x: 2, y: 2 },
    idleTargetType: 'patrol',
    patrolRoute: [{ x: 2, y: 2 }, { x: 4, y: 2 }],
  });

  const grid = createGrid(10, 6, '#');
  grid[2][3] = '.';
  grid[2][4] = '.';
  grid[2][5] = '.';
  grid[2][6] = '.';
  grid[1][3] = '.';
  grid[1][4] = '.';
  grid[1][5] = '.';

  const floorState = {
    grid,
    enemies: [roamingEnemy, patrolGuard],
    doors: [],
    rooms: [{ id: 'mixed-room', x: 3, y: 1, width: 4, height: 2 }],
    showcases: [],
  };

  const { api } = createEnemyTurnHarness({
    enemy: roamingEnemy,
    floorState,
    player: { x: 0, y: 0, hp: 20, maxHp: 20 },
    randomChance: () => 0.1,
  });

  api.moveEnemies();

  assert.ok(
    (roamingEnemy.x === 3 && roamingEnemy.y === 1) ||
    (roamingEnemy.x === 4 && roamingEnemy.y === 1) ||
    (roamingEnemy.x === 5 && roamingEnemy.y === 1),
  );
});

test('patrol enemies without any bypass pocket do not phase through each other', () => {
  const enemy = createBaseEnemy({
    id: 'blocked-patrol',
    x: 3,
    y: 2,
    originX: 3,
    originY: 2,
    behavior: 'dormant',
    mobility: 'local',
    idleTarget: { x: 5, y: 2 },
    idleTargetType: 'patrol',
    patrolRoute: [{ x: 5, y: 2 }, { x: 3, y: 2 }],
  });
  const blocker = createBaseEnemy({
    id: 'hard-blocker',
    x: 4,
    y: 2,
    originX: 4,
    originY: 2,
    behavior: 'dormant',
    mobility: 'local',
    idleTarget: { x: 2, y: 2 },
    idleTargetType: 'patrol',
    patrolRoute: [{ x: 2, y: 2 }, { x: 4, y: 2 }],
  });

  const grid = createGrid(8, 5, '#');
  grid[2][3] = '.';
  grid[2][4] = '.';
  grid[2][5] = '.';

  const floorState = {
    grid,
    enemies: [enemy, blocker],
    doors: [],
    rooms: [{ id: 'tight-corridor', x: 3, y: 2, width: 3, height: 1 }],
    showcases: [],
  };

  const { api } = createEnemyTurnHarness({
    enemy,
    floorState,
    player: { x: 0, y: 0, hp: 20, maxHp: 20 },
    randomChance: () => 0.1,
  });

  api.moveEnemies();

  assert.equal(enemy.x, 3);
  assert.equal(enemy.y, 2);
  assert.equal(blocker.x, 5);
  assert.equal(blocker.y, 2);
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
  assert.equal(hiddenHarness.floatingTexts.length, 0);
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
    nearbyHarness.messages.some((entry) => entry.text.includes('aufgehenden Tuer.')),
    true,
  );
  assert.deepEqual(nearbyHarness.floatingTexts, [{
    x: 5,
    y: 2,
    text: 'Du hoerst eine Tuer aufgehen.',
    kind: 'sense',
    options: {
      title: 'Hinter der Kulisse',
      duration: 1500,
    },
  }]);
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
  assert.equal(visibleHarness.floatingTexts.length, 0);
  assert.equal(visibleHarness.getDoorOpenSoundCount(), 1);
});
