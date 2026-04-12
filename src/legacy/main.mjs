import { WIDTH, HEIGHT, TILE_SIZE, TILE_GAP, BOARD_PADDING, ROOM_ATTEMPTS, MIN_ROOM_SIZE, MAX_ROOM_SIZE, LOG_LIMIT, HIGHSCORE_KEY, HIGHSCORE_STORAGE_VERSION, HIGHSCORE_VERSION_KEY, VISION_RADIUS, BASE_HIT_CHANCE, MIN_HIT_CHANCE, MAX_HIT_CHANCE, MIN_CRIT_CHANCE, MAX_CRIT_CHANCE, TILE, MONSTER_CATALOG, WEAPON_CATALOG, OFFHAND_CATALOG } from './data.mjs';
import { boardElement, heroIdentityFormElement, heroNameInputElement, saveHeroNameButtonElement, heroIdentityStatusElement, messageLogElement, inventoryListElement, inventoryCountElement, playerSheetElement, enemySheetElement, highscoreListElement, depthTitleElement, topbarHpCardElement, topbarHpElement, topbarLevelCardElement, topbarLevelElement, topbarDamageCardElement, topbarDamageElement, topbarHitCardElement, topbarHitElement, topbarCritCardElement, topbarCritElement, topbarBlockCardElement, topbarBlockElement, xpLabelElement, xpFillElement, potionsElement, choiceModalElement, choiceTitleElement, choiceTextElement, choiceDrinkButton, choiceStoreButton, choiceLeaveButton, stairsModalElement, stairsTitleElement, stairsTextElement, stairsConfirmButton, stairsStayButton, inventoryModalElement, openInventoryButton, closeInventoryButton, optionsModalElement, openOptionsButton, closeOptionsButton, toggleStepSoundElement, toggleDeathSoundElement, deathModalElement, deathSummaryElement, deathKillsElement, closeDeathButton, hoverTooltipElement, collapsibleCards } from './dom.mjs';
import { createDungeonApi } from './dungeon.mjs';
import { createStateApi } from './state.mjs';
import { createRenderApi } from './render.mjs';
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
const DEFAULT_HERO_NAME = "Final Girl";
const CHOICE_ACTIONS = {
  potion: ["drink", "store", "leave"],
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
    name: "Bloße Fäuste",
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
  };
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
    return `${item.blockChance}% Block | ${item.blockValue} Blockwert`;
  }

  return item.description ?? "Nebenhand-Item";
}

