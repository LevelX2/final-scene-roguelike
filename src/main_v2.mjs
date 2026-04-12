import { WIDTH, HEIGHT, TILE_SIZE, TILE_GAP, BOARD_PADDING, ROOM_ATTEMPTS, MIN_ROOM_SIZE, MAX_ROOM_SIZE, LOG_LIMIT, HIGHSCORE_KEY, HIGHSCORE_STORAGE_VERSION, HIGHSCORE_VERSION_KEY, VISION_RADIUS, BASE_HIT_CHANCE, MIN_HIT_CHANCE, MAX_HIT_CHANCE, MIN_CRIT_CHANCE, MAX_CRIT_CHANCE, TILE, MONSTER_CATALOG, WEAPON_CATALOG, OFFHAND_CATALOG } from './data.mjs';
import { boardElement, startModalElement, startFormElement, classOptionsElement, heroNameInputElement, saveHeroNameButtonElement, heroIdentityStatusElement, messageLogElement, inventoryListElement, playerSheetElement, playerPanelTitleElement, enemySheetElement, highscoreListElement, runStatsSummaryElement, runStatsKillsElement, depthTitleElement, topbarHpCardElement, topbarHpElement, topbarLevelCardElement, topbarLevelElement, topbarDamageCardElement, topbarDamageElement, topbarHitCardElement, topbarHitElement, topbarCritCardElement, topbarCritElement, topbarBlockCardElement, topbarBlockElement, topbarFoodCardElement, topbarFoodElement, xpLabelElement, xpFillElement, nutritionLabelElement, nutritionFillElement, nutritionStateElement, choiceModalElement, choiceTitleElement, choiceTextElement, choiceDrinkButton, choiceStoreButton, choiceLeaveButton, stairsModalElement, stairsTitleElement, stairsTextElement, stairsConfirmButton, stairsStayButton, inventoryModalElement, runStatsModalElement, openRunStatsButton, closeRunStatsButton, openInventoryButton, closeInventoryButton, inventoryFilterButtons, optionsModalElement, openOptionsButton, closeOptionsButton, helpModalElement, openHelpButton, closeHelpButton, highscoresModalElement, openHighscoresButton, closeHighscoresButton, toggleStepSoundElement, toggleDeathSoundElement, deathModalElement, deathSummaryElement, deathKillsElement, deathKillsModalElement, openDeathKillsButton, closeDeathKillsButton, closeDeathButton, hoverTooltipElement, collapsibleCards } from './dom_v2.mjs';
import { DOOR_TYPE, LOCK_COLORS } from './data.mjs';
import { PROP_CATALOG } from './data.mjs';
import { DISPLAY_CASE_AMBIENCE } from './data.mjs';
import { HERO_CLASSES, getUnlockedMonsterRank, getEnemyCountForFloor, getPotionCountForFloor, shouldSpawnFloorWeapon, shouldSpawnChest, getChestCountForFloor, getLockedDoorCountForFloor, shouldPlaceLockedRoomChest, getLevelUpRewards, NON_ICONIC_MONSTER_WEIGHT_BONUS, ICONIC_MONSTER_WEIGHT_PENALTY } from './balance.mjs';
import { ITEM_RARITY_MODIFIER_COUNTS, getEquipmentRarityWeights } from './balance.mjs';
import { getNutritionMax, getNutritionStart, clampNutritionValue, getHungerState, getHungerStateLabel, getHungerStateMessage, HUNGER_STATE, NUTRITION_COST_PER_ACTION, DAMAGE_PER_ACTION_WHILE_DYING } from './nutrition.mjs';
import { buildFoodItemsForBudget, rollFoodBudget, splitFoodBudget, rollMonsterPlannedDrop } from './loot.mjs';
import { ITEM_DEFS } from './item-defs.mjs';
import { createItemizationApi } from './itemization.mjs';
import { createTrapsApi } from './traps.mjs';
import { createDungeonApi } from './dungeon.mjs';
import { createStateApi } from './state_v2.mjs';
import { createRenderApi } from './render_v2.mjs';
import { createCombatApi } from './combat.mjs';
import { createAiApi } from './ai.mjs';
import { createItemsApi } from './items.mjs';
import { createTestApi } from './test-api.mjs';
import { clamp, randomInt, createGrid, carveRoom, carveTunnel, roomsOverlap } from './utils.mjs';

let state;
let audioContext;
let testRandomQueue = [];
let heroIdentityStatusTimeout;
const OPTIONS_KEY = "dungeon-rogue-options";
const HERO_NAME_KEY = "movieverse-hero-name";
const HERO_CLASS_KEY = "movieverse-hero-class";
const DEFAULT_HERO_NAME = "Final Girl";
const DEFAULT_HERO_CLASS = "survivor";
const CHOICE_ACTIONS = {
  potion: ["drink", "store", "leave"],
  food: ["eat", "store", "leave"],
  weapon: ["equip", "store", "leave"],
  offhand: ["equip", "store", "leave"],
};
const STAIR_ACTIONS = ["change-floor", "stay"];

function rollPercent(chance) {
  return randomChance() * 100 < chance;
}

function randomChance() {
  if (testRandomQueue.length > 0) {
    return testRandomQueue.shift();
  }
  return Math.random();
}

function createBareHandsWeapon() {
  return {
    type: "weapon",
    id: "bare-hands",
    name: "Bloesse Faeuste",
    source: "Start",
    handedness: "one-handed",
    damage: 1,
    hitBonus: 0,
    critBonus: 0,
    description: "Nicht ideal, aber immerhin ehrlich.",
  };
}

function cloneOffHandItem(item) {
  if (!item) {
    return null;
  }

  return {
    ...item,
    type: item.type ?? "offhand",
    modifiers: item.modifiers ? item.modifiers.map((modifier) => ({
      ...modifier,
      allowedItemTypes: [...(modifier.allowedItemTypes ?? [])],
      statChanges: { ...(modifier.statChanges ?? {}) },
      tags: [...(modifier.tags ?? [])],
    })) : [],
    modifierIds: [...(item.modifierIds ?? [])],
    statMods: { ...(item.statMods ?? {}) },
  };
}

function getStatLabel(stat) {
  return {
    strength: "Staerke",
    precision: "Praezision",
    reaction: "Reaktion",
    nerves: "Nerven",
    intelligence: "Intelligenz",
    endurance: "Ausdauer",
    charm: "Charme",
  }[stat] ?? stat;
}

function formatStatMod(value) {
  return `${value >= 0 ? "+" : ""}${value}`;
}

function formatStatMods(statMods = {}) {
  return Object.entries(statMods)
    .filter(([, value]) => value)
    .map(([stat, value]) => `${getStatLabel(stat)} ${formatStatMod(value)}`)
    .join(" | ");
}

function applyItemStatMods(entity, item, direction = 1) {
  if (!entity || !item?.statMods) {
    return;
  }

  Object.entries(item.statMods).forEach(([stat, value]) => {
    if (!value) {
      return;
    }
    const currentValue = typeof entity[stat] === "number" ? entity[stat] : 0;
    entity[stat] = currentValue + value * direction;
  });
}

function getMainHand(entity) {
  return entity.mainHand ?? entity.weapon ?? createBareHandsWeapon();
}

function getOffHand(entity) {
  return entity.offHand ?? null;
}

function formatOffHandStats(item) {
  if (!item) {
    return "Leer";
  }

  if (item.subtype === "shield") {
    const stats = [`${item.blockChance}% Block`, `${item.blockValue} Blockwert`];
    const statMods = formatStatMods(item.statMods);
    if (statMods) {
      stats.push(statMods);
    }
    if (item.rarity && item.rarity !== "common") {
      stats.unshift(formatRarityLabel(item.rarity));
    }
    return stats.join(" | ");
  }

  return item.description ?? "Nebenhand-Item";
}

function getOffHandTooltipLines(item) {
  if (!item) {
    return ["Kein Gegenstand ausgeruestet."];
  }

  if (item.subtype === "shield") {
    const lines = [
      item.source,
      item.rarity ? formatRarityLabel(item.rarity) : null,
      `${item.blockChance}% Blockchance`,
      `${item.blockValue} Schadensblock`,
      formatStatMods(item.statMods),
      item.modifiers?.length ? `Mods: ${getItemModifierSummary(item)}` : null,
      item.description,
    ];
    return lines.filter(Boolean);
  }

  return [
    item.source ?? "Nebenhand",
    item.description ?? "Kein weiterer Effekt bekannt.",
  ];
}

