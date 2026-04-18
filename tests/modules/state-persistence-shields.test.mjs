import test from 'node:test';
import assert from 'node:assert/strict';
import { createStatePersistenceApi } from '../../src/application/state-persistence.mjs';

function createPersistenceHarness() {
  const storage = new Map();
  const HERO_CLASSES = {
    filmstar: { label: 'Filmstar', passiveName: 'Triff deine Marke', passiveSummary: 'Test', passiveDescription: 'Test' },
  };
  let state = null;

  const createDefaultModals = (startOpen = false) => ({
    startOpen,
    inventoryOpen: false,
    studioTopologyOpen: false,
    runStatsOpen: false,
    optionsOpen: false,
    helpOpen: false,
    highscoresOpen: false,
  });

  const createFreshState = (heroName, heroClassId) => ({
    floor: 1,
    deepestFloor: 1,
    turn: 0,
    messages: [],
    inventory: [],
    gameOver: false,
    safeRestTurns: 0,
    pendingChoice: null,
    pendingStairChoice: null,
    deathCause: null,
    scoreSaved: false,
    kills: 0,
    killStats: {},
    damageDealt: 0,
    damageTaken: 0,
    xpGained: 0,
    openedChests: 0,
    consumedPotions: 0,
    consumedFoods: 0,
    knownMonsterTypes: {},
    seenMonsterCounts: {},
    visitedFloors: [],
    lastScoreRank: null,
    modals: createDefaultModals(false),
    collapsedCards: {},
    options: { stepSound: true, deathSound: true, voiceAnnouncements: true, showcaseAnnouncementMode: 'floating-text' },
    preferences: {},
    floors: {
      1: {
        floorNumber: 1,
        studioArchetypeId: 'slasher',
        grid: [['.']],
        visible: [[true]],
        weapons: [],
        offHands: [],
        enemies: [],
      },
    },
    player: {
      name: heroName,
      classId: heroClassId,
      classLabel: HERO_CLASSES[heroClassId].label,
      classPassiveName: HERO_CLASSES[heroClassId].passiveName,
      classPassiveSummary: HERO_CLASSES[heroClassId].passiveSummary,
      classPassiveDescription: HERO_CLASSES[heroClassId].passiveDescription,
      level: 1,
      hp: 10,
      maxHp: 10,
      xp: 0,
      xpToNext: 20,
      mainHand: null,
      offHand: null,
      nutrition: 80,
      nutritionMax: 100,
      hungerState: 'NORMAL',
    },
  });

  const persistence = createStatePersistenceApi({
    HIGHSCORE_KEY: 'highscores',
    HIGHSCORE_STORAGE_VERSION: 1,
    HIGHSCORE_VERSION_KEY: 'highscores-version',
    HIGHSCORE_LAST_ENTRY_KEY: 'highscores-last',
    OPTIONS_KEY: 'options',
    SAVEGAME_KEY: 'savegame',
    SAVEGAME_VERSION: 4,
    DEFAULT_OPTIONS: { stepSound: true, deathSound: true, voiceAnnouncements: true, showcaseAnnouncementMode: 'floating-text' },
    readStorage: (key) => storage.get(key) ?? null,
    writeStorage: (key, value) => storage.set(key, value),
    removeStorage: (key) => storage.delete(key),
    getState: () => state,
    setState: (nextState) => {
      state = nextState;
    },
    loadHeroClassId: () => 'filmstar',
    createFreshState,
    createDefaultModals,
    createDefaultCollapsedCards: () => ({}),
    createDefaultPreferences: () => ({}),
    normalizeHeroName: (value) => value?.trim() || 'Final Girl',
    resolveHeroClassId: (value, fallback) => (HERO_CLASSES[value] ? value : fallback),
    HERO_CLASSES,
    randomInt: () => 0,
    createRunArchetypeSequence: () => ['slasher'],
    getArchetypeForFloor: () => 'slasher',
    xpForNextLevel: () => 20,
    getNutritionMax: () => 100,
    getNutritionStart: () => 80,
    getHungerState: () => 'NORMAL',
    updateVisibility: () => {},
    renderSelf: () => {},
  });

  return {
    storage,
    getState: () => state,
    persistence,
  };
}

test('state-persistence normalisiert Schilde in Inventar, Boden-Pickups und Gegnerdaten', () => {
  const { storage, getState, persistence } = createPersistenceHarness();

  storage.set('savegame', JSON.stringify({
    version: 2,
    slots: [{
      id: 'save-1',
      savedAt: 123,
      snapshotVersion: 4,
      state: {
        floor: 1,
        deepestFloor: 1,
        inventory: [
          {
            type: 'offhand',
            id: 'satellite-dish-guard',
            name: 'Satellitenschuessel-Schild',
            rarity: 'uncommon',
          },
        ],
        player: {
          name: 'Ripley',
          classId: 'lead',
          offHand: {
            id: 'clapperboard-shield',
            name: 'Klappenbrett-Schild',
            blockChance: 16,
            blockValue: 2,
          },
        },
        floors: {
          1: {
            floorNumber: 1,
            studioArchetypeId: 'slasher',
            grid: [['.']],
            visible: [[true]],
            offHands: [
              {
                x: 2,
                y: 3,
                item: {
                  id: 'stuntman-bracer',
                  name: 'Stuntman-Bracer',
                },
              },
            ],
            enemies: [
              {
                id: 'test-enemy',
                offHand: {
                  id: 'neon-diner-tray',
                  name: 'Neon-Diner-Tablett',
                },
                lootOffHand: {
                  id: 'worksite-bracer',
                  name: 'Arbeitsschutz-Armschild',
                },
              },
            ],
          },
        },
      },
    }],
  }));

  const result = persistence.loadSavedGame();
  const state = getState();

  assert.equal(result.ok, true);
  assert.equal(state.player.offHand.type, 'offhand');
  assert.equal(state.player.offHand.itemType, 'shield');
  assert.equal(state.player.offHand.subtype, 'shield');
  assert.equal(state.player.offHand.baseItemId, 'clapperboard-shield');
  assert.equal(state.player.offHand.iconAssetId, 'clapperboard-shield');

  assert.equal(state.inventory[0].itemType, 'shield');
  assert.equal(state.inventory[0].baseItemId, 'satellite-dish-guard');
  assert.equal(state.inventory[0].iconAssetId, 'satellite-dish-guard');

  assert.equal(state.floors[1].offHands[0].item.itemType, 'shield');
  assert.equal(state.floors[1].offHands[0].item.iconAssetId, 'stuntman-bracer');
  assert.equal(state.floors[1].enemies[0].offHand.itemType, 'shield');
  assert.equal(state.floors[1].enemies[0].lootOffHand.baseItemId, 'worksite-bracer');
});
