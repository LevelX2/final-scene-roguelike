import {
  cloneConsumableDefinition,
  CONSUMABLE_DEFINITIONS,
  getConsumableDefinition,
  getConsumableEffectLabel,
  getConsumableThemeForArchetype,
} from '../content/catalogs/consumables.mjs';

function cloneBuffMagnitude(magnitude) {
  return magnitude && typeof magnitude === 'object'
    ? { ...magnitude }
    : magnitude ?? null;
}

function cloneBuff(buff) {
  return {
    ...buff,
    magnitude: cloneBuffMagnitude(buff.magnitude),
  };
}

function cloneConsumableItem(item) {
  const definition = cloneConsumableDefinition(item?.id);
  if (definition) {
    return {
      ...definition,
      floorNumber: item?.floorNumber ?? definition.floorNumber ?? null,
      sourceArchetypeId: item?.sourceArchetypeId ?? definition.sourceArchetypeId ?? null,
      dropSourceTag: item?.dropSourceTag ?? definition.dropSourceTag ?? null,
    };
  }

  return item ? {
    ...item,
    magnitude: cloneBuffMagnitude(item.magnitude),
    useLogTexts: [...(item.useLogTexts ?? [])],
    expireLogTexts: [...(item.expireLogTexts ?? [])],
    resultLogTexts: [...(item.resultLogTexts ?? [])],
    balanceGroups: [...(item.balanceGroups ?? [])],
  } : null;
}

function getTierEntriesForFloor(floorNumber) {
  if (floorNumber <= 2) {
    return [
      { tier: 1, weight: 84 },
      { tier: 2, weight: 16 },
    ];
  }

  if (floorNumber <= 5) {
    return [
      { tier: 1, weight: 40 },
      { tier: 2, weight: 48 },
      { tier: 3, weight: 12 },
    ];
  }

  return [
    { tier: 1, weight: 12 },
    { tier: 2, weight: 52 },
    { tier: 3, weight: 36 },
  ];
}

function weightedPick(entries, randomChance = Math.random, weightKey = 'weight') {
  const totalWeight = entries.reduce((sum, entry) => sum + (entry?.[weightKey] ?? 0), 0);
  if (totalWeight <= 0) {
    return entries[entries.length - 1] ?? null;
  }

  let roll = randomChance() * totalWeight;
  for (const entry of entries) {
    roll -= entry?.[weightKey] ?? 0;
    if (roll <= 0) {
      return entry;
    }
  }

  return entries[entries.length - 1] ?? null;
}

export function rollConsumableLootDefinition({ floorNumber = 1, sourceType = 'floor', archetypeId = null, allowedPhase = 3 } = {}, randomChance = Math.random) {
  const theme = getConsumableThemeForArchetype(archetypeId);
  const tier = weightedPick(getTierEntriesForFloor(floorNumber), randomChance)?.tier ?? 1;
  const candidates = CONSUMABLE_DEFINITIONS.filter((entry) =>
    entry.tier === tier &&
    entry.phase <= allowedPhase &&
    (entry.theme === theme || sourceType !== 'floor')
  );
  const weightedEntries = candidates.map((entry) => ({
    definition: entry,
    weight: Number(entry.rarityWeight?.[sourceType] ?? entry.rarityWeight?.floor ?? 0),
  })).filter((entry) => entry.weight > 0);
  const picked = weightedPick(weightedEntries, randomChance)?.definition ?? null;
  return picked ? cloneConsumableDefinition(picked.id) : null;
}