function getCombatWeapon(entity) {
  return getMainHand(entity);
}

function formatModifier(value) {
  return `${value >= 0 ? "+" : ""}${value}`;
}

function formatBreakdown(base, modifier) {
  return `${base}${modifier >= 0 ? "+" : ""}${modifier}`;
}

function getHandednessLabel(handedness) {
  return handedness === "two-handed" ? "2H" : "1H";
}

function formatWeaponStats(weapon) {
  const stats = [
    getHandednessLabel(weapon.handedness),
    `${weapon.damage} Schaden`,
    `${formatModifier(weapon.hitBonus)} Treffer`,
  ];

  if (weapon.rarity && weapon.rarity !== "common") {
    stats.unshift(formatRarityLabel(weapon.rarity));
  }

  if (weapon.critBonus !== 0) {
    stats.push(`${formatModifier(weapon.critBonus)} Krit`);
  }

  return stats.join(" | ");
}

function createMaskGrid(fill = false) {
  return createGrid(WIDTH, HEIGHT, fill);
}

const {
  formatRarityLabel,
  generateEquipmentItem,
  getItemModifierSummary,
  getWeaponConditionalDamageBonus,
  itemHasModifier,
} = createItemizationApi({
  ITEM_RARITY_MODIFIER_COUNTS,
  getEquipmentRarityWeights,
  randomChance,
});

const {
  buildTrapsForFloor,
  detectNearbyTraps,
  handleActorEnterTile,
  processContinuousTraps,
} = createTrapsApi({
  randomInt,
  randomChance,
  getState: () => state,
  getCurrentFloorState,
  addMessage,
  showFloatingText: (...args) => showFloatingText(...args),
  healPlayer: (...args) => healPlayer(...args),
  refreshNutritionState: (...args) => refreshNutritionState(...args),
  grantExperience: (...args) => grantExperience(...args),
  createDeathCause: (...args) => createDeathCause(...args),
  saveHighscoreIfNeeded: () => saveHighscoreIfNeeded(),
  showDeathModal: (...args) => showDeathModal(...args),
  playDeathSound: () => playDeathSound(),
});

const {
  createEnemy,
  createWeaponPickup,
  createOffHandPickup,
  createChestPickup,
  createFoodPickup,
  createKeyPickup,
  createDoor,
  rollChestContent,
  cloneWeapon,
  createDungeonLevel,
} = createDungeonApi({
  WIDTH,
  HEIGHT,
  ROOM_ATTEMPTS,
  MIN_ROOM_SIZE,
  MAX_ROOM_SIZE,
  TILE,
  MONSTER_CATALOG,
  WEAPON_CATALOG,
  OFFHAND_CATALOG,
  PROP_CATALOG,
  DOOR_TYPE,
  LOCK_COLORS,
  buildFoodItemsForBudget,
  rollFoodBudget,
  splitFoodBudget,
  rollMonsterPlannedDrop,
  getUnlockedMonsterRank,
  getEnemyCountForFloor,
  getPotionCountForFloor,
  shouldSpawnFloorWeapon,
  shouldSpawnChest,
  getChestCountForFloor,
  getLockedDoorCountForFloor,
  shouldPlaceLockedRoomChest,
  NON_ICONIC_MONSTER_WEIGHT_BONUS,
  ICONIC_MONSTER_WEIGHT_PENALTY,
  buildTrapsForFloor,
  generateEquipmentItem,
  randomInt,
  createGrid: () => createGrid(WIDTH, HEIGHT, TILE.WALL),
  carveRoom: (grid, room) => carveRoom(grid, room, TILE.FLOOR),
  carveTunnel: (grid, start, end) => carveTunnel(grid, start, end, TILE.FLOOR),
  roomsOverlap,
  cloneOffHandItem,
  getState: () => state,
});

const {
  loadHighscores,
  loadHeroName,
  saveHeroName,
  loadHeroClassId,
  saveHeroClassId,
  saveOptions,
  loadLastHighscoreMarker,
  saveHighscoreIfNeeded,
  createDeathCause,
  xpForNextLevel,
  initializeGame,
} = createStateApi({
  HIGHSCORE_KEY,
  HIGHSCORE_STORAGE_VERSION,
  HIGHSCORE_VERSION_KEY,
  OPTIONS_KEY,
  HERO_NAME_KEY,
  HERO_CLASS_KEY,
  DEFAULT_HERO_NAME,
  DEFAULT_HERO_CLASS,
  HERO_CLASSES,
  getState: () => state,
  setState: (nextState) => {
    state = nextState;
  },
  createBareHandsWeapon,
  createDungeonLevel,
  updateVisibility,
  addMessage,
  renderSelf: () => render(),
  randomInt,
});

const {
  getPlayerCombatSummary,
  getTopbarTooltipContent,
  bindTooltip,
  createSheetRow,
  renderPlayerSheet,
  renderEnemySheet,
  renderInventory,
  renderHighscores,
  renderRunStats,
  renderLog,
  renderBoard,
  showFloatingText,
  showTooltip,
  moveTooltip,
  hideTooltip,
  tileAt,
  } = createRenderApi({
  MIN_CRIT_CHANCE,
  MAX_CRIT_CHANCE,
  WIDTH,
  HEIGHT,
  TILE_SIZE,
  TILE_GAP,
  BOARD_PADDING,
  TILE,
  boardElement,
  messageLogElement,
  inventoryListElement,
  inventoryFilterButtons,
    playerSheetElement,
    enemySheetElement,
    highscoreListElement,
    runStatsSummaryElement,
    runStatsKillsElement,
    hoverTooltipElement,
    monsterNames: MONSTER_CATALOG.map((monster) => monster.name),
    itemNames: [
      "Heiltrank",
      ...Object.values(WEAPON_CATALOG).map((item) => item.name),
      ...Object.values(OFFHAND_CATALOG).map((item) => item.name),
      ...Object.values(ITEM_DEFS).map((item) => item.name),
    ],
    getState: () => state,
    getCurrentFloorState,
  getMainHand,
  getOffHand,
  getCombatWeapon,
  formatWeaponStats,
  formatOffHandStats,
  getOffHandTooltipLines,
  formatRarityLabel,
  getItemModifierSummary,
  getHungerStateLabel,
  clamp,
  loadHighscores,
  loadLastHighscoreMarker,
  countPotionsInInventory,
  countFoodInInventory,
  useInventoryItem: (...args) => useInventoryItem(...args),
  renderSelf: () => render(),
});

const {
  resolveBlock,
  resolveCombatAttack,
  healPlayer,
  gainLevel,
  grantExperience,
  attackEnemy,
} = createCombatApi({
  BASE_HIT_CHANCE,
  MIN_HIT_CHANCE,
  MAX_HIT_CHANCE,
  MIN_CRIT_CHANCE,
  MAX_CRIT_CHANCE,
  clamp,
  rollPercent,
  getState: () => state,
  getCombatWeapon,
  getOffHand,
  getCurrentFloorState,
  createWeaponPickup,
  createOffHandPickup,
  createFoodPickup,
  showFloatingText,
  playVictorySound,
  playLevelUpSound,
  playEnemyHitSound,
  playDodgeSound,
  xpForNextLevel,
  getLevelUpRewards,
  getWeaponConditionalDamageBonus,
  itemHasModifier,
  noteMonsterEncounter,
  addMessage,
  renderSelf: () => render(),
});

const {
  manhattanDistance,
  hasNearbyEnemy,
  processSafeRegeneration,
  moveEnemies,
} = createAiApi({
  WIDTH,
  HEIGHT,
  TILE,
  DOOR_TYPE,
  getState: () => state,
  getCurrentFloorState,
  getDoorAt,
  getOffHand,
  resolveCombatAttack,
  resolveBlock,
  healPlayer,
  addMessage,
  showFloatingText,
  createDeathCause,
  playPlayerHitSound,
  playDodgeSound,
  playDeathSound,
  playDoorOpenSound,
  saveHighscoreIfNeeded,
  showDeathModal,
  noteMonsterEncounter,
  handleActorEnterTile,
});

