import { DUNGEON_WEAPON_TIERS, PROP_CATALOG } from './data.mjs';
import {
  CHEST_WEAPON_CHANCE,
  CHEST_SHIELD_CHANCE,
  DUNGEON_WEAPON_WEIGHT_BONUS,
  DUPLICATE_WEAPON_WEIGHT_PENALTY,
  NON_ICONIC_MONSTER_WEIGHT_BONUS,
  ICONIC_MONSTER_WEIGHT_PENALTY,
  ENEMY_HP_PER_SCALE,
  ENEMY_XP_PER_SCALE,
  ENEMY_STRENGTH_SCALE_STEP,
  ENEMY_PRECISION_SCALE_STEP,
  ENEMY_REACTION_SCALE_STEP,
  ENEMY_NERVES_SCALE_STEP,
  ENEMY_INTELLIGENCE_SCALE_STEP,
  ENEMY_AGGRO_RADIUS_CAP,
  MONSTER_VARIANT_TIERS,
  MONSTER_VARIANT_MODIFIERS,
  getMonsterVariantWeights,
  getEnemyScaleForFloor,
  shouldSpawnFloorShield,
} from './balance.mjs';
import { createDungeonEquipmentRolls } from './dungeon/equipment-rolls.mjs';
import { createDungeonPickupFactory } from './dungeon/pickup-factory.mjs';
import { createShowcasePlacementApi } from './dungeon/showcase-placement.mjs';
import { rollStudioArchetypeId } from './studio-theme.mjs';

