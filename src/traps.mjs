const TRAP_VARIANTS = {
  floor: [
    {
      id: "loose-stage-panel",
      name: "Lockere Bühnenplatte",
      description: "Eine nachgebende Platte im Setboden schnappt plötzlich weg.",
      detectDifficulty: 3,
      reactDifficulty: 4,
      effect: { damage: 4 },
    },
    {
      id: "trapdoor-snag",
      name: "Verdeckte Falltür",
      description: "Ein verdeckter Mechanismus reisst am Boden auf.",
      detectDifficulty: 4,
      reactDifficulty: 4,
      effect: { damage: 5, slow: 1 },
    },
  ],
  alarm: [
    {
      id: "tripwire-alarm",
      name: "Stolperdraht",
      description: "Ein Draht löst Licht, Lärm und hektische Bewegung aus.",
      detectDifficulty: 4,
      reactDifficulty: 3,
      effect: { alarm: true },
    },
    {
      id: "spotlight-trigger",
      name: "Scheinwerfer-Auslöser",
      description: "Ein Mechanismus wirft dich abrupt ins grelle Rampenlicht.",
      detectDifficulty: 3,
      reactDifficulty: 3,
      effect: { alarm: true, nerveDebuff: 1 },
    },
  ],
  hazard: [
    {
      id: "sparking-cable",
      name: "Funkenkabel",
      description: "Blanke Kabel schlagen knisternd über den Boden.",
      effect: { damage: 2 },
    },
    {
      id: "slick-smoke-zone",
      name: "Rutschige Rauchzone",
      description: "Eine ölige Rauchfläche macht jeden Schritt unsicher.",
      effect: { slow: 1 },
    },
  ],
};

function createTrap(type, variant, x, y, overrides = {}) {
  if (type === "hazard") {
    return {
      id: `${variant.id}-${x}-${y}`,
      type,
      name: variant.name,
      description: variant.description,
      visibility: "visible",
      state: "active",
      trigger: "continuous",
      resetMode: "persistent",
      affectsPlayer: true,
      affectsEnemies: true,
      x,
      y,
      effect: { ...(variant.effect ?? {}) },
      ...overrides,
    };
  }

  return {
    id: `${variant.id}-${x}-${y}`,
    type,
    name: variant.name,
    description: variant.description,
    visibility: "hidden",
    state: "active",
    trigger: "on_enter",
    resetMode: "single_use",
    affectsPlayer: true,
    affectsEnemies: type === "floor",
    x,
    y,
    detectDifficulty: variant.detectDifficulty,
    reactDifficulty: variant.reactDifficulty,
    effect: { ...(variant.effect ?? {}) },
    ...overrides,
  };
}