const {
  tryPickupLoot,
  equipWeapon,
  canEquipOffHand,
  equipOffHand,
  openChest,
  resolvePotionChoice,
  useInventoryItem,
  quickUsePotion,
} = createItemsApi({
  getState: () => state,
  getCurrentFloorState,
  getMainHand,
  getOffHand,
  applyItemStatMods,
  cloneWeapon,
  cloneOffHandItem,
  createWeaponPickup,
  createOffHandPickup,
  createFoodPickup,
  formatWeaponStats,
  formatOffHandStats,
  formatRarityLabel,
  addMessage,
  showChoiceModal,
    hideChoiceModal,
    endTurn,
    healPlayer,
    restoreNutrition,
    refreshNutritionState,
    renderSelf: () => render(),
  });

const { syncTestApi } = createTestApi({
  WIDTH,
  HEIGHT,
  TILE,
  getState: () => state,
  getCurrentFloorState,
  getMainHand,
  getOffHand,
  countPotionsInInventory,
  loadHighscores,
  grantExperience,
  cloneWeapon,
  cloneOffHandItem,
  createChestPickup,
  createFoodPickup,
  createDoor,
  createKeyPickup,
  generateEquipmentItem,
  setRandomSequence: (values) => {
    testRandomQueue = [...values];
  },
  clearRandomSequence: () => {
    testRandomQueue = [];
  },
  tryUseStairs,
  renderSelf: () => render(),
});

function addMessage(text, tone = "") {
  state.messages.unshift({ text, tone });
  state.messages = state.messages.slice(0, LOG_LIMIT);
}

function getAudioContext() {
  if (!audioContext) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      return null;
    }
    audioContext = new AudioContextClass();
  }
  return audioContext;
}

function playDeathSound() {
  if (!state.options.deathSound) {
    return;
  }

  const context = getAudioContext();
  if (!context) {
    return;
  }

  const now = context.currentTime;
  const master = context.createGain();
  master.gain.setValueAtTime(0.001, now);
  master.gain.exponentialRampToValueAtTime(0.18, now + 0.02);
  master.gain.exponentialRampToValueAtTime(0.001, now + 2.5);
  master.connect(context.destination);

  [220, 174, 146, 110].forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(frequency, now + index * 0.16);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(60, frequency / 2.4), now + 1.9);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.08 / (index + 1), now + 0.03 + index * 0.06);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.1);
    oscillator.connect(gain);
    gain.connect(master);
    oscillator.start(now + index * 0.04);
    oscillator.stop(now + 2.2);
  });
}

function playVictorySound() {
  const context = getAudioContext();
  if (!context) {
    return;
  }

  const now = context.currentTime;
  const notes = [392, 494, 587];

  notes.forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(frequency, now + index * 0.05);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.03, now + 0.02 + index * 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28 + index * 0.05);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now + index * 0.05);
    oscillator.stop(now + 0.35 + index * 0.05);
  });
}

function playLevelUpSound() {
  const context = getAudioContext();
  if (!context) {
    return;
  }

  const now = context.currentTime;
  const notes = [392, 523, 659, 784];

  notes.forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sawtooth";
    oscillator.frequency.setValueAtTime(frequency, now + index * 0.07);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.045, now + 0.025 + index * 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5 + index * 0.06);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now + index * 0.07);
    oscillator.stop(now + 0.55 + index * 0.06);
  });
}

function playEnemyHitSound(critical = false) {
  if (!state.options.stepSound) {
    return;
  }

  const context = getAudioContext();
  if (!context) {
    return;
  }

  const now = context.currentTime;
  const master = context.createGain();
  master.gain.setValueAtTime(0.001, now);
  master.gain.exponentialRampToValueAtTime(critical ? 0.14 : 0.09, now + 0.015);
  master.gain.exponentialRampToValueAtTime(0.001, now + (critical ? 0.28 : 0.18));
  master.connect(context.destination);

  const oscillator = context.createOscillator();
  oscillator.type = critical ? "sawtooth" : "triangle";
  oscillator.frequency.setValueAtTime(critical ? 220 : 180, now);
  oscillator.frequency.exponentialRampToValueAtTime(critical ? 96 : 120, now + (critical ? 0.26 : 0.16));
  oscillator.connect(master);
  oscillator.start(now);
  oscillator.stop(now + (critical ? 0.28 : 0.18));

  if (critical) {
    const accent = context.createOscillator();
    const accentGain = context.createGain();
    accent.type = "square";
    accent.frequency.setValueAtTime(640, now);
    accent.frequency.exponentialRampToValueAtTime(280, now + 0.12);
    accentGain.gain.setValueAtTime(0.0001, now);
    accentGain.gain.exponentialRampToValueAtTime(0.035, now + 0.015);
    accentGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
    accent.connect(accentGain);
    accentGain.connect(context.destination);
    accent.start(now);
    accent.stop(now + 0.14);
  }
}

function playPlayerHitSound(critical = false) {
  if (!state.options.stepSound) {
    return;
  }

  const context = getAudioContext();
  if (!context) {
    return;
  }

  const now = context.currentTime;
  const master = context.createGain();
  master.gain.setValueAtTime(0.001, now);
  master.gain.exponentialRampToValueAtTime(critical ? 0.16 : 0.11, now + 0.02);
  master.gain.exponentialRampToValueAtTime(0.001, now + (critical ? 0.36 : 0.24));
  master.connect(context.destination);

  const body = context.createOscillator();
  body.type = "square";
  body.frequency.setValueAtTime(critical ? 150 : 130, now);
  body.frequency.exponentialRampToValueAtTime(critical ? 58 : 72, now + (critical ? 0.34 : 0.22));
  body.connect(master);
  body.start(now);
  body.stop(now + (critical ? 0.36 : 0.24));

  const sting = context.createOscillator();
  const stingGain = context.createGain();
  sting.type = "triangle";
  sting.frequency.setValueAtTime(critical ? 420 : 300, now);
  sting.frequency.exponentialRampToValueAtTime(critical ? 170 : 150, now + 0.12);
  stingGain.gain.setValueAtTime(0.0001, now);
  stingGain.gain.exponentialRampToValueAtTime(0.03, now + 0.012);
  stingGain.gain.exponentialRampToValueAtTime(0.0001, now + (critical ? 0.18 : 0.12));
  sting.connect(stingGain);
  stingGain.connect(context.destination);
  sting.start(now);
  sting.stop(now + (critical ? 0.18 : 0.12));
}

function playDodgeSound() {
  if (!state.options.stepSound) {
    return;
  }

  const context = getAudioContext();
  if (!context) {
    return;
  }

  const now = context.currentTime;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "triangle";
  oscillator.frequency.setValueAtTime(820, now);
  oscillator.frequency.exponentialRampToValueAtTime(1180, now + 0.04);
  oscillator.frequency.exponentialRampToValueAtTime(920, now + 0.09);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.035, now + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.11);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(now);
  oscillator.stop(now + 0.11);
}

function playDoorOpenSound() {
  if (!state.options.stepSound) {
    return;
  }

  const context = getAudioContext();
  if (!context) {
    return;
  }

  const now = context.currentTime;
  const thunk = context.createOscillator();
  const creak = context.createOscillator();
  const thunkGain = context.createGain();
  const creakGain = context.createGain();

  thunk.type = "square";
  thunk.frequency.setValueAtTime(170, now);
  thunk.frequency.exponentialRampToValueAtTime(96, now + 0.08);
  thunkGain.gain.setValueAtTime(0.0001, now);
  thunkGain.gain.exponentialRampToValueAtTime(0.05, now + 0.01);
  thunkGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);

  creak.type = "triangle";
  creak.frequency.setValueAtTime(410, now + 0.02);
  creak.frequency.exponentialRampToValueAtTime(250, now + 0.14);
  creakGain.gain.setValueAtTime(0.0001, now);
  creakGain.gain.exponentialRampToValueAtTime(0.03, now + 0.03);
  creakGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

  thunk.connect(thunkGain);
  creak.connect(creakGain);
  thunkGain.connect(context.destination);
  creakGain.connect(context.destination);
  thunk.start(now);
  creak.start(now + 0.015);
  thunk.stop(now + 0.11);
  creak.stop(now + 0.18);
}

function playDoorCloseSound() {
  if (!state.options.stepSound) {
    return;
  }

  const context = getAudioContext();
  if (!context) {
    return;
  }

  const now = context.currentTime;
  const body = context.createOscillator();
  const bodyGain = context.createGain();
  body.type = "square";
  body.frequency.setValueAtTime(140, now);
  body.frequency.exponentialRampToValueAtTime(85, now + 0.07);
  bodyGain.gain.setValueAtTime(0.0001, now);
  bodyGain.gain.exponentialRampToValueAtTime(0.055, now + 0.01);
  bodyGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);
  body.connect(bodyGain);
  bodyGain.connect(context.destination);
  body.start(now);
  body.stop(now + 0.1);
}

