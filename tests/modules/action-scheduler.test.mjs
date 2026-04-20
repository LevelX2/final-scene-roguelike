import test from 'node:test';
import assert from 'node:assert/strict';
import { createActionScheduler } from '../../src/application/action-scheduler.mjs';

function createActor(overrides = {}) {
  return {
    hp: 10,
    baseSpeed: 100,
    nextActionTime: 0,
    reaction: 3,
    statusEffects: [],
    ...overrides,
  };
}

function createHarness({
  player = {},
  enemies = [],
  otherFloors = {},
} = {}) {
  const state = {
    floor: 1,
    timelineTime: 0,
    player: createActor({
      type: 'player',
      name: 'Held',
      ...player,
    }),
    floors: {},
  };
  const floorState = {
    enemies: enemies.map((enemy, index) => createActor({
      type: 'monster',
      id: enemy.id ?? `enemy-${index}`,
      name: enemy.name ?? `Enemy ${index + 1}`,
      ...enemy,
    })),
  };
  state.floors[1] = floorState;
  for (const [floorNumber, floorConfig] of Object.entries(otherFloors)) {
    state.floors[floorNumber] = {
      enemies: (floorConfig.enemies ?? []).map((enemy, index) => createActor({
        type: 'monster',
        id: enemy.id ?? `floor-${floorNumber}-enemy-${index}`,
        name: enemy.name ?? `Enemy ${floorNumber}.${index + 1}`,
        ...enemy,
      })),
    };
  }

  const scheduler = createActionScheduler({
    getState: () => state,
    getCurrentFloorState: () => floorState,
  });

  return {
    state,
    floorState,
    scheduler,
  };
}

test('action-scheduler gives faster actors more turns over time', () => {
  const { scheduler, floorState } = createHarness({
    player: { baseSpeed: 80, reaction: 4 },
    enemies: [
      { id: 'normal', baseSpeed: 100, reaction: 3 },
      { id: 'slow', baseSpeed: 130, reaction: 3 },
    ],
  });

  const order = [];
  for (let index = 0; index < 9; index += 1) {
    const actor = scheduler.getNextScheduledActor();
    order.push(actor === floorState.enemies[0] ? 'normal' : actor === floorState.enemies[1] ? 'slow' : 'player');
    scheduler.beginActorTurn(actor);
    scheduler.scheduleActorNextTurn(actor);
  }

  assert.deepEqual(order, ['player', 'normal', 'slow', 'player', 'normal', 'slow', 'player', 'normal', 'player']);
});

test('action-scheduler breaks equal time ties with derived reaction', () => {
  const { scheduler, floorState } = createHarness({
    player: { nextActionTime: 40, reaction: 3 },
    enemies: [{ id: 'quick-react', nextActionTime: 40, reaction: 5 }],
  });

  assert.equal(scheduler.getNextScheduledActor(), floorState.enemies[0]);
});

test('action-scheduler prefers the player on exact ties after reaction', () => {
  const { scheduler, state } = createHarness({
    player: { nextActionTime: 60, reaction: 4 },
    enemies: [{ id: 'mirror', nextActionTime: 60, reaction: 4 }],
  });

  assert.equal(scheduler.getNextScheduledActor(), state.player);
});

test('action-scheduler keeps 100 as the neutral tempo between fast and slow actors', () => {
  const { scheduler, floorState } = createHarness({
    enemies: [
      { id: 'fast', baseSpeed: 85, reaction: 4 },
      { id: 'normal', baseSpeed: 100, reaction: 4 },
      { id: 'slow', baseSpeed: 125, reaction: 4 },
    ],
  });

  assert.equal(scheduler.getActorActionDelay(floorState.enemies[0]), 85);
  assert.equal(scheduler.getActorActionDelay(floorState.enemies[1]), 100);
  assert.equal(scheduler.getActorActionDelay(floorState.enemies[2]), 125);
});

test('action-scheduler includes enemies from other existing floors in the global turn order', () => {
  const { scheduler, state } = createHarness({
    player: { nextActionTime: 120, reaction: 4 },
    enemies: [{ id: 'current-floor', nextActionTime: 90, reaction: 3 }],
    otherFloors: {
      2: {
        enemies: [{ id: 'off-floor', nextActionTime: 40, reaction: 2 }],
      },
    },
  });

  const nextActor = scheduler.getNextScheduledActor();
  const context = scheduler.getActorFloorContext(nextActor);

  assert.equal(nextActor.id, 'off-floor');
  assert.equal(context.floorNumber, 2);
  assert.equal(context.floorState, state.floors[2]);
});
