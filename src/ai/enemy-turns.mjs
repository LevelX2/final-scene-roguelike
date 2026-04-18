import { recordKillStat } from '../kill-stats.mjs';
import {
  getEnemyAggroBreakDistance,
  getEnemyAggroChaseChance,
  getEnemyAggroPursuitDetectionBonus,
  estimateEnemyBaseStrikeDamage,
  getEnemyHealingProfile,
  getEnemyHealingRules,
  getEnemyIdleChance,
  getEnemyIdleExplorationRadius,
  getEnemyIdlePlanAgeLimit,
  getEnemyMobility,
  getEnemyMobilityLeash,
  getEnemyRangedDetectionBonus,
  getEnemyRetreatDistanceLimit,
  getEnemyRetreatHealthThreshold,
  getEnemyRetreatMinimumIntelligence,
  getEnemyRetreatProfile,
  getEnemyTemperament,
  shouldEnemyFallbackFromCloseRange,
  shouldEnemyAggroFromDetection,
  shouldEnemyKeepAggroByMobility,
  shouldEnemyPauseAtIdleTarget,
  shouldEnemyReplanIdleErratically,
} from './enemy-profile-helpers.mjs';
import { getActorDerivedMaxHp, getActorDerivedStat } from '../application/derived-actor-stats.mjs';
import { buildCombatEnemyReference, formatEnemyAttackLog } from '../text/combat-log.mjs';
import { formatWeaponReference } from '../text/combat-phrasing.mjs';

const CARDINAL_STEPS = Object.freeze([
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
]);

const EIGHT_WAY_STEPS = Object.freeze([
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
  { x: 1, y: 1 },
  { x: 1, y: -1 },
  { x: -1, y: 1 },
  { x: -1, y: -1 },
]);