function playLockedDoorSound() {
  if (!state.options.stepSound) {
    return;
  }

  const context = getAudioContext();
  if (!context) {
    return;
  }

  const now = context.currentTime;
  const rattle = context.createOscillator();
  const rattleGain = context.createGain();
  rattle.type = "square";
  rattle.frequency.setValueAtTime(520, now);
  rattle.frequency.exponentialRampToValueAtTime(440, now + 0.035);
  rattle.frequency.exponentialRampToValueAtTime(610, now + 0.075);
  rattle.frequency.exponentialRampToValueAtTime(470, now + 0.11);
  rattleGain.gain.setValueAtTime(0.0001, now);
  rattleGain.gain.exponentialRampToValueAtTime(0.032, now + 0.01);
  rattleGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.13);
  rattle.connect(rattleGain);
  rattleGain.connect(context.destination);
  rattle.start(now);
  rattle.stop(now + 0.13);
}

function playShowcaseAmbienceSound() {
  if (!state.options.stepSound) {
    return;
  }

  const context = getAudioContext();
  if (!context) {
    return;
  }

  const now = context.currentTime;
  const master = context.createGain();
  master.gain.setValueAtTime(0.0001, now);
  master.gain.exponentialRampToValueAtTime(0.065, now + 0.018);
  master.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
  master.connect(context.destination);

  const shimmer = context.createOscillator();
  shimmer.type = "triangle";
  shimmer.frequency.setValueAtTime(720, now);
  shimmer.frequency.exponentialRampToValueAtTime(540, now + 0.16);
  shimmer.frequency.exponentialRampToValueAtTime(660, now + 0.36);
  shimmer.connect(master);
  shimmer.start(now);
  shimmer.stop(now + 0.4);

  const accent = context.createOscillator();
  const accentGain = context.createGain();
  accent.type = "sine";
  accent.frequency.setValueAtTime(980, now + 0.01);
  accent.frequency.exponentialRampToValueAtTime(780, now + 0.13);
  accentGain.gain.setValueAtTime(0.0001, now);
  accentGain.gain.exponentialRampToValueAtTime(0.026, now + 0.018);
  accentGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
  accent.connect(accentGain);
  accentGain.connect(context.destination);
  accent.start(now + 0.01);
  accent.stop(now + 0.22);
}

function showDeathModal(rank) {
  deathSummaryElement.innerHTML = [
    createSheetRow("Name", state.player.name),
    createSheetRow("Gestorben auf Ebene", state.floor),
    createSheetRow("Erreichte tiefste Ebene", state.deepestFloor),
    createSheetRow("Level", state.player.level),
    createSheetRow("Gegner besiegt", state.kills),
    createSheetRow("Schritte", state.turn),
    createSheetRow("Abgang", state.deathCause ?? "Unbekannte Schluss-Szene"),
    createSheetRow("Highscore-Platz", rank ? `#${rank}` : "Ausser Wertung"),
  ].join("");
  const killEntries = Object.entries(state.killStats)
    .sort((a, b) => b[1] - a[1]);
  deathKillsElement.innerHTML = killEntries.length > 0
    ? killEntries.map(([name, count]) => createSheetRow(name, count)).join("")
    : `<div class="inventory-empty">Keine Gegner besiegt.</div>`;
  state.modals.deathKillsOpen = false;
  deathModalElement.classList.remove("hidden");
  deathModalElement.setAttribute("aria-hidden", "false");
}

function hideDeathModal() {
  state.modals.deathKillsOpen = false;
  deathModalElement.classList.add("hidden");
  deathModalElement.setAttribute("aria-hidden", "true");
}

function countPotionsInInventory() {
  return state.inventory.filter((item) => item.type === "potion").length;
}

function countFoodInInventory() {
  return state.inventory.filter((item) => item.type === "food").length;
}

function refreshNutritionState(previousState = null) {
  state.player.nutritionMax = getNutritionMax(state.player);
  state.player.nutrition = clampNutritionValue(state.player.nutrition ?? getNutritionStart(state.player), state.player);
  const nextState = getHungerState(state.player);
  state.player.hungerState = nextState;

  if (previousState && previousState !== nextState) {
    const message = getHungerStateMessage(nextState);
    if (message) {
      addMessage(message, nextState === HUNGER_STATE.DYING ? "danger" : "important");
    }
  }

  return nextState;
}

function restoreNutrition(amount) {
  const previous = state.player.nutrition ?? getNutritionStart(state.player);
  const previousState = state.player.hungerState;
  state.player.nutrition = previous + amount;
  refreshNutritionState(previousState);
  return Math.max(0, state.player.nutrition - previous);
}

function noteMonsterEncounter(enemy) {
  if (!enemy?.id) {
    return;
  }

  state.knownMonsterTypes[enemy.id] = true;
}

function applyPlayerNutritionTurnCost() {
  const previousState = state.player.hungerState;
  state.player.nutrition = (state.player.nutrition ?? getNutritionStart(state.player)) - NUTRITION_COST_PER_ACTION;
  const nextState = refreshNutritionState(previousState);

  if (nextState !== HUNGER_STATE.DYING) {
    return;
  }

  state.player.hp = Math.max(0, state.player.hp - DAMAGE_PER_ACTION_WHILE_DYING);
  state.damageTaken = (state.damageTaken ?? 0) + DAMAGE_PER_ACTION_WHILE_DYING;
  showFloatingText(state.player.x, state.player.y, `-${DAMAGE_PER_ACTION_WHILE_DYING}`, "taken");
  addMessage("Der Hunger zerfrisst dich.", "danger");
  if (state.player.hp <= 0) {
    state.gameOver = true;
    state.deathCause = "verhungerte in den Kulissen des Dungeons.";
    playDeathSound();
    const rank = saveHighscoreIfNeeded();
    addMessage("Du bist verhungert. Druecke R fuer einen neuen Versuch.", "danger");
    showDeathModal(rank);
  }
}

function getCurrentFloorState() {
  return state.floors[state.floor];
}

function getDoorAt(x, y, floorState = getCurrentFloorState()) {
  return floorState?.doors?.find((door) => door.x === x && door.y === y) ?? null;
}

function getShowcaseAt(x, y, floorState = getCurrentFloorState()) {
  return floorState?.showcases?.find((showcase) => showcase.x === x && showcase.y === y) ?? null;
}

function getRoomIndexAtPosition(position, floorState = getCurrentFloorState()) {
  return floorState?.rooms?.findIndex((room) =>
    position.x >= room.x &&
    position.x < room.x + room.width &&
    position.y >= room.y &&
    position.y < room.y + room.height
  ) ?? -1;
}

function maybeTriggerShowcaseAmbience() {
  const floorState = getCurrentFloorState();
  if (!floorState?.rooms?.length || !floorState?.showcases?.length) {
    return;
  }

  floorState.showcaseAmbienceSeen = floorState.showcaseAmbienceSeen ?? {};
  const roomIndex = getRoomIndexAtPosition(state.player, floorState);
  if (roomIndex < 0 || floorState.showcaseAmbienceSeen[roomIndex]) {
    return;
  }

  const showcasesInRoom = floorState.showcases.filter((showcase) => {
    const room = floorState.rooms[roomIndex];
    return showcase.x >= room.x &&
      showcase.x < room.x + room.width &&
      showcase.y >= room.y &&
      showcase.y < room.y + room.height;
  });
  if (!showcasesInRoom.length) {
    return;
  }

  const selectedShowcase = showcasesInRoom[randomInt(0, showcasesInRoom.length - 1)];
  const lines = DISPLAY_CASE_AMBIENCE[selectedShowcase.item.ambienceId] ?? [];
  if (!lines.length) {
    floorState.showcaseAmbienceSeen[roomIndex] = true;
    return;
  }

  const line = lines[randomInt(0, lines.length - 1)];
  addMessage(line);
  playShowcaseAmbienceSound();
  floorState.showcaseAmbienceSeen[roomIndex] = true;
}

function isDoorClosed(door) {
  return Boolean(door) && !door.isOpen;
}

function hasKeyForDoor(door, entity = state.player) {
  if (!door) {
    return false;
  }

  return entity === state.player && state.inventory.some((item) =>
    item.type === "key" &&
    item.keyColor === door.lockColor &&
    item.keyFloor === state.floor
  );
}

