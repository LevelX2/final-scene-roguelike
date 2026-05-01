import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createInputController } from '../../src/application/input-controller.mjs';

function createKeyboardEvent({ key, code }) {
  return {
    key,
    code,
    preventDefaultCalled: false,
    preventDefault() {
      this.preventDefaultCalled = true;
    },
  };
}

function createControllerForState(state, overrides = {}) {
  const calls = [];
  const controller = createInputController({
    getState: () => state,
    addMessage: () => {},
    confirmRestartRun: () => {},
    resolveStairChoice: (action) => calls.push(['resolve-stair', action]),
    cycleStairChoice: (direction) => calls.push(['stair', direction]),
    resolvePotionChoice: (action) => calls.push(['resolve-choice', action]),
    cyclePotionChoice: (direction) => calls.push(['choice', direction]),
    toggleInventory: () => {},
    toggleStudioTopology: () => {},
    toggleRunStats: () => {},
    toggleOptions: () => {},
    toggleSavegames: () => {},
    toggleHelp: () => {},
    toggleHighscores: () => {},
    toggleDebugInfo: () => {},
    triggerDebugAdvance: () => {},
    closeStartModal: () => {},
    movePlayer: () => {},
    handleWait: () => {},
    debugRevealOrAdvanceStudio: () => {},
    debugReturnToPreviousStudio: () => {},
    tryCloseAdjacentDoor: () => {},
    quickUsePotion: () => {},
    closeContainerLoot: () => {},
    cycleContainerLootAction: (direction) => calls.push(['container-action', direction]),
    moveContainerLootFocus: (direction) => calls.push(['container-focus', direction]),
    confirmContainerLootFocus: () => calls.push(['confirm-container']),
    takeSelectedContainerLoot: () => calls.push(['take-selected']),
    takeAllContainerLoot: () => calls.push(['take-all']),
    cycleHealingOverlay: () => {},
    closeHealingOverlay: () => {},
    useSelectedHealingConsumable: () => calls.push(['use-healing']),
    cycleTargetMode: () => {},
    cancelTargetMode: () => {},
    moveTargetCursor: () => {},
    confirmTargetAttack: () => {},
    ...overrides,
  });

  return { controller, calls };
}

test('item choice modal accepts A/D and 4/6 for horizontal selection', () => {
  const state = {
    view: 'game',
    gameOver: false,
    floor: 1,
    floors: { 1: {} },
    pendingChoice: { selectedAction: 'use' },
    pendingStairChoice: null,
    pendingContainerLoot: null,
    healOverlay: { open: false },
    targeting: { active: false },
    modals: {},
  };
  const { controller, calls } = createControllerForState(state);

  for (const keyEvent of [
    { key: 'a', code: 'KeyA', direction: -1 },
    { key: 'd', code: 'KeyD', direction: 1 },
    { key: '4', code: 'Digit4', direction: -1 },
    { key: '6', code: 'Digit6', direction: 1 },
    { key: '4', code: 'Numpad4', direction: -1 },
    { key: '6', code: 'Numpad6', direction: 1 },
  ]) {
    const event = createKeyboardEvent(keyEvent);
    controller.handleInput(event);
    assert.equal(event.preventDefaultCalled, true);
    assert.deepEqual(calls.pop(), ['choice', keyEvent.direction]);
  }
});

test('stair choice modal accepts 4/6 in addition to arrows and A/D', () => {
  const state = {
    view: 'game',
    gameOver: false,
    floor: 1,
    floors: { 1: {} },
    pendingChoice: null,
    pendingStairChoice: { selectedAction: 'stay' },
    pendingContainerLoot: null,
    healOverlay: { open: false },
    targeting: { active: false },
    modals: {},
  };
  const { controller, calls } = createControllerForState(state);

  for (const keyEvent of [
    { key: '4', code: 'Digit4', direction: -1 },
    { key: '6', code: 'Digit6', direction: 1 },
    { key: '4', code: 'Numpad4', direction: -1 },
    { key: '6', code: 'Numpad6', direction: 1 },
  ]) {
    const event = createKeyboardEvent(keyEvent);
    controller.handleInput(event);
    assert.equal(event.preventDefaultCalled, true);
    assert.deepEqual(calls.pop(), ['stair', keyEvent.direction]);
  }
});

