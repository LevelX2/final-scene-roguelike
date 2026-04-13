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
    createFoodPickup,
    createDoor,
    createKeyPickup,
    setRandomSequence,
    clearRandomSequence,
    tryUseStairs,
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
    floorState.potions = [];
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
    renderSelf();
  }

  function placePotion(position, potion = {}) {
    const floorState = getCurrentFloorState();
    floorState.grid[position.y][position.x] = TILE.FLOOR;
    floorState.potions.push({
      x: position.x,
      y: position.y,
      heal: potion.heal ?? 8,
    });
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
    state.player.hp = config.player?.hp ?? state.player.maxHp;
    if (config.player) {
      Object.assign(state.player, config.player);
      if (config.player.weapon || config.player.mainHand) {
        state.player.mainHand = cloneWeapon(config.player.mainHand ?? config.player.weapon);
      }
      if (config.player.offHand) {
        state.player.offHand = cloneOffHandItem(config.player.offHand);
      }
    }

    floorState.enemies = [];
    floorState.potions = [];
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
    state.pendingChoice = null;
    state.pendingStairChoice = null;

    const enemy = {
      x: enemyPosition.x,
      y: enemyPosition.y,
      type: "monster",
      id: "test-enemy",
      name: config.enemy?.name ?? "Testgegner",
      rank: 1,
      behavior: config.enemy?.behavior ?? "dormant",
      behaviorLabel: config.enemy?.behaviorLabel ?? "Test",
      mobility: config.enemy?.mobility ?? "roaming",
      mobilityLabel: config.enemy?.mobilityLabel ?? "Mobil",
      retreatProfile: config.enemy?.retreatProfile ?? "none",
      retreatLabel: config.enemy?.retreatLabel ?? "Standhaft",
      healingProfile: config.enemy?.healingProfile ?? "slow",
      healingLabel: config.enemy?.healingLabel ?? "Langsam",
      isRetreating: false,
      description: config.enemy?.description ?? "Kontrollierter Testgegner.",
      special: config.enemy?.special ?? "Nur fuer Tests.",
      originX: enemyPosition.x,
      originY: enemyPosition.y,
      aggro: config.enemy?.aggro ?? false,
      turnsSinceHit: 0,
      canOpenDoors: config.enemy?.canOpenDoors ?? false,
      canChangeFloors: false,
      mainHand: config.enemy?.mainHand || config.enemy?.weapon ? cloneWeapon(config.enemy.mainHand ?? config.enemy.weapon) : null,
      offHand: config.enemy?.offHand ? cloneOffHandItem(config.enemy.offHand) : null,
      xpReward: 0,
      maxHp: config.enemy?.maxHp ?? 12,
      hp: config.enemy?.hp ?? config.enemy?.maxHp ?? 12,
      strength: config.enemy?.strength ?? 3,
      precision: config.enemy?.precision ?? 3,
      reaction: config.enemy?.reaction ?? 3,
      nerves: config.enemy?.nerves ?? 2,
      intelligence: config.enemy?.intelligence ?? 1,
      aggroRadius: config.enemy?.aggroRadius ?? 0,
    };

    floorState.enemies.push(enemy);
    renderSelf();
    return {
      player: { x: state.player.x, y: state.player.y },
      enemy: { x: enemy.x, y: enemy.y, hp: enemy.hp },
    };
  }

  function grantExperienceForTests(amount, source = "Tests") {
    grantExperience(amount, source);
    renderSelf();
  }

  return {
    teleportPlayer,
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
    setupCombatScenario,
  };
}