function consumeKeyForDoor(door, entity = state.player) {
  if (entity !== state.player || !door) {
    return null;
  }

  const keyIndex = state.inventory.findIndex((item) =>
    item.type === "key" &&
    item.keyColor === door.lockColor &&
    item.keyFloor === state.floor
  );

  if (keyIndex === -1) {
    return null;
  }

  const [usedKey] = state.inventory.splice(keyIndex, 1);
  return usedKey ?? null;
}

function getDoorColorLabels(color) {
  if (color === "green") {
    return { adjective: "gruene", adjectiveDative: "gruene", key: "gruener" };
  }

  if (color === "blue") {
    return { adjective: "blaue", adjectiveDative: "blauen", key: "blauer" };
  }

  return { adjective: color, adjectiveDative: color, key: color };
}

function canPlayerOpenDoor(door) {
  if (!door) {
    return true;
  }

  if (door.isOpen) {
    return true;
  }

  if (door.doorType === DOOR_TYPE.LOCKED) {
    return hasKeyForDoor(door);
  }

  return true;
}

function openDoor(door, actor = "player") {
  if (!door || door.isOpen) {
    return true;
  }

  let usedKey = null;
  if (door.doorType === DOOR_TYPE.LOCKED) {
    usedKey = consumeKeyForDoor(door);
    if (!usedKey) {
      return false;
    }
  }

  if (door.doorType === DOOR_TYPE.LOCKED && !usedKey) {
    return false;
  }

  door.isOpen = true;
  playDoorOpenSound();
  if (actor === "player") {
    const colorLabels = getDoorColorLabels(door.lockColor);
    addMessage(
      door.doorType === DOOR_TYPE.LOCKED
        ? `Der ${colorLabels.key} Schluessel von Ebene ${usedKey.keyFloor} entriegelt die Tuer und wird verbraucht.`
        : "Die Tuer schwingt auf.",
      "important",
    );
  } else {
    addMessage(`${actor.name} drueckt eine Tuer auf.`, "danger");
  }
  if (door.doorType === DOOR_TYPE.LOCKED) {
    door.doorType = DOOR_TYPE.NORMAL;
    door.lockColor = null;
  }
  return true;
}

function closeDoor(door) {
  if (!door || !door.isOpen) {
    return false;
  }

  const floorState = getCurrentFloorState();
  const occupiedByEnemy = floorState.enemies.some((enemy) => enemy.x === door.x && enemy.y === door.y);
  const occupiedByPlayer = state.player.x === door.x && state.player.y === door.y;
  if (occupiedByEnemy || occupiedByPlayer) {
    return false;
  }

  door.isOpen = false;
  playDoorCloseSound();
  return true;
}

function isInsideBoard(x, y) {
  return x >= 0 && x < WIDTH && y >= 0 && y < HEIGHT;
}

function isOpaqueTile(floorState, x, y) {
  if (!isInsideBoard(x, y) || floorState.grid[y][x] === TILE.WALL) {
    return true;
  }

  return isDoorClosed(getDoorAt(x, y, floorState));
}

function hasLineOfSight(floorState, fromX, fromY, toX, toY) {
  const startX = fromX + 0.5;
  const startY = fromY + 0.5;
  const endX = toX + 0.5;
  const endY = toY + 0.5;
  const deltaX = endX - startX;
  const deltaY = endY - startY;
  const steps = Math.max(Math.abs(deltaX), Math.abs(deltaY)) * 2;

  let previousCellX = fromX;
  let previousCellY = fromY;

  for (let step = 1; step <= steps; step += 1) {
    const progress = step / steps;
    const sampleX = Math.floor(startX + deltaX * progress);
    const sampleY = Math.floor(startY + deltaY * progress);

    if (sampleX === previousCellX && sampleY === previousCellY) {
      continue;
    }

    if (sampleX !== previousCellX && sampleY !== previousCellY) {
      if (
        isOpaqueTile(floorState, previousCellX, sampleY) &&
        isOpaqueTile(floorState, sampleX, previousCellY)
      ) {
        return false;
      }
    }

    if (sampleX === toX && sampleY === toY) {
      return true;
    }

    if (isOpaqueTile(floorState, sampleX, sampleY)) {
      return false;
    }

    previousCellX = sampleX;
    previousCellY = sampleY;
  }

  return true;
}

function updateVisibility() {
  const floorState = getCurrentFloorState();
  if (!floorState) {
    return;
  }

  floorState.visible = createMaskGrid(false);
  floorState.visible[state.player.y][state.player.x] = true;
  floorState.explored[state.player.y][state.player.x] = true;

  for (let y = 0; y < HEIGHT; y += 1) {
    for (let x = 0; x < WIDTH; x += 1) {
      const distance = Math.max(Math.abs(x - state.player.x), Math.abs(y - state.player.y));
      if (distance > VISION_RADIUS) {
        continue;
      }

      if (!hasLineOfSight(floorState, state.player.x, state.player.y, x, y)) {
        continue;
      }

      floorState.visible[y][x] = true;
      floorState.explored[y][x] = true;
    }
  }

  for (let y = 0; y < HEIGHT; y += 1) {
    for (let x = 0; x < WIDTH; x += 1) {
      if (!floorState.visible[y][x] || floorState.grid[y][x] === TILE.WALL) {
        continue;
      }

      for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
        for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
          const nextX = x + offsetX;
          const nextY = y + offsetY;

          if (
            nextX < 0 ||
            nextY < 0 ||
            nextX >= WIDTH ||
            nextY >= HEIGHT ||
            floorState.grid[nextY][nextX] !== TILE.WALL
          ) {
            continue;
          }

          floorState.visible[nextY][nextX] = true;
          floorState.explored[nextY][nextX] = true;
        }
      }
    }
  }
}