function getOffHandTooltipLines(item) {
  if (!item) {
    return ["Kein Gegenstand ausgeruestet."];
  }

  if (item.subtype === "shield") {
    return [
      item.source,
      `${item.blockChance}% Blockchance`,
      `${item.blockValue} Schadensblock`,
      item.description,
    ];
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

  if (weapon.critBonus !== 0) {
    stats.push(`${formatModifier(weapon.critBonus)} Krit`);
  }

  return stats.join(" | ");
}

function createMaskGrid(fill = false) {
  return createGrid(WIDTH, HEIGHT, fill);
}

const {
  createEnemy,
  createWeaponPickup,
  createOffHandPickup,
  createChestPickup,
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
  saveOptions,
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
  DEFAULT_HERO_NAME,
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
  playerSheetElement,
  enemySheetElement,
  highscoreListElement,
  hoverTooltipElement,
  getState: () => state,
  getCurrentFloorState,
  getMainHand,
  getOffHand,
  getCombatWeapon,
  formatWeaponStats,
  formatOffHandStats,
  getOffHandTooltipLines,
  clamp,
  loadHighscores,
  countPotionsInInventory,
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
  showFloatingText,
  playVictorySound,
  playLevelUpSound,
  playEnemyHitSound,
  playDodgeSound,
  xpForNextLevel,
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
  getState: () => state,
  getCurrentFloorState,
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
  saveHighscoreIfNeeded,
  showDeathModal,
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
  cloneWeapon,
  cloneOffHandItem,
  createWeaponPickup,
  createOffHandPickup,
  formatWeaponStats,
  formatOffHandStats,
  addMessage,
  showChoiceModal,
  hideChoiceModal,
  endTurn,
  healPlayer,
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

function showDeathModal(rank) {
  deathSummaryElement.innerHTML = [
    createSheetRow("Name", state.player.name),
    createSheetRow("Gestorben auf Ebene", state.floor),
    createSheetRow("Erreichte tiefste Ebene", state.deepestFloor),
    createSheetRow("Level", state.player.level),
    createSheetRow("Gegner besiegt", state.kills),
    createSheetRow("Schritte", state.turn),
    createSheetRow("Abgang", state.deathCause ?? "Unbekannte Schluss-Szene"),
    createSheetRow("Highscore-Platz", rank ? `#${rank}` : "Außer Wertung"),
  ].join("");
  const killEntries = Object.entries(state.killStats)
    .sort((a, b) => b[1] - a[1]);
  deathKillsElement.innerHTML = killEntries.length > 0
    ? killEntries.map(([name, count]) => createSheetRow(name, count)).join("")
    : `<div class="inventory-empty">Keine Gegner besiegt.</div>`;
  deathModalElement.classList.remove("hidden");
  deathModalElement.setAttribute("aria-hidden", "false");
}

function hideDeathModal() {
  deathModalElement.classList.add("hidden");
  deathModalElement.setAttribute("aria-hidden", "true");
}

function countPotionsInInventory() {
  return state.inventory.filter((item) => item.type === "potion").length;
}

function getCurrentFloorState() {
  return state.floors[state.floor];
}

function isInsideBoard(x, y) {
  return x >= 0 && x < WIDTH && y >= 0 && y < HEIGHT;
}

function isOpaqueTile(floorState, x, y) {
  return !isInsideBoard(x, y) || floorState.grid[y][x] === TILE.WALL;
}

function hasLineOfSight(floorState, fromX, fromY, toX, toY) {
  let x = fromX;
  let y = fromY;
  const dx = Math.abs(toX - fromX);
  const dy = Math.abs(toY - fromY);
  const sx = fromX < toX ? 1 : -1;
  const sy = fromY < toY ? 1 : -1;
  let err = dx - dy;

  while (!(x === toX && y === toY)) {
    const twiceErr = err * 2;
    if (twiceErr > -dy) {
      err -= dy;
      x += sx;
    }
    if (twiceErr < dx) {
      err += dx;
      y += sy;
    }

    if (x === toX && y === toY) {
      return true;
    }

    if (isOpaqueTile(floorState, x, y)) {
      return false;
    }
  }

  return true;
}

function updateVisibility() {
  const floorState = getCurrentFloorState();
  if (!floorState) {
    return;
  }

  floorState.visible = createMaskGrid(false);

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
}

function render() {
  syncTestApi();
  const combatSummary = getPlayerCombatSummary();
  updateVisibility();
  renderBoard();
  depthTitleElement.textContent = `Dungeon-Ebene ${state.floor}`;
  topbarHpElement.textContent = combatSummary.hp;
  topbarLevelElement.textContent = combatSummary.level;
  topbarDamageElement.textContent = combatSummary.damage;
  topbarHitElement.textContent = combatSummary.hit;
  topbarCritElement.textContent = combatSummary.crit;
  topbarBlockElement.textContent = combatSummary.block;
  inventoryCountElement.textContent = String(state.inventory.length);
  potionsElement.textContent = String(countPotionsInInventory());
  xpLabelElement.textContent = `${state.player.xp} / ${state.player.xpToNext} XP`;
  xpFillElement.style.width = `${Math.max(0, Math.min(100, (state.player.xp / state.player.xpToNext) * 100))}%`;
  renderPlayerSheet();
  renderEnemySheet();
  renderInventory();
  renderHighscores();
  renderLog();
  inventoryModalElement.classList.toggle("hidden", !state.modals.inventoryOpen);
  inventoryModalElement.setAttribute("aria-hidden", String(!state.modals.inventoryOpen));
  optionsModalElement.classList.toggle("hidden", !state.modals.optionsOpen);
  optionsModalElement.setAttribute("aria-hidden", String(!state.modals.optionsOpen));
  stairsModalElement.classList.toggle("hidden", !state.pendingStairChoice);
  stairsModalElement.setAttribute("aria-hidden", String(!state.pendingStairChoice));
  deathModalElement.classList.contains("hidden")
    ? deathModalElement.setAttribute("aria-hidden", "true")
    : deathModalElement.setAttribute("aria-hidden", "false");
  toggleStepSoundElement.checked = state.options.stepSound;
  toggleDeathSoundElement.checked = state.options.deathSound;
  collapsibleCards.forEach((card) => {
    const key = card.dataset.collapsible;
    const collapsed = Boolean(state.collapsedCards[key]);
    card.classList.toggle("collapsed", collapsed);
    const button = card.querySelector(".collapse-btn");
    if (button) {
      button.textContent = collapsed ? "Ausklappen" : "Einklappen";
    }
  });
  updatePotionChoiceSelection();
}

function toggleCardCollapse(key) {
  state.collapsedCards[key] = !state.collapsedCards[key];
  render();
}

function showChoiceModal(config) {
  state.pendingChoice = config;
  choiceTitleElement.textContent = config.title;
  choiceTextElement.textContent = config.text;
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
  choiceDrinkButton.classList.toggle("selected", selected === "drink");
  choiceDrinkButton.classList.toggle("selected", selected === "equip");
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

    addMessage("Die Treppe führt hier gerade nirgendwohin.");
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

function toggleOptions(forceOpen) {
  state.modals.optionsOpen = forceOpen ?? !state.modals.optionsOpen;
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
    const follower = transferFloorFollower(targetFloor - 1, targetFloor, sourceStair, targetStair);
    addMessage(`Du steigst tiefer hinab. Dungeon-Ebene ${state.floor} beginnt.`, "important");
    if (follower) {
      addMessage(`${follower.name} folgt dir über die Treppe.`, "danger");
    }
    return true;
  }

  if (direction < 0 && currentFloorState.stairsUp && state.floor > 1) {
    state.floor = targetFloor;
    const targetStair = state.floors[targetFloor].stairsDown;
    state.player.x = targetStair.x;
    state.player.y = targetStair.y;
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
      title: "Abwärtstreppe",
      text: `Du stehst auf einer Treppe nach unten. Möchtest du auf Ebene ${state.floor + 1} hinabsteigen oder hier bleiben?`,
      confirmLabel: "Hinabsteigen",
      stayLabel: "Hier bleiben",
    });
    render();
    return true;
  }

  if (floorState.stairsUp && floorState.stairsUp.x === state.player.x && floorState.stairsUp.y === state.player.y) {
    showStairChoice({
      direction: -1,
      title: "Aufwärtstreppe",
      text: `Du stehst auf einer Treppe nach oben. Möchtest du auf Ebene ${state.floor - 1} hinaufsteigen oder hier bleiben?`,
      confirmLabel: "Hinaufsteigen",
      stayLabel: "Hier bleiben",
    });
    render();
    return true;
  }

  return false;
}