const RECENT_ROOM_LIMIT = 4;
const RECENT_DOOR_LIMIT = 5;
const RECENT_AGGRO_POSITION_LIMIT = 6;
const RECENT_MOVE_POSITION_LIMIT = 6;
const DOOR_ACTION_HEARING_RANGE = 10;

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
    createWeaponPickup,
    createOffHandPickup,
    createFoodPickup,
    resolveCombatAttack,
    resolveBlock,
    hasLineOfSight,
    canActorMove,
    tryApplyWeaponEffects,
    addMessage,
    showFloatingText,
    createDeathCause,
    playPlayerHitSound,
    playDodgeSound,
    playVictorySound,
    playDeathSound,
    playDoorOpenSound,
    saveHighscoreIfNeeded,
    showDeathModal,
    grantExperience,
    noteMonsterEncounter,
    handleActorEnterTile,
    manhattanDistance,
    randomChance = Math.random,
  } = context;

  function chebyshevDistance(left, right) {
    return Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));
  }

  function isDiagonalStep(step) {
    return Boolean(step) && step.x !== 0 && step.y !== 0;
  }

  function isMovementBlockingTile(enemy, x, y, floorState) {
    if (x < 0 || y < 0 || x >= WIDTH || y >= HEIGHT) {
      return true;
    }

    if (floorState.grid[y]?.[x] !== TILE.FLOOR) {
      return true;
    }

    if (floorState.showcases?.some((entry) => entry.x === x && entry.y === y)) {
      return true;
    }

    const door = getDoorAt(x, y, floorState);
    return Boolean(door && !door.isOpen);
  }

  function canTraverseDiagonal(enemy, currentX, currentY, step, floorState) {
    if (!isDiagonalStep(step)) {
      return true;
    }

    return !(
      isMovementBlockingTile(enemy, currentX + step.x, currentY, floorState) &&
      isMovementBlockingTile(enemy, currentX, currentY + step.y, floorState)
    );
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
    enemy.recentMovePositions = Array.isArray(enemy.recentMovePositions)
      ? enemy.recentMovePositions.map((position) => ({ ...position }))
      : [];
    enemy.recentAggroPositions = Array.isArray(enemy.recentAggroPositions)
      ? enemy.recentAggroPositions.map((position) => ({ ...position }))
      : [];
    enemy.patrolRoute = Array.isArray(enemy.patrolRoute)
      ? enemy.patrolRoute.map((position) => ({ ...position }))
      : [];
    enemy.patrolRouteIndex = Number.isInteger(enemy.patrolRouteIndex) ? enemy.patrolRouteIndex : 0;
    enemy.patrolBlockedTurns = Number.isInteger(enemy.patrolBlockedTurns) ? enemy.patrolBlockedTurns : 0;
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

    enemy.recentMovePositions = pushRecentPosition(
      enemy.recentMovePositions,
      enemy,
      RECENT_MOVE_POSITION_LIMIT,
    );
    enemy.patrolBlockedTurns = 0;

    if (enemy.idleTarget && isSamePosition(enemy, enemy.idleTarget)) {
      clearIdleTarget(enemy);
    }
  }

  function rememberAggroPosition(enemy) {
    enemy.recentAggroPositions = pushRecentPosition(enemy.recentAggroPositions, enemy, RECENT_AGGRO_POSITION_LIMIT);
  }

  function canPlayerPerceiveDoorAction(floorState, player, x, y) {
    if (floorState.visible?.[y]?.[x]) {
      return 'visible';
    }

    if (manhattanDistance(player, { x, y }) <= DOOR_ACTION_HEARING_RANGE) {
      return 'heard';
    }

    return null;
  }

  function estimateEnemyStrikeDamage(enemy, distanceToPlayer) {
    const state = getState();
    const weapon = enemy.mainHand;
    const weaponDamage = weapon?.damage ?? 0;
    const isRangedAttack = weapon?.attackMode === 'ranged' && distanceToPlayer > 1;
    const floorNumber = Math.max(1, state?.floor ?? 1);
    const rangedDamagePenalty = isRangedAttack
      ? floorNumber <= 2
        ? 2
        : floorNumber <= 4
          ? 1
          : 0
      : 0;

    return estimateEnemyBaseStrikeDamage(enemy, weaponDamage, rangedDamagePenalty);
  }

  function shouldEnemyRetreat(enemy, player, distanceToPlayer = chebyshevDistance(enemy, player)) {
    const retreatProfile = getEnemyRetreatProfile(enemy);
    if (retreatProfile === 'none' || !enemy.aggro) {
      return false;
    }

    if (getActorDerivedStat(enemy, 'intelligence') < getEnemyRetreatMinimumIntelligence(enemy)) {
      return false;
    }

    if (distanceToPlayer > getEnemyRetreatDistanceLimit(enemy)) {
      return false;
    }

    const enemyHealthRatio = enemy.maxHp > 0 ? enemy.hp / enemy.maxHp : 0;
    const playerMaxHp = getActorDerivedMaxHp(player);
    const playerHealthRatio = playerMaxHp > 0 ? player.hp / playerMaxHp : 0;
    if (enemyHealthRatio > getEnemyRetreatHealthThreshold(enemy)) {
      return false;
    }

    const estimatedStrikeDamage = estimateEnemyStrikeDamage(enemy, distanceToPlayer);
    const canLikelyFinishPlayerInTwoHits = player.hp <= estimatedStrikeDamage * 2;
    if (canLikelyFinishPlayerInTwoHits) {
      return false;
    }

    return playerHealthRatio > 0;
  }

  function tryEnemyRegeneration(enemy, distanceToPlayer, floorState) {
    if (enemy.hp >= enemy.maxHp) {
      return;
    }

    const profile = getEnemyHealingProfile(enemy);
    if (profile === 'none') {
      return;
    }

    const rules = getEnemyHealingRules(enemy);

    if (!rules) {
      return;
    }

    if (distanceToPlayer < (rules.minimumDistance ?? 2)) {
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

  function canEnemyDetectPlayer(enemy, playerPosition, floorState, distanceToPlayer, rangeBonus = 0) {
    const detectionRadius = Math.max(0, (enemy.aggroRadius ?? 0) + rangeBonus);
    if (distanceToPlayer > detectionRadius) {
      return false;
    }

    return hasLineOfSight
      ? hasLineOfSight(floorState, enemy.x, enemy.y, playerPosition.x, playerPosition.y)
      : true;
  }

  function updateEnemyAggroState(enemy, mobility, distanceToPlayer, detectsPlayer, randomChance) {
    const startedAggro = Boolean(enemy.aggro);

    if (enemy.aggro && distanceToPlayer > getEnemyAggroBreakDistance(enemy)) {
      enemy.aggro = false;
    }

    if (mobility === 'roaming' && detectsPlayer(getEnemyAggroPursuitDetectionBonus(enemy))) {
      enemy.aggro = true;
    }

    if (shouldEnemyKeepAggroByMobility(enemy) && (enemy.aggro || detectsPlayer(getEnemyAggroPursuitDetectionBonus(enemy)))) {
      enemy.aggro = true;
    }

    if (shouldEnemyAggroFromDetection(enemy, detectsPlayer, randomChance)) {
      enemy.aggro = true;
    }

    return {
      aggroTriggered: !startedAggro && enemy.aggro,
    };
  }

  function handleEnemyDefeatByCounter(enemy, floorState, enemyReference, message) {
    const state = getState();
    floorState.enemies = floorState.enemies.filter((entry) => entry !== enemy);
    state.kills += 1;
    state.killStats = recordKillStat(state.killStats, enemy);
    if (enemy.lootWeapon && randomChance() < (enemy.weaponDropChance ?? 0.55)) {
      floorState.weapons.push(createWeaponPickup(enemy.lootWeapon, enemy.x, enemy.y));
      addMessage(`${enemyReference.subjectCapitalized} laesst ${formatWeaponReference(enemy.lootWeapon, { article: 'definite', grammaticalCase: 'accusative' })} fallen.`, 'important');
    }
    if (enemy.lootOffHand && randomChance() < (enemy.offHandDropChance ?? 0.45)) {
      floorState.offHands.push(createOffHandPickup(enemy.lootOffHand, enemy.x, enemy.y));
      addMessage(`${enemyReference.subjectCapitalized} verliert ${enemy.lootOffHand.name}.`, 'important');
    }
    if (enemy.lootDrop?.item?.type === 'food') {
      floorState.foods.push(createFoodPickup(enemy.lootDrop.item, enemy.x, enemy.y));
      addMessage(`${enemyReference.subjectCapitalized} laesst ${enemy.lootDrop.item.name} fallen.`, 'important');
    }
    playVictorySound?.();
    grantExperience?.(enemy.xpReward, enemyReference.object);
    addMessage(message ?? `${enemyReference.subjectCapitalized} geht am Gegenschlag zugrunde.`, 'important');
  }

  function applyReflectiveCounterToEnemy(enemy, blockResult, floorState, enemyReference) {
    if ((blockResult.reflectiveDamage ?? 0) <= 0) {
      return false;
    }

    const state = getState();
    enemy.hp = Math.max(0, enemy.hp - blockResult.reflectiveDamage);
    state.damageDealt = (state.damageDealt ?? 0) + blockResult.reflectiveDamage;
    showFloatingText(enemy.x, enemy.y, `-${blockResult.reflectiveDamage}`, 'dealt');
    addMessage(`${blockResult.item.name} wirft ${blockResult.reflectiveDamage} Schaden auf ${enemyReference.object} zurueck.`, 'important');
    if (enemy.hp > 0) {
      return false;
    }

    handleEnemyDefeatByCounter(
      enemy,
      floorState,
      enemyReference,
      `${enemyReference.subjectCapitalized} zerbricht am reflektierten Treffer.`,
    );
    return true;
  }

  function isEnemyPathTileOpen(enemy, x, y, floorState, target = null, options = {}) {
    const state = getState();
    if (x < 0 || y < 0 || x >= WIDTH || y >= HEIGHT) {
      return false;
    }

    if (floorState.grid[y]?.[x] !== TILE.FLOOR) {
      return false;
    }

    if (chebyshevDistance({ x, y }, { x: enemy.originX, y: enemy.originY }) > getEnemyMobilityLeash(enemy)) {
      return false;
    }

    const step = { x: x - enemy.x, y: y - enemy.y };
    if (!canTraverseDiagonal(enemy, enemy.x, enemy.y, step, floorState)) {
      return false;
    }

    const door = getDoorAt(x, y, floorState);
    const showcase = floorState.showcases?.some((entry) => entry.x === x && entry.y === y);
    if (showcase) {
      return false;
    }

    if (door && !door.isOpen) {
      if (isDiagonalStep(step)) {
        return false;
      }

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

    if (chebyshevDistance({ x: nextX, y: nextY }, { x: enemy.originX, y: enemy.originY }) > getEnemyMobilityLeash(enemy)) {
      return false;
    }

    if (!canTraverseDiagonal(enemy, enemy.x, enemy.y, step, floorState)) {
      return false;
    }

    if (blocked) {
      return false;
    }

    if (door && !door.isOpen && enemy.canOpenDoors) {
      if (isDiagonalStep(step)) {
        return false;
      }

      const doorPerception = canPlayerPerceiveDoorAction(floorState, state.player, nextX, nextY);
      door.isOpen = true;
      if (doorPerception) {
        playDoorOpenSound();
        if (doorPerception === 'visible') {
          const enemyReference = buildCombatEnemyReference(enemy);
          addMessage(`${enemyReference.subjectCapitalized} oeffnet eine Tuer.`, 'danger');
        } else {
          showFloatingText(state.player.x, state.player.y, 'Du hoerst eine Tuer aufgehen.', 'sense', {
            title: 'Hinter der Kulisse',
            duration: 1500,
          });
          addMessage('Aus der Kulisse dringt das Geraeusch einer aufgehenden Tuer.', 'important');
        }
      }
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

  function findPathStep(enemy, target, floorState, options = {}) {
    const startKey = createPositionKey(enemy);
    const queue = [{
      x: enemy.x,
      y: enemy.y,
      firstStep: null,
    }];
    const seen = new Set([startKey]);
    const directions = [...EIGHT_WAY_STEPS].sort((left, right) => {
      const leftDistance = chebyshevDistance(target, { x: enemy.x + left.x, y: enemy.y + left.y });
      const rightDistance = chebyshevDistance(target, { x: enemy.x + right.x, y: enemy.y + right.y });
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

        if (!isEnemyPathTileOpen(enemy, nextX, nextY, floorState, target, {
          ignoreEnemies: options.ignoreEnemies ?? false,
          ignorePlayer: options.ignorePlayer ?? false,
        })) {
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

  function collectReachableTilesForEnemy(enemy, floorState, options = {}) {
    const queue = [{ x: enemy.x, y: enemy.y }];
    const seen = new Set([createPositionKey(enemy)]);
    const reachable = [{ x: enemy.x, y: enemy.y }];

    while (queue.length > 0) {
      const current = queue.shift();

      for (const direction of EIGHT_WAY_STEPS) {
        const nextX = current.x + direction.x;
        const nextY = current.y + direction.y;
        const key = `${nextX},${nextY}`;

        if (seen.has(key)) {
          continue;
        }

        if (!isEnemyPathTileOpen(enemy, nextX, nextY, floorState, null, {
          ignoreEnemies: options.ignoreEnemies ?? true,
          ignorePlayer: options.ignorePlayer ?? true,
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

  function chooseSpreadTiles(candidates, count, seedPosition) {
    if (candidates.length === 0 || count <= 0) {
      return [];
    }

    const remaining = [...candidates];
    const selected = [];
    const seed = seedPosition ?? candidates[0];

    remaining.sort((left, right) =>
      chebyshevDistance(seed, right) - chebyshevDistance(seed, left)
    );
    selected.push(remaining.shift());

    while (remaining.length > 0 && selected.length < count) {
      remaining.sort((left, right) => {
        const leftSpread = selected.reduce((sum, point) => sum + chebyshevDistance(point, left), 0);
        const rightSpread = selected.reduce((sum, point) => sum + chebyshevDistance(point, right), 0);
        if (rightSpread !== leftSpread) {
          return rightSpread - leftSpread;
        }

        return chebyshevDistance(seed, right) - chebyshevDistance(seed, left);
      });
      selected.push(remaining.shift());
    }

    return selected;
  }

  function ensurePatrolRoute(enemy, floorState) {
    if (Array.isArray(enemy.patrolRoute) && enemy.patrolRoute.length >= 2) {
      enemy.patrolRouteIndex %= enemy.patrolRoute.length;
      return enemy.patrolRoute;
    }

    const seedPosition = { x: enemy.originX, y: enemy.originY };
    const seedRoom = getRoomAtPosition(floorState, seedPosition) ?? getRoomAtPosition(floorState, enemy);
    const reachableTiles = collectReachableTilesForEnemy(enemy, floorState);
    const patrolCandidates = reachableTiles
      .filter((tile) => {
        if (isSamePosition(tile, seedPosition)) {
          return false;
        }

        if (seedRoom) {
          return (
            tile.x >= seedRoom.x &&
            tile.x < seedRoom.x + seedRoom.width &&
            tile.y >= seedRoom.y &&
            tile.y < seedRoom.y + seedRoom.height
          );
        }

        return true;
      })
      .filter((tile) => chebyshevDistance(seedPosition, tile) >= 2);

    const patrolPointCount = patrolCandidates.length >= 8 ? 4 : patrolCandidates.length >= 4 ? 3 : 2;
    const route = chooseSpreadTiles(patrolCandidates, patrolPointCount, seedPosition);
    enemy.patrolRoute = route;
    enemy.patrolRouteIndex = 0;
    return route;
  }

  function choosePatrolAnchor(enemy, floorState) {
    if (!(enemy.behavior === 'dormant' && getEnemyTemperament(enemy) === 'patrol')) {
      return null;
    }

    const route = ensurePatrolRoute(enemy, floorState);
    if (!Array.isArray(route) || route.length === 0) {
      return null;
    }

    let routeIndex = enemy.patrolRouteIndex % route.length;
    if (isSamePosition(enemy, route[routeIndex])) {
      routeIndex = (routeIndex + 1) % route.length;
      enemy.patrolRouteIndex = routeIndex;
    }

    const nextPoint = route[routeIndex];
    const nextRoom = getRoomAtPosition(floorState, nextPoint);
    return nextPoint
      ? {
          type: 'patrol',
          x: nextPoint.x,
          y: nextPoint.y,
          roomId: nextRoom?.id ?? null,
        }
      : null;
  }

  function choosePatrolBypassAnchor(enemy, floorState) {
    if (enemy.idleTargetType !== 'patrol') {
      return null;
    }

    const currentRoom = getRoomAtPosition(floorState, enemy);
    const patrolKeys = new Set((enemy.patrolRoute ?? []).map((point) => createPositionKey(point)));
    const patrolTarget = enemy.idleTarget;
    const preferPerpendicularStep = patrolTarget
      ? Math.abs((patrolTarget.x ?? enemy.x) - enemy.x) >= Math.abs((patrolTarget.y ?? enemy.y) - enemy.y)
      : false;
    const reachableTiles = collectReachableTilesForEnemy(enemy, floorState, {
      ignoreEnemies: false,
      ignorePlayer: true,
    });

    const bypassCandidates = reachableTiles
      .map((tile) => {
        const room = getRoomAtPosition(floorState, tile);
        return {
          ...tile,
          roomId: room?.id ?? null,
          sameRoom: room?.id != null && room.id === currentRoom?.id,
          distance: chebyshevDistance(enemy, tile),
          isCorridor: !room,
          changesLane: preferPerpendicularStep ? tile.y !== enemy.y : tile.x !== enemy.x,
        };
      })
      .filter((tile) =>
        !isSamePosition(tile, enemy) &&
        tile.distance <= 4 &&
        !patrolKeys.has(createPositionKey(tile))
      );

    if (bypassCandidates.length === 0) {
      return null;
    }

    bypassCandidates.sort((left, right) => {
      const leftScore = (left.sameRoom ? 3 : 0) + (!left.isCorridor ? 2 : 0) + (left.changesLane ? 4 : 0) - left.distance;
      const rightScore = (right.sameRoom ? 3 : 0) + (!right.isCorridor ? 2 : 0) + (right.changesLane ? 4 : 0) - right.distance;
      if (rightScore !== leftScore) {
        return rightScore - leftScore;
      }

      return left.distance - right.distance;
    });

    const selected = bypassCandidates[0];
    return selected
      ? {
          type: 'patrol-bypass',
          x: selected.x,
          y: selected.y,
          roomId: selected.roomId,
        }
      : null;
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

    const patrolAnchor = choosePatrolAnchor(enemy, floorState);
    if (patrolAnchor) {
      pushAnchor(patrolAnchor);
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
        chebyshevDistance(enemy, right) - chebyshevDistance(enemy, left)
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

    const explorationRadius = getEnemyIdleExplorationRadius(enemy);
    const explorationCandidates = reachableTiles
      .map((tile) => {
        const room = getRoomAtPosition(floorState, tile);
        return {
          ...tile,
          roomId: room?.id ?? null,
          distance: chebyshevDistance(enemy, tile),
          isDoor: doorKeys.has(createPositionKey(tile)),
        };
      })
      .filter((tile) =>
        !isSamePosition(tile, enemy) &&
        !tile.isDoor &&
        tile.distance >= 4 &&
        tile.distance <= explorationRadius
      )
      .sort((left, right) => right.distance - left.distance);

    const explorationAnchors = chooseSpreadTiles(
      explorationCandidates,
      Math.min(3, explorationCandidates.length),
      enemy,
    );

    for (const tile of explorationAnchors) {
      pushAnchor({
        type: 'waypoint',
        x: tile.x,
        y: tile.y,
        roomId: tile.roomId,
      });
    }

    return anchors;
  }

  function scoreIdleAnchor(enemy, floorState, anchor) {
    const temperament = getEnemyTemperament(enemy);
    const currentRoom = getRoomAtPosition(floorState, enemy);
    const recentRooms = new Set(enemy.recentRoomHistory ?? []);
    const recentDoors = new Set(enemy.recentDoorHistory ?? []);
    const sameRoom = anchor.roomId != null && currentRoom?.id === anchor.roomId;
    const distance = chebyshevDistance(enemy, anchor);
    let score = 1;

    if (enemy.behavior === 'dormant') {
      score += sameRoom ? 3 : -2;
      score += anchor.type === 'origin' ? 2 : 0;
      score += anchor.type === 'patrol' ? 7 : 0;
    }

    if (enemy.behavior === 'wanderer') {
      score += anchor.type === 'corridor' ? 2 : 0;
      score += !sameRoom ? 1.5 : 0;
      score += anchor.type === 'waypoint' ? 4 : 0;
    }

    if (enemy.behavior === 'trickster') {
      score += anchor.type === 'door' ? 2 : 0;
      score += anchor.type === 'corridor' ? 1.5 : 0;
      score += anchor.type === 'waypoint' ? 3.5 : 0;
    }

    if (enemy.behavior === 'stalker') {
      score += anchor.type === 'door' ? 1.5 : 0;
      score += anchor.type === 'room' && !sameRoom ? 1 : 0;
      score += anchor.type === 'waypoint' ? 2.5 : 0;
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
        score += anchor.type === 'waypoint' ? -2.5 : 0;
        score += anchor.type === 'patrol' ? 2 : 0;
        score += anchor.roomId != null && recentRooms.has(anchor.roomId) ? -3 : 0;
        score += anchor.doorKey && recentDoors.has(anchor.doorKey) ? -2 : 0;
        break;
      case 'patrol':
        score += anchor.type === 'door' ? 7 : 0;
        score += anchor.type === 'room' ? 5 : 0;
        score += anchor.type === 'waypoint' ? 3 : 0;
        score += anchor.type === 'patrol' ? 10 : 0;
        score += sameRoom ? -2 : 3;
        score += Math.min(distance, 8) * 0.8;
        score += anchor.roomId != null && recentRooms.has(anchor.roomId) ? -5 : 0;
        score += anchor.doorKey && recentDoors.has(anchor.doorKey) ? -4 : 0;
        score += anchor.type === 'origin' ? -1 : 0;
        break;
      case 'restless':
        score += anchor.type === 'door' ? 5 : 0;
        score += anchor.type === 'corridor' ? 6 : 0;
        score += anchor.type === 'waypoint' ? 7 : 0;
        score += sameRoom ? -4 : 3;
        score += Math.min(distance, 12) * 1.2;
        score += anchor.type === 'origin' ? -5 : 0;
        score += anchor.roomId != null && recentRooms.has(anchor.roomId) ? -2 : 0;
        break;
      case 'erratic':
        score += anchor.type === 'door' ? 2 : 0;
        score += anchor.type === 'corridor' ? 2.5 : 0;
        score += anchor.type === 'waypoint' ? 5.5 : 0;
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
    const temperament = getEnemyTemperament(enemy);
    const scoredAnchors = anchors.map((anchor) => ({
      entry: anchor,
      score: scoreIdleAnchor(enemy, floorState, anchor),
      distance: chebyshevDistance(enemy, anchor),
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

    if ((enemy.idlePlanAge ?? 0) >= getEnemyIdlePlanAgeLimit(enemy)) {
      return true;
    }

    return shouldEnemyReplanIdleErratically(enemy, randomChance);
  }

  function buildMovementCandidates(enemy, floorState, target, pathStep, mode) {
    const currentDistance = chebyshevDistance(enemy, target);
    const currentRoom = getRoomAtPosition(floorState, enemy);

    const candidates = EIGHT_WAY_STEPS
      .filter((step) => isEnemyPathTileOpen(enemy, enemy.x + step.x, enemy.y + step.y, floorState))
      .map((step) => {
        const nextPosition = { x: enemy.x + step.x, y: enemy.y + step.y };
        const nextDistance = chebyshevDistance(nextPosition, target);
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
    const temperament = getEnemyTemperament(enemy);
    const idleTargetType = enemy.idleTargetType ?? null;
    const recentMovePositions = enemy.recentMovePositions ?? [];
    const immediateBacktrack = recentMovePositions[recentMovePositions.length - 2] ?? null;
    let score = candidate.progress * 4;

    // When BFS found a real route, trust that detour strongly enough to avoid corner ping-pong.
    score += candidate.matchesPath ? (mode === 'idle' ? 12 : 10) : 0;
    score += candidate.opensDoor ? 0.5 : 0;
    score -= candidate.recentAggroPenalty;
    score -= candidate.step.x === 0 && candidate.step.y === 0 ? 4 : 0;

    if (mode === 'idle') {
      score += candidate.progress * 1.5;
      score += idleTargetType === 'door' && candidate.opensDoor ? 2 : 0;
      score += idleTargetType === 'corridor' && candidate.isCorridor ? 1.5 : 0;
      score += idleTargetType === 'room' && candidate.changesRoom ? 1.5 : 0;
      score -= recentMovePositions.some((position) => isSamePosition(position, candidate.nextPosition)) ? 2 : 0;
      score -= immediateBacktrack && isSamePosition(immediateBacktrack, candidate.nextPosition) ? 4 : 0;
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
    const temperament = getEnemyTemperament(enemy);
    const movementCandidates = buildMovementCandidates(enemy, floorState, target, pathStep, mode);
    const directPathCandidate = pathStep && temperament !== 'erratic'
      ? movementCandidates.find((candidate) => candidate.matchesPath)
      : null;
    const scoredCandidates = movementCandidates
      .map((candidate) => ({
        entry: candidate,
        score: scoreMovementCandidate(enemy, candidate, mode),
        distance: candidate.nextDistance,
      }));

    const selectedCandidate = directPathCandidate
      ?? selectScoredEntry(scoredCandidates, temperament, mode === 'idle' ? 2.25 : 1.5);
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
        if (enemy.idleTargetType === 'patrol' && Array.isArray(enemy.patrolRoute) && enemy.patrolRoute.length > 0) {
          enemy.patrolRouteIndex = (enemy.patrolRouteIndex + 1) % enemy.patrolRoute.length;
        }
        if (enemy.idleTargetType !== 'patrol-bypass') {
          clearIdleTarget(enemy);
        }
      }
    }

    return moved && !isSamePosition(previousPosition, enemy);
  }

  function chaseTarget(enemy, target, floorState) {
    return moveTowardTarget(enemy, target, floorState, 'aggro');
  }

  function fleeFromTarget(enemy, target, floorState) {
    const recentMovePositions = enemy.recentMovePositions ?? [];
    const immediateBacktrack = recentMovePositions[recentMovePositions.length - 2] ?? null;
    const currentDistance = chebyshevDistance(enemy, target);

    const candidates = [...EIGHT_WAY_STEPS, { x: 0, y: 0 }]
      .filter((step) =>
        step.x === 0 && step.y === 0
          ? true
          : isEnemyPathTileOpen(enemy, enemy.x + step.x, enemy.y + step.y, floorState)
      )
      .map((step) => {
        const nextPosition = { x: enemy.x + step.x, y: enemy.y + step.y };
        const nextDistance = chebyshevDistance(nextPosition, target);
        const nextRoom = getRoomAtPosition(floorState, nextPosition);
        let score = nextDistance * 5;

        if (nextDistance > currentDistance) {
          score += 3;
        } else if (nextDistance < currentDistance) {
          score -= 8;
        }

        if (step.x === 0 && step.y === 0) {
          score -= 6;
        }

        if (recentMovePositions.some((position) => isSamePosition(position, nextPosition))) {
          score -= 2;
        }

        if (immediateBacktrack && isSamePosition(immediateBacktrack, nextPosition)) {
          score -= 5;
        }

        score += nextRoom ? 1 : 0;

        return {
          step,
          nextPosition,
          score,
          distance: nextDistance,
        };
      })
      .sort((left, right) => {
        if (right.score !== left.score) {
          return right.score - left.score;
        }

        return right.distance - left.distance;
      });

    const selected = candidates[0];
    if (!selected) {
      return false;
    }

    const previousPosition = { x: enemy.x, y: enemy.y };
    if (!moveEnemyToStep(enemy, selected.step, floorState, { trackAggro: true })) {
      return false;
    }

    return !isSamePosition(previousPosition, enemy) || (selected.step.x === 0 && selected.step.y === 0);
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
      if (enemy.idleTargetType === 'patrol-bypass' && (enemy.idlePlanAge ?? 0) < 2) {
        enemy.idlePlanAge = (enemy.idlePlanAge ?? 0) + 1;
        return false;
      }

      const temperament = getEnemyTemperament(enemy);
      clearIdleTarget(enemy);
      if (shouldEnemyPauseAtIdleTarget(enemy, randomChance)) {
        return false;
      }

      const nextAnchor = chooseIdleAnchor(enemy, floorState);
      if (!nextAnchor) {
        return false;
      }
      setIdleTarget(enemy, nextAnchor);
    }

    if (enemy.idleTargetType === 'patrol') {
      const blockedPath = !findPathStep(enemy, enemy.idleTarget, floorState);
      const pathExistsWithoutTraffic = Boolean(
        findPathStep(enemy, enemy.idleTarget, floorState, {
          ignoreEnemies: true,
          ignorePlayer: true,
        }),
      );

      if (blockedPath && pathExistsWithoutTraffic) {
        enemy.patrolBlockedTurns = (enemy.patrolBlockedTurns ?? 0) + 1;
        const bypassAnchor = choosePatrolBypassAnchor(enemy, floorState);
        if (bypassAnchor) {
          setIdleTarget(enemy, bypassAnchor);
          return moveTowardTarget(enemy, enemy.idleTarget, floorState, 'idle');
        }
      }
    }

    const moved = moveTowardTarget(enemy, enemy.idleTarget, floorState, 'idle');
    if (moved) {
      return true;
    }

    if (enemy.idleTargetType === 'patrol') {
      enemy.patrolBlockedTurns = (enemy.patrolBlockedTurns ?? 0) + 1;
      if (enemy.patrolBlockedTurns >= 1) {
        const bypassAnchor = choosePatrolBypassAnchor(enemy, floorState);
        if (bypassAnchor) {
          setIdleTarget(enemy, bypassAnchor);
          return moveTowardTarget(enemy, enemy.idleTarget, floorState, 'idle');
        }
      }
    }

    return false;
  }

  function moveEnemies() {
    const state = getState();
    const floorState = getCurrentFloorState();

    for (const enemy of floorState.enemies) {
      ensureEnemyRuntimeState(enemy);
      enemy.turnsSinceHit += 1;

      const playerPosition = { x: state.player.x, y: state.player.y };
      const distance = chebyshevDistance(enemy, playerPosition);
      const detectsPlayer = (rangeBonus = 0) =>
        canEnemyDetectPlayer(enemy, playerPosition, floorState, distance, rangeBonus);
      const weapon = enemy.mainHand;
      const weaponRange = Math.max(1, weapon?.range ?? 1);
      const canShootPlayer = Boolean(
        weapon &&
        weapon.attackMode === 'ranged' &&
        distance > 1 &&
        distance <= weaponRange &&
        hasLineOfSight?.(floorState, enemy.x, enemy.y, state.player.x, state.player.y) &&
        detectsPlayer(getEnemyRangedDetectionBonus(enemy, weapon)),
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
          if (applyReflectiveCounterToEnemy(enemy, blockResult, floorState, enemyReference)) {
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
        if (blockResult.blocked) {
          addMessage(`${getOffHand(state.player).name} faengt ${blockResult.prevented} Schaden fuer dich ab.`, 'important');
          if (applyReflectiveCounterToEnemy(enemy, blockResult, floorState, enemyReference)) {
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

      const mobility = getEnemyMobility(enemy);
      const aggroState = updateEnemyAggroState(enemy, mobility, distance, detectsPlayer, randomChance);

      if (retreating || shouldEnemyFallbackFromCloseRange(enemy, weapon, distance)) {
        clearIdleTarget(enemy);
        fleeFromTarget(enemy, playerPosition, floorState);
        continue;
      }

      if (enemy.behavior === 'dormant') {
        if (enemy.aggro) {
          clearIdleTarget(enemy);
          chaseTarget(enemy, playerPosition, floorState);
        } else if (randomChance() < getEnemyIdleChance(enemy)) {
          performIdleMovement(enemy, floorState);
        }
        continue;
      }

      if (enemy.behavior === 'wanderer') {
        if (aggroState.aggroTriggered) {
          clearIdleTarget(enemy);
          chaseTarget(enemy, playerPosition, floorState);
        } else if (enemy.aggro && randomChance() < getEnemyAggroChaseChance(enemy)) {
          clearIdleTarget(enemy);
          chaseTarget(enemy, playerPosition, floorState);
        } else {
          performIdleMovement(enemy, floorState);
        }
        continue;
      }

      if (enemy.behavior === 'trickster') {
        if (enemy.aggro && randomChance() < getEnemyAggroChaseChance(enemy)) {
          clearIdleTarget(enemy);
          chaseTarget(enemy, playerPosition, floorState);
        } else {
          performIdleMovement(enemy, floorState);
        }
        continue;
      }

      if (enemy.behavior === 'stalker') {
        if (enemy.aggro) {
          clearIdleTarget(enemy);
          chaseTarget(enemy, playerPosition, floorState);
        } else if (randomChance() < getEnemyIdleChance(enemy)) {
          performIdleMovement(enemy, floorState);
        }
        continue;
      }

      if (enemy.behavior === 'hunter') {
        if (enemy.aggro || detectsPlayer()) {
          clearIdleTarget(enemy);
          chaseTarget(enemy, playerPosition, floorState);
        } else if (randomChance() < getEnemyIdleChance(enemy)) {
          performIdleMovement(enemy, floorState);
        }
        continue;
      }

      if (enemy.behavior === 'juggernaut') {
        if (enemy.aggro) {
          clearIdleTarget(enemy);
          chaseTarget(enemy, playerPosition, floorState);
        } else if (randomChance() < getEnemyIdleChance(enemy)) {
          performIdleMovement(enemy, floorState);
        }
        continue;
      }

      if (detectsPlayer()) {
        clearIdleTarget(enemy);
        chaseTarget(enemy, playerPosition, floorState);
      } else if (randomChance() < getEnemyIdleChance(enemy)) {
        performIdleMovement(enemy, floorState);
      }
    }
  }

  return {
    moveEnemies,
  };
}
