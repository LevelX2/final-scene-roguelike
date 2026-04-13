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
  } = context;

  function getMobility(enemy) {
    return enemy.mobility ?? "roaming";
  }

  function getRetreatProfile(enemy) {
    return enemy.retreatProfile ?? "none";
  }

  function getHealingProfile(enemy) {
    return enemy.healingProfile ?? "slow";
  }

  function getEnemyWeaponLabel(weapon) {
    if (!weapon || weapon.id === "bare-hands") {
      return "bloßen Fäusten";
    }
    return weapon.name ?? "einer unbekannten Waffe";
  }

  function getMobilityLeash(enemy) {
    return getMobility(enemy) === "local" ? 6 : Number.POSITIVE_INFINITY;
  }

  function shouldEnemyRetreat(enemy, player, distanceToPlayer = manhattanDistance(enemy, player)) {
    const retreatProfile = getRetreatProfile(enemy);
    if (retreatProfile === "none" || !enemy.aggro) {
      return false;
    }

    if ((enemy.intelligence ?? 0) < 4) {
      return false;
    }

    if (distanceToPlayer > (retreatProfile === "cowardly" ? 4 : 3)) {
      return false;
    }

    const enemyHealthRatio = enemy.maxHp > 0 ? enemy.hp / enemy.maxHp : 0;
    const playerHealthRatio = player.maxHp > 0 ? player.hp / player.maxHp : 0;
    const retreatThreshold = retreatProfile === "cowardly" ? 0.45 : 0.28;

    if (enemyHealthRatio > retreatThreshold) {
      return false;
    }

    if (playerHealthRatio < 0.45) {
      return false;
    }

    return player.hp > enemy.hp + (retreatProfile === "cowardly" ? 0 : 2);
  }

  function fleeFromTarget(enemy, target, floorState) {
    const steps = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
      { x: 0, y: 0 },
    ].sort((left, right) => {
      const leftDistance = Math.abs(target.x - (enemy.x + left.x)) + Math.abs(target.y - (enemy.y + left.y));
      const rightDistance = Math.abs(target.x - (enemy.x + right.x)) + Math.abs(target.y - (enemy.y + right.y));
      return rightDistance - leftDistance;
    });

    for (const step of steps) {
      if (moveEnemyToStep(enemy, step, floorState)) {
        return true;
      }
    }

    return false;
  }

  function tryEnemyRegeneration(enemy, distanceToPlayer, floorState) {
    if (enemy.hp >= enemy.maxHp || distanceToPlayer <= 1) {
      return;
    }

    const profile = getHealingProfile(enemy);
    if (profile === "none") {
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
      showFloatingText(enemy.x, enemy.y, `+${enemy.hp - previousHp}`, "heal");
      addMessage(`${enemy.name} erholt sich etwas.`, "important");
    }
  }

  function moveEnemyToStep(enemy, step, floorState) {
    const state = getState();
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

    if (!blocked) {
      if (door && !door.isOpen && enemy.canOpenDoors) {
        door.isOpen = true;
        playDoorOpenSound();
        addMessage(`${enemy.name} öffnet eine Tür.`, "danger");
      }
      enemy.x = nextX;
      enemy.y = nextY;
      handleActorEnterTile(enemy, floorState);
      return true;
    }

    return false;
  }

  function isEnemyPathTileOpen(enemy, x, y, floorState, target) {
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

    if (floorState.enemies.some((other) => other !== enemy && other.x === x && other.y === y)) {
      return false;
    }

    if (state.player.x === x && state.player.y === y) {
      return Boolean(target) && target.x === x && target.y === y;
    }

    return true;
  }

  function findPathStep(enemy, target, floorState) {
    const startKey = `${enemy.x},${enemy.y}`;
    const queue = [{
      x: enemy.x,
      y: enemy.y,
      firstStep: null,
    }];
    const seen = new Set([startKey]);
    const directions = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
    ].sort((left, right) => {
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

  function chaseTarget(enemy, target, floorState) {
    const pathStep = findPathStep(enemy, target, floorState);
    const distanceX = target.x - enemy.x;
    const distanceY = target.y - enemy.y;
    const stepOptions = pathStep
      ? [pathStep]
      : [];

    if (Math.abs(distanceX) > Math.abs(distanceY)) {
      stepOptions.push({ x: Math.sign(distanceX), y: 0 });
      if (distanceY !== 0) {
        stepOptions.push({ x: 0, y: Math.sign(distanceY) });
      }
    } else {
      stepOptions.push({ x: 0, y: Math.sign(distanceY) });
      if (distanceX !== 0) {
        stepOptions.push({ x: Math.sign(distanceX), y: 0 });
      }
    }

    stepOptions.push({ x: 0, y: 0 });
    for (const step of stepOptions) {
      if (moveEnemyToStep(enemy, step, floorState)) {
        return;
      }
    }
  }

  function wander(enemy, floorState) {
    const steps = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
    ].sort(() => Math.random() - 0.5);

    for (const step of steps) {
      if (moveEnemyToStep(enemy, step, floorState)) {
        return;
      }
    }
  }

  function moveEnemies() {
    const state = getState();
    const floorState = getCurrentFloorState();

    for (const enemy of floorState.enemies) {
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

      if (retreating && !enemy.isRetreating) {
        addMessage(`${enemy.name} sucht plötzlich Abstand.`, "important");
      }
      enemy.isRetreating = retreating;

      if (adjacent) {
        if (retreating && fleeFromTarget(enemy, playerPosition, floorState)) {
          continue;
        }

        state.safeRestTurns = 0;
        noteMonsterEncounter(enemy);
        const result = resolveCombatAttack(enemy, state.player, { distance: 1, weapon });

        if (!result.hit) {
          showFloatingText(state.player.x, state.player.y, "Dodge", "dodge");
          playDodgeSound();
          addMessage(`Du weichst dem Angriff von ${enemy.name} aus.`, "important");
          continue;
        }

        const blockResult = resolveBlock(state.player, result.damage);
        const weaponLabel = getEnemyWeaponLabel(weapon);
        state.player.hp -= blockResult.damage;
        state.damageTaken = (state.damageTaken ?? 0) + Math.max(0, blockResult.damage);
        tryApplyWeaponEffects?.(enemy, state.player, weapon, {
          ...result,
          damage: blockResult.damage,
        });
        if (blockResult.damage > 0) {
          showFloatingText(state.player.x, state.player.y, `-${blockResult.damage}`, result.critical ? "crit" : "taken");
          playPlayerHitSound(result.critical);
        } else {
          showFloatingText(state.player.x, state.player.y, "Block", "heal");
        }
        if (blockResult.blocked) {
          addMessage(`${getOffHand(state.player).name} faengt ${blockResult.prevented} Schaden für dich ab.`, "important");
        }
        addMessage(
          result.critical
            ? `${enemy.name} landet mit ${weaponLabel} einen kritischen Treffer für ${blockResult.damage} Schaden!`
            : `${enemy.name} trifft dich mit ${weaponLabel} für ${blockResult.damage} Schaden.`,
          "danger",
        );
        if (state.player.hp <= 0) {
          state.player.hp = 0;
          state.gameOver = true;
          state.deathCause = createDeathCause(enemy, { critical: result.critical, ranged: false });
          playDeathSound();
          const rank = saveHighscoreIfNeeded();
          addMessage("Du bist gefallen. Drücke R für einen neuen Versuch.", "danger");
          showDeathModal(rank);
          return;
        }
        continue;
      }

      if (canShootPlayer) {
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
          addMessage(`Du weichst dem Schuss von ${enemy.name} aus.`, 'important');
          continue;
        }

        const blockResult = resolveBlock(state.player, result.damage);
        const weaponLabel = getEnemyWeaponLabel(weapon);
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
        addMessage(
          result.critical
            ? `${enemy.name} trifft dich aus der Distanz mit ${weaponLabel} kritisch für ${blockResult.damage} Schaden!`
            : `${enemy.name} trifft dich aus der Distanz mit ${weaponLabel} für ${blockResult.damage} Schaden.`,
          'danger',
        );
        if (state.player.hp <= 0) {
          state.player.hp = 0;
          state.gameOver = true;
          state.deathCause = createDeathCause(enemy, { critical: result.critical, ranged: true });
          playDeathSound();
          const rank = saveHighscoreIfNeeded();
          addMessage('Du bist gefallen. Drücke R für einen neuen Versuch.', 'danger');
          showDeathModal(rank);
          return;
        }
        continue;
      }

      if (!canActorMove?.(enemy)) {
        continue;
      }
      const mobility = getMobility(enemy);

      if (mobility === "local" && enemy.aggro && distance > enemy.aggroRadius + 4) {
        enemy.aggro = false;
      }

      if (mobility === "roaming" && distance <= enemy.aggroRadius + 1) {
        enemy.aggro = true;
      }

      if (mobility === "relentless" && (enemy.aggro || distance <= enemy.aggroRadius + 2)) {
        enemy.aggro = true;
      }

      if (retreating || (weapon?.attackMode === 'ranged' && distance <= 2)) {
        fleeFromTarget(enemy, playerPosition, floorState);
        continue;
      }

      if (enemy.behavior === "dormant") {
        if (distance <= enemy.aggroRadius && Math.random() < 0.55) {
          enemy.aggro = true;
        }
        if (enemy.aggro) {
          chaseTarget(enemy, playerPosition, floorState);
        } else if (Math.random() < 0.28) {
          wander(enemy, floorState);
        }
        continue;
      }

      if (enemy.behavior === "wanderer") {
        if (distance <= enemy.aggroRadius + (mobility === "roaming" ? 1 : 0) && Math.random() < 0.68) {
          enemy.aggro = true;
          chaseTarget(enemy, playerPosition, floorState);
        } else if (enemy.aggro && Math.random() < 0.78) {
          chaseTarget(enemy, playerPosition, floorState);
        } else {
          wander(enemy, floorState);
        }
        continue;
      }

      if (enemy.behavior === "trickster") {
        if (distance <= enemy.aggroRadius + 1) {
          enemy.aggro = true;
        }
        if (enemy.aggro && Math.random() < 0.8) {
          chaseTarget(enemy, playerPosition, floorState);
        } else {
          wander(enemy, floorState);
        }
        continue;
      }

      if (enemy.behavior === "hunter") {
        if (distance <= enemy.aggroRadius + (mobility === "relentless" ? 2 : 1)) {
          enemy.aggro = true;
        }
        if (enemy.aggro || distance <= enemy.aggroRadius) {
          chaseTarget(enemy, playerPosition, floorState);
        } else if (Math.random() < 0.25) {
          chaseTarget(enemy, { x: enemy.originX, y: enemy.originY }, floorState);
        }
        continue;
      }

      if (enemy.behavior === "juggernaut") {
        if (distance <= enemy.aggroRadius + (mobility === "relentless" ? 1 : 0)) {
          enemy.aggro = true;
        }
        if (enemy.aggro) {
          chaseTarget(enemy, playerPosition, floorState);
        } else if (Math.random() < 0.15) {
          wander(enemy, floorState);
        }
        continue;
      }

      if (distance <= enemy.aggroRadius) {
        chaseTarget(enemy, playerPosition, floorState);
      } else if (Math.random() < 0.25) {
        wander(enemy, floorState);
      }
    }
  }

  return {
    moveEnemies,
  };
}