function endTurn({ skipEnemyMove = false } = {}) {
  state.turn += 1;
  if (!state.gameOver && !skipEnemyMove) {
    moveEnemies();
  }
  if (!state.gameOver) {
    processSafeRegeneration();
  }
  render();
}

function movePlayer(dx, dy) {
  if (state.gameOver || state.pendingChoice || state.pendingStairChoice || state.modals.inventoryOpen) {
    return;
  }
  state.safeRestTurns = 0;

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

  const enemy = floorState.enemies.find((entry) => entry.x === targetX && entry.y === targetY);
  if (enemy) {
    attackEnemy(enemy);
    endTurn();
    return;
  }

  state.player.x = targetX;
  state.player.y = targetY;
  playStepSound();

  if (tryPickupLoot()) {
    return;
  }

  const stairPromptShown = tryUseStairs();
  if (stairPromptShown) {
    return;
  }

  endTurn();
}

function handleWait() {
  if (state.gameOver || state.pendingChoice || state.pendingStairChoice || state.modals.inventoryOpen) {
    return;
  }

  if (hasNearbyEnemy()) {
    addMessage("Du wartest, aber in der Nähe ist noch Gefahr.");
  } else {
    addMessage("Du horchst in die Dunkelheit und sammelst langsam wieder Kraft.");
  }
  playStepSound();
  endTurn();
}

