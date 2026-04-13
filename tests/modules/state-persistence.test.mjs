import test from 'node:test';
import assert from 'node:assert/strict';
import { createStatePersistenceApi } from '../../src/application/state-persistence.mjs';

test('state-persistence normalizes transient modal state on load', () => {
  const storage = new Map();
  const HERO_CLASSES = {
    lead: { label: 'Hauptrolle', passiveName: 'Triff deine Marke', passiveSummary: 'Test', passiveDescription: 'Test' },
  };
  let state = null;

  const createDefaultModals = (startOpen = false) => ({
    startOpen,
    inventoryOpen: false,
    runStatsOpen: false,
    optionsOpen: false,
    helpOpen: false,
    highscoresOpen: false,
    deathKillsOpen: false,
  });
  const createDefaultCollapsedCards = () => ({ player: 'summary', log: 'compact' });
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
    lastScoreRank: null,
    modals: createDefaultModals(false),
    collapsedCards: createDefaultCollapsedCards(),
    options: { stepSound: true, deathSound: true },
    preferences: createDefaultPreferences(),
    floors: { 1: { studioArchetypeId: 'slasher', grid: [['.']], visible: [[true]], enemies: [] } },
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
    SAVEGAME_VERSION: 3,
    DEFAULT_OPTIONS: { stepSound: true, deathSound: true },
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
    rollStudioArchetypeId: () => 'slasher',
    xpForNextLevel: () => 20,
    getNutritionMax: () => 100,
    getNutritionStart: () => 80,
    getHungerState: () => 'NORMAL',
    updateVisibility: () => {},
    renderSelf: () => {},
  });

  storage.set('savegame', JSON.stringify({
    version: 3,
    savedAt: 123,
    state: {
      floor: 1,
      deepestFloor: 1,
      modals: { inventoryOpen: true, optionsOpen: true },
      pendingChoice: { type: 'potion' },
      pendingStairChoice: { direction: 1 },
      player: { name: 'Ripley', classId: 'lead', level: 2, hp: 7, maxHp: 12, xpToNext: 25, nutrition: 50 },
      floors: { 1: { studioArchetypeId: 'slasher', grid: [['.']], visible: [[true]], enemies: [] } },
    },
  }));

  const result = persistence.loadSavedGame();

  assert.equal(result.ok, true);
  assert.equal(state.modals.inventoryOpen, false);
  assert.equal(state.modals.optionsOpen, false);
  assert.equal(state.pendingChoice, null);
  assert.equal(state.pendingStairChoice, null);
  assert.equal(state.player.name, 'Ripley');
});
