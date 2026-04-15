import test from 'node:test';
import assert from 'node:assert/strict';
import { createStatePersistenceApi } from '../../src/application/state-persistence.mjs';

test('state-persistence normalizes key inventory items and floor key pickups', () => {
  const storage = new Map();
  const HERO_CLASSES = {
    lead: { label: 'Hauptrolle', passiveName: 'Test', passiveSummary: 'Test', passiveDescription: 'Test' },
  };
  let state = null;

  const createDefaultModals = (startOpen = false) => ({
    startOpen,
    inventoryOpen: false,
    studioTopologyOpen: false,
    runStatsOpen: false,
    optionsOpen: false,
    savegamesOpen: false,
    helpOpen: false,
    highscoresOpen: false,
  });
  const createDefaultCollapsedCards = () => ({ player: 'summary', log: 'visible' });
  const createDefaultPreferences = () => ({ inventoryFilter: 'all' });
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
    collapsedCards: createDefaultCollapsedCards(),
    options: { stepSound: true, deathSound: true, voiceAnnouncements: true, showcaseAnnouncementMode: 'floating-text' },
    preferences: createDefaultPreferences(),
    floors: {
      1: {
        studioArchetypeId: 'slasher',
        grid: [['.']],
        visible: [[true]],
        enemies: [],
        keys: [],
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
    setState: (nextState) => { state = nextState; },
    loadHeroClassId: () => 'lead',
    createFreshState,
    createDefaultModals,
    createDefaultCollapsedCards,
    createDefaultPreferences,
    normalizeHeroName: (value) => value?.trim() || 'Final Girl',
    resolveHeroClassId: (value, fallback) => HERO_CLASSES[value] ? value : fallback,
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

  storage.set('savegame', JSON.stringify({
    version: 4,
    entries: [{
      id: 'save-keys',
      savedAt: 123,
      snapshotVersion: 4,
      state: {
        floor: 1,
        player: { name: 'Ripley', classId: 'lead' },
        inventory: [
          { type: 'key', keyColor: 'green', keyFloor: 3 },
        ],
        floors: {
          1: {
            studioArchetypeId: 'slasher',
            grid: [['.']],
            visible: [[true]],
            enemies: [],
            keys: [{ x: 0, y: 0, item: { type: 'key', keyColor: 'blue', keyFloor: 2 } }],
          },
        },
      },
    }],
    consumedIds: {},
  }));

  const result = persistence.loadSavedGame();

  assert.equal(result.ok, true);
  assert.equal(state.inventory[0].name, 'Grüner Schlüssel');
  assert.match(state.inventory[0].description, /Studio 3/);
  assert.equal(state.floors[1].keys[0].item.name, 'Blauer Schlüssel');
  assert.match(state.floors[1].keys[0].item.description, /Studio 2/);
});
