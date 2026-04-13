import test from 'node:test';
import assert from 'node:assert/strict';
import { createDoorService } from '../../src/application/door-service.mjs';

test('door-service consumes matching keys and closes unoccupied doors', () => {
  const state = {
    floor: 2,
    player: { x: 1, y: 1 },
    inventory: [{ type: 'key', keyColor: 'green', keyFloor: 2 }],
  };
  const floorState = {
    enemies: [],
    doors: [{ x: 2, y: 1, doorType: 'locked', isOpen: false, lockColor: 'green' }],
  };
  const messages = [];
  let opened = 0;
  let closed = 0;

  const api = createDoorService({
    DOOR_TYPE: { NORMAL: 'normal', LOCKED: 'locked' },
    getState: () => state,
    getCurrentFloorState: () => floorState,
    addMessage: (text) => messages.push(text),
    playDoorOpenSound: () => { opened += 1; },
    playDoorCloseSound: () => { closed += 1; },
  });

  assert.equal(api.openDoor(floorState.doors[0]), true);
  assert.equal(floorState.doors[0].isOpen, true);
  assert.equal(floorState.doors[0].doorType, 'normal');
  assert.equal(state.inventory.length, 0);
  assert.equal(opened, 1);

  state.player.x = 1;
  state.player.y = 1;
  assert.equal(api.closeDoor(floorState.doors[0]), true);
  assert.equal(floorState.doors[0].isOpen, false);
  assert.equal(closed, 1);
  assert.ok(messages.some((entry) => entry.includes('entriegelt')));
});
