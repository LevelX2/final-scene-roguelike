import { getActorDerivedMaxHp } from './derived-actor-stats.mjs';
import { cloneItemDef } from '../item-defs.mjs';
import { NORMAL_SPEED_INTERVAL } from './actor-speed.mjs';

export function createTestApiMutators(context) {
  const {
    WIDTH,
    HEIGHT,
    TILE,
    getState,
    getCurrentFloorState,
    getMainHand,
    getOffHand,
    grantExperience,
    cloneWeapon,
    cloneOffHandItem,
    createChestPickup,
    createPotionPickup,
    createFoodPickup,
    createDoor,
    createKeyPickup,
    setRandomSequence,
    clearRandomSequence,
    tryUseStairs,
    movePlayer,
    openChest,
    enterTargetMode,
    cancelTargetMode,
    moveTargetCursor,
    confirmTargetAttack,
    applyStatusEffect,
    processRoundStatusEffects,
    renderSelf,
  } = context;

  function teleportPlayer(position) {
    const state = getState();
    state.player.x = position.x;
    state.player.y = position.y;
    renderSelf();
  }

  function promptCurrentStairs() {
    return tryUseStairs();
  }

  function stepPlayer(dx, dy) {
    movePlayer?.(dx, dy);
    renderSelf();
  }

  function openChestAtPlayer() {
    const state = getState();
    const floorState = getCurrentFloorState();
    const chestIndex = floorState.chests?.findIndex((chest) => chest.x === state.player.x && chest.y === state.player.y) ?? -1;
    if (chestIndex === -1) {
      return false;
    }

    openChest?.(chestIndex);
    renderSelf();
    return true;
  }

  function addInventoryItem(item) {
    const state = getState();
    const clonedItem = item.type === "weapon"
      ? cloneWeapon(item)
      : item.type === "offhand"
        ? cloneOffHandItem(item)
        : { ...item };
    state.inventory.push(clonedItem);
    renderSelf();
  }

  function clearFloorEntities() {
    const state = getState();
    const floorState = getCurrentFloorState();
    floorState.enemies = [];
    floorState.consumables = [];
    floorState.potions = floorState.consumables;
    floorState.weapons = [];
    floorState.offHands = [];
    floorState.foods = [];
    floorState.keys = [];
    floorState.chests = [];
    floorState.doors = [];
    floorState.showcases = [];
    floorState.traps = [];
    state.messages = [];
    state.pendingChoice = null;
    state.pendingStairChoice = null;
    state.pendingContainerLoot = null;
    renderSelf();
  }

  function placePotion(position, potion = {}) {
    const floorState = getCurrentFloorState();
    floorState.grid[position.y][position.x] = TILE.FLOOR;
    floorState.consumables.push(createPotionPickup({
      ...(cloneItemDef("healing-potion") ?? {}),
      ...potion,
    }, position.x, position.y));
    renderSelf();
  }

  function placeWeapon(position, weapon) {
    const floorState = getCurrentFloorState();
    floorState.grid[position.y][position.x] = TILE.FLOOR;
    floorState.weapons.push({
      x: position.x,
      y: position.y,
      item: cloneWeapon(weapon),
    });
    renderSelf();
  }

  function placeFood(position, item) {
    const floorState = getCurrentFloorState();
    floorState.grid[position.y][position.x] = TILE.FLOOR;
    floorState.foods.push(createFoodPickup(item, position.x, position.y));
    renderSelf();
  }

  function placeOffHand(position, item) {
    const floorState = getCurrentFloorState();
    floorState.grid[position.y][position.x] = TILE.FLOOR;
    floorState.offHands.push({
      x: position.x,
      y: position.y,
      item: cloneOffHandItem(item),
    });
    renderSelf();
  }

  function placeChest(position, content) {
    const floorState = getCurrentFloorState();
    floorState.grid[position.y][position.x] = TILE.FLOOR;
    floorState.chests.push(createChestPickup(content, position.x, position.y));
    renderSelf();
  }

  function placeKey(position, color = "green", floorNumber = getState().floor) {
    const floorState = getCurrentFloorState();
    floorState.grid[position.y][position.x] = TILE.FLOOR;
    floorState.keys.push(createKeyPickup(color, position.x, position.y, floorNumber));
    renderSelf();
  }

  function placeDoor(position, config = {}) {
    const floorState = getCurrentFloorState();
    floorState.grid[position.y][position.x] = TILE.FLOOR;
    floorState.doors = floorState.doors ?? [];
    floorState.doors.push(createDoor(position.x, position.y, config));
    renderSelf();
  }

  function placeShowcase(position, item = {}) {
    const floorState = getCurrentFloorState();
    floorState.grid[position.y][position.x] = TILE.FLOOR;
    floorState.showcases = floorState.showcases ?? [];
    floorState.showcases.push({
      x: position.x,
      y: position.y,
      item: {
        type: "showcase",
        id: item.id ?? `test-showcase-${position.x}-${position.y}`,
        ambienceId: item.ambienceId ?? item.id ?? `test-showcase-${position.x}-${position.y}`,
        name: item.name ?? "Test-Vitrine",
        source: item.source ?? "Tests",
        description: item.description ?? "Nur fuer Tests.",
        iconAsset: item.iconAsset ?? null,
      },
    });
    renderSelf();
  }

  function placeTrap(position, trap = {}) {
    const floorState = getCurrentFloorState();
    floorState.grid[position.y][position.x] = TILE.FLOOR;
    floorState.traps = floorState.traps ?? [];
    floorState.traps.push({
      id: trap.id ?? `test-trap-${position.x}-${position.y}`,
      name: trap.name ?? "Testfalle",
      description: trap.description ?? "Nur fuer Tests.",
      type: trap.type ?? "floor",
      visibility: trap.visibility ?? "hidden",
      state: trap.state ?? "active",
      trigger: trap.trigger ?? "on_enter",
      resetMode: trap.resetMode ?? "single_use",
      affectsPlayer: trap.affectsPlayer ?? true,
      affectsEnemies: trap.affectsEnemies ?? true,
      detectDifficulty: trap.detectDifficulty,
      reactDifficulty: trap.reactDifficulty,
      effect: { ...(trap.effect ?? {}) },
      x: position.x,
      y: position.y,
    });
    renderSelf();
  }

  function setDebugReveal(value = true) {
    const floorState = getCurrentFloorState();
    floorState.debugReveal = Boolean(value);
    renderSelf();
  }

  function createTestEnemy(position, config = {}) {
    const enemyName = config.name ?? "Testgegner";

    return {
      x: position.x,
      y: position.y,
      type: "monster",
      id: config.id ?? "test-enemy",
      baseName: config.baseName ?? enemyName,
      name: enemyName,
      rank: 1,
      behavior: config.behavior ?? "dormant",
      behaviorLabel: config.behaviorLabel ?? "Test",
      mobility: config.mobility ?? "roaming",
      mobilityLabel: config.mobilityLabel ?? "Mobil",
      retreatProfile: config.retreatProfile ?? "none",
      retreatLabel: config.retreatLabel ?? "Standhaft",
      healingProfile: config.healingProfile ?? "slow",
      healingLabel: config.healingLabel ?? "Langsam",
      allowedTemperaments: [...(config.allowedTemperaments ?? [])],
      temperament: config.temperament ?? "stoic",
      temperamentHint: config.temperamentHint ?? "Regt sich kaum, bis etwas seine stille Geduld stört.",
      idleTarget: config.idleTarget ?? null,
      idleTargetType: config.idleTargetType ?? null,
      idlePlanAge: config.idlePlanAge ?? 0,
      recentRoomHistory: [...(config.recentRoomHistory ?? [])],
      recentDoorHistory: [...(config.recentDoorHistory ?? [])],
      recentAggroPositions: (config.recentAggroPositions ?? []).map((position) => ({ ...position })),
      isRetreating: false,
      description: config.description ?? "Kontrollierter Testgegner.",
      special: config.special ?? "Nur fuer Tests.",
      grammar: config.grammar ?? null,
      originX: position.x,
      originY: position.y,
      aggro: config.aggro ?? false,
      turnsSinceHit: 0,
      nextActionTime: Number.isFinite(config.nextActionTime) ? Math.round(config.nextActionTime) : 0,
      baseSpeed: Number.isFinite(config.baseSpeed) ? Math.round(config.baseSpeed) : NORMAL_SPEED_INTERVAL,
      speedIntervalModifier: Number.isFinite(config.speedIntervalModifier) ? Math.round(config.speedIntervalModifier) : 0,
      speedIntervalModifiers: Array.isArray(config.speedIntervalModifiers)
        ? config.speedIntervalModifiers.map((entry) => ({ ...entry }))
        : [],
      canOpenDoors: config.canOpenDoors ?? false,
      canChangeFloors: config.canChangeFloors ?? false,
      sourceArchetypeId: config.sourceArchetypeId ?? null,
      mainHand: config.mainHand || config.weapon ? cloneWeapon(config.mainHand ?? config.weapon) : null,
      offHand: config.offHand ? cloneOffHandItem(config.offHand) : null,
      xpReward: config.xpReward ?? 0,
      maxHp: config.maxHp ?? 12,
      hp: config.hp ?? config.maxHp ?? 12,
      strength: config.strength ?? 3,
      precision: config.precision ?? 3,
      reaction: config.reaction ?? 3,
      nerves: config.nerves ?? 2,
      intelligence: config.intelligence ?? 1,
      aggroRadius: config.aggroRadius ?? 0,
    };
  }

  function setupCombatScenario(config = {}) {
    const state = getState();
    const floorState = getCurrentFloorState();
    const playerPosition = config.playerPosition ?? { x: 2, y: 2 };
    const enemyPosition = config.enemyPosition ?? { x: playerPosition.x + 1, y: playerPosition.y };

    if (config.clearGrid) {
      for (let y = 0; y < HEIGHT; y += 1) {
        for (let x = 0; x < WIDTH; x += 1) {
          floorState.grid[y][x] = x === 0 || y === 0 || x === WIDTH - 1 || y === HEIGHT - 1
            ? TILE.WALL
            : TILE.FLOOR;
        }
      }
    }

    floorState.grid[playerPosition.y][playerPosition.x] = TILE.FLOOR;
    floorState.grid[enemyPosition.y][enemyPosition.x] = TILE.FLOOR;

    state.player.x = playerPosition.x;
    state.player.y = playerPosition.y;
    state.player.hp = config.player?.hp ?? getActorDerivedMaxHp(state.player);
    if (config.player) {
      Object.assign(state.player, config.player);
      if (Array.isArray(config.player.speedIntervalModifiers)) {
        state.player.speedIntervalModifiers = config.player.speedIntervalModifiers.map((entry) => ({ ...entry }));
      }
      if (config.player.weapon || config.player.mainHand) {
        state.player.mainHand = cloneWeapon(config.player.mainHand ?? config.player.weapon);
      }
      if (config.player.offHand) {
        state.player.offHand = cloneOffHandItem(config.player.offHand);
      }
    }

    floorState.enemies = [];
    floorState.consumables = [];
    floorState.potions = floorState.consumables;
    floorState.weapons = [];
    floorState.offHands = [];
    floorState.chests = [];
    floorState.foods = [];
    floorState.keys = [];
    floorState.doors = [];
    floorState.showcases = [];
    floorState.traps = [];
    if (Array.isArray(config.walls)) {
      config.walls.forEach((wall) => {
        if (wall.x >= 0 && wall.x < WIDTH && wall.y >= 0 && wall.y < HEIGHT) {
          floorState.grid[wall.y][wall.x] = TILE.WALL;
        }
      });
    }
    state.messages = [];
    state.gameOver = false;
    state.safeRestTurns = 0;
    state.timelineTime = 0;
    state.pendingChoice = null;
    state.pendingStairChoice = null;
    state.pendingContainerLoot = null;

    const enemy = createTestEnemy(enemyPosition, config.enemy);
    floorState.enemies.push(enemy);
    renderSelf();
    return {
      player: { x: state.player.x, y: state.player.y },
      enemy: { x: enemy.x, y: enemy.y, hp: enemy.hp },
    };
  }

  function placeEnemy(position, enemy = {}) {
    const floorState = getCurrentFloorState();
    floorState.grid[position.y][position.x] = TILE.FLOOR;
    floorState.enemies = floorState.enemies ?? [];
    floorState.enemies.push(createTestEnemy(position, enemy));
    renderSelf();
  }

  function grantExperienceForTests(amount, source = "Tests") {
    grantExperience(amount, source);
    renderSelf();
  }

  function enterTargetModeForTests() {
    enterTargetMode?.();
    renderSelf();
  }

  function cancelTargetModeForTests() {
    cancelTargetMode?.();
    renderSelf();
  }

  function moveTargetCursorForTests(dx, dy) {
    moveTargetCursor?.(dx, dy);
    renderSelf();
  }

  function confirmTargetAttackForTests() {
    confirmTargetAttack?.();
    renderSelf();
  }

  function applyStatusToPlayer(effect) {
    const state = getState();
    applyStatusEffect?.(state.player, effect, { actorType: "test", name: "Tests" });
    renderSelf();
  }

  function applyStatusToEnemy(effect, enemyIndex = 0) {
    const floorState = getCurrentFloorState();
    const enemy = floorState.enemies?.[enemyIndex];
    if (!enemy) {
      return;
    }
    applyStatusEffect?.(enemy, effect, { actorType: "test", name: "Tests" });
    renderSelf();
  }

  function setPlayerSpeed(config = {}) {
    const state = getState();
    if (config.nextActionTime !== undefined) {
      state.player.nextActionTime = Number.isFinite(config.nextActionTime)
        ? Math.round(config.nextActionTime)
        : 0;
    }
    if (config.baseSpeed !== undefined) {
      state.player.baseSpeed = Number.isFinite(config.baseSpeed)
        ? Math.round(config.baseSpeed)
        : NORMAL_SPEED_INTERVAL;
    }
    if (config.speedIntervalModifier !== undefined) {
      state.player.speedIntervalModifier = Number.isFinite(config.speedIntervalModifier)
        ? Math.round(config.speedIntervalModifier)
        : 0;
    }
    if (config.speedIntervalModifierLabel !== undefined) {
      state.player.speedIntervalModifierLabel = config.speedIntervalModifierLabel ?? null;
    }
    if (Array.isArray(config.speedIntervalModifiers)) {
      state.player.speedIntervalModifiers = config.speedIntervalModifiers.map((entry) => ({ ...entry }));
    }
    renderSelf();
  }

  function setEnemySpeed(config = {}, enemyIndex = 0) {
    const floorState = getCurrentFloorState();
    const enemy = floorState.enemies?.[enemyIndex];
    if (!enemy) {
      return;
    }

    if (config.nextActionTime !== undefined) {
      enemy.nextActionTime = Number.isFinite(config.nextActionTime)
        ? Math.round(config.nextActionTime)
        : 0;
    }
    if (config.baseSpeed !== undefined) {
      enemy.baseSpeed = Number.isFinite(config.baseSpeed)
        ? Math.round(config.baseSpeed)
        : NORMAL_SPEED_INTERVAL;
    }
    if (config.speedIntervalModifier !== undefined) {
      enemy.speedIntervalModifier = Number.isFinite(config.speedIntervalModifier)
        ? Math.round(config.speedIntervalModifier)
        : 0;
    }
    if (config.speedIntervalModifierLabel !== undefined) {
      enemy.speedIntervalModifierLabel = config.speedIntervalModifierLabel ?? null;
    }
    if (Array.isArray(config.speedIntervalModifiers)) {
      enemy.speedIntervalModifiers = config.speedIntervalModifiers.map((entry) => ({ ...entry }));
    }
    renderSelf();
  }

  function processStatusRoundForTests() {
    processRoundStatusEffects?.();
    renderSelf();
  }

  function setTimelineTime(nextTimelineTime = 0) {
    const state = getState();
    state.timelineTime = Number.isFinite(nextTimelineTime)
      ? Math.max(0, Math.round(nextTimelineTime))
      : 0;
    renderSelf();
  }

  return {
    teleportPlayer,
    stepPlayer,
    openChestAtPlayer,
    promptCurrentStairs,
    setRandomSequence,
    clearRandomSequence,
    addInventoryItem,
    grantExperience: grantExperienceForTests,
    clearFloorEntities,
    placePotion,
    placeWeapon,
    placeFood,
    placeOffHand,
    placeChest,
    placeKey,
    placeDoor,
    placeShowcase,
    placeTrap,
    setDebugReveal,
    placeEnemy,
    setupCombatScenario,
    enterTargetMode: enterTargetModeForTests,
    cancelTargetMode: cancelTargetModeForTests,
    moveTargetCursor: moveTargetCursorForTests,
    confirmTargetAttack: confirmTargetAttackForTests,
    applyStatusToPlayer,
    applyStatusToEnemy,
    setPlayerSpeed,
    setEnemySpeed,
    setTimelineTime,
    processStatusRound: processStatusRoundForTests,
  };
}