function handleInput(event) {
  const key = event.key.toLowerCase();

  if (key === "r") {
    hideChoiceModal();
    hideStairChoice();
    toggleInventory(false);
    toggleOptions(false);
    hideDeathModal();
    initializeGame();
    syncHeroIdentityControls();
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

  if (key === "o") {
    event.preventDefault();
    toggleOptions();
    return;
  }

  if (state.modals.inventoryOpen || state.modals.optionsOpen) {
    if (key === "escape") {
      toggleInventory(false);
      toggleOptions(false);
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

  if (key === "h") {
    event.preventDefault();
    quickUsePotion();
  }
}

function syncHeroIdentityControls() {
  const fallbackName = state?.player?.name ?? loadHeroName();
  heroNameInputElement.value = fallbackName;
  saveHeroNameButtonElement.textContent = "Übernehmen";
  heroIdentityStatusElement.textContent = "Wird für den aktuellen und den nächsten Lauf gemerkt.";
  heroIdentityStatusElement.classList.remove("success");
}

function applyHeroNameFromInput() {
  const previousName = state.player.name;
  const nextName = saveHeroName(heroNameInputElement.value);
  state.player.name = nextName;
  heroNameInputElement.value = nextName;

  if (previousName !== nextName) {
    addMessage(`${nextName} betritt das Set.`, "important");
  }

  heroIdentityStatusElement.textContent = `Gespeichert. ${nextName} steht jetzt auf dem Call Sheet.`;
  heroIdentityStatusElement.classList.add("success");
  saveHeroNameButtonElement.textContent = "Gespeichert";
  window.clearTimeout(heroIdentityStatusTimeout);
  heroIdentityStatusTimeout = window.setTimeout(() => {
    saveHeroNameButtonElement.textContent = "Übernehmen";
    heroIdentityStatusElement.textContent = "Wird für den aktuellen und den nächsten Lauf gemerkt.";
    heroIdentityStatusElement.classList.remove("success");
  }, 1800);

  render();
}

choiceDrinkButton.addEventListener("click", () => resolveChoiceBySlot(0));
choiceStoreButton.addEventListener("click", () => resolveChoiceBySlot(1));
choiceLeaveButton.addEventListener("click", () => resolveChoiceBySlot(2));
stairsConfirmButton.addEventListener("click", () => resolveStairChoice("change-floor"));
stairsStayButton.addEventListener("click", () => resolveStairChoice("stay"));
openInventoryButton.addEventListener("click", () => toggleInventory(true));
closeInventoryButton.addEventListener("click", () => toggleInventory(false));
openOptionsButton.addEventListener("click", () => toggleOptions(true));
closeOptionsButton.addEventListener("click", () => toggleOptions(false));
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
heroIdentityFormElement.addEventListener("submit", (event) => {
  event.preventDefault();
  applyHeroNameFromInput();
});
saveHeroNameButtonElement.addEventListener("click", () => {
  applyHeroNameFromInput();
});
document.addEventListener("keydown", handleInput);
initializeGame();
syncHeroIdentityControls();
// Legacy implementation kept for reference. The active runtime entry point is src/main.mjs.
