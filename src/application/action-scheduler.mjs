import { getActorSpeedState, NORMAL_SPEED_INTERVAL } from './actor-speed.mjs';
import { getActorDerivedStat } from './derived-actor-stats.mjs';

export const STANDARD_ACTION_COST = 100;

function normalizeTimelineValue(value, fallback = 0) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return Math.max(0, Math.round(fallback) || 0);
  }

  return Math.max(0, Math.round(numeric));
}

function normalizeActionCost(value, fallback = STANDARD_ACTION_COST) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return fallback;
  }

  return Math.max(1, Math.round(numeric));
}

export function normalizeActorNextActionTime(actor, fallback = 0) {
  return normalizeTimelineValue(actor?.nextActionTime, fallback);
}

export function getActorCurrentSpeedInterval(actor) {
  return getActorSpeedState(actor).currentValue ?? NORMAL_SPEED_INTERVAL;
}

export function getActorActionDelay(actor, actionCost = STANDARD_ACTION_COST) {
  const currentSpeed = getActorCurrentSpeedInterval(actor);
  const normalizedCost = normalizeActionCost(actionCost);
  return Math.max(1, Math.round((currentSpeed * normalizedCost) / STANDARD_ACTION_COST));
}

export function createActionScheduler(context) {
  const {
    getState,
    getCurrentFloorState,
  } = context;

  function getAllFloorEntries(state = getState()) {
    const entries = Object.entries(state.floors ?? {})
      .map(([floorNumber, floorState]) => ({
        floorNumber: Number(floorNumber),
        floorState,
      }))
      .filter((entry) => Number.isInteger(entry.floorNumber) && entry.floorState)
      .sort((left, right) => left.floorNumber - right.floorNumber);

    if (!entries.length) {
      const currentFloorNumber = Number.isInteger(Number(state.floor)) ? Number(state.floor) : 1;
      const currentFloorState = getCurrentFloorState();
      return currentFloorState
        ? [{ floorNumber: currentFloorNumber, floorState: currentFloorState }]
        : [];
    }

    return entries;
  }

  function getActorFloorContext(actor) {
    const state = getState();
    if (actor === state.player) {
      return {
        floorNumber: state.floor,
        floorState: state.floors?.[state.floor] ?? getCurrentFloorState(),
      };
    }

    for (const entry of getAllFloorEntries(state)) {
      const enemyIndex = (entry.floorState.enemies ?? []).indexOf(actor);
      if (enemyIndex >= 0) {
        return {
          floorNumber: entry.floorNumber,
          floorState: entry.floorState,
          enemyIndex,
        };
      }
    }

    return {
      floorNumber: state.floor,
      floorState: getCurrentFloorState(),
      enemyIndex: Number.MAX_SAFE_INTEGER,
    };
  }

  function getStableActorOrder(actor, state) {
    if (actor === state.player) {
      return -1;
    }

    const { floorNumber, floorState, enemyIndex = Number.MAX_SAFE_INTEGER } = getActorFloorContext(actor);
    const safeFloorNumber = Number.isInteger(floorNumber) ? floorNumber : Number.MAX_SAFE_INTEGER;
    const safeEnemyIndex = enemyIndex >= 0
      ? enemyIndex
      : (floorState?.enemies ?? []).indexOf(actor);

    return safeFloorNumber * 10000 + (safeEnemyIndex >= 0 ? safeEnemyIndex : Number.MAX_SAFE_INTEGER);
  }

  function ensureActorSchedulingState(actor, fallback = 0) {
    if (!actor || typeof actor !== 'object') {
      return actor ?? null;
    }

    actor.baseSpeed = Number.isFinite(actor.baseSpeed)
      ? Math.max(1, Math.round(actor.baseSpeed))
      : NORMAL_SPEED_INTERVAL;
    actor.nextActionTime = normalizeActorNextActionTime(actor, fallback);
    return actor;
  }

  function ensureSchedulerState() {
    const state = getState();
    state.timelineTime = normalizeTimelineValue(state.timelineTime, 0);
    ensureActorSchedulingState(state.player, state.timelineTime);
    for (const entry of getAllFloorEntries(state)) {
      (entry.floorState.enemies ?? []).forEach((enemy) => ensureActorSchedulingState(enemy, state.timelineTime));
    }
    return { state, floorState: getCurrentFloorState() };
  }

  function compareActorsForTurnOrder(left, right) {
    const { state } = ensureSchedulerState();
    const leftTime = normalizeActorNextActionTime(left, state.timelineTime);
    const rightTime = normalizeActorNextActionTime(right, state.timelineTime);
    if (leftTime !== rightTime) {
      return leftTime - rightTime;
    }

    const leftReaction = getActorDerivedStat(left, 'reaction');
    const rightReaction = getActorDerivedStat(right, 'reaction');
    if (leftReaction !== rightReaction) {
      return rightReaction - leftReaction;
    }

    const leftIsPlayer = left === state.player;
    const rightIsPlayer = right === state.player;
    if (leftIsPlayer !== rightIsPlayer) {
      return leftIsPlayer ? -1 : 1;
    }

    return getStableActorOrder(left, state) - getStableActorOrder(right, state);
  }

  function getSchedulableActors() {
    const { state } = ensureSchedulerState();
    return [
      state.player,
      ...getAllFloorEntries(state).flatMap((entry) => entry.floorState.enemies ?? []),
    ].filter((actor) => actor && actor.hp > 0);
  }

  function getNextScheduledActor() {
    const actors = getSchedulableActors();
    if (!actors.length) {
      return null;
    }

    return [...actors].sort(compareActorsForTurnOrder)[0] ?? null;
  }

  function isPlayerTurn() {
    const { state } = ensureSchedulerState();
    return getNextScheduledActor() === state.player;
  }

  function beginActorTurn(actor) {
    if (!actor) {
      return null;
    }

    const { state } = ensureSchedulerState();
    const nextTime = normalizeActorNextActionTime(actor, state.timelineTime);
    state.timelineTime = nextTime;
    actor.nextActionTime = nextTime;
    return nextTime;
  }

  function scheduleActorNextTurn(actor, actionCost = STANDARD_ACTION_COST) {
    if (!actor || actor.hp <= 0) {
      return null;
    }

    const { state } = ensureSchedulerState();
    const currentTime = Math.max(
      state.timelineTime,
      normalizeActorNextActionTime(actor, state.timelineTime),
    );
    actor.nextActionTime = currentTime + getActorActionDelay(actor, actionCost);
    return actor.nextActionTime;
  }

  function setActorNextActionTime(actor, nextActionTime) {
    if (!actor) {
      return null;
    }

    const { state } = ensureSchedulerState();
    actor.nextActionTime = normalizeTimelineValue(nextActionTime, state.timelineTime);
    return actor.nextActionTime;
  }

  function setTimelineTime(nextTimelineTime) {
    const { state } = ensureSchedulerState();
    state.timelineTime = normalizeTimelineValue(nextTimelineTime, state.timelineTime);
    return state.timelineTime;
  }

  return {
    ensureActorSchedulingState,
    ensureSchedulerState,
    compareActorsForTurnOrder,
    getActorActionDelay,
    getActorFloorContext,
    getNextScheduledActor,
    isPlayerTurn,
    beginActorTurn,
    scheduleActorNextTurn,
    setActorNextActionTime,
    setTimelineTime,
  };
}
