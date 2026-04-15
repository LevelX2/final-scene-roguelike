import { buildCombatEnemyReference, formatEnemyAttackLog } from '../text/combat-log.mjs';
import { formatWeaponReference } from '../text/combat-phrasing.mjs';

const CARDINAL_STEPS = Object.freeze([
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
]);

const IDLE_PLAN_AGE_LIMITS = Object.freeze({
  stoic: 8,
  patrol: 12,
  restless: 9,
  erratic: 7,
});

const RECENT_ROOM_LIMIT = 4;
const RECENT_DOOR_LIMIT = 5;
const RECENT_AGGRO_POSITION_LIMIT = 6;

export function createEnemyTurnApi(context) {
  const {
    WIDTH,
    HEIGHT,
    TILE,
    DOOR_TYPE,
    getState,
    getCurrentFloorState,
    getDoorAt,
    getOffHand,
    resolveCombatAttack,
    resolveBlock,
    hasLineOfSight,
    isStraightShot,
    canActorMove,
    tryApplyWeaponEffects,
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
    manhattanDistance,
    randomChance = Math.random,
  } = context;

  function getMobility(enemy) {
    return enemy.mobility ?? 'roaming';
  }

  function getRetreatProfile(enemy) {
    return enemy.retreatProfile ?? 'none';
  }

  function getHealingProfile(enemy) {
    return enemy.healingProfile ?? 'slow';
  }

  function getTemperament(enemy) {
    return enemy.temperament ?? 'stoic';
  }

  function getMobilityLeash(enemy) {
    return getMobility(enemy) === 'local' ? 6 : Number.POSITIVE_INFINITY;
  }

  function getIdlePlanAgeLimit(enemy) {
    return IDLE_PLAN_AGE_LIMITS[getTemperament(enemy)] ?? 9;
  }

  function createPositionKey(position) {
    return `${position.x},${position.y}`;
  }

  function createDoorKey(door) {
    return door ? `${door.x},${door.y}` : null;
  }

  function isSamePosition(left, right) {
    return Boolean(left) && Boolean(right) && left.x === right.x && left.y === right.y;
  }

  function isSameStep(left, right) {
    return Boolean(left) && Boolean(right) && left.x === right.x && left.y === right.y;
  }

  function getRoomAtPosition(floorState, position) {
    return (floorState.rooms ?? []).find((room) =>
      position.x >= room.x &&
      position.x < room.x + room.width &&
      position.y >= room.y &&
      position.y < room.y + room.height
    ) ?? null;
  }

  function getRoomCenter(room) {
    return {
      x: room.x + Math.floor(room.width / 2),
      y: room.y + Math.floor(room.height / 2),
    };
  }

  function pushRecentEntry(entries, value, limit) {
    if (value == null) {
      return Array.isArray(entries) ? [...entries] : [];
    }

    const nextEntries = Array.isArray(entries) ? [...entries] : [];
    if (nextEntries[nextEntries.length - 1] === value) {
      return nextEntries;
    }

    const filtered = nextEntries.filter((entry) => entry !== value);
    filtered.push(value);
    return filtered.slice(-limit);
  }

  function pushRecentPosition(entries, position, limit) {
    if (!position) {
      return Array.isArray(entries) ? entries.map((entry) => ({ ...entry })) : [];
    }

    const nextEntries = Array.isArray(entries) ? entries.map((entry) => ({ ...entry })) : [];
    const key = createPositionKey(position);
    const last = nextEntries[nextEntries.length - 1];
    if (last && createPositionKey(last) === key) {
      return nextEntries;
    }

    const filtered = nextEntries.filter((entry) => createPositionKey(entry) !== key);
    filtered.push({ x: position.x, y: position.y });
    return filtered.slice(-limit);
  }

  function clearIdleTarget(enemy) {
    enemy.idleTarget = null;
    enemy.idleTargetType = null;
    enemy.idlePlanAge = 0;
  }

  function setIdleTarget(enemy, anchor) {
    enemy.idleTarget = anchor ? { x: anchor.x, y: anchor.y } : null;
    enemy.idleTargetType = anchor?.type ?? null;
    enemy.idlePlanAge = 0;
  }

  function ensureEnemyRuntimeState(enemy) {
    enemy.mobility ??= 'roaming';
    enemy.retreatProfile ??= 'none';
    enemy.healingProfile ??= 'slow';
    enemy.temperament ??= 'stoic';
    enemy.temperamentHint ??= enemy.description ?? '';
    enemy.idleTarget ??= null;
    enemy.idleTargetType ??= null;
    enemy.idlePlanAge = Number.isFinite(enemy.idlePlanAge) ? enemy.idlePlanAge : 0;
    enemy.recentRoomHistory = Array.isArray(enemy.recentRoomHistory) ? [...enemy.recentRoomHistory] : [];
    enemy.recentDoorHistory = Array.isArray(enemy.recentDoorHistory) ? [...enemy.recentDoorHistory] : [];
    enemy.recentAggroPositions = Array.isArray(enemy.recentAggroPositions)
      ? enemy.recentAggroPositions.map((position) => ({ ...position }))
      : [];
    enemy.canOpenDoors = Boolean(enemy.canOpenDoors);
  }

  function rememberEnemyMovement(enemy, floorState, previousPosition) {
    if (isSamePosition(previousPosition, enemy)) {
      return;
    }

    const room = getRoomAtPosition(floorState, enemy);
    if (room?.id != null) {
      enemy.recentRoomHistory = pushRecentEntry(enemy.recentRoomHistory, room.id, RECENT_ROOM_LIMIT);
    }

    const door = getDoorAt(enemy.x, enemy.y, floorState);
    const doorKey = createDoorKey(door);
    if (doorKey) {
      enemy.recentDoorHistory = pushRecentEntry(enemy.recentDoorHistory, doorKey, RECENT_DOOR_LIMIT);
    }

    if (enemy.idleTarget && isSamePosition(enemy, enemy.idleTarget)) {
      clearIdleTarget(enemy);
    }
  }

  function rememberAggroPosition(enemy) {
    enemy.recentAggroPositions = pushRecentPosition(enemy.recentAggroPositions, enemy, RECENT_AGGRO_POSITION_LIMIT);
  }

  function shouldEnemyRetreat(enemy, player, distanceToPlayer = manhattanDistance(enemy, player)) {
    const retreatProfile = getRetreatProfile(enemy);
    if (retreatProfile === 'none' || !enemy.aggro) {
      return false;
    }

    if ((enemy.intelligence ?? 0) < 4) {
      return false;
    }

    if (distanceToPlayer > (retreatProfile === 'cowardly' ? 4 : 3)) {
      return false;
    }

    const enemyHealthRatio = enemy.maxHp > 0 ? enemy.hp / enemy.maxHp : 0;
    const playerHealthRatio = player.maxHp > 0 ? player.hp / player.maxHp : 0;
    const retreatThreshold = retreatProfile === 'cowardly' ? 0.45 : 0.28;

    if (enemyHealthRatio > retreatThreshold) {
      return false;
    }

    if (playerHealthRatio < 0.45) {
      return false;
    }

    return player.hp > enemy.hp + (retreatProfile === 'cowardly' ? 0 : 2);
  }

  function tryEnemyRegeneration(enemy, distanceToPlayer, floorState) {
    if (enemy.hp >= enemy.maxHp || distanceToPlayer <= 1) {
      return;
    }

    const profile = getHealingProfile(enemy);
    if (profile === 'none') {
      return;
    }

    const rules = {
      slow: { cooldown: 6, heal: 1, requireCalm: false },
      steady: { cooldown: 4, heal: 1, requireCalm: false },
      lurking: { cooldown: 3, heal: 1, requireCalm: true },
    }[profile];

    if (!rules) {
      return;
    }

    if (rules.requireCalm && enemy.aggro) {
      return;
    }

    if (enemy.turnsSinceHit < rules.cooldown) {
      return;
    }

    const previousHp = enemy.hp;
    enemy.hp = Math.min(enemy.maxHp, enemy.hp + rules.heal);
    if (enemy.hp === previousHp) {
      return;
    }

    enemy.turnsSinceHit = 0;
    if (floorState.visible?.[enemy.y]?.[enemy.x]) {
      showFloatingText(enemy.x, enemy.y, `+${enemy.hp - previousHp}`, 'heal');
      const enemyReference = buildCombatEnemyReference(enemy);
      addMessage(`${enemyReference.subjectCapitalized} erholt sich etwas.`, 'important');
    }
  }

  function isEnemyPathTileOpen(enemy, x, y, floorState, target = null, options = {}) {
    const state = getState();
    if (x < 0 || y < 0 || x >= WIDTH || y >= HEIGHT) {
      return false;
    }

    if (floorState.grid[y]?.[x] !== TILE.FLOOR) {
      return false;
    }

    if (manhattanDistance({ x, y }, { x: enemy.originX, y: enemy.originY }) > getMobilityLeash(enemy)) {
      return false;
    }

    const door = getDoorAt(x, y, floorState);
    const showcase = floorState.showcases?.some((entry) => entry.x === x && entry.y === y);
    if (showcase) {
      return false;
    }

    if (door && !door.isOpen) {
      if (door.doorType === DOOR_TYPE.LOCKED) {
        return false;
      }

      if (!enemy.canOpenDoors) {
        return false;
      }
    }

    if (!options.ignoreEnemies && floorState.enemies.some((other) => other !== enemy && other.x === x && other.y === y)) {
      return false;
    }

    if (!options.ignorePlayer && state.player.x === x && state.player.y === y) {
      return Boolean(target) && target.x === x && target.y === y;
    }

    return true;
  }

  function moveEnemyToStep(enemy, step, floorState, options = {}) {
    if (!step || (step.x === 0 && step.y === 0)) {
      return true;
    }

    const state = getState();
    const previousPosition = { x: enemy.x, y: enemy.y };
    const nextX = enemy.x + step.x;
    const nextY = enemy.y + step.y;
    const door = getDoorAt(nextX, nextY, floorState);
    const showcase = floorState.showcases?.some((entry) => entry.x === nextX && entry.y === nextY);
    const blocked =
      floorState.grid[nextY]?.[nextX] !== TILE.FLOOR ||
      showcase ||
      (door && !door.isOpen && (door.doorType === DOOR_TYPE.LOCKED || !enemy.canOpenDoors)) ||
      floorState.enemies.some((other) => other !== enemy && other.x === nextX && other.y === nextY) ||
      (state.player.x === nextX && state.player.y === nextY);

    if (manhattanDistance({ x: nextX, y: nextY }, { x: enemy.originX, y: enemy.originY }) > getMobilityLeash(enemy)) {
      return false;
    }

    if (blocked) {
      return false;
    }

    if (door && !door.isOpen && enemy.canOpenDoors) {
      door.isOpen = true;
      playDoorOpenSound();
      const enemyReference = buildCombatEnemyReference(enemy);
      addMessage(`${enemyReference.subjectCapitalized} oeffnet eine Tuer.`, 'danger');
    }

    enemy.x = nextX;
    enemy.y = nextY;
    handleActorEnterTile(enemy, floorState);
    rememberEnemyMovement(enemy, floorState, previousPosition);
    if (options.trackAggro) {
      rememberAggroPosition(enemy);
    }
    return true;
  }

  function findPathStep(enemy, target, floorState) {
    const startKey = createPositionKey(enemy);
    const queue = [{
      x: enemy.x,
      y: enemy.y,
      firstStep: null,
    }];
    const seen = new Set([startKey]);
    const directions = [...CARDINAL_STEPS].sort((left, right) => {
      const leftDistance = Math.abs(target.x - (enemy.x + left.x)) + Math.abs(target.y - (enemy.y + left.y));
      const rightDistance = Math.abs(target.x - (enemy.x + right.x)) + Math.abs(target.y - (enemy.y + right.y));
      return leftDistance - rightDistance;
    });

    while (queue.length > 0) {
      const current = queue.shift();

      if (current.x === target.x && current.y === target.y) {
        return current.firstStep;
      }

      for (const direction of directions) {
        const nextX = current.x + direction.x;
        const nextY = current.y + direction.y;
        const key = `${nextX},${nextY}`;

        if (seen.has(key)) {
          continue;
        }

        if (!isEnemyPathTileOpen(enemy, nextX, nextY, floorState, target)) {
          continue;
        }

        seen.add(key);
        queue.push({
          x: nextX,
          y: nextY,
          firstStep: current.firstStep ?? direction,
        });
      }
    }

    return null;
  }

  function collectReachableTilesForEnemy(enemy, floorState) {
    const queue = [{ x: enemy.x, y: enemy.y }];
    const seen = new Set([createPositionKey(enemy)]);
    const reachable = [{ x: enemy.x, y: enemy.y }];

    while (queue.length > 0) {
      const current = queue.shift();

      for (const direction of CARDINAL_STEPS) {
        const nextX = current.x + direction.x;
        const nextY = current.y + direction.y;
        const key = `${nextX},${nextY}`;

        if (seen.has(key)) {
          continue;
        }

        if (!isEnemyPathTileOpen(enemy, nextX, nextY, floorState, null, {
          ignoreEnemies: true,
          ignorePlayer: true,
        })) {
          continue;
        }

        seen.add(key);
        const nextPosition = { x: nextX, y: nextY };
        queue.push(nextPosition);
        reachable.push(nextPosition);
      }
    }

    return reachable;
  }

  function findBestReachableTileForRoom(room, reachableTiles) {
    if (!room) {
      return null;
    }

    const center = getRoomCenter(room);
    const roomTiles = reachableTiles.filter((tile) =>
      tile.x >= room.x &&
      tile.x < room.x + room.width &&
      tile.y >= room.y &&
      tile.y < room.y + room.height
    );

    if (roomTiles.length === 0) {
      return null;
    }

    return [...roomTiles].sort((left, right) => {
      const leftDistance = Math.abs(left.x - center.x) + Math.abs(left.y - center.y);
      const rightDistance = Math.abs(right.x - center.x) + Math.abs(right.y - center.y);
      return leftDistance - rightDistance;
    })[0];
  }

  function collectIdleAnchors(enemy, floorState) {
    const reachableTiles = collectReachableTilesForEnemy(enemy, floorState);
    const reachableKeys = new Set(reachableTiles.map(createPositionKey));
    const currentRoom = getRoomAtPosition(floorState, enemy);
    const doorKeys = new Set((floorState.doors ?? []).map((door) => createDoorKey(door)));
    const anchors = [];
    const anchorKeys = new Set();

    function pushAnchor(anchor) {
      if (!anchor) {
        return;
      }

      const key = `${anchor.type}:${anchor.x},${anchor.y}`;
      if (anchorKeys.has(key)) {
        return;
      }

      anchorKeys.add(key);
      anchors.push(anchor);
    }

    if (reachableKeys.has(createPositionKey({ x: enemy.originX, y: enemy.originY }))) {
      pushAnchor({
        type: 'origin',
        x: enemy.originX,
        y: enemy.originY,
        roomId: getRoomAtPosition(floorState, { x: enemy.originX, y: enemy.originY })?.id ?? null,
      });
    }

    for (const room of floorState.rooms ?? []) {
      const targetTile = findBestReachableTileForRoom(room, reachableTiles);
      if (!targetTile) {
        continue;
      }

      pushAnchor({
        type: 'room',
        x: targetTile.x,
        y: targetTile.y,
        roomId: room.id,
        sameRoom: currentRoom?.id === room.id,
      });
    }

    for (const door of floorState.doors ?? []) {
      const doorKey = createDoorKey(door);
      if (!reachableKeys.has(doorKey)) {
        continue;
      }

      pushAnchor({
        type: 'door',
        x: door.x,
        y: door.y,
        roomId: currentRoom?.id ?? null,
        doorKey,
      });
    }

    const corridorCandidates = reachableTiles
      .filter((tile) => !getRoomAtPosition(floorState, tile) && !doorKeys.has(createPositionKey(tile)))
      .sort((left, right) =>
        manhattanDistance(enemy, right) - manhattanDistance(enemy, left)
      );

    if (corridorCandidates.length > 0) {
      pushAnchor({
        type: 'corridor',
        ...corridorCandidates[0],
      });
    }

    if (corridorCandidates.length > 2) {
      pushAnchor({
        type: 'corridor',
        ...corridorCandidates[Math.floor(corridorCandidates.length / 2)],
      });
    }

    return anchors;
  }

  function scoreIdleAnchor(enemy, floorState, anchor) {
    const temperament = getTemperament(enemy);
    const currentRoom = getRoomAtPosition(floorState, enemy);
    const recentRooms = new Set(enemy.recentRoomHistory ?? []);
    const recentDoors = new Set(enemy.recentDoorHistory ?? []);
    const sameRoom = anchor.roomId != null && currentRoom?.id === anchor.roomId;
    const distance = manhattanDistance(enemy, anchor);
    let score = 1;

    if (enemy.behavior === 'dormant') {
      score += sameRoom ? 3 : -2;
      score += anchor.type === 'origin' ? 2 : 0;
    }

    if (enemy.behavior === 'wanderer') {
      score += anchor.type === 'corridor' ? 2 : 0;
      score += !sameRoom ? 1.5 : 0;
    }

    if (enemy.behavior === 'trickster') {
      score += anchor.type === 'door' ? 2 : 0;
      score += anchor.type === 'corridor' ? 1.5 : 0;
    }

    if (enemy.behavior === 'stalker') {
      score += anchor.type === 'door' ? 1.5 : 0;
      score += anchor.type === 'room' && !sameRoom ? 1 : 0;
    }

    if (enemy.behavior === 'hunter') {
      score += anchor.type === 'origin' ? 2.5 : 0;
    }

    if (enemy.behavior === 'juggernaut') {
      score += sameRoom ? 2 : 0;
      score += anchor.type === 'origin' ? 2 : 0;
    }

    switch (temperament) {
      case 'stoic':
        score += anchor.type === 'origin' ? 8 : 0;
        score += sameRoom ? 6 : -3;
        score += Math.max(0, 4 - distance);
        score += anchor.type === 'door' ? -3 : 0;
        score += anchor.type === 'corridor' ? -2 : 0;
        score += anchor.roomId != null && recentRooms.has(anchor.roomId) ? -3 : 0;
        score += anchor.doorKey && recentDoors.has(anchor.doorKey) ? -2 : 0;
        break;
      case 'patrol':
        score += anchor.type === 'door' ? 7 : 0;
        score += anchor.type === 'room' ? 5 : 0;
        score += sameRoom ? -2 : 3;
        score += Math.min(distance, 8) * 0.8;
        score += anchor.roomId != null && recentRooms.has(anchor.roomId) ? -5 : 0;
        score += anchor.doorKey && recentDoors.has(anchor.doorKey) ? -4 : 0;
        score += anchor.type === 'origin' ? -1 : 0;
        break;
      case 'restless':
        score += anchor.type === 'door' ? 5 : 0;
        score += anchor.type === 'corridor' ? 6 : 0;
        score += sameRoom ? -4 : 3;
        score += Math.min(distance, 12) * 1.2;
        score += anchor.type === 'origin' ? -5 : 0;
        score += anchor.roomId != null && recentRooms.has(anchor.roomId) ? -2 : 0;
        break;
      case 'erratic':
        score += anchor.type === 'door' ? 2 : 0;
        score += anchor.type === 'corridor' ? 2.5 : 0;
        score += sameRoom ? 1 : 2;
        score += Math.min(distance, 10) * 0.5;
        score += anchor.roomId != null && recentRooms.has(anchor.roomId) ? -1.5 : 0;
        score += anchor.doorKey && recentDoors.has(anchor.doorKey) ? -1 : 0;
        break;
      default:
        break;
    }

    return score;
  }

  function selectScoredEntry(scoredEntries, temperament, varianceWindow = 1.75) {
    if (scoredEntries.length === 0) {
      return null;
    }

    const sortedEntries = [...scoredEntries].sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      const leftDistance = left.distance ?? 0;
      const rightDistance = right.distance ?? 0;
      return leftDistance - rightDistance;
    });

    if (temperament !== 'erratic') {
      return sortedEntries[0].entry;
    }

    const bestScore = sortedEntries[0].score;
    const candidates = sortedEntries.filter((item) => item.score >= bestScore - varianceWindow);
    return candidates[Math.floor(randomChance() * candidates.length)]?.entry ?? sortedEntries[0].entry;
  }

  function chooseIdleAnchor(enemy, floorState) {
    const anchors = collectIdleAnchors(enemy, floorState);
    const temperament = getTemperament(enemy);
    const scoredAnchors = anchors.map((anchor) => ({
      entry: anchor,
      score: scoreIdleAnchor(enemy, floorState, anchor),
      distance: manhattanDistance(enemy, anchor),
    }));

    return selectScoredEntry(scoredAnchors, temperament, 2.5);
  }

  function isIdleTargetValid(enemy, floorState) {
    if (!enemy.idleTarget) {
      return false;
    }

    if (isSamePosition(enemy, enemy.idleTarget)) {
      return true;
    }

    return isEnemyPathTileOpen(enemy, enemy.idleTarget.x, enemy.idleTarget.y, floorState, null, {
      ignoreEnemies: true,
      ignorePlayer: true,
    });
  }

  function shouldReplanIdleTarget(enemy, floorState) {
    if (!enemy.idleTarget) {
      return true;
    }

    if (!isIdleTargetValid(enemy, floorState)) {
      return true;
    }

    if (isSamePosition(enemy, enemy.idleTarget)) {
      return true;
    }

    if ((enemy.idlePlanAge ?? 0) >= getIdlePlanAgeLimit(enemy)) {
      return true;
    }

    return getTemperament(enemy) === 'erratic' && (enemy.idlePlanAge ?? 0) >= 3 && randomChance() < 0.18;
  }

  function buildMovementCandidates(enemy, floorState, target, pathStep, mode) {
    const currentDistance = manhattanDistance(enemy, target);
    const currentRoom = getRoomAtPosition(floorState, enemy);

    const candidates = CARDINAL_STEPS
      .filter((step) => isEnemyPathTileOpen(enemy, enemy.x + step.x, enemy.y + step.y, floorState))
      .map((step) => {
        const nextPosition = { x: enemy.x + step.x, y: enemy.y + step.y };
        const nextDistance = manhattanDistance(nextPosition, target);
        const nextDoor = getDoorAt(nextPosition.x, nextPosition.y, floorState);
        const nextRoom = getRoomAtPosition(floorState, nextPosition);
        const recentAggroPenalty = (enemy.recentAggroPositions ?? []).some((position) => isSamePosition(position, nextPosition))
          ? 1.5
          : 0;

        return {
          step,
          nextPosition,
          nextDistance,
          progress: currentDistance - nextDistance,
          matchesPath: isSameStep(step, pathStep),
          opensDoor: Boolean(nextDoor && !nextDoor.isOpen && enemy.canOpenDoors),
          changesRoom: currentRoom?.id != null && nextRoom?.id != null && currentRoom.id !== nextRoom.id,
          isCorridor: !nextRoom,
          recentAggroPenalty,
          mode,
        };
      });

    candidates.push({
      step: { x: 0, y: 0 },
      nextPosition: { x: enemy.x, y: enemy.y },
      nextDistance: currentDistance,
      progress: 0,
      matchesPath: false,
      opensDoor: false,
      changesRoom: false,
      isCorridor: !currentRoom,
      recentAggroPenalty: 0,
      mode,
    });

    return candidates;
  }

  function scoreMovementCandidate(enemy, candidate, mode) {
    const temperament = getTemperament(enemy);
    const idleTargetType = enemy.idleTargetType ?? null;
    let score = candidate.progress * 4;

    score += candidate.matchesPath ? 3 : 0;
    score += candidate.opensDoor ? 0.5 : 0;
    score -= candidate.recentAggroPenalty;
    score -= candidate.step.x === 0 && candidate.step.y === 0 ? 4 : 0;

    if (mode === 'idle') {
      score += candidate.progress * 1.5;
      score += idleTargetType === 'door' && candidate.opensDoor ? 2 : 0;
      score += idleTargetType === 'corridor' && candidate.isCorridor ? 1.5 : 0;
      score += idleTargetType === 'room' && candidate.changesRoom ? 1.5 : 0;
    }

    switch (temperament) {
      case 'stoic':
        score += candidate.matchesPath ? 2.5 : 0;
        score += candidate.progress <= 0 ? -3 : 0;
        score += candidate.changesRoom ? -1.5 : 0;
        break;
      case 'patrol':
        score += candidate.matchesPath ? 2 : 0;
        score += candidate.opensDoor ? 1.5 : 0;
        score += candidate.changesRoom ? 1 : 0;
        break;
      case 'restless':
        score += candidate.progress > 0 ? 3 : -2;
        score += candidate.changesRoom ? 1.5 : 0;
        score += candidate.isCorridor ? 1.25 : 0;
        break;
      case 'erratic':
        score += candidate.matchesPath ? 0.75 : 0;
        score += candidate.progress >= 0 && !candidate.matchesPath ? 1 : 0;
        score += candidate.changesRoom ? 0.5 : 0;
        break;
      default:
        break;
    }

    return score;
  }

  function moveTowardTarget(enemy, target, floorState, mode = 'aggro') {
    const pathStep = findPathStep(enemy, target, floorState);
    const temperament = getTemperament(enemy);
    const scoredCandidates = buildMovementCandidates(enemy, floorState, target, pathStep, mode)
      .map((candidate) => ({
        entry: candidate,
        score: scoreMovementCandidate(enemy, candidate, mode),
        distance: candidate.nextDistance,
      }));

    const selectedCandidate = selectScoredEntry(scoredCandidates, temperament, mode === 'idle' ? 2.25 : 1.5);
    if (!selectedCandidate) {
      return false;
    }

    const previousPosition = { x: enemy.x, y: enemy.y };
    const moved = moveEnemyToStep(enemy, selectedCandidate.step, floorState, {
      trackAggro: mode !== 'idle',
    });

    if (mode === 'idle') {
      enemy.idlePlanAge = (enemy.idlePlanAge ?? 0) + 1;
      if (isSamePosition(enemy, enemy.idleTarget)) {
        clearIdleTarget(enemy);
      }
    }

    return moved && !isSamePosition(previousPosition, enemy);
  }

  function chaseTarget(enemy, target, floorState) {
    return moveTowardTarget(enemy, target, floorState, 'aggro');
  }

  function fleeFromTarget(enemy, target, floorState) {
    const steps = [...CARDINAL_STEPS, { x: 0, y: 0 }].sort((left, right) => {
      const leftDistance = Math.abs(target.x - (enemy.x + left.x)) + Math.abs(target.y - (enemy.y + left.y));
      const rightDistance = Math.abs(target.x - (enemy.x + right.x)) + Math.abs(target.y - (enemy.y + right.y));
      return rightDistance - leftDistance;
    });

    for (const step of steps) {
      const previousPosition = { x: enemy.x, y: enemy.y };
      if (moveEnemyToStep(enemy, step, floorState, { trackAggro: true })) {
        return !isSamePosition(previousPosition, enemy) || (step.x === 0 && step.y === 0);
      }
    }

    return false;
  }

  function performIdleMovement(enemy, floorState) {
    ensureEnemyRuntimeState(enemy);

    if (shouldReplanIdleTarget(enemy, floorState)) {
      const nextAnchor = chooseIdleAnchor(enemy, floorState);
      if (!nextAnchor) {
        clearIdleTarget(enemy);
        return false;
      }
      setIdleTarget(enemy, nextAnchor);
    }

    if (!enemy.idleTarget) {
      return false;
    }

    if (isSamePosition(enemy, enemy.idleTarget)) {
      const temperament = getTemperament(enemy);
      clearIdleTarget(enemy);
      if (temperament === 'stoic' && randomChance() < 0.7) {
        return false;
      }

      const nextAnchor = chooseIdleAnchor(enemy, floorState);
      if (!nextAnchor) {
        return false;
      }
      setIdleTarget(enemy, nextAnchor);
    }

    return moveTowardTarget(enemy, enemy.idleTarget, floorState, 'idle');
  }

  function moveEnemies() {
    const state = getState();
    const floorState = getCurrentFloorState();

    for (const enemy of floorState.enemies) {
      ensureEnemyRuntimeState(enemy);
      enemy.turnsSinceHit += 1;

      const playerPosition = { x: state.player.x, y: state.player.y };
      const distance = manhattanDistance(enemy, playerPosition);
      const weapon = enemy.mainHand;
      const weaponRange = Math.max(1, weapon?.range ?? 1);
      const canShootPlayer = Boolean(
        weapon &&
        weapon.attackMode === 'ranged' &&
        distance > 1 &&
        distance <= weaponRange &&
        isStraightShot?.(enemy.x, enemy.y, state.player.x, state.player.y) &&
        hasLineOfSight?.(floorState, enemy.x, enemy.y, state.player.x, state.player.y),
      );
      tryEnemyRegeneration(enemy, distance, floorState);
      const adjacent = distance === 1;
      const retreating = shouldEnemyRetreat(enemy, state.player, distance);

      const enemyReference = buildCombatEnemyReference(enemy);

      if (retreating && !enemy.isRetreating) {
        addMessage(`${enemyReference.subjectCapitalized} sucht ploetzlich Abstand.`, 'important');
      }
      enemy.isRetreating = retreating;

      if (adjacent) {
        clearIdleTarget(enemy);
        if (retreating && fleeFromTarget(enemy, playerPosition, floorState)) {
          continue;
        }

        state.safeRestTurns = 0;
        noteMonsterEncounter(enemy);
        const result = resolveCombatAttack(enemy, state.player, { distance: 1, weapon });

        if (!result.hit) {
          showFloatingText(state.player.x, state.player.y, 'Dodge', 'dodge');
          playDodgeSound();
          addMessage(`Du weichst dem Angriff von ${enemyReference.dative} aus.`, 'important');
          continue;
        }

        const blockResult = resolveBlock(state.player, result.damage);
        const weaponLabel = formatWeaponReference(weapon, {
          article: 'definite',
          grammaticalCase: 'dative',
        });
        state.player.hp -= blockResult.damage;
        state.damageTaken = (state.damageTaken ?? 0) + Math.max(0, blockResult.damage);
        tryApplyWeaponEffects?.(enemy, state.player, weapon, {
          ...result,
          damage: blockResult.damage,
        });
        if (blockResult.damage > 0) {
          showFloatingText(state.player.x, state.player.y, `-${blockResult.damage}`, result.critical ? 'crit' : 'taken');
          playPlayerHitSound(result.critical);
        } else {
          showFloatingText(state.player.x, state.player.y, 'Block', 'heal');
        }
        if (blockResult.blocked) {
          addMessage(`${getOffHand(state.player).name} faengt ${blockResult.prevented} Schaden fuer dich ab.`, 'important');
        }
        addMessage(formatEnemyAttackLog({
          enemyReference,
          weaponLabel,
          damage: blockResult.damage,
          critical: result.critical,
        }), 'danger');
        if (state.player.hp <= 0) {
          state.player.hp = 0;
          state.gameOver = true;
          state.deathCause = createDeathCause(enemy, {
            critical: result.critical,
            ranged: false,
            victimName: state.player.name,
            weapon,
          });
          playDeathSound();
          const rank = saveHighscoreIfNeeded();
          addMessage('Du bist gefallen. Druecke R fuer einen neuen Versuch.', 'danger');
          showDeathModal(rank);
          return;
        }
        continue;
      }

      if (canShootPlayer) {
        clearIdleTarget(enemy);
        state.safeRestTurns = 0;
        noteMonsterEncounter(enemy);
        const result = resolveCombatAttack(enemy, state.player, { distance, weapon });
        const rangedBoardEffect = {
          boardEffect: {
            fromX: enemy.x,
            fromY: enemy.y,
            kind: result.critical ? 'hostile-shot-crit' : 'hostile-shot',
            flash: true,
          },
        };

        if (!result.hit) {
          showFloatingText(state.player.x, state.player.y, 'Dodge', 'dodge', {
            title: 'Schuss vorbei',
            duration: 900,
            ...rangedBoardEffect,
          });
          playDodgeSound();
          addMessage(`Du weichst dem Schuss von ${enemyReference.dative} aus.`, 'important');
          continue;
        }

        const blockResult = resolveBlock(state.player, result.damage);
        const weaponLabel = formatWeaponReference(weapon, {
          article: 'definite',
          grammaticalCase: 'dative',
        });
        state.player.hp -= blockResult.damage;
        state.damageTaken = (state.damageTaken ?? 0) + Math.max(0, blockResult.damage);
        tryApplyWeaponEffects?.(enemy, state.player, weapon, {
          ...result,
          damage: blockResult.damage,
        });
        if (blockResult.damage > 0) {
          showFloatingText(state.player.x, state.player.y, `-${blockResult.damage}`, result.critical ? 'crit' : 'taken', {
            title: result.critical ? 'Krit-Schuss' : 'Schuss',
            duration: 950,
            ...rangedBoardEffect,
          });
          playPlayerHitSound(result.critical, 'ranged');
        } else {
          showFloatingText(state.player.x, state.player.y, 'Block', 'heal', {
            title: 'Schuss geblockt',
            duration: 900,
            ...rangedBoardEffect,
          });
        }
        addMessage(formatEnemyAttackLog({
          enemyReference,
          weaponLabel,
          damage: blockResult.damage,
          critical: result.critical,
          ranged: true,
        }), 'danger');
        if (state.player.hp <= 0) {
          state.player.hp = 0;
          state.gameOver = true;
          state.deathCause = createDeathCause(enemy, {
            critical: result.critical,
            ranged: true,
            victimName: state.player.name,
            weapon,
          });
          playDeathSound();
          const rank = saveHighscoreIfNeeded();
          addMessage('Du bist gefallen. Druecke R fuer einen neuen Versuch.', 'danger');
          showDeathModal(rank);
          return;
        }
        continue;
      }

      if (!canActorMove?.(enemy)) {
        continue;
      }

      const mobility = getMobility(enemy);
      if (mobility === 'local' && enemy.aggro && distance > enemy.aggroRadius + 4) {
        enemy.aggro = false;
      }

      if (mobility === 'roaming' && distance <= enemy.aggroRadius + 1) {
        enemy.aggro = true;
      }

      if (mobility === 'relentless' && (enemy.aggro || distance <= enemy.aggroRadius + 2)) {
        enemy.aggro = true;
      }

      if (retreating || (weapon?.attackMode === 'ranged' && distance <= 2)) {
        clearIdleTarget(enemy);
        fleeFromTarget(enemy, playerPosition, floorState);
        continue;
      }

      if (enemy.behavior === 'dormant') {
        if (distance <= enemy.aggroRadius && randomChance() < 0.55) {
          enemy.aggro = true;
        }
        if (enemy.aggro) {
          clearIdleTarget(enemy);
          chaseTarget(enemy, playerPosition, floorState);
        } else if (randomChance() < 0.28) {
          performIdleMovement(enemy, floorState);
        }
        continue;
      }

      if (enemy.behavior === 'wanderer') {
        if (distance <= enemy.aggroRadius + (mobility === 'roaming' ? 1 : 0) && randomChance() < 0.68) {
          enemy.aggro = true;
          clearIdleTarget(enemy);
          chaseTarget(enemy, playerPosition, floorState);
        } else if (enemy.aggro && randomChance() < 0.78) {
          clearIdleTarget(enemy);
          chaseTarget(enemy, playerPosition, floorState);
        } else {
          performIdleMovement(enemy, floorState);
        }
        continue;
      }

      if (enemy.behavior === 'trickster') {
        if (distance <= enemy.aggroRadius + 1) {
          enemy.aggro = true;
        }
        if (enemy.aggro && randomChance() < 0.8) {
          clearIdleTarget(enemy);
          chaseTarget(enemy, playerPosition, floorState);
        } else {
          performIdleMovement(enemy, floorState);
        }
        continue;
      }

      if (enemy.behavior === 'stalker') {
        if (distance <= enemy.aggroRadius + 1) {
          enemy.aggro = true;
        }
        if (enemy.aggro) {
          clearIdleTarget(enemy);
          chaseTarget(enemy, playerPosition, floorState);
        } else if (randomChance() < 0.22) {
          performIdleMovement(enemy, floorState);
        }
        continue;
      }

      if (enemy.behavior === 'hunter') {
        if (distance <= enemy.aggroRadius + (mobility === 'relentless' ? 2 : 1)) {
          enemy.aggro = true;
        }
        if (enemy.aggro || distance <= enemy.aggroRadius) {
          clearIdleTarget(enemy);
          chaseTarget(enemy, playerPosition, floorState);
        } else if (randomChance() < 0.25) {
          performIdleMovement(enemy, floorState);
        }
        continue;
      }

      if (enemy.behavior === 'juggernaut') {
        if (distance <= enemy.aggroRadius + (mobility === 'relentless' ? 1 : 0)) {
          enemy.aggro = true;
        }
        if (enemy.aggro) {
          clearIdleTarget(enemy);
          chaseTarget(enemy, playerPosition, floorState);
        } else if (randomChance() < 0.15) {
          performIdleMovement(enemy, floorState);
        }
        continue;
      }

      if (distance <= enemy.aggroRadius) {
        clearIdleTarget(enemy);
        chaseTarget(enemy, playerPosition, floorState);
      } else if (randomChance() < 0.25) {
        performIdleMovement(enemy, floorState);
      }
    }
  }

  return {
    moveEnemies,
  };
}