test('selection modals accept S and 5 as confirm keys', () => {
  const confirmKeys = [
    { key: 's', code: 'KeyS' },
    { key: '5', code: 'Digit5' },
    { key: '5', code: 'Numpad5' },
  ];

  for (const keyEvent of confirmKeys) {
    const state = {
      view: 'game',
      gameOver: false,
      floor: 1,
      floors: { 1: {} },
      pendingChoice: { selectedAction: 'store' },
      pendingStairChoice: null,
      pendingContainerLoot: null,
      healOverlay: { open: false },
      targeting: { active: false },
      modals: {},
    };
    const { controller, calls } = createControllerForState(state);
    const event = createKeyboardEvent(keyEvent);

    controller.handleInput(event);

    assert.equal(event.preventDefaultCalled, true);
    assert.deepEqual(calls, [['resolve-choice', 'store']]);
  }

  for (const keyEvent of confirmKeys) {
    const state = {
      view: 'game',
      gameOver: false,
      floor: 1,
      floors: { 1: {} },
      pendingChoice: null,
      pendingStairChoice: { selectedAction: 'change-floor' },
      pendingContainerLoot: null,
      healOverlay: { open: false },
      targeting: { active: false },
      modals: {},
    };
    const { controller, calls } = createControllerForState(state);
    const event = createKeyboardEvent(keyEvent);

    controller.handleInput(event);

    assert.equal(event.preventDefaultCalled, true);
    assert.deepEqual(calls, [['resolve-stair', 'change-floor']]);
  }
});

test('pending door action uses the next movement key as door direction', () => {
  const state = {
    view: 'game',
    gameOver: false,
    floor: 1,
    floors: { 1: {} },
    pendingChoice: null,
    pendingStairChoice: null,
    pendingContainerLoot: null,
    pendingDoorAction: { active: true, x: 5, y: 5 },
    healOverlay: { open: false },
    targeting: { active: false },
    modals: {},
  };
  const { controller, calls } = createControllerForState(state, {
    tryCloseAdjacentDoor: (dx, dy) => calls.push(['door-action', dx, dy]),
  });
  const event = createKeyboardEvent({ key: 'd', code: 'KeyD' });

  controller.handleInput(event);

  assert.equal(event.preventDefaultCalled, true);
  assert.deepEqual(calls, [['door-action', 1, 0]]);
});

test('pending door action can be cancelled with escape', () => {
  const state = {
    view: 'game',
    gameOver: false,
    floor: 1,
    floors: { 1: {} },
    pendingChoice: null,
    pendingStairChoice: null,
    pendingContainerLoot: null,
    pendingDoorAction: { active: true, x: 5, y: 5 },
    healOverlay: { open: false },
    targeting: { active: false },
    modals: {},
  };
  const { controller } = createControllerForState(state);
  const event = createKeyboardEvent({ key: 'Escape', code: 'Escape' });

  controller.handleInput(event);

  assert.equal(event.preventDefaultCalled, true);
  assert.equal(state.pendingDoorAction, null);
});

test('container and healing selections accept S and 5 as confirm keys', () => {
  for (const keyEvent of [
    { key: 's', code: 'KeyS' },
    { key: '5', code: 'Digit5' },
    { key: '5', code: 'Numpad5' },
  ]) {
    const containerState = {
      view: 'game',
      gameOver: false,
      floor: 1,
      floors: { 1: {} },
      pendingChoice: null,
      pendingStairChoice: null,
      pendingContainerLoot: { selectedItemIndices: [] },
      healOverlay: { open: false },
      targeting: { active: false },
      modals: {},
    };
    const containerSetup = createControllerForState(containerState);
    const containerEvent = createKeyboardEvent(keyEvent);

    containerSetup.controller.handleInput(containerEvent);

    assert.equal(containerEvent.preventDefaultCalled, true);
    assert.deepEqual(containerSetup.calls, [['confirm-container']]);

    const healingState = {
      view: 'game',
      gameOver: false,
      floor: 1,
      floors: { 1: {} },
      pendingChoice: null,
      pendingStairChoice: null,
      pendingContainerLoot: null,
      healOverlay: { open: true },
      targeting: { active: false },
      modals: {},
    };
    const healingSetup = createControllerForState(healingState);
    const healingEvent = createKeyboardEvent(keyEvent);

    healingSetup.controller.handleInput(healingEvent);

    assert.equal(healingEvent.preventDefaultCalled, true);
    assert.deepEqual(healingSetup.calls, [['use-healing']]);
  }
});

test('container loot modal accepts directional navigation across actions and items', () => {
  const state = {
    view: 'game',
    gameOver: false,
    floor: 1,
    floors: { 1: {} },
    pendingChoice: null,
    pendingStairChoice: null,
    pendingContainerLoot: {
      selectedItemIndices: [],
      selectedAction: 'all',
      focusArea: 'actions',
      focusedItemIndex: 0,
    },
    healOverlay: { open: false },
    targeting: { active: false },
    modals: {},
  };
  const { controller, calls } = createControllerForState(state);

  for (const keyEvent of [
    { key: 'a', code: 'KeyA', call: ['container-action', -1] },
    { key: 'd', code: 'KeyD', call: ['container-action', 1] },
    { key: '4', code: 'Digit4', call: ['container-action', -1] },
    { key: '6', code: 'Digit6', call: ['container-action', 1] },
    { key: 'w', code: 'KeyW', call: ['container-focus', -1] },
    { key: 'ArrowDown', code: 'ArrowDown', call: ['container-focus', 1] },
  ]) {
    const event = createKeyboardEvent(keyEvent);
    controller.handleInput(event);
    assert.equal(event.preventDefaultCalled, true);
    assert.deepEqual(calls.pop(), keyEvent.call);
  }
});