export function createDungeonApi(context) {
  const {
    WIDTH,
    HEIGHT,
    ROOM_ATTEMPTS,
    MIN_ROOM_SIZE,
    MAX_ROOM_SIZE,
    TILE,
    MONSTER_CATALOG,
    WEAPON_CATALOG,
    OFFHAND_CATALOG,
    PROP_CATALOG: propCatalog = PROP_CATALOG,
    DOOR_TYPE,
    LOCK_COLORS,
    buildFoodItemsForBudget,
    rollFoodBudget,
    splitFoodBudget,
    rollMonsterPlannedDrop,
    getLockedDoorCountForFloor,
    buildTrapsForFloor,
    randomInt,
    createGrid,
    carveRoom,
    carveTunnel,
    roomsOverlap,
    cloneOffHandItem,
    generateEquipmentItem,
    getState,
  } = context;

  const pickupFactory = createDungeonPickupFactory({
    DOOR_TYPE,
    cloneOffHandItem,
  });

  const {
    createWeaponPickup,
    createOffHandPickup,
    createChestPickup,
    createFoodPickup,
    createShowcase,
    cloneWeapon,
    createDoor,
    createKeyPickup,
  } = pickupFactory;

  const equipmentRolls = createDungeonEquipmentRolls({
    MONSTER_CATALOG,
    WEAPON_CATALOG,
    OFFHAND_CATALOG,
    DUNGEON_WEAPON_TIERS,
    CHEST_WEAPON_CHANCE,
    CHEST_SHIELD_CHANCE,
    DUNGEON_WEAPON_WEIGHT_BONUS,
    DUPLICATE_WEAPON_WEIGHT_PENALTY,
    cloneWeapon,
    cloneOffHandItem,
    generateEquipmentItem,
    getState,
  });

  const {
    weightedPick,
    buildAvailableWeaponsForFloor,
    chooseWeightedWeapon,
    buildAvailableShieldsForFloor,
    chooseWeightedShield,
    rollChestContent,
  } = equipmentRolls;

  function createEnemy(position, floor, monster) {
    const scale = getEnemyScaleForFloor(floor, monster.rank);
    const variant = rollMonsterVariant(floor);
    const variantModifiers = rollMonsterVariantModifiers(variant);
    const baseHp = monster.hp + scale * ENEMY_HP_PER_SCALE + randomInt(0, 2);
    const baseStrength = monster.strength + Math.floor((scale + 1) / ENEMY_STRENGTH_SCALE_STEP);
    const basePrecision = monster.precision + Math.floor(scale / ENEMY_PRECISION_SCALE_STEP);
    const baseReaction = monster.reaction + Math.floor(scale / ENEMY_REACTION_SCALE_STEP);
    const baseNerves = monster.nerves + Math.floor(scale / ENEMY_NERVES_SCALE_STEP);
    const baseIntelligence = monster.intelligence + Math.floor(scale / ENEMY_INTELLIGENCE_SCALE_STEP);
    const baseAggroRadius = monster.aggroRadius + Math.min(ENEMY_AGGRO_RADIUS_CAP, Math.floor(scale / 3));
    const variantBonus = getMonsterVariantStatBonus(variantModifiers);
    const maxHp = Math.max(1, Math.round(baseHp * variant.hpMultiplier) + (variantBonus.hpFlat ?? 0));
    const weapon = WEAPON_CATALOG[monster.id];
    const offHand = monster.offHand ? OFFHAND_CATALOG[monster.offHand] : null;
    const variantName = buildMonsterVariantName(monster.name, variant, variantModifiers);
    const mobilityAggroBonus = monster.mobility === "relentless"
      ? 2
      : monster.mobility === "roaming"
        ? 1
        : 0;
    const dropSourceTag = variant.id === "normal"
      ? `monster:${monster.id}`
      : `monster:${monster.id}:${variant.id}`;

    return {
      ...position,
      type: "monster",
      id: monster.id,
      baseName: monster.name,
      name: variantName,
      rank: monster.rank,
      variantTier: variant.id,
      variantLabel: variant.label,
      variantModifiers,
      behavior: monster.behavior,
      behaviorLabel: monster.behaviorLabel,
      mobility: monster.mobility,
      mobilityLabel: monster.mobilityLabel,
      retreatProfile: monster.retreatProfile,
      retreatLabel: monster.retreatLabel,
      healingProfile: monster.healingProfile,
      healingLabel: monster.healingLabel,
      isRetreating: false,
      description: monster.description,
      special: monster.special,
      originX: position.x,
      originY: position.y,
      aggro: false,
      turnsSinceHit: 0,
      canChangeFloors: Boolean(monster.canChangeFloors),
      mainHand: weapon
        ? {
            ...weapon,
            type: "weapon",
          }
        : null,
      offHand: offHand ? cloneOffHandItem(offHand) : null,
      lootWeapon: weapon ? generateEquipmentItem(weapon, { floorNumber: floor, dropSourceTag }) : null,
      lootOffHand: offHand ? generateEquipmentItem(offHand, { floorNumber: floor, dropSourceTag }) : null,
      weaponDropChance: variant.weaponDropChance,
      offHandDropChance: variant.offHandDropChance,
      xpReward: Math.round((monster.xpReward + scale * ENEMY_XP_PER_SCALE) * variant.xpMultiplier),
      maxHp,
      hp: maxHp,
      strength: baseStrength + (variantBonus.strength ?? 0),
      precision: basePrecision + (variantBonus.precision ?? 0),
      reaction: baseReaction + (variantBonus.reaction ?? 0),
      nerves: baseNerves + (variantBonus.nerves ?? 0),
      intelligence: baseIntelligence + (variantBonus.intelligence ?? 0),
      aggroRadius: baseAggroRadius + mobilityAggroBonus + (variantBonus.aggroRadius ?? 0),
    };
  }

  function collectUsedShowcasePropIds() {
    const state = getState();
    if (!state?.floors) {
      return new Set();
    }

    const usedPropIds = new Set();
    Object.values(state.floors).forEach((floorState) => {
      (floorState?.showcases ?? []).forEach((showcase) => {
        const propId = showcase?.item?.id;
        if (propId) {
          usedPropIds.add(propId);
        }
      });
    });
    return usedPropIds;
  }

  function getRoomCenter(room) {
    return {
      x: room.x + Math.floor(room.width / 2),
      y: room.y + Math.floor(room.height / 2),
    };
  }

  function getCardinalNeighbors(x, y) {
    return [
      { x: x + 1, y },
      { x: x - 1, y },
      { x, y: y + 1 },
      { x, y: y - 1 },
    ];
  }

  function clampToRoom(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function getRoomConnectionPoint(room, target) {
    const center = getRoomCenter(room);
    const deltaX = target.x - center.x;
    const deltaY = target.y - center.y;

    if (Math.abs(deltaX) >= Math.abs(deltaY)) {
      return {
        x: deltaX >= 0 ? room.x + room.width - 1 : room.x,
        y: clampToRoom(target.y, room.y, room.y + room.height - 1),
      };
    }

    return {
      x: clampToRoom(target.x, room.x, room.x + room.width - 1),
      y: deltaY >= 0 ? room.y + room.height - 1 : room.y,
    };
  }

  function isPositionInsideRoom(position, room) {
    return (
      position.x >= room.x &&
      position.x < room.x + room.width &&
      position.y >= room.y &&
      position.y < room.y + room.height
    );
  }

  function buildTunnelPath(start, end) {
    const path = [{ x: start.x, y: start.y }];
    let x = start.x;
    let y = start.y;

    while (x !== end.x) {
      x += x < end.x ? 1 : -1;
      path.push({ x, y });
    }

    while (y !== end.y) {
      y += y < end.y ? 1 : -1;
      path.push({ x, y });
    }

    return path;
  }

  function isWallOrOutside(grid, x, y) {
    return x < 0 || y < 0 || x >= WIDTH || y >= HEIGHT || grid[y][x] === TILE.WALL;
  }

  function isTileWalkable(grid, x, y) {
    return x >= 0 && y >= 0 && x < WIDTH && y < HEIGHT && grid[y][x] === TILE.FLOOR;
  }

  function isValidDoorSlot(grid, x, y) {
    if (grid[y]?.[x] !== TILE.FLOOR) {
      return false;
    }

    const wallsLeftRight = isWallOrOutside(grid, x - 1, y) && isWallOrOutside(grid, x + 1, y);
    const wallsUpDown = isWallOrOutside(grid, x, y - 1) && isWallOrOutside(grid, x, y + 1);
    return wallsLeftRight || wallsUpDown;
  }

  function getDoorCandidate(grid, previous, current, roomIdA, roomIdB, tunnelPath = null) {
    const path = tunnelPath ?? buildTunnelPath(getRoomCenter(previous), getRoomCenter(current));

    for (let index = 1; index < path.length; index += 1) {
      const currentStep = path[index];
      const previousStep = path[index - 1];
      const entersCurrentRoom =
        isPositionInsideRoom(currentStep, current) &&
        !isPositionInsideRoom(previousStep, current);

      if (entersCurrentRoom) {
        const slotCandidates = path
          .map((step, candidateIndex) => ({
            ...step,
            distanceToEntry: Math.abs(candidateIndex - (index - 1)),
          }))
          .filter((step) => isValidDoorSlot(grid, step.x, step.y))
          .sort((left, right) => left.distanceToEntry - right.distanceToEntry);

        if (slotCandidates.length > 0) {
          return createDoor(slotCandidates[0].x, slotCandidates[0].y, { roomIdA, roomIdB });
        }

        return null;
      }
    }

    return null;
  }

  function computeReachableTiles(grid, startPosition, doors) {
    const queue = [startPosition];
    const seen = new Set([`${startPosition.x},${startPosition.y}`]);
    const reachable = [];

    while (queue.length > 0) {
      const current = queue.shift();
      reachable.push(current);

      for (const direction of [
        { x: 1, y: 0 },
        { x: -1, y: 0 },
        { x: 0, y: 1 },
        { x: 0, y: -1 },
      ]) {
        const nextX = current.x + direction.x;
        const nextY = current.y + direction.y;
        const key = `${nextX},${nextY}`;

        if (seen.has(key)) {
          continue;
        }

        if (nextX < 0 || nextY < 0 || nextX >= WIDTH || nextY >= HEIGHT) {
          continue;
        }

        if (grid[nextY][nextX] !== TILE.FLOOR) {
          continue;
        }

        const door = doors.find((entry) => entry.x === nextX && entry.y === nextY);
        if (door && !door.isOpen && door.doorType === DOOR_TYPE.LOCKED) {
          continue;
        }

        seen.add(key);
        queue.push({ x: nextX, y: nextY });
      }
    }

    return reachable;
  }

  function computeReachableTilesWithBlockedPositions(grid, startPosition, doors, blockedPositions = []) {
    const blocked = new Set(blockedPositions.map((position) => `${position.x},${position.y}`));
    const queue = [startPosition];
    const seen = new Set([`${startPosition.x},${startPosition.y}`]);
    const reachable = [];

    while (queue.length > 0) {
      const current = queue.shift();
      reachable.push(current);

      for (const direction of [
        { x: 1, y: 0 },
        { x: -1, y: 0 },
        { x: 0, y: 1 },
        { x: 0, y: -1 },
      ]) {
        const nextX = current.x + direction.x;
        const nextY = current.y + direction.y;
        const key = `${nextX},${nextY}`;

        if (seen.has(key) || blocked.has(key)) {
          continue;
        }

        if (!isTileWalkable(grid, nextX, nextY)) {
          continue;
        }

        const door = doors.find((entry) => entry.x === nextX && entry.y === nextY);
        if (door && !door.isOpen && door.doorType === DOOR_TYPE.LOCKED) {
          continue;
        }

        seen.add(key);
        queue.push({ x: nextX, y: nextY });
      }
    }

    return reachable;
  }

  function hasReachableMatchingKey(grid, startPosition, doors, keys, lockedDoor) {
    if (!lockedDoor || lockedDoor.doorType !== DOOR_TYPE.LOCKED) {
      return true;
    }

    const reachableKeys = computeReachableTiles(grid, startPosition, doors);
    return reachableKeys.some((tile) =>
      keys.some((entry) =>
        entry.x === tile.x &&
        entry.y === tile.y &&
        entry.item.keyColor === lockedDoor.lockColor &&
        entry.item.keyFloor != null
      )
    );
  }

  function isLockedRoomSealed(grid, startPosition, doors, room, lockedDoor) {
    if (!room || !lockedDoor) {
      return false;
    }

    const simulatedDoors = doors.map((door) =>
      door === lockedDoor
        ? {
            ...door,
            isOpen: false,
            doorType: DOOR_TYPE.LOCKED,
          }
        : door
    );
    const reachableTiles = computeReachableTiles(grid, startPosition, simulatedDoors);

    return !reachableTiles.some((tile) => isPositionInsideRoom(tile, room));
  }

  const showcasePlacementApi = createShowcasePlacementApi({
    propCatalog,
    randomInt,
    createShowcase,
    collectUsedShowcasePropIds,
    getCardinalNeighbors,
    isTileWalkable,
    computeReachableTilesWithBlockedPositions,
    isPositionInsideRoom,
  });

  const {
    chooseShowcaseRooms,
    getShowcaseCandidateTiles,
    placeShowcases,
  } = showcasePlacementApi;

  function chooseWeightedMonster(availableMonsters, floorNumber, runSeenCounts, floorSeenCounts) {
    const iconicMonsterIds = new Set([
      "bates",
      "ghostface",
      "chucky",
      "myers",
      "jason",
      "freddy",
      "pennywise",
      "xenomorph",
      "predator",
      "vader",
      "terminator",
    ]);

    const weighted = availableMonsters.map((monster) => {
      const runSeen = runSeenCounts[monster.id] ?? 0;
      const floorSeen = floorSeenCounts[monster.id] ?? 0;
      const recencyBonus = Math.max(0, (monster.rank - 1) / Math.max(1, floorNumber + 1));
      const iconWeight = iconicMonsterIds.has(monster.id)
        ? ICONIC_MONSTER_WEIGHT_PENALTY
        : NON_ICONIC_MONSTER_WEIGHT_BONUS;
      const weight = Math.max(
        0.2,
        (1.2 +
          recencyBonus * 1.4 -
          runSeen * 0.18 -
          floorSeen * 0.4) * iconWeight
      );
      return { monster, weight };
    });

    const totalWeight = weighted.reduce((sum, entry) => sum + entry.weight, 0);
    let roll = Math.random() * totalWeight;

    for (const entry of weighted) {
      roll -= entry.weight;
      if (roll <= 0) {
        return entry.monster;
      }
    }

    return weighted[weighted.length - 1].monster;
  }

  function weightedPickFromMap(weights) {
    return weightedPick(
      Object.entries(weights).map(([value, weight]) => ({ value, weight })),
    );
  }

  function rollMonsterVariant(floorNumber) {
    const weights = getMonsterVariantWeights(floorNumber);
    const tierId = weightedPickFromMap(weights) ?? "normal";
    return MONSTER_VARIANT_TIERS[tierId] ?? MONSTER_VARIANT_TIERS.normal;
  }

  function rollMonsterVariantModifiers(variant) {
    const modifierCount = variant.modCount ?? 0;
    if (modifierCount <= 0) {
      return [];
    }

    const modifiers = [];
    const pool = [...MONSTER_VARIANT_MODIFIERS];
    while (modifiers.length < modifierCount && pool.length > 0) {
      const index = randomInt(0, pool.length - 1);
      modifiers.push(pool.splice(index, 1)[0]);
    }
    return modifiers;
  }

  function getMonsterVariantStatBonus(modifiers) {
    return modifiers.reduce((sum, modifier) => {
      Object.entries(modifier.statChanges ?? {}).forEach(([stat, value]) => {
        sum[stat] = (sum[stat] ?? 0) + value;
      });
      return sum;
    }, {});
  }

  function buildMonsterVariantName(baseName, variant, modifiers) {
    if (variant.id === "normal" || modifiers.length === 0) {
      return baseName;
    }

    const affixes = modifiers
      .map((modifier) => modifier.label)
      .slice(0, variant.id === "dire" ? 2 : 1)
      .join(" ");
    return `${affixes} ${baseName}`;
  }

  function rollLayoutProfile() {
    return weightedPick([
      {
        weight: 4,
        value: {
          id: "branchy",
          roomWeights: { hub: 4, side: 4, hallH: 2, hallV: 2, pocket: 2 },
          targetRooms: { min: 13, max: 18 },
          clusterChance: 0.52,
          kinkChance: 0.18,
          extraConnections: { min: 0, max: 1 },
        },
      },
      {
        weight: 3,
        value: {
          id: "clustered",
          roomWeights: { hub: 4, side: 3, hallH: 1, hallV: 1, pocket: 4 },
          targetRooms: { min: 14, max: 20 },
          clusterChance: 0.72,
          kinkChance: 0.24,
          extraConnections: { min: 0, max: 2 },
        },
      },
      {
        weight: 3,
        value: {
          id: "sprawling",
          roomWeights: { hub: 3, side: 3, hallH: 3, hallV: 3, pocket: 1 },
          targetRooms: { min: 12, max: 17 },
          clusterChance: 0.44,
          kinkChance: 0.34,
          extraConnections: { min: 1, max: 2 },
        },
      },
    ]);
  }

  function createRoomTemplate(profile) {
    const archetype = weightedPick([
      { weight: profile.roomWeights.hub, value: "hub" },
      { weight: profile.roomWeights.side, value: "side" },
      { weight: profile.roomWeights.hallH, value: "hallH" },
      { weight: profile.roomWeights.hallV, value: "hallV" },
      { weight: profile.roomWeights.pocket, value: "pocket" },
    ]);

    if (archetype === "hub") {
      return {
        category: "hub",
        width: randomInt(Math.max(6, MIN_ROOM_SIZE + 2), Math.max(7, MAX_ROOM_SIZE + 1)),
        height: randomInt(Math.max(6, MIN_ROOM_SIZE + 1), Math.max(7, MAX_ROOM_SIZE + 1)),
      };
    }

    if (archetype === "side") {
      return {
        category: "side",
        width: randomInt(MIN_ROOM_SIZE, Math.max(MIN_ROOM_SIZE, MAX_ROOM_SIZE - 1)),
        height: randomInt(MIN_ROOM_SIZE, Math.max(MIN_ROOM_SIZE, MAX_ROOM_SIZE - 1)),
      };
    }

    if (archetype === "hallH") {
      return {
        category: "hall",
        width: randomInt(Math.max(7, MIN_ROOM_SIZE + 3), Math.max(9, MAX_ROOM_SIZE + 3)),
        height: randomInt(4, 5),
      };
    }

    if (archetype === "hallV") {
      return {
        category: "hall",
        width: randomInt(4, 5),
        height: randomInt(Math.max(7, MIN_ROOM_SIZE + 3), Math.max(9, MAX_ROOM_SIZE + 3)),
      };
    }

    return {
      category: "pocket",
      width: randomInt(3, 4),
      height: randomInt(3, 4),
    };
  }

  function tryPlaceRoomNearAnchor(template, anchorRoom) {
    const direction = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
    ][randomInt(0, 3)];
    const gap = randomInt(2, 5);
    const lateralJitter = randomInt(-3, 3);
    let x = 1;
    let y = 1;

    if (direction.x !== 0) {
      x = direction.x > 0
        ? anchorRoom.x + anchorRoom.width + gap
        : anchorRoom.x - template.width - gap;
      y = anchorRoom.y + Math.floor(anchorRoom.height / 2) - Math.floor(template.height / 2) + lateralJitter;
    } else {
      x = anchorRoom.x + Math.floor(anchorRoom.width / 2) - Math.floor(template.width / 2) + lateralJitter;
      y = direction.y > 0
        ? anchorRoom.y + anchorRoom.height + gap
        : anchorRoom.y - template.height - gap;
    }

    x = Math.max(1, Math.min(WIDTH - template.width - 2, x));
    y = Math.max(1, Math.min(HEIGHT - template.height - 2, y));

    return {
      ...template,
      x,
      y,
    };
  }

  function getRoomDistance(a, b) {
    const centerA = getRoomCenter(a);
    const centerB = getRoomCenter(b);
    return Math.abs(centerA.x - centerB.x) + Math.abs(centerA.y - centerB.y);
  }

  function chooseStartRoomIndex(rooms) {
    const sorted = rooms
      .map((room, index) => ({ room, index }))
      .sort((left, right) => left.room.x - right.room.x);
    const leftSlice = sorted.slice(0, Math.max(1, Math.ceil(sorted.length / 3)));
    const boardMidY = Math.floor(HEIGHT / 2);
    leftSlice.sort((left, right) =>
      Math.abs(getRoomCenter(left.room).y - boardMidY) - Math.abs(getRoomCenter(right.room).y - boardMidY) ||
      (right.room.width * right.room.height) - (left.room.width * left.room.height)
    );
    return leftSlice[0]?.index ?? 0;
  }

  function chooseAsymmetricConnectionPoint(room, target, forceAxis = null) {
    const center = getRoomCenter(room);
    const deltaX = target.x - center.x;
    const deltaY = target.y - center.y;
    const axis = forceAxis ?? (Math.abs(deltaX) >= Math.abs(deltaY) ? "x" : "y");

    if (axis === "x") {
      const edgeX = deltaX >= 0 ? room.x + room.width - 1 : room.x;
      const minY = room.y;
      const maxY = room.y + room.height - 1;
      const baseY = clampToRoom(target.y, minY, maxY);
      const jitteredY = clampToRoom(baseY + randomInt(-Math.floor(room.height / 3), Math.floor(room.height / 3)), minY, maxY);
      return { x: edgeX, y: jitteredY };
    }

    const edgeY = deltaY >= 0 ? room.y + room.height - 1 : room.y;
    const minX = room.x;
    const maxX = room.x + room.width - 1;
    const baseX = clampToRoom(target.x, minX, maxX);
    const jitteredX = clampToRoom(baseX + randomInt(-Math.floor(room.width / 3), Math.floor(room.width / 3)), minX, maxX);
    return { x: jitteredX, y: edgeY };
  }

  function appendLineSegment(path, from, to) {
    let x = from.x;
    let y = from.y;
    if (path.length === 0 || path[path.length - 1].x !== x || path[path.length - 1].y !== y) {
      path.push({ x, y });
    }

    while (x !== to.x) {
      x += x < to.x ? 1 : -1;
      path.push({ x, y });
    }

    while (y !== to.y) {
      y += y < to.y ? 1 : -1;
      path.push({ x, y });
    }
  }

  function buildConnectionPath(start, end, profile) {
    const path = [];
    const horizontalFirst = Math.abs(end.x - start.x) >= Math.abs(end.y - start.y)
      ? Math.random() < 0.7
      : Math.random() < 0.35;
    const useKink = Math.random() < profile.kinkChance && Math.abs(end.x - start.x) > 4 && Math.abs(end.y - start.y) > 4;

    if (!useKink) {
      if (horizontalFirst) {
        appendLineSegment(path, start, { x: end.x, y: start.y });
        appendLineSegment(path, { x: end.x, y: start.y }, end);
      } else {
        appendLineSegment(path, start, { x: start.x, y: end.y });
        appendLineSegment(path, { x: start.x, y: end.y }, end);
      }
      return path;
    }

    if (horizontalFirst) {
      const midX = randomInt(
        Math.min(start.x, end.x) + 1,
        Math.max(start.x, end.x) - 1,
      );
      const midY = clampToRoom(
        start.y + Math.sign(end.y - start.y) * randomInt(1, Math.max(1, Math.abs(end.y - start.y) - 1)),
        1,
        HEIGHT - 2,
      );
      appendLineSegment(path, start, { x: midX, y: start.y });
      appendLineSegment(path, { x: midX, y: start.y }, { x: midX, y: midY });
      appendLineSegment(path, { x: midX, y: midY }, { x: end.x, y: midY });
      appendLineSegment(path, { x: end.x, y: midY }, end);
    } else {
      const midY = randomInt(
        Math.min(start.y, end.y) + 1,
        Math.max(start.y, end.y) - 1,
      );
      const midX = clampToRoom(
        start.x + Math.sign(end.x - start.x) * randomInt(1, Math.max(1, Math.abs(end.x - start.x) - 1)),
        1,
        WIDTH - 2,
      );
      appendLineSegment(path, start, { x: start.x, y: midY });
      appendLineSegment(path, { x: start.x, y: midY }, { x: midX, y: midY });
      appendLineSegment(path, { x: midX, y: midY }, { x: midX, y: end.y });
      appendLineSegment(path, { x: midX, y: end.y }, end);
    }

    return path;
  }

  function carvePath(grid, path) {
    path.forEach(({ x, y }) => {
      if (x >= 0 && y >= 0 && x < WIDTH && y < HEIGHT) {
        grid[y][x] = TILE.FLOOR;
      }
    });
  }

  function createRoomConnectionEdge(rooms, roomIdA, roomIdB, profile) {
    const roomA = rooms[roomIdA];
    const roomB = rooms[roomIdB];
    const centerA = getRoomCenter(roomA);
    const centerB = getRoomCenter(roomB);
    const axis = Math.abs(centerA.x - centerB.x) >= Math.abs(centerA.y - centerB.y) ? "x" : "y";
    const start = chooseAsymmetricConnectionPoint(roomA, centerB, axis);
    const end = chooseAsymmetricConnectionPoint(roomB, centerA, axis);
    return {
      roomIdA,
      roomIdB,
      path: buildConnectionPath(start, end, profile),
    };
  }

  function buildMainTreeEdges(rooms, startRoomIndex, profile) {
    const connected = new Set([startRoomIndex]);
    const edges = [];

    while (connected.size < rooms.length) {
      const candidates = [];

      rooms.forEach((room, roomIndex) => {
        if (connected.has(roomIndex)) {
          return;
        }

        connected.forEach((connectedIndex) => {
          const sourceRoom = rooms[connectedIndex];
          const distance = getRoomDistance(sourceRoom, room);
          const categoryPenalty = room.category === "pocket" ? -1 : room.category === "hall" ? 1 : 0;
          candidates.push({
            roomIdA: connectedIndex,
            roomIdB: roomIndex,
            score: distance + categoryPenalty,
          });
        });
      });

      candidates.sort((left, right) => left.score - right.score);
      const candidate = candidates[randomInt(0, Math.min(3, candidates.length - 1))];
      edges.push(createRoomConnectionEdge(rooms, candidate.roomIdA, candidate.roomIdB, profile));
      connected.add(candidate.roomIdB);
    }

    return edges;
  }

  function buildRoomAdjacency(edges, roomCount) {
    const adjacency = Array.from({ length: roomCount }, () => []);
    edges.forEach((edge) => {
      adjacency[edge.roomIdA].push(edge.roomIdB);
      adjacency[edge.roomIdB].push(edge.roomIdA);
    });
    return adjacency;
  }

  function findFarthestRoom(startRoomIndex, adjacency) {
    const queue = [{ roomId: startRoomIndex, distance: 0 }];
    const seen = new Set([startRoomIndex]);
    let farthest = queue[0];

    while (queue.length > 0) {
      const current = queue.shift();
      if (current.distance > farthest.distance) {
        farthest = current;
      }

      adjacency[current.roomId].forEach((nextRoomId) => {
        if (seen.has(nextRoomId)) {
          return;
        }
        seen.add(nextRoomId);
        queue.push({ roomId: nextRoomId, distance: current.distance + 1 });
      });
    }

    return farthest.roomId;
  }

  function findRoomPath(startRoomId, endRoomId, adjacency) {
    const queue = [startRoomId];
    const previous = new Map([[startRoomId, null]]);

    while (queue.length > 0) {
      const roomId = queue.shift();
      if (roomId === endRoomId) {
        break;
      }

      adjacency[roomId].forEach((nextRoomId) => {
        if (previous.has(nextRoomId)) {
          return;
        }
        previous.set(nextRoomId, roomId);
        queue.push(nextRoomId);
      });
    }

    const path = [];
    let cursor = endRoomId;
    while (cursor != null) {
      path.unshift(cursor);
      cursor = previous.get(cursor) ?? null;
    }
    return path;
  }

  function pathAlreadyConnected(roomIdA, roomIdB, edges) {
    return edges.some((edge) =>
      (edge.roomIdA === roomIdA && edge.roomIdB === roomIdB) ||
      (edge.roomIdA === roomIdB && edge.roomIdB === roomIdA)
    );
  }

  function scoreProposedPath(grid, path) {
    let reusedTiles = 0;
    let adjacentFloors = 0;

    path.forEach(({ x, y }, index) => {
      if (grid[y]?.[x] === TILE.FLOOR) {
        reusedTiles += 1;
      }

      const previous = path[index - 1];
      const next = path[index + 1];
      const isHorizontal = previous && next ? previous.y === y && next.y === y : false;
      const neighbors = isHorizontal
        ? [{ x, y: y - 1 }, { x, y: y + 1 }]
        : [{ x: x - 1, y }, { x: x + 1, y }];

      neighbors.forEach((neighbor) => {
        if (grid[neighbor.y]?.[neighbor.x] === TILE.FLOOR) {
          adjacentFloors += 1;
        }
      });
    });

    return {
      reusedTiles,
      adjacentFloors,
    };
  }

  function buildExtraEdges(rooms, baseEdges, profile, grid) {
    const extraEdges = [];
    const targetExtraEdges = randomInt(profile.extraConnections.min, profile.extraConnections.max);
    const adjacency = buildRoomAdjacency(baseEdges, rooms.length);
    const candidates = [];

    for (let roomIdA = 0; roomIdA < rooms.length; roomIdA += 1) {
      for (let roomIdB = roomIdA + 1; roomIdB < rooms.length; roomIdB += 1) {
        if (pathAlreadyConnected(roomIdA, roomIdB, baseEdges)) {
          continue;
        }

        const treePath = findRoomPath(roomIdA, roomIdB, adjacency);
        if (treePath.length < 4) {
          continue;
        }

        const distance = getRoomDistance(rooms[roomIdA], rooms[roomIdB]);
        if (distance < 10 || distance > 24) {
          continue;
        }

        const edge = createRoomConnectionEdge(rooms, roomIdA, roomIdB, profile);
        const score = scoreProposedPath(grid, edge.path);
        if (score.reusedTiles > 4 || score.adjacentFloors > edge.path.length * 0.7) {
          continue;
        }

        candidates.push({
          edge,
          score: distance + score.reusedTiles * 4 + score.adjacentFloors,
        });
      }
    }

    candidates
      .sort((left, right) => left.score - right.score)
      .slice(0, targetExtraEdges * 3)
      .forEach(({ edge }) => {
        if (extraEdges.length >= targetExtraEdges) {
          return;
        }

        if (pathAlreadyConnected(edge.roomIdA, edge.roomIdB, [...baseEdges, ...extraEdges])) {
          return;
        }

        carvePath(grid, edge.path);
        extraEdges.push(edge);
      });

    return extraEdges;
  }

  function assignLockedDoors({
    floorNumber,
    grid,
    rooms,
    doors,
    keys,
    occupied,
    entryPosition,
    stairsUp,
    stairsDown,
  }) {
    const targetLockedDoorCount = getLockedDoorCountForFloor(floorNumber);
    if (targetLockedDoorCount <= 0) {
      return [];
    }

    const eligibleCandidates = [...doors]
      .filter((door) => {
        const room = rooms[door.roomIdB];
        return room &&
          !isPositionInsideRoom(entryPosition, room) &&
          !isPositionInsideRoom(stairsDown, room) &&
          (!stairsUp || !isPositionInsideRoom(stairsUp, room)) &&
          isLockedRoomSealed(grid, entryPosition, doors, room, door);
      })
      .sort((left, right) => (right.roomIdB ?? -1) - (left.roomIdB ?? -1));

    if (!eligibleCandidates.length) {
      return [];
    }

    const shuffledCandidates = [...eligibleCandidates].sort(() => Math.random() - 0.5);
    const selectedDoors = [];
    const usedRoomIds = new Set();

    for (const candidate of shuffledCandidates) {
      if (selectedDoors.length >= targetLockedDoorCount) {
        break;
      }

      if (usedRoomIds.has(candidate.roomIdB)) {
        continue;
      }

      const lockColor = LOCK_COLORS[randomInt(0, LOCK_COLORS.length - 1)];
      candidate.doorType = DOOR_TYPE.LOCKED;
      candidate.lockColor = lockColor;

      const room = rooms[candidate.roomIdB];
      const allSelectedStillSealed = [...selectedDoors, candidate].every((door) =>
        isLockedRoomSealed(grid, entryPosition, doors, rooms[door.roomIdB], door)
      );
      const reachableTiles = computeReachableTiles(grid, entryPosition, doors)
        .filter((tile) => !doors.some((door) => door.x === tile.x && door.y === tile.y))
        .filter((tile) => !occupied.some((entry) => entry.x === tile.x && entry.y === tile.y));

      if (!room || !allSelectedStillSealed || reachableTiles.length < selectedDoors.length + 1) {
        candidate.doorType = DOOR_TYPE.NORMAL;
        candidate.lockColor = null;
        continue;
      }

      selectedDoors.push(candidate);
      usedRoomIds.add(candidate.roomIdB);
    }

    if (!selectedDoors.length) {
      return [];
    }

    const keyTiles = computeReachableTiles(grid, entryPosition, doors)
      .filter((tile) => !doors.some((door) => door.x === tile.x && door.y === tile.y))
      .filter((tile) => !occupied.some((entry) => entry.x === tile.x && entry.y === tile.y));

    if (keyTiles.length < selectedDoors.length) {
      selectedDoors.forEach((door) => {
        door.doorType = DOOR_TYPE.NORMAL;
        door.lockColor = null;
      });
      return [];
    }

    const availableKeyTiles = [...keyTiles];
    selectedDoors.forEach((door) => {
      const tileIndex = randomInt(0, availableKeyTiles.length - 1);
      const [keyPosition] = availableKeyTiles.splice(tileIndex, 1);
      keys.push(createKeyPickup(door.lockColor, keyPosition.x, keyPosition.y, floorNumber));
      occupied.push(keyPosition);
    });

    return selectedDoors;
  }

  function createDungeonLevel(floorNumber, options = {}) {
    const grid = createGrid();
    const rooms = [];
    const studioArchetypeId = options.studioArchetypeId ?? rollStudioArchetypeId(randomInt);
    const layoutProfile = rollLayoutProfile();
    const targetRoomCount = randomInt(
      layoutProfile.targetRooms.min,
      layoutProfile.targetRooms.max,
    );
    const placementAttempts = Math.max(ROOM_ATTEMPTS, targetRoomCount * 8);

    for (let attempt = 0; attempt < placementAttempts && rooms.length < targetRoomCount; attempt += 1) {
      const template = rooms.length === 0
        ? {
            category: "hub",
            width: randomInt(Math.max(6, MIN_ROOM_SIZE + 2), Math.max(7, MAX_ROOM_SIZE + 1)),
            height: randomInt(Math.max(6, MIN_ROOM_SIZE + 1), Math.max(7, MAX_ROOM_SIZE + 1)),
          }
        : createRoomTemplate(layoutProfile);
      let room;

      if (rooms.length === 0) {
        room = {
          ...template,
          x: randomInt(2, Math.max(2, Math.floor(WIDTH / 6))),
          y: randomInt(
            2,
            Math.max(2, HEIGHT - template.height - 3),
          ),
        };
      } else if (Math.random() < layoutProfile.clusterChance) {
        const anchorRoom = rooms[randomInt(0, rooms.length - 1)];
        room = tryPlaceRoomNearAnchor(template, anchorRoom);
      } else {
        room = {
          ...template,
          x: randomInt(1, WIDTH - template.width - 2),
          y: randomInt(1, HEIGHT - template.height - 2),
        };
      }

      if (rooms.some((existing) => roomsOverlap(existing, room))) {
        continue;
      }

      carveRoom(grid, room);
      rooms.push(room);
    }

    if (rooms.length === 0) {
      const fallbackRoom = { x: 4, y: 4, width: 10, height: 8, category: "hub" };
      carveRoom(grid, fallbackRoom);
      rooms.push(fallbackRoom);
    }

    const startRoomIndex = chooseStartRoomIndex(rooms);
    const mainEdges = rooms.length > 1
      ? buildMainTreeEdges(rooms, startRoomIndex, layoutProfile)
      : [];
    mainEdges.forEach((edge) => carvePath(grid, edge.path));
    const extraEdges = rooms.length > 2
      ? buildExtraEdges(rooms, mainEdges, layoutProfile, grid)
      : [];
    const connectionEdges = [...mainEdges, ...extraEdges];
    const adjacency = buildRoomAdjacency(connectionEdges, rooms.length);
    const goalRoomIndex = rooms.length > 1
      ? findFarthestRoom(startRoomIndex, adjacency)
      : startRoomIndex;

    const occupied = [];
    const startRoom = rooms[startRoomIndex];
    const goalRoom = rooms[goalRoomIndex];

    function markOccupied(position) {
      if (!position) {
        return;
      }

      if (!occupied.some((entry) => entry.x === position.x && entry.y === position.y)) {
        occupied.push(position);
      }
    }

    function getRoomFloorTiles(room) {
      const tiles = [];
      for (let y = room.y; y < room.y + room.height; y += 1) {
        for (let x = room.x; x < room.x + room.width; x += 1) {
          if (grid[y][x] === TILE.FLOOR) {
            tiles.push({ x, y });
          }
        }
      }
      return tiles;
    }

    function chooseFreeTileInRoom(room) {
      const center = getRoomCenter(room);
      const roomTiles = getRoomFloorTiles(room)
        .filter((tile) => !occupied.some((entry) => entry.x === tile.x && entry.y === tile.y))
        .sort((left, right) =>
          (Math.abs(left.x - center.x) + Math.abs(left.y - center.y)) -
          (Math.abs(right.x - center.x) + Math.abs(right.y - center.y))
        );
      return roomTiles[0] ?? null;
    }

    const stairsUp = options.stairsUp ?? (floorNumber > 1 ? chooseFreeTileInRoom(startRoom) : null);
    const startPosition = stairsUp ?? chooseFreeTileInRoom(startRoom) ?? {
      x: startRoom.x + Math.floor(startRoom.width / 2),
      y: startRoom.y + Math.floor(startRoom.height / 2),
    };
    markOccupied(startPosition);

    function nextFloorPosition(preferredRooms = null) {
      if (preferredRooms) {
        for (const room of preferredRooms) {
          const preferredTile = chooseFreeTileInRoom(room);
          if (preferredTile) {
            markOccupied(preferredTile);
            return preferredTile;
          }
        }
      }

      let position;
      do {
        position = {
          x: randomInt(1, WIDTH - 2),
          y: randomInt(1, HEIGHT - 2),
        };
      } while (
        grid[position.y][position.x] !== TILE.FLOOR ||
        occupied.some((item) => item.x === position.x && item.y === position.y)
      );
      markOccupied(position);
      return position;
    }

    markOccupied(stairsUp);
    const stairsDown = options.stairsDown ?? nextFloorPosition([goalRoom]);
    const entryPosition = stairsUp ?? startPosition;
    const enemies = [];
    const potions = [];
    const weapons = [];
      const offHands = [];
      const chests = [];
    const foods = [];
    const keys = [];
    const doors = [];
    const showcases = [];
    const traps = [];
    const enemyCount = context.getEnemyCountForFloor(floorNumber);
    const potionCount = context.getPotionCountForFloor(floorNumber);
    const unlockedMonsterRank = context.getUnlockedMonsterRank(floorNumber, MONSTER_CATALOG);
      const availableMonsters = MONSTER_CATALOG.filter((monster) => monster.rank <= unlockedMonsterRank);
      const availableWeapons = buildAvailableWeaponsForFloor(floorNumber, unlockedMonsterRank);
      const availableShields = buildAvailableShieldsForFloor(floorNumber);
      const bonusChestWeapons = buildAvailableWeaponsForFloor(
        floorNumber + 1,
        context.getUnlockedMonsterRank(floorNumber + 1, MONSTER_CATALOG),
      );
      const bonusChestShields = buildAvailableShieldsForFloor(floorNumber + 1);
    const floorSeenCounts = {};
      const state = getState();
      const foodBudget = splitFoodBudget(rollFoodBudget(randomInt).totalBudget);

      markOccupied(stairsDown);

      const candidateConnections = connectionEdges
        .map((edge) => ({
          ...edge,
          door: getDoorCandidate(
            grid,
            rooms[edge.roomIdA],
            rooms[edge.roomIdB],
            edge.roomIdA,
            edge.roomIdB,
            edge.path,
          ),
        }))
        .filter((connection) => {
          if (!connection.door) {
            return false;
          }
          const { x, y } = connection.door;
          return (
            isValidDoorSlot(grid, x, y) &&
            !occupied.some((entry) => entry.x === x && entry.y === y)
          );
        });

      const doorTargetCount = candidateConnections.length === 0
        ? 0
        : Math.max(
          1,
          Math.min(
            candidateConnections.length,
            Math.floor(candidateConnections.length * (0.22 + Math.random() * 0.18)),
          ),
        );
      const shuffledCandidates = [...candidateConnections].sort(() => Math.random() - 0.5);

      for (const connection of shuffledCandidates.slice(0, doorTargetCount)) {
        doors.push(connection.door);
        markOccupied({ x: connection.door.x, y: connection.door.y });
      }

      showcases.push(...placeShowcases({
        grid,
        rooms,
        startRoomIndex,
        goalRoomIndex,
        doors,
        occupied,
        stairsUp,
        stairsDown,
        startPosition,
        studioArchetypeId,
      }));

      traps.push(
        ...buildTrapsForFloor({
          floorNumber,
          grid,
          occupied,
          doors,
          stairsUp,
          stairsDown,
        }),
      );

      for (let i = 0; i < enemyCount; i += 1) {
        const monster = chooseWeightedMonster(
          availableMonsters,
          floorNumber,
          state?.seenMonsterCounts ?? {},
          floorSeenCounts,
        );
        floorSeenCounts[monster.id] = (floorSeenCounts[monster.id] ?? 0) + 1;
        if (state?.seenMonsterCounts) {
          state.seenMonsterCounts[monster.id] = (state.seenMonsterCounts[monster.id] ?? 0) + 1;
        }
        const enemy = createEnemy(nextFloorPosition(), floorNumber, monster);
        const plannedDrop = rollMonsterPlannedDrop(enemy.id, foodBudget.monsters);
        if (plannedDrop) {
          enemy.lootDrop = {
            itemId: plannedDrop.itemId,
            item: plannedDrop.item,
          };
          foodBudget.monsters = Math.max(0, foodBudget.monsters - plannedDrop.spentBudget);
        }
        enemies.push(enemy);
      }

      for (let i = 0; i < potionCount; i += 1) {
        potions.push(nextFloorPosition());
      }

      for (const foodItem of buildFoodItemsForBudget(foodBudget.world)) {
        const pos = nextFloorPosition();
        foods.push(createFoodPickup(foodItem, pos.x, pos.y));
      }

      if (context.shouldSpawnFloorWeapon(floorNumber)) {
        const weapon = chooseWeightedWeapon(availableWeapons, state?.player);
        if (weapon) {
          const pos = nextFloorPosition();
          weapons.push(createWeaponPickup(generateEquipmentItem(weapon, {
            floorNumber,
            dropSourceTag: "floor-weapon",
          }), pos.x, pos.y));
        }
      }

      if (shouldSpawnFloorShield(floorNumber)) {
        const shield = chooseWeightedShield(availableShields, state?.player);
        if (shield) {
          const pos = nextFloorPosition();
          offHands.push(createOffHandPickup(generateEquipmentItem(shield, {
            floorNumber,
            dropSourceTag: "floor-shield",
          }), pos.x, pos.y));
        }
      }

      if (context.shouldSpawnChest(floorNumber)) {
        const chestCount = context.getChestCountForFloor(floorNumber);
        for (let i = 0; i < chestCount; i += 1) {
          const pos = nextFloorPosition();
          chests.push(createChestPickup(rollChestContent(floorNumber, availableWeapons, availableShields, { dropSourceTag: "chest" }), pos.x, pos.y));
        }
      }

      for (const foodItem of buildFoodItemsForBudget(foodBudget.containers)) {
        const pos = nextFloorPosition();
        chests.push(createChestPickup({ type: "food", item: foodItem }, pos.x, pos.y));
      }

      const lockedDoors = assignLockedDoors({
        floorNumber,
        grid,
        rooms,
        doors,
        keys,
        occupied,
        entryPosition,
        stairsUp,
        stairsDown,
      });
      lockedDoors.forEach((lockedDoor) => {
        const lockedRoom = rooms[lockedDoor.roomIdB];
        if (!lockedRoom) {
          return;
        }

        const lockedRoomTiles = [];
        for (let y = lockedRoom.y; y < lockedRoom.y + lockedRoom.height; y += 1) {
          for (let x = lockedRoom.x; x < lockedRoom.x + lockedRoom.width; x += 1) {
            if (
              !occupied.some((entry) => entry.x === x && entry.y === y) &&
              !doors.some((door) => door.x === x && door.y === y)
            ) {
              lockedRoomTiles.push({ x, y });
            }
          }
        }

        if (lockedRoomTiles.length > 0 && context.shouldPlaceLockedRoomChest()) {
          const chestPosition = lockedRoomTiles[randomInt(0, lockedRoomTiles.length - 1)];
          chests.push(createChestPickup(rollChestContent(floorNumber + 1, bonusChestWeapons, bonusChestShields, { dropSourceTag: "locked-room-chest" }), chestPosition.x, chestPosition.y));
          markOccupied(chestPosition);
        }
      });

      return {
        floorNumber,
        studioArchetypeId,
        grid,
        rooms,
        startPosition,
        stairsUp,
        stairsDown,
        enemies,
        potions,
        foods,
        weapons,
        offHands,
          chests,
          keys,
          doors,
          showcases,
          showcaseAmbienceSeen: {},
          traps,
          explored: Array.from({ length: HEIGHT }, () => Array(WIDTH).fill(false)),
          visible: Array.from({ length: HEIGHT }, () => Array(WIDTH).fill(false)),
        };
  }

  return {
    createEnemy,
    createWeaponPickup,
    createOffHandPickup,
    createChestPickup,
    createFoodPickup,
    createShowcase,
    createKeyPickup,
    createDoor,
    rollChestContent,
    cloneWeapon,
    createDungeonLevel,
  };
}