function chooseTrapVariant(type, randomInt) {
  const variants = TRAP_VARIANTS[type] ?? [];
  if (!variants.length) {
    return null;
  }
  return variants[randomInt(0, variants.length - 1)];
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function createTrapsApi(context) {
  const {
    randomInt,
    randomChance,
    getState,
    getCurrentFloorState,
    addMessage,
    showFloatingText,
    healPlayer,
    refreshNutritionState,
    grantExperience,
    createDeathCause,
    saveHighscoreIfNeeded,
    showDeathModal,
    playDeathSound,
  } = context;

  function getTrapAt(x, y, floorState = getCurrentFloorState()) {
    return floorState?.traps?.find((trap) => trap.x === x && trap.y === y) ?? null;
  }

  function isTrapVisible(trap) {
    return trap.visibility === "visible" || trap.visibility === "discovered" || trap.state !== "active";
  }

  function buildTrapCandidates(grid, occupied, doors, stairsUp, stairsDown) {
    const blocked = new Set([
      ...occupied.map((entry) => `${entry.x},${entry.y}`),
      ...(doors ?? []).map((door) => `${door.x},${door.y}`),
      ...(stairsUp ? [`${stairsUp.x},${stairsUp.y}`] : []),
      ...(stairsDown ? [`${stairsDown.x},${stairsDown.y}`] : []),
    ]);
    const candidates = [];
    for (let y = 1; y < grid.length - 1; y += 1) {
      for (let x = 1; x < grid[y].length - 1; x += 1) {
        if (grid[y][x] !== ".") {
          continue;
        }
        if (blocked.has(`${x},${y}`)) {
          continue;
        }
        candidates.push({ x, y });
      }
    }
    return candidates;
  }

  function takeTrapPosition(candidates, occupied) {
    if (!candidates.length) {
      return null;
    }
    const index = randomInt(0, candidates.length - 1);
    const [position] = candidates.splice(index, 1);
    occupied.push(position);
    return position;
  }

  function buildTrapsForFloor({
    floorNumber,
    grid,
    occupied,
    doors = [],
    stairsUp = null,
    stairsDown = null,
  }) {
    const traps = [];
    const candidates = buildTrapCandidates(grid, occupied, doors, stairsUp, stairsDown);
    const floorTrapCount = floorNumber >= 5 ? 3 : floorNumber >= 3 ? 2 : floorNumber >= 2 ? 1 : 0;
    const alarmTrapCount = floorNumber >= 6 ? 2 : floorNumber >= 3 ? 1 : 0;
    const hazardCount = floorNumber >= 5 ? 2 : floorNumber >= 3 ? 1 : 0;

    for (let i = 0; i < floorTrapCount; i += 1) {
      const position = takeTrapPosition(candidates, occupied);
      const variant = chooseTrapVariant("floor", randomInt);
      if (!position || !variant) {
        break;
      }
      traps.push(createTrap("floor", variant, position.x, position.y));
    }

    for (let i = 0; i < alarmTrapCount; i += 1) {
      const position = takeTrapPosition(candidates, occupied);
      const variant = chooseTrapVariant("alarm", randomInt);
      if (!position || !variant) {
        break;
      }
      traps.push(createTrap("alarm", variant, position.x, position.y));
    }

    for (let i = 0; i < hazardCount; i += 1) {
      const position = takeTrapPosition(candidates, occupied);
      const variant = chooseTrapVariant("hazard", randomInt);
      if (!position || !variant) {
        break;
      }
      traps.push(createTrap("hazard", variant, position.x, position.y));
    }

    return traps;
  }

  function getDetectionChance(actor, trap) {
    return clamp(25 + ((actor.precision ?? 0) - (trap.detectDifficulty ?? 0)) * 15, 5, 95);
  }

  function getAvoidChance(actor, trap, trapVisible = false) {
    const visibleBonus = trapVisible ? 15 : 0;
    return clamp(20 + ((actor.reaction ?? 0) - (trap.reactDifficulty ?? 0)) * 15 + visibleBonus, 5, 95);
  }

  function detectNearbyTraps(player = getState().player, floorState = getCurrentFloorState()) {
    let detected = 0;
    (floorState.traps ?? []).forEach((trap) => {
      if (trap.state !== "active" || trap.visibility !== "hidden") {
        return;
      }
      const distance = Math.abs(player.x - trap.x) + Math.abs(player.y - trap.y);
      if (distance === 0 || distance > 1) {
        return;
      }
      if (randomChance() * 100 <= getDetectionChance(player, trap)) {
        trap.visibility = "discovered";
        detected += 1;
        addMessage(`Du entdeckst ${trap.name}.`, "important");
      }
    });
    return detected;
  }

  function handleTrapDeath(actor, trap) {
    const state = getState();
    const floorState = getCurrentFloorState();

    if (actor === state.player) {
      state.player.hp = 0;
      state.gameOver = true;
      state.deathCause = `${trap.name} forderte den Helden im falschen Moment.`;
      playDeathSound();
      const rank = saveHighscoreIfNeeded();
      addMessage("Eine Falle hat dich niedergestreckt. Drücke R für einen neuen Versuch.", "danger");
      showDeathModal(rank);
      return;
    }

    floorState.enemies = floorState.enemies.filter((enemy) => enemy !== actor);
    state.kills += 1;
    state.killStats[actor.baseName ?? actor.name] = (state.killStats[actor.baseName ?? actor.name] ?? 0) + 1;
    grantExperience(actor.xpReward ?? 0, actor.name);
    addMessage(`${actor.name} geht in ${trap.name} zugrunde.`, "important");
  }

  function applyTrapEffect(trap, actor, { reduced = false, isContinuous = false } = {}) {
    const state = getState();
    const floorState = getCurrentFloorState();
    const isPlayer = actor === state.player;

    if (trap.effect.damage) {
      if (!isPlayer) {
        actor.turnsSinceHit = 0;
      }
      const enduranceMitigation = isPlayer
        ? Math.floor((actor.endurance ?? 0) / (isContinuous ? 2 : 3))
        : Math.floor((actor.endurance ?? 0) / 4);
      const damage = Math.max(1, trap.effect.damage - enduranceMitigation - (reduced ? 1 : 0));
      actor.hp = Math.max(0, actor.hp - damage);
      if (isPlayer) {
        state.damageTaken = (state.damageTaken ?? 0) + damage;
      } else {
        state.damageDealt = (state.damageDealt ?? 0) + damage;
      }
      showFloatingText(actor.x, actor.y, `-${damage}`, "taken");
      addMessage(
        isPlayer
          ? `${trap.name} trifft dich für ${damage} Schaden.`
          : `${actor.name} erleidet ${damage} Schaden durch ${trap.name}.`,
        "danger",
      );
      if (actor.hp <= 0) {
        handleTrapDeath(actor, trap);
        return;
      }
    }

    if (trap.effect.slow) {
      addMessage(
        isPlayer
          ? `${trap.name} bringt dich kurz aus dem Tritt.`
          : `${actor.name} wird von ${trap.name} ausgebremst.`,
        "important",
      );
    }

    if (trap.effect.alarm && isPlayer) {
      let alerted = 0;
      floorState.enemies.forEach((enemy) => {
        const distance = Math.abs(enemy.x - trap.x) + Math.abs(enemy.y - trap.y);
        if (distance <= 8) {
          enemy.aggro = true;
          alerted += 1;
        }
      });
      addMessage(
        alerted > 0
          ? `${trap.name} lässt ${alerted} Gegner aufhorchen.`
          : `${trap.name} kreischt durch die Kulissen.`,
        "danger",
      );
    }
  }

  function triggerTrap(trap, actor, { isContinuous = false } = {}) {
    if (!trap || trap.state !== "active") {
      return false;
    }

    const state = getState();
    const isPlayer = actor === state.player;
    if ((isPlayer && !trap.affectsPlayer) || (!isPlayer && !trap.affectsEnemies)) {
      return false;
    }

    const hidden = trap.visibility === "hidden";
    if (hidden) {
      trap.visibility = "discovered";
    }

    if (!isContinuous && trap.trigger === "on_enter") {
      const avoided = trap.reactDifficulty == null
        ? false
        : randomChance() * 100 <= getAvoidChance(actor, trap, !hidden);

      if (avoided) {
        addMessage(
          isPlayer
            ? `Du reagierst rechtzeitig auf ${trap.name}.`
            : `${actor.name} entgeht ${trap.name}.`,
          "important",
        );
      } else {
        applyTrapEffect(trap, actor, { reduced: false, isContinuous: false });
      }

      if (trap.resetMode === "single_use") {
        trap.state = "consumed";
      }
      return true;
    }

    if (isContinuous && trap.trigger === "continuous") {
      applyTrapEffect(trap, actor, { reduced: false, isContinuous: true });
      return true;
    }

    return false;
  }

  function handleActorEnterTile(actor, floorState = getCurrentFloorState()) {
    const trap = getTrapAt(actor.x, actor.y, floorState);
    if (!trap) {
      return false;
    }
    return triggerTrap(trap, actor, { isContinuous: false });
  }

  function processContinuousTraps() {
    const state = getState();
    const floorState = getCurrentFloorState();
    const activeHazards = (floorState.traps ?? []).filter((trap) =>
      trap.state === "active" && trap.trigger === "continuous"
    );

    if (!activeHazards.length) {
      return;
    }

    activeHazards.forEach((trap) => {
      if (state.player.x === trap.x && state.player.y === trap.y && !state.gameOver) {
        triggerTrap(trap, state.player, { isContinuous: true });
      }

      if (state.gameOver) {
        return;
      }

      [...floorState.enemies].forEach((enemy) => {
        if (enemy.x === trap.x && enemy.y === trap.y) {
          triggerTrap(trap, enemy, { isContinuous: true });
        }
      });
    });
  }

  return {
    createTrap,
    buildTrapsForFloor,
    getTrapAt,
    isTrapVisible,
    detectNearbyTraps,
    handleActorEnterTile,
    processContinuousTraps,
  };
}