function render() {
  syncTestApi();
  const combatSummary = getPlayerCombatSummary();
  const hungerClass = `state-${String(state.player.hungerState ?? HUNGER_STATE.NORMAL).toLowerCase()}`;
  updateVisibility();
  renderBoard();
  depthTitleElement.textContent = `Dungeon-Ebene ${state.floor}`;
  playerPanelTitleElement.textContent = state.player.name;
  topbarHpElement.textContent = combatSummary.hp;
  topbarLevelElement.textContent = combatSummary.level;
  topbarDamageElement.textContent = combatSummary.damage;
  topbarHitElement.textContent = combatSummary.hit;
  topbarCritElement.textContent = combatSummary.crit;
  topbarBlockElement.textContent = combatSummary.block;
  topbarFoodElement.textContent = getHungerStateLabel(state.player.hungerState);
  xpLabelElement.textContent = `${state.player.xp} / ${state.player.xpToNext} XP`;
  xpFillElement.style.width = `${Math.max(0, Math.min(100, (state.player.xp / state.player.xpToNext) * 100))}%`;
  nutritionLabelElement.textContent = `${state.player.nutrition} / ${state.player.nutritionMax}`;
  nutritionFillElement.style.width = `${Math.max(0, Math.min(100, (state.player.nutrition / state.player.nutritionMax) * 100))}%`;
  nutritionStateElement.textContent = getHungerStateLabel(state.player.hungerState);
  nutritionStateElement.className = `nutrition-state ${hungerClass}`;
  topbarFoodCardElement.className = `board-stat-pill ${hungerClass}`;
  renderPlayerSheet();
  renderEnemySheet();
  renderInventory();
  renderHighscores();
  renderRunStats();
  renderLog();
  inventoryModalElement.classList.toggle("hidden", !state.modals.inventoryOpen);
  inventoryModalElement.setAttribute("aria-hidden", String(!state.modals.inventoryOpen));
  runStatsModalElement.classList.toggle("hidden", !state.modals.runStatsOpen);
  runStatsModalElement.setAttribute("aria-hidden", String(!state.modals.runStatsOpen));
  optionsModalElement.classList.toggle("hidden", !state.modals.optionsOpen);
  optionsModalElement.setAttribute("aria-hidden", String(!state.modals.optionsOpen));
  helpModalElement.classList.toggle("hidden", !state.modals.helpOpen);
  helpModalElement.setAttribute("aria-hidden", String(!state.modals.helpOpen));
  highscoresModalElement.classList.toggle("hidden", !state.modals.highscoresOpen);
  highscoresModalElement.setAttribute("aria-hidden", String(!state.modals.highscoresOpen));
  startModalElement.classList.toggle("hidden", !state.modals.startOpen);
  startModalElement.setAttribute("aria-hidden", String(!state.modals.startOpen));
  stairsModalElement.classList.toggle("hidden", !state.pendingStairChoice);
  stairsModalElement.setAttribute("aria-hidden", String(!state.pendingStairChoice));
  deathKillsModalElement.classList.toggle("hidden", !state.modals.deathKillsOpen);
  deathKillsModalElement.setAttribute("aria-hidden", String(!state.modals.deathKillsOpen));
  deathModalElement.classList.contains("hidden")
    ? deathModalElement.setAttribute("aria-hidden", "true")
    : deathModalElement.setAttribute("aria-hidden", "false");
  toggleStepSoundElement.checked = state.options.stepSound;
  toggleDeathSoundElement.checked = state.options.deathSound;
  collapsibleCards.forEach((card) => {
    const key = card.dataset.collapsible;
    if (key === "player") {
      const mode = state.collapsedCards.player ?? "summary";
      card.classList.toggle("collapsed", mode === "hidden");
      card.classList.toggle("player-summary", mode === "summary");
      card.classList.toggle("player-full", mode === "full");
      card.classList.toggle("player-hidden", mode === "hidden");
      } else {
        const collapsed = key === "log"
          ? (state.collapsedCards.log ?? "compact") === "hidden"
          : Boolean(state.collapsedCards[key]);
        card.classList.toggle("collapsed", collapsed);
        if (key === "log") {
          const mode = state.collapsedCards.log ?? "compact";
          card.classList.toggle("log-compact", mode === "compact");
          card.classList.toggle("log-full", mode === "full");
          card.classList.toggle("log-hidden", mode === "hidden");
        }
      }
      const button = card.querySelector(".collapse-btn");
      if (button) {
        if (key === "player") {
          const mode = state.collapsedCards.player ?? "summary";
          button.textContent = mode === "summary"
            ? "Alle Werte"
            : mode === "full"
              ? "Einklappen"
              : "Kompakt";
        } else if (key === "log") {
          const mode = state.collapsedCards.log ?? "compact";
          button.textContent = mode === "compact"
            ? "Mehr"
            : mode === "full"
              ? "Einklappen"
              : "Kompakt";
        } else {
          const collapsed = Boolean(state.collapsedCards[key]);
          button.textContent = collapsed ? "Ausklappen" : "Einklappen";
        }
      }
  });
  updatePotionChoiceSelection();
}

  function toggleCardCollapse(key) {
    if (key === "player") {
      const currentMode = state.collapsedCards.player ?? "summary";
      state.collapsedCards.player = currentMode === "summary"
        ? "full"
        : currentMode === "full"
          ? "hidden"
          : "summary";
    } else if (key === "log") {
      const currentMode = state.collapsedCards.log ?? "compact";
      state.collapsedCards.log = currentMode === "compact"
        ? "full"
        : currentMode === "full"
          ? "hidden"
          : "compact";
    } else {
      state.collapsedCards[key] = !state.collapsedCards[key];
    }
  render();
}

function showChoiceModal(config) {
  const allowedActions = CHOICE_ACTIONS[config.kind] ?? [];
  const selectedAction = allowedActions.includes(config.selectedAction)
    ? config.selectedAction
    : allowedActions[0];
  state.pendingChoice = {
    ...config,
    selectedAction,
  };
  choiceTitleElement.textContent = config.title;
  if (config.htmlText) {
    choiceTextElement.innerHTML = config.htmlText;
  } else {
    choiceTextElement.textContent = config.text;
  }
  choiceDrinkButton.textContent = config.labels[0];
  choiceStoreButton.textContent = config.labels[1];
  choiceLeaveButton.textContent = config.labels[2];
  choiceModalElement.classList.remove("hidden");
  choiceModalElement.setAttribute("aria-hidden", "false");
  updatePotionChoiceSelection();
}

function hideChoiceModal() {
  state.pendingChoice = null;
  choiceModalElement.classList.add("hidden");
  choiceModalElement.setAttribute("aria-hidden", "true");
}

function showStairChoice(config) {
  state.pendingStairChoice = {
    ...config,
    selectedAction: config.selectedAction ?? "stay",
  };
  stairsTitleElement.textContent = config.title;
  stairsTextElement.textContent = config.text;
  stairsConfirmButton.textContent = config.confirmLabel ?? "Ebene wechseln";
  stairsStayButton.textContent = config.stayLabel ?? "Hier bleiben";
  stairsModalElement.classList.remove("hidden");
  stairsModalElement.setAttribute("aria-hidden", "false");
  updateStairChoiceSelection();
}

function hideStairChoice() {
  state.pendingStairChoice = null;
  stairsModalElement.classList.add("hidden");
  stairsModalElement.setAttribute("aria-hidden", "true");
}

function updatePotionChoiceSelection() {
  const selected = state?.pendingChoice?.selectedAction;
  choiceDrinkButton.classList.toggle("selected", selected === "drink" || selected === "equip" || selected === "eat");
  choiceStoreButton.classList.toggle("selected", selected === "store");
  choiceLeaveButton.classList.toggle("selected", selected === "leave");
}

function updateStairChoiceSelection() {
  const selected = state?.pendingStairChoice?.selectedAction;
  stairsConfirmButton.classList.toggle("selected", selected === "change-floor");
  stairsStayButton.classList.toggle("selected", selected === "stay");
}

function cyclePotionChoice(direction) {
  if (!state.pendingChoice) {
    return;
  }

  const actions = CHOICE_ACTIONS[state.pendingChoice.kind];
  const currentIndex = actions.indexOf(state.pendingChoice.selectedAction);
  const nextIndex = (currentIndex + direction + actions.length) % actions.length;
  state.pendingChoice.selectedAction = actions[nextIndex];
  updatePotionChoiceSelection();
}

function cycleStairChoice(direction) {
  if (!state.pendingStairChoice) {
    return;
  }

  const currentIndex = STAIR_ACTIONS.indexOf(state.pendingStairChoice.selectedAction);
  const nextIndex = (currentIndex + direction + STAIR_ACTIONS.length) % STAIR_ACTIONS.length;
  state.pendingStairChoice.selectedAction = STAIR_ACTIONS[nextIndex];
  updateStairChoiceSelection();
}

function resolveChoiceBySlot(slotIndex) {
  if (!state.pendingChoice) {
    return;
  }

  const actions = CHOICE_ACTIONS[state.pendingChoice.kind];
  const action = actions?.[slotIndex];
  if (!action) {
    return;
  }

  resolvePotionChoice(action);
}

function resolveStairChoice(action) {
  if (!state.pendingStairChoice) {
    return;
  }

  const pending = state.pendingStairChoice;
  hideStairChoice();

  if (action === "change-floor") {
    const changedFloor = moveToFloor(pending.direction);
    if (changedFloor) {
      endTurn({ skipEnemyMove: true });
      return;
    }

    addMessage("Die Treppe fuehrt hier gerade nirgendwohin.");
    render();
    return;
  }

  addMessage(pending.direction > 0
    ? "Du bleibst auf der Treppe stehen, ohne hinabzusteigen."
    : "Du bleibst auf der Treppe stehen, ohne hinaufzusteigen.");
  render();
}

function toggleInventory(forceOpen) {
  state.modals.inventoryOpen = forceOpen ?? !state.modals.inventoryOpen;
  render();
}

function toggleRunStats(forceOpen) {
  state.modals.runStatsOpen = forceOpen ?? !state.modals.runStatsOpen;
  render();
}

function setInventoryFilter(filter) {
  state.preferences.inventoryFilter = filter;
  render();
}

function toggleOptions(forceOpen) {
  state.modals.optionsOpen = forceOpen ?? !state.modals.optionsOpen;
  render();
}

function toggleHelp(forceOpen) {
  state.modals.helpOpen = forceOpen ?? !state.modals.helpOpen;
  render();
}

function toggleHighscores(forceOpen) {
  state.modals.highscoresOpen = forceOpen ?? !state.modals.highscoresOpen;
  render();
}

function toggleDeathKills(forceOpen) {
  state.modals.deathKillsOpen = forceOpen ?? !state.modals.deathKillsOpen;
  render();
}

function playStepSound() {
  if (!state.options.stepSound) {
    return;
  }

  const context = getAudioContext();
  if (!context) {
    return;
  }

  const now = context.currentTime;
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = "square";
  oscillator.frequency.setValueAtTime(220, now);
  oscillator.frequency.exponentialRampToValueAtTime(145, now + 0.07);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.05, now + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.11);

  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(now);
  oscillator.stop(now + 0.12);
}

