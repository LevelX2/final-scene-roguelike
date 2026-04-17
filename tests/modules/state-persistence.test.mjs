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
    studioTopologyOpen: false,
    runStatsOpen: false,
    optionsOpen: false,
    helpOpen: false,
    highscoresOpen: false,
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
    visitedFloors: [],
    lastScoreRank: null,
    modals: createDefaultModals(false),
    collapsedCards: createDefaultCollapsedCards(),
    options: { stepSound: true, deathSound: true, voiceAnnouncements: true, showcaseAnnouncementMode: 'floating-text' },
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
    version: 2,
    slots: [{
      id: 'save-1',
      savedAt: 123,
      snapshotVersion: 4,
      state: {
        floor: 1,
        deepestFloor: 1,
        modals: { inventoryOpen: true, optionsOpen: true },
        pendingChoice: { type: 'potion' },
        pendingStairChoice: { direction: 1 },
        player: { name: 'Ripley', classId: 'lead', level: 2, hp: 7, maxHp: 12, xpToNext: 25, nutrition: 50 },
        floors: { 1: { studioArchetypeId: 'slasher', grid: [['.']], visible: [[true]], enemies: [] } },
      },
    }],
  }));

  const result = persistence.loadSavedGame();

  assert.equal(result.ok, true);
  assert.equal(state.modals.inventoryOpen, false);
  assert.equal(state.modals.optionsOpen, false);
  assert.equal(state.pendingChoice, null);
  assert.equal(state.pendingStairChoice, null);
  assert.equal(state.player.name, 'Ripley');
  assert.equal(state.options.voiceAnnouncements, true);
  assert.equal(state.options.showcaseAnnouncementMode, 'floating-text');
  assert.deepEqual(state.visitedFloors, [1]);
});

test('state-persistence ranks final scenes by studio, level, kills, then turns', () => {
  const storage = new Map();
  const HERO_CLASSES = {
    lead: { label: 'Hauptrolle', passiveName: 'Triff deine Marke', passiveSummary: 'Test', passiveDescription: 'Test' },
  };
  let state = {
    floor: 7,
    deepestFloor: 7,
    turn: 120,
    scoreSaved: false,
    lastScoreRank: null,
    kills: 14,
    deathCause: 'wurde von einem Testgegner aus dem Bild genommen.',
    floors: {
      7: { studioArchetypeId: 'noir' },
    },
    player: {
      name: 'Ripley',
      classId: 'lead',
      classLabel: HERO_CLASSES.lead.label,
      level: 4,
      hp: 2,
      maxHp: 18,
    },
  };

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
    createFreshState: () => state,
    createDefaultModals: () => ({}),
    createDefaultCollapsedCards: () => ({}),
    createDefaultPreferences: () => ({}),
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

  storage.set('highscores-version', 1);
  storage.set('highscores', JSON.stringify([
    {
      marker: 'same-studio-more-turns',
      heroName: 'Casey',
      heroClassId: 'lead',
      heroClass: 'Hauptrolle',
      date: '13.04.2026, 12:00:00',
      deathFloor: 7,
      deathStudioArchetypeId: 'noir',
      deepestFloor: 7,
      deepestStudioArchetypeId: 'noir',
      level: 4,
      hp: 12,
      maxHp: 18,
      turns: 140,
      kills: 14,
      deathCause: 'Test',
    },
    {
      marker: 'same-studio-less-level',
      heroName: 'Billy',
      heroClassId: 'lead',
      heroClass: 'Hauptrolle',
      date: '13.04.2026, 12:00:01',
      deathFloor: 7,
      deathStudioArchetypeId: 'noir',
      deepestFloor: 7,
      deepestStudioArchetypeId: 'noir',
      level: 3,
      hp: 18,
      maxHp: 18,
      turns: 90,
      kills: 30,
      deathCause: 'Test',
    },
    {
      marker: 'higher-studio',
      heroName: 'Sidney',
      heroClassId: 'lead',
      heroClass: 'Hauptrolle',
      date: '13.04.2026, 12:00:02',
      deathFloor: 8,
      deathStudioArchetypeId: 'slasher',
      deepestFloor: 8,
      deepestStudioArchetypeId: 'slasher',
      level: 2,
      hp: 1,
      maxHp: 18,
      turns: 300,
      kills: 2,
      deathCause: 'Test',
    },
  ]));

  const rank = persistence.saveHighscoreIfNeeded();
  const scores = JSON.parse(storage.get('highscores'));

  assert.equal(rank, 2);
  assert.deepEqual(
    scores.slice(0, 4).map((entry) => entry.marker),
    ['higher-studio', scores[1].marker, 'same-studio-more-turns', 'same-studio-less-level'],
  );
  assert.equal(scores[1].heroName, 'Ripley');
});
