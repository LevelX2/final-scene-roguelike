export function createTestApi(context) {
  const {
    WIDTH,
    HEIGHT,
    TILE,
    getState,
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
    setRandomSequence,
    clearRandomSequence,
    tryUseStairs,
    renderSelf,
  } = context;

  function isTestApiEnabled() {
    try {
      return window.localStorage.getItem("dungeon-rogue-enable-test-api") === "1";
    } catch {
      return false;
    }
  }

  function syncTestApi() {
    if (!isTestApiEnabled()) {
      delete window.__TEST_API__;
      return;
    }

    window.__TEST_API__ = {
      getSnapshot() {
        const state = getState();
        const floorState = getCurrentFloorState();
        return {
          floor: state.floor,
          player: {
            name: state.player.name,
            x: state.player.x,
            y: state.player.y,
            hp: state.player.hp,
            maxHp: state.player.maxHp,
            nutrition: state.player.nutrition,
            nutritionMax: state.player.nutritionMax,
            hungerState: state.player.hungerState,
          },
          stairsDown: floorState.stairsDown ? { ...floorState.stairsDown } : null,
          stairsUp: floorState.stairsUp ? { ...floorState.stairsUp } : null,
          grid: floorState.grid.map((row) => [...row]),
          rooms: (floorState.rooms ?? []).map((room) => ({ ...room })),
          visible: floorState.visible?.map((row) => [...row]) ?? [],
          keys: (floorState.keys ?? []).map((entry) => ({
            x: entry.x,
            y: entry.y,
            keyColor: entry.item.keyColor,
            keyFloor: entry.item.keyFloor,
          })),
          foods: (floorState.foods ?? []).map((entry) => ({
            x: entry.x,
            y: entry.y,
            id: entry.item.id,
            nutritionRestore: entry.item.nutritionRestore,
          })),
          doors: (floorState.doors ?? []).map((door) => ({
            x: door.x,
            y: door.y,
            doorType: door.doorType,
            isOpen: door.isOpen,
            lockColor: door.lockColor,
            roomIdA: door.roomIdA,
            roomIdB: door.roomIdB,
          })),
          showcases: (floorState.showcases ?? []).map((entry) => ({
            x: entry.x,
            y: entry.y,
            id: entry.item.id,
            ambienceId: entry.item.ambienceId,
            name: entry.item.name,
            source: entry.item.source,
          })),
          traps: (floorState.traps ?? []).map((trap) => ({
            id: trap.id,
            name: trap.name,
            type: trap.type,
            visibility: trap.visibility,
            state: trap.state,
            trigger: trap.trigger,
            x: trap.x,
            y: trap.y,
            effect: { ...(trap.effect ?? {}) },
          })),
          offHands: (floorState.offHands ?? []).map((item) => ({
            id: item.item.id,
            name: item.item.name,
            x: item.x,
            y: item.y,
          })),
          enemies: floorState.enemies.map((enemy) => ({
            id: enemy.id,
            name: enemy.name,
            x: enemy.x,
            y: enemy.y,
            hp: enemy.hp,
            maxHp: enemy.maxHp,
            aggro: Boolean(enemy.aggro),
            retreatProfile: enemy.retreatProfile ?? "none",
            retreatLabel: enemy.retreatLabel ?? "Standhaft",
            healingProfile: enemy.healingProfile ?? "slow",
            healingLabel: enemy.healingLabel ?? "Langsam",
            isRetreating: Boolean(enemy.isRetreating),
          })),
        };
      },
      teleportPlayer(position) {
        const state = getState();
        state.player.x = position.x;
        state.player.y = position.y;
        renderSelf();
      },
      promptCurrentStairs() {
        return tryUseStairs();
      },
      setRandomSequence(values) {
        setRandomSequence(values);
      },
      clearRandomSequence() {
        clearRandomSequence();
      },
      getMessages() {
        const state = getState();
        return state.messages.map((entry) => ({ ...entry }));
      },
      getInventorySnapshot() {
        const state = getState();
        return {
          inventoryCount: state.inventory.length,
          potionCount: countPotionsInInventory(),
          foodCount: state.inventory.filter((item) => item.type === "food").length,
          equippedWeapon: getMainHand(state.player) ? { ...getMainHand(state.player) } : null,
          offHand: getOffHand(state.player) ? { ...getOffHand(state.player) } : null,
          items: state.inventory.map((item) => ({ ...item })),
        };
      },
      addInventoryItem(item) {
        const state = getState();
        const clonedItem = item.type === "weapon"
          ? cloneWeapon(item)
          : item.type === "offhand"
            ? cloneOffHandItem(item)
            : { ...item };
        state.inventory.push(clonedItem);
        renderSelf();
      },
      getOptionsSnapshot() {
        const state = getState();
        return { ...state.options };
      },
      getHighscores() {
        return loadHighscores();
      },
      grantExperience(amount, source = "Tests") {
        grantExperience(amount, source);
        renderSelf();
      },
      clearFloorEntities() {
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
      },
      placePotion(position, potion = {}) {
        const floorState = getCurrentFloorState();
        floorState.grid[position.y][position.x] = TILE.FLOOR;
        floorState.potions.push({
          x: position.x,
          y: position.y,
          heal: potion.heal ?? 8,
        });
        renderSelf();
      },
      placeWeapon(position, weapon) {
        const floorState = getCurrentFloorState();
        floorState.grid[position.y][position.x] = TILE.FLOOR;
        floorState.weapons.push({
          x: position.x,
          y: position.y,
          item: cloneWeapon(weapon),
        });
        renderSelf();
      },
      placeFood(position, item) {
        const floorState = getCurrentFloorState();
        floorState.grid[position.y][position.x] = TILE.FLOOR;
        floorState.foods.push(createFoodPickup(item, position.x, position.y));
        renderSelf();
      },
      placeOffHand(position, item) {
        const floorState = getCurrentFloorState();
        floorState.grid[position.y][position.x] = TILE.FLOOR;
        floorState.offHands.push({
          x: position.x,
          y: position.y,
          item: cloneOffHandItem(item),
        });
        renderSelf();
      },
      placeChest(position, content) {
        const floorState = getCurrentFloorState();
        floorState.grid[position.y][position.x] = TILE.FLOOR;
        floorState.chests.push(createChestPickup(content, position.x, position.y));
        renderSelf();
      },
      placeKey(position, color = "green", floorNumber = getState().floor) {
        const floorState = getCurrentFloorState();
        floorState.grid[position.y][position.x] = TILE.FLOOR;
        floorState.keys.push(createKeyPickup(color, position.x, position.y, floorNumber));
        renderSelf();
      },
      placeDoor(position, config = {}) {
        const floorState = getCurrentFloorState();
        floorState.grid[position.y][position.x] = TILE.FLOOR;
        floorState.doors = floorState.doors ?? [];
        floorState.doors.push(createDoor(position.x, position.y, config));
        renderSelf();
      },
      placeShowcase(position, item = {}) {
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
            description: item.description ?? "Nur für Tests.",
            iconAsset: item.iconAsset ?? null,
          },
        });
        renderSelf();
      },
      placeTrap(position, trap = {}) {
        const floorState = getCurrentFloorState();
        floorState.grid[position.y][position.x] = TILE.FLOOR;
        floorState.traps = floorState.traps ?? [];
        floorState.traps.push({
          id: trap.id ?? `test-trap-${position.x}-${position.y}`,
          name: trap.name ?? "Testfalle",
          description: trap.description ?? "Nur für Tests.",
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
      },
      previewGeneratedEquipment(baseItem, dropContext = {}) {
        return generateEquipmentItem(baseItem, dropContext);
      },
      setupCombatScenario(config = {}) {
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
          special: config.enemy?.special ?? "Nur für Tests.",
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
      },
    };
  }

  return { syncTestApi };
}