function ensureFloorExists(floorNumber) {
  if (!state.floors[floorNumber]) {
    state.floors[floorNumber] = createDungeonLevel(floorNumber);
  }
}

function transferFloorFollower(fromFloor, targetFloor, sourceStair, targetStair) {
  const sourceFloor = state.floors[fromFloor];
  const destinationFloor = state.floors[targetFloor];
  if (!sourceFloor || !destinationFloor || !sourceStair || !targetStair) {
    return null;
  }

  const follower = sourceFloor.enemies.find((enemy) =>
    enemy.canChangeFloors &&
    enemy.aggro &&
    manhattanDistance(enemy, sourceStair) <= 2
  );

  if (!follower) {
    return null;
  }

  const occupied = destinationFloor.enemies.some((enemy) => enemy.x === targetStair.x && enemy.y === targetStair.y) ||
    (state.player.x === targetStair.x && state.player.y === targetStair.y);
  if (occupied) {
    return null;
  }

  sourceFloor.enemies = sourceFloor.enemies.filter((enemy) => enemy !== follower);
  follower.x = targetStair.x;
  follower.y = targetStair.y;
  follower.originX = targetStair.x;
  follower.originY = targetStair.y;
  destinationFloor.enemies.push(follower);
  return follower;
}

function moveToFloor(direction) {
  const currentFloorState = getCurrentFloorState();
  const targetFloor = state.floor + direction;
  state.safeRestTurns = 0;
  const sourceStair = direction > 0 ? currentFloorState.stairsDown : currentFloorState.stairsUp;

  if (direction > 0) {
    ensureFloorExists(targetFloor);
    state.floor = targetFloor;
    state.deepestFloor = Math.max(state.deepestFloor, state.floor);
    const targetStair = state.floors[targetFloor].stairsUp
      ? state.floors[targetFloor].stairsUp
      : state.floors[targetFloor].startPosition;
    state.player.x = targetStair.x;
    state.player.y = targetStair.y;
    detectNearbyTraps();
    maybeTriggerShowcaseAmbience();
    const follower = transferFloorFollower(targetFloor - 1, targetFloor, sourceStair, targetStair);
    addMessage(`Du steigst tiefer hinab. Dungeon-Ebene ${state.floor} beginnt.`, "important");
    if (follower) {
      addMessage(`${follower.name} folgt dir ueber die Treppe.`, "danger");
    }
    return true;
  }

  if (direction < 0 && currentFloorState.stairsUp && state.floor > 1) {
    state.floor = targetFloor;
    const targetStair = state.floors[targetFloor].stairsDown;
    state.player.x = targetStair.x;
    state.player.y = targetStair.y;
    detectNearbyTraps();
    maybeTriggerShowcaseAmbience();
    const follower = transferFloorFollower(targetFloor + 1, targetFloor, sourceStair, targetStair);
    addMessage(`Du steigst vorsichtig wieder auf Ebene ${state.floor}.`, "important");
    if (follower) {
      addMessage(`${follower.name} setzt dir weiter nach.`, "danger");
    }
    return true;
  }

  return false;
}

function tryUseStairs() {
  const floorState = getCurrentFloorState();

  if (floorState.stairsDown && floorState.stairsDown.x === state.player.x && floorState.stairsDown.y === state.player.y) {
    showStairChoice({
      direction: 1,
      title: "Abwaertstreppe",
      text: `Du stehst auf einer Treppe nach unten. Moechtest du auf Ebene ${state.floor + 1} hinabsteigen oder hier bleiben?`,
      confirmLabel: "Hinabsteigen",
      stayLabel: "Hier bleiben",
    });
    render();
    return true;
  }

  if (floorState.stairsUp && floorState.stairsUp.x === state.player.x && floorState.stairsUp.y === state.player.y) {
    showStairChoice({
      direction: -1,
      title: "Aufwaertstreppe",
      text: `Du stehst auf einer Treppe nach oben. Moechtest du auf Ebene ${state.floor - 1} hinaufsteigen oder hier bleiben?`,
      confirmLabel: "Hinaufsteigen",
      stayLabel: "Hier bleiben",
    });
    render();
    return true;
  }

  return false;
}

function endTurn({ skipEnemyMove = false, actionType = "other" } = {}) {
  state.turn += 1;
  if (!state.gameOver) {
    applyPlayerNutritionTurnCost();
  }
  if (!state.gameOver && !skipEnemyMove) {
    moveEnemies();
  }
  if (!state.gameOver) {
    processContinuousTraps();
  }
  if (!state.gameOver) {
    processSafeRegeneration(actionType);
  }
  render();
}

function tryCloseAdjacentDoor() {
  if (state.gameOver || state.modals.startOpen || state.pendingChoice || state.pendingStairChoice || state.modals.inventoryOpen || state.modals.runStatsOpen || state.modals.optionsOpen || state.modals.helpOpen || state.modals.highscoresOpen || state.modals.deathKillsOpen) {
    return;
  }

  const floorState = getCurrentFloorState();
  const adjacentDoors = (floorState.doors ?? []).filter((door) =>
    door.isOpen &&
    manhattanDistance(door, state.player) === 1
  );

  if (adjacentDoors.length === 0) {
    addMessage("Keine offene Tuer direkt neben dir.");
    render();
    return;
  }

  const targetDoor = adjacentDoors[0];
  if (!closeDoor(targetDoor)) {
    addMessage("Die Tuer laesst sich gerade nicht schliessen.");
    render();
    return;
  }

  addMessage("Du ziehst die Tuer wieder zu.", "important");
  endTurn({ actionType: "other" });
}

function movePlayer(dx, dy) {
  if (state.gameOver || state.modals.startOpen || state.pendingChoice || state.pendingStairChoice || state.modals.inventoryOpen || state.modals.runStatsOpen || state.modals.helpOpen || state.modals.highscoresOpen || state.modals.deathKillsOpen) {
    return;
  }

  const floorState = getCurrentFloorState();
  const targetX = state.player.x + dx;
  const targetY = state.player.y + dy;

  if (targetX < 0 || targetX >= WIDTH || targetY < 0 || targetY >= HEIGHT) {
    return;
  }

  if (floorState.grid[targetY][targetX] === TILE.WALL) {
    addMessage("Nur kalter Stein. Dort kommst du nicht durch.");
    render();
    return;
  }

  const door = getDoorAt(targetX, targetY, floorState);
  if (door && !door.isOpen) {
    if (!canPlayerOpenDoor(door)) {
      playLockedDoorSound();
      const hasWrongFloorKey = state.inventory.some((item) =>
        item.type === "key" &&
        item.keyColor === door.lockColor &&
        item.keyFloor !== state.floor
      );
      addMessage(
        hasWrongFloorKey
          ? `Die ${getDoorColorLabels(door.lockColor).adjective} Tuer reagiert nicht auf deinen Schluessel von einer anderen Ebene.`
          : `Die ${getDoorColorLabels(door.lockColor).adjective} Tuer bleibt verschlossen.`,
      );
      render();
      return;
    }

    openDoor(door, "player");
  }

  if (getShowcaseAt(targetX, targetY, floorState)) {
    addMessage("Eine Glasvitrine versperrt dir hier den Weg.");
    render();
    return;
  }

  const enemy = floorState.enemies.find((entry) => entry.x === targetX && entry.y === targetY);
  if (enemy) {
    attackEnemy(enemy);
    endTurn({ actionType: "other" });
    return;
  }

  state.player.x = targetX;
  state.player.y = targetY;
  playStepSound();

  handleActorEnterTile(state.player);
  if (state.gameOver) {
    render();
    return;
  }
  detectNearbyTraps();
  maybeTriggerShowcaseAmbience();

  if (tryPickupLoot()) {
    return;
  }

  const stairPromptShown = tryUseStairs();
  if (stairPromptShown) {
    return;
  }

  endTurn({ actionType: "move" });
}

function handleWait() {
  if (state.gameOver || state.modals.startOpen || state.pendingChoice || state.pendingStairChoice || state.modals.inventoryOpen || state.modals.runStatsOpen || state.modals.helpOpen || state.modals.highscoresOpen || state.modals.deathKillsOpen) {
    return;
  }

  if (hasNearbyEnemy()) {
    addMessage("Du wartest, aber in der Naehe ist noch Gefahr.");
  } else {
    addMessage("Du horchst in die Dunkelheit und sammelst langsam wieder Kraft.");
  }
  playStepSound();
  detectNearbyTraps();
  endTurn({ actionType: "wait" });
}