export function createConsumableService(context) {
  const {
    getState,
    getCurrentFloorState,
    getDoorAt,
    getShowcaseAt,
    detectNearbyTraps,
    maybeTriggerShowcaseAmbience,
    handleActorEnterTile,
    moveToFloor,
    addMessage,
    createRuntimeId = (prefix) => `${prefix}-${Date.now()}`,
    randomChance = Math.random,
  } = context;

  function ensureConsumableState(state = getState()) {
    if (!state || typeof state !== 'object') {
      return null;
    }

    state.activeConsumableBuffs = Array.isArray(state.activeConsumableBuffs) ? state.activeConsumableBuffs : [];
    state.consumableLogMemory = state.consumableLogMemory && typeof state.consumableLogMemory === 'object'
      ? state.consumableLogMemory
      : {};
    state.player = state.player && typeof state.player === 'object'
      ? state.player
      : {};
    state.player.consumableBonuses = state.player.consumableBonuses && typeof state.player.consumableBonuses === 'object'
      ? state.player.consumableBonuses
      : {};
    state.player.activeConsumableBuffs = Array.isArray(state.player.activeConsumableBuffs)
      ? state.player.activeConsumableBuffs
      : [];
    return state;
  }

  function rebuildPlayerConsumableState() {
    const state = ensureConsumableState();
    if (!state) {
      return;
    }

    const totals = {
      lightBonus: 0,
      precision: 0,
      reaction: 0,
      nerves: 0,
      trapDetectionBonus: 0,
      trapAvoidBonus: 0,
      trapDamageReduction: 0,
      safeRestProgressBonus: 0,
      enemyAggroRadiusMod: 0,
    };

    for (const buff of state.activeConsumableBuffs) {
      const magnitude = buff?.magnitude ?? {};
      Object.entries(magnitude).forEach(([key, value]) => {
        if (!Number.isFinite(value)) {
          return;
        }
        totals[key] = (totals[key] ?? 0) + value;
      });
    }

    state.player.consumableBonuses = totals;
    state.player.activeConsumableBuffs = state.activeConsumableBuffs.map((buff) => ({
      buffId: buff.buffId,
      effectFamily: buff.effectFamily,
      sourceItemId: buff.sourceItemId,
      remainingTurns: buff.remainingTurns,
      magnitude: cloneBuffMagnitude(buff.magnitude),
      theme: buff.theme ?? null,
      label: getConsumableEffectLabel(buff.effectFamily),
    }));
  }

  function chooseLogText(itemId, channel, texts = []) {
    if (!texts.length) {
      return null;
    }

    const state = ensureConsumableState();
    if (!state) {
      return texts[0] ?? null;
    }

    const memoryKey = `${itemId}:${channel}`;
    const lastIndex = Number.isInteger(state.consumableLogMemory[memoryKey])
      ? state.consumableLogMemory[memoryKey]
      : -1;
    const available = texts
      .map((text, index) => ({ text, index }))
      .filter((entry) => texts.length === 1 || entry.index !== lastIndex);
    const picked = available[Math.floor(randomChance() * available.length)] ?? available[0] ?? null;
    if (!picked) {
      return null;
    }
    state.consumableLogMemory[memoryKey] = picked.index;
    return picked.text;
  }

  function addConsumableLog(item, channel, tone = 'important', fallbackText = null) {
    const text = chooseLogText(item?.id ?? item?.sourceItemId ?? 'consumable', channel, item?.[channel] ?? []);
    if (text || fallbackText) {
      addMessage(text ?? fallbackText, tone);
    }
  }

  function addActiveBuff(item) {
    const state = ensureConsumableState();
    if (!state) {
      return;
    }

    const definition = getConsumableDefinition(item.id) ?? item;
    const nextBuff = {
      buffId: createRuntimeId(`cons-buff-${definition.effectFamily}`),
      sourceItemId: definition.id,
      effectFamily: definition.effectFamily,
      remainingTurns: definition.duration ?? 0,
      magnitude: cloneBuffMagnitude(definition.magnitude),
      stackRule: definition.stackRule ?? 'refresh_or_stronger',
      theme: definition.theme ?? null,
    };
    const currentIndex = state.activeConsumableBuffs.findIndex((entry) => entry.effectFamily === nextBuff.effectFamily);
    if (currentIndex >= 0) {
      const current = state.activeConsumableBuffs[currentIndex];
      const currentPower = Object.values(current.magnitude ?? {}).reduce((sum, value) => sum + (Number(value) || 0), 0);
      const nextPower = Object.values(nextBuff.magnitude ?? {}).reduce((sum, value) => sum + (Number(value) || 0), 0);
      if (nextPower > currentPower || nextBuff.remainingTurns >= (current.remainingTurns ?? 0)) {
        state.activeConsumableBuffs[currentIndex] = nextBuff;
      } else {
        current.remainingTurns = Math.max(current.remainingTurns ?? 0, nextBuff.remainingTurns ?? 0);
      }
    } else {
      state.activeConsumableBuffs.push(nextBuff);
    }
    rebuildPlayerConsumableState();
  }

  function processConsumableBuffs() {
    const state = ensureConsumableState();
    if (!state) {
      return;
    }

    if (!state.activeConsumableBuffs.length) {
      rebuildPlayerConsumableState();
      return;
    }

    const stillActive = [];
    const expired = [];
    for (const buff of state.activeConsumableBuffs) {
      const nextBuff = cloneBuff(buff);
      nextBuff.remainingTurns = Math.max(0, (nextBuff.remainingTurns ?? 0) - 1);
      if (nextBuff.remainingTurns <= 0) {
        expired.push(nextBuff);
      } else {
        stillActive.push(nextBuff);
      }
    }

    state.activeConsumableBuffs = stillActive;
    rebuildPlayerConsumableState();
    expired.forEach((buff) => {
      const item = getConsumableDefinition(buff.sourceItemId);
      if (!item) {
        return;
      }
      addConsumableLog(item, 'expireLogTexts', 'important', `${item.displayName} klingt ab.`);
    });
  }

  function isWalkableTeleportTile(floorState, x, y) {
    if (x == null || y == null) {
      return false;
    }

    if (floorState?.grid?.[y]?.[x] !== '.') {
      return false;
    }

    if (getShowcaseAt?.(x, y, floorState)) {
      return false;
    }

    if (getDoorAt?.(x, y, floorState)) {
      return false;
    }

    if (floorState?.chests?.some((entry) => entry.x === x && entry.y === y)) {
      return false;
    }

    if (floorState?.enemies?.some((enemy) => enemy.x === x && enemy.y === y)) {
      return false;
    }

    const state = getState();
    if (state.player.x === x && state.player.y === y) {
      return false;
    }

    return true;
  }

  function getTeleportThreatScore(floorState, position) {
    const adjacentEnemyPenalty = (floorState?.enemies ?? []).reduce((score, enemy) => {
      const distance = Math.max(Math.abs(enemy.x - position.x), Math.abs(enemy.y - position.y));
      if (distance <= 1) {
        return score + 8;
      }
      if (distance <= 2) {
        return score + 3;
      }
      if (distance <= 3) {
        return score + 1;
      }
      return score;
    }, 0);
    const hazardPenalty = (floorState?.traps ?? []).some((trap) =>
      trap.state === 'active' &&
      trap.trigger === 'continuous' &&
      trap.x === position.x &&
      trap.y === position.y
    ) ? 10 : 0;
    return adjacentEnemyPenalty + hazardPenalty;
  }

  function pickTeleportDestination(item) {
    const floorState = getCurrentFloorState();
    const candidates = [];
    for (let y = 0; y < floorState.grid.length; y += 1) {
      for (let x = 0; x < floorState.grid[y].length; x += 1) {
        if (!isWalkableTeleportTile(floorState, x, y)) {
          continue;
        }
        const position = { x, y, threatScore: getTeleportThreatScore(floorState, { x, y }) };
        candidates.push(position);
      }
    }

    if (!candidates.length) {
      return null;
    }

    const quality = item?.magnitude?.quality ?? 'random';
    if (quality === 'random') {
      return candidates[Math.floor(randomChance() * candidates.length)] ?? null;
    }

    const filtered = quality === 'enemy_buffered'
      ? candidates.filter((entry) => entry.threatScore <= 3)
      : candidates.filter((entry) => entry.threatScore <= 1);
    const pool = filtered.length > 0 ? filtered : [...candidates].sort((left, right) => left.threatScore - right.threatScore).slice(0, Math.max(1, Math.floor(candidates.length / 3)));
    return pool[Math.floor(randomChance() * pool.length)] ?? pool[0] ?? null;
  }

  function useBlinkTeleport(item) {
    const state = getState();
    const destination = pickTeleportDestination(item);
    if (!destination) {
      addMessage('Die Requisite findet heute keinen sicheren Sprungpunkt.', 'danger');
      return false;
    }

    addConsumableLog(item, 'useLogTexts', 'important', `${item.displayName} reißt den Raum kurz auf.`);
    state.player.x = destination.x;
    state.player.y = destination.y;
    addConsumableLog(item, 'resultLogTexts', 'important', `${item.displayName} versetzt dich an eine neue Position.`);
    handleActorEnterTile?.(state.player);
    if (!state.gameOver) {
      detectNearbyTraps?.();
      maybeTriggerShowcaseAmbience?.();
    }
    return true;
  }

  function useFloorwarp(item) {
    const steps = Math.abs(item?.magnitude?.floors ?? 0);
    const direction = Math.sign(item?.magnitude?.floors ?? 0);
    if (!steps || !direction) {
      return false;
    }

    addConsumableLog(item, 'useLogTexts', 'important', `${item.displayName} knistert nach einem abrupten Szenenwechsel.`);
    let moved = false;
    for (let index = 0; index < steps; index += 1) {
      const ok = moveToFloor?.(direction);
      if (!ok) {
        break;
      }
      moved = true;
    }

    if (!moved) {
      addMessage(
        direction < 0
          ? 'Weiter zurück geht es hier nicht mehr.'
          : 'Der Sprung nach vorn findet keinen gültigen Anschluss.',
        'danger',
      );
      return false;
    }

    addConsumableLog(item, 'resultLogTexts', 'important', `${item.displayName} schneidet die Szene auf eine andere Ebene.`);
    return true;
  }

  function useConsumable(item) {
    const definition = getConsumableDefinition(item?.id) ?? item;
    if (!definition || definition.type !== 'consumable') {
      return false;
    }

    if ((definition.duration ?? 0) > 0) {
      addConsumableLog(definition, 'useLogTexts', 'important', `${definition.displayName} setzt einen Buff frei.`);
      addActiveBuff(definition);
      return true;
    }

    if (definition.effectFamily === 'blink_teleport') {
      return useBlinkTeleport(definition);
    }

    if (definition.effectFamily === 'retreat_floorwarp' || definition.effectFamily === 'advance_floorwarp') {
      return useFloorwarp(definition);
    }

    return false;
  }

  function rollConsumableForLoot({ floorNumber = 1, sourceType = 'floor', archetypeId = null, allowedPhase = 3 } = {}) {
    return rollConsumableLootDefinition({ floorNumber, sourceType, archetypeId, allowedPhase }, randomChance);
  }

  return {
    cloneConsumableItem,
    ensureConsumableState,
    rebuildPlayerConsumableState,
    processConsumableBuffs,
    useConsumable,
    rollConsumableForLoot,
  };
}
