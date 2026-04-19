import test from 'node:test';
import assert from 'node:assert/strict';
import { createModalController } from '../../src/application/modal-controller.mjs';

function createClassList() {
  const classes = new Set();
  return {
    add: (value) => classes.add(value),
    remove: (value) => classes.delete(value),
    toggle: (value, force) => {
      if (force === undefined) {
        if (classes.has(value)) {
          classes.delete(value);
          return false;
        }
        classes.add(value);
        return true;
      }
      if (force) {
        classes.add(value);
        return true;
      }
      classes.delete(value);
      return false;
    },
    contains: (value) => classes.has(value),
  };
}

function createElement() {
  return {
    classList: createClassList(),
    setAttribute: () => {},
    querySelector: () => ({ textContent: '' }),
    textContent: '',
    innerHTML: '',
    value: '',
  };
}

test('modal-controller charges floor transitions as 150 percent movement actions', () => {
  const state = {
    floor: 1,
    pendingStairChoice: {
      direction: 1,
      selectedAction: 'change-floor',
    },
    pendingChoice: null,
    modals: {
      inventoryOpen: false,
      studioTopologyOpen: false,
      runStatsOpen: false,
      debugInfoOpen: false,
      optionsOpen: false,
      savegamesOpen: false,
      helpOpen: false,
      highscoresOpen: false,
    },
  };
  const endTurnCalls = [];
  let movedFloor = 1;

  const controller = createModalController({
    CHOICE_ACTIONS: {},
    STAIR_ACTIONS: ['change-floor', 'stay'],
    getState: () => state,
    createSheetRow: () => '',
    updateSavegameControls: () => {},
    getCurrentFloorState: () => ({ debugReveal: false }),
    returnToStartScreen: () => {},
    renderSelf: () => {},
    addMessage: () => {},
    moveToFloor: (direction) => {
      movedFloor += direction;
      state.floor = movedFloor;
      return true;
    },
    endTurn: (config) => endTurnCalls.push(config),
    resolvePotionChoice: () => {},
    renderEquipmentCompareHtml: () => '',
    choiceModalElement: createElement(),
    choiceTitleElement: createElement(),
    choiceTextElement: createElement(),
    choiceDrinkButton: createElement(),
    choiceStoreButton: createElement(),
    choiceLeaveButton: createElement(),
    containerLootModalElement: createElement(),
    containerLootImageElement: createElement(),
    containerLootTitleElement: createElement(),
    containerLootSummaryElement: createElement(),
    containerLootListElement: createElement(),
    containerLootTakeSelectedButton: createElement(),
    containerLootTakeAllButton: createElement(),
    stairsModalElement: createElement(),
    stairsTitleElement: createElement(),
    stairsTextElement: createElement(),
    stairsConfirmButton: createElement(),
    stairsStayButton: createElement(),
    deathModalElement: createElement(),
    deathSummaryElement: createElement(),
    debugInfoModalElement: createElement(),
    debugInfoTextElement: createElement(),
    debugInfoStatusElement: createElement(),
    formatWeaponDisplayName: () => '',
    formatWeaponStats: () => '',
    formatOffHandStats: () => '',
  });

  controller.resolveStairChoice('change-floor');

  assert.equal(state.floor, 2);
  assert.equal(state.pendingStairChoice, null);
  assert.deepEqual(endTurnCalls, [{
    actionType: 'move',
    actionCost: 150,
  }]);
});

test('modal-controller debug info shows timeline and upcoming actor order when opened', () => {
  const state = {
    floor: 2,
    runSeed: 777,
    timelineTime: 240,
    turn: 13,
    player: {
      x: 5,
      y: 5,
      hp: 10,
      nextActionTime: 300,
      baseSpeed: 100,
      reaction: 4,
    },
    floors: {
      1: {
        enemies: [
          { id: 'raider', name: 'Raider', hp: 10, nextActionTime: 260, baseSpeed: 80, reaction: 2 },
        ],
      },
      2: {
        generationSeed: 999,
        studioArchetypeId: 'action',
        layoutId: 'debug-layout',
        layoutVariant: 'test',
        layoutFailureReason: null,
        corridorWidth: 2,
        entryAnchor: null,
        exitAnchor: null,
        enemies: [
          { id: 'brute', name: 'Brecher', hp: 10, nextActionTime: 300, baseSpeed: 130, reaction: 1 },
        ],
        debugReveal: true,
      },
    },
    pendingStairChoice: null,
    pendingChoice: null,
    modals: {
      inventoryOpen: false,
      studioTopologyOpen: false,
      runStatsOpen: false,
      debugInfoOpen: false,
      optionsOpen: false,
      savegamesOpen: false,
      helpOpen: false,
      highscoresOpen: false,
    },
  };
  const debugInfoTextElement = createElement();

  const controller = createModalController({
    CHOICE_ACTIONS: {},
    STAIR_ACTIONS: ['change-floor', 'stay'],
    getState: () => state,
    createSheetRow: () => '',
    updateSavegameControls: () => {},
    getCurrentFloorState: () => state.floors[state.floor],
    returnToStartScreen: () => {},
    renderSelf: () => {},
    addMessage: () => {},
    moveToFloor: () => false,
    endTurn: () => {},
    resolvePotionChoice: () => {},
    renderEquipmentCompareHtml: () => '',
    choiceModalElement: createElement(),
    choiceTitleElement: createElement(),
    choiceTextElement: createElement(),
    choiceDrinkButton: createElement(),
    choiceStoreButton: createElement(),
    choiceLeaveButton: createElement(),
    containerLootModalElement: createElement(),
    containerLootImageElement: createElement(),
    containerLootTitleElement: createElement(),
    containerLootSummaryElement: createElement(),
    containerLootListElement: createElement(),
    containerLootTakeSelectedButton: createElement(),
    containerLootTakeAllButton: createElement(),
    stairsModalElement: createElement(),
    stairsTitleElement: createElement(),
    stairsTextElement: createElement(),
    stairsConfirmButton: createElement(),
    stairsStayButton: createElement(),
    deathModalElement: createElement(),
    deathSummaryElement: createElement(),
    debugInfoModalElement: createElement(),
    debugInfoTextElement,
    debugInfoStatusElement: createElement(),
    formatWeaponDisplayName: () => '',
    formatWeaponStats: () => '',
    formatOffHandStats: () => '',
  });

  controller.toggleDebugInfo(true);

  assert.equal(state.modals.debugInfoOpen, true);
  assert.match(debugInfoTextElement.value, /Weltzeit: 240/);
  assert.match(debugInfoTextElement.value, /Spieler-Zeitpunkt: 300/);
  assert.match(debugInfoTextElement.value, /Nächster Akteur: Raider \| Floor 1/);
  assert.match(debugInfoTextElement.value, /Nächste Akteure:/);
  assert.match(debugInfoTextElement.value, /1\. Raider \| Floor 1 \| Zeit 260 \| Reaktion 2 \| Tempo Sehr schnell/);
  assert.match(debugInfoTextElement.value, /2\. Spieler \| Floor 2 \| Zeit 300 \| Reaktion 4 \| Tempo Normal/);
});