function handleInput(event) {
  const key = event.key.toLowerCase();

  if (key === "r") {
    hideChoiceModal();
    hideStairChoice();
    toggleInventory(false);
    toggleRunStats(false);
    toggleOptions(false);
    toggleHelp(false);
    toggleHighscores(false);
    toggleDeathKills(false);
    hideDeathModal();
    initializeGame();
    syncStartModalControls();
    return;
  }

  if (state.modals.startOpen) {
    return;
  }

  if (state.pendingStairChoice) {
    if (key === "enter") {
      event.preventDefault();
      resolveStairChoice(state.pendingStairChoice.selectedAction);
      return;
    }

    if (key === "escape") {
      event.preventDefault();
      resolveStairChoice("stay");
      return;
    }

    if (key === "arrowleft" || key === "a") {
      event.preventDefault();
      cycleStairChoice(-1);
      return;
    }

    if (key === "arrowright" || key === "d") {
      event.preventDefault();
      cycleStairChoice(1);
      return;
    }

    if (key === "w" || key === "arrowup" || key === "s" || key === "arrowdown") {
      event.preventDefault();
      cycleStairChoice(1);
      return;
    }

    return;
  }

  if (state.pendingChoice) {
    if (key === "enter") {
      event.preventDefault();
      resolvePotionChoice(state.pendingChoice.selectedAction);
      return;
    }

    if (key === "arrowleft" || key === "a") {
      event.preventDefault();
      cyclePotionChoice(-1);
      return;
    }

    if (key === "arrowright" || key === "d") {
      event.preventDefault();
      cyclePotionChoice(1);
      return;
    }

    return;
  }

  if (key === "i") {
    event.preventDefault();
    toggleInventory();
    return;
  }

  if (key === "l") {
    event.preventDefault();
    toggleRunStats();
    return;
  }

  if (key === "o") {
    event.preventDefault();
    toggleOptions();
    return;
  }

  if (key === "?") {
    event.preventDefault();
    toggleHelp();
    return;
  }

  if (state.modals.inventoryOpen || state.modals.runStatsOpen || state.modals.optionsOpen || state.modals.helpOpen || state.modals.highscoresOpen || state.modals.deathKillsOpen) {
    if (key === "escape") {
      toggleInventory(false);
      toggleRunStats(false);
      toggleOptions(false);
      toggleHelp(false);
      toggleHighscores(false);
      toggleDeathKills(false);
    }
    return;
  }

  const movement = {
    arrowup: [0, -1],
    w: [0, -1],
    arrowdown: [0, 1],
    s: [0, 1],
    arrowleft: [-1, 0],
    a: [-1, 0],
    arrowright: [1, 0],
    d: [1, 0],
  }[key];

  if (movement) {
    event.preventDefault();
    movePlayer(...movement);
    return;
  }

  if (key === " ") {
    event.preventDefault();
    handleWait();
    return;
  }

  if (key === "c") {
    event.preventDefault();
    tryCloseAdjacentDoor();
    return;
  }

  if (key === "h") {
    event.preventDefault();
    quickUsePotion();
  }
}

function renderClassOptions(selectedClassId) {
  classOptionsElement.innerHTML = "";

  Object.values(HERO_CLASSES).forEach((heroClass) => {
    const label = document.createElement("label");
    label.className = `class-option${heroClass.id === selectedClassId ? " selected" : ""}`;
    label.tabIndex = 0;
    label.innerHTML = `
      <input type="radio" name="heroClass" value="${heroClass.id}" ${heroClass.id === selectedClassId ? "checked" : ""}>
      <strong>${heroClass.label}</strong>
      <span>${heroClass.tagline}</span>
    `;
    const input = label.querySelector('input[name="heroClass"]');
    const applySelection = () => {
      if (!input) {
        return;
      }

      input.checked = true;
      classOptionsElement.querySelectorAll(".class-option").forEach((option) => {
        option.classList.toggle("selected", option === label);
      });
    };
    label.addEventListener("click", applySelection);
    label.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        applySelection();
      }
    });
    input?.addEventListener("change", applySelection);
    classOptionsElement.appendChild(label);
  });
}

function syncStartModalControls() {
  const fallbackName = state?.player?.name ?? loadHeroName();
  const fallbackClassId = state?.player?.classId ?? loadHeroClassId();
  heroNameInputElement.value = fallbackName;
  saveHeroNameButtonElement.textContent = "Start";
  heroIdentityStatusElement.textContent = "Wird fuer den aktuellen und den naechsten Lauf gemerkt.";
  heroIdentityStatusElement.classList.remove("success");
  renderClassOptions(fallbackClassId);
}

function applyStartProfile() {
  const selectedClass = classOptionsElement.querySelector('input[name="heroClass"]:checked')?.value ?? loadHeroClassId();
  const nextName = saveHeroName(heroNameInputElement.value);
  const nextClassId = saveHeroClassId(selectedClass);

  saveHeroNameButtonElement.textContent = "Gespeichert";
  heroIdentityStatusElement.textContent = `${nextName} startet als ${HERO_CLASSES[nextClassId].label}.`;
  heroIdentityStatusElement.classList.add("success");
  window.clearTimeout(heroIdentityStatusTimeout);
  heroIdentityStatusTimeout = window.setTimeout(() => {
    saveHeroNameButtonElement.textContent = "Start";
    heroIdentityStatusElement.textContent = "Wird fuer den aktuellen und den naechsten Lauf gemerkt.";
    heroIdentityStatusElement.classList.remove("success");
  }, 1400);

  initializeGame({ heroName: nextName, heroClassId: nextClassId }, { openStartModal: false });
}

choiceDrinkButton.addEventListener("click", () => resolveChoiceBySlot(0));
choiceStoreButton.addEventListener("click", () => resolveChoiceBySlot(1));
choiceLeaveButton.addEventListener("click", () => resolveChoiceBySlot(2));
stairsConfirmButton.addEventListener("click", () => resolveStairChoice("change-floor"));
stairsStayButton.addEventListener("click", () => resolveStairChoice("stay"));
openInventoryButton.addEventListener("click", () => toggleInventory(true));
openRunStatsButton.addEventListener("click", () => toggleRunStats(true));
closeRunStatsButton.addEventListener("click", () => toggleRunStats(false));
closeInventoryButton.addEventListener("click", () => toggleInventory(false));
inventoryFilterButtons.forEach((button) => {
  button.addEventListener("click", () => setInventoryFilter(button.dataset.filter ?? "all"));
});
openOptionsButton.addEventListener("click", () => toggleOptions(true));
closeOptionsButton.addEventListener("click", () => toggleOptions(false));
openHighscoresButton.addEventListener("click", () => toggleHighscores(true));
closeHighscoresButton.addEventListener("click", () => toggleHighscores(false));
openHelpButton.addEventListener("click", () => toggleHelp(true));
closeHelpButton.addEventListener("click", () => toggleHelp(false));
openDeathKillsButton.addEventListener("click", () => toggleDeathKills(true));
closeDeathKillsButton.addEventListener("click", () => toggleDeathKills(false));
closeDeathButton.addEventListener("click", () => hideDeathModal());
document.querySelectorAll(".collapse-btn").forEach((button) => {
  button.addEventListener("click", () => toggleCardCollapse(button.dataset.target));
});
bindTooltip(topbarHpCardElement, () => getTopbarTooltipContent().hp);
bindTooltip(topbarLevelCardElement, () => getTopbarTooltipContent().level);
bindTooltip(topbarDamageCardElement, () => getTopbarTooltipContent().damage);
bindTooltip(topbarHitCardElement, () => getTopbarTooltipContent().hit);
bindTooltip(topbarCritCardElement, () => getTopbarTooltipContent().crit);
bindTooltip(topbarBlockCardElement, () => getTopbarTooltipContent().block);
toggleStepSoundElement.addEventListener("change", () => {
  state.options.stepSound = toggleStepSoundElement.checked;
  saveOptions();
});
toggleDeathSoundElement.addEventListener("change", () => {
  state.options.deathSound = toggleDeathSoundElement.checked;
  saveOptions();
});
startFormElement.addEventListener("submit", (event) => {
  event.preventDefault();
  applyStartProfile();
});
document.addEventListener("keydown", handleInput);
initializeGame();
detectNearbyTraps();
render();
syncStartModalControls();
