import { getActorDerivedMaxHp } from '../application/derived-actor-stats.mjs';

export function createAiAwarenessApi(context) {
  const {
    getState,
    getCurrentFloorState,
    healPlayer,
    addMessage,
  } = context;

  function manhattanDistance(a, b) {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  }

  function chebyshevDistance(a, b) {
    return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
  }

  function hasNearbyEnemy(radius = 3) {
    const floorState = getCurrentFloorState();
    const state = getState();
    return floorState.enemies.some((enemy) => chebyshevDistance(enemy, state.player) <= radius);
  }

  function isPlayerAdjacentToShowcase() {
    const floorState = getCurrentFloorState();
    const state = getState();
    return (floorState.showcases ?? []).some((showcase) =>
      chebyshevDistance(showcase, state.player) === 1
    );
  }

  function processActorSafeRegeneration(actor, actionType = "wait") {
    const state = getState();
    if (actor !== state.player) {
      return;
    }

    if (state.player.hp >= getActorDerivedMaxHp(state.player)) {
      state.safeRestTurns = 0;
      return;
    }

    if (hasNearbyEnemy()) {
      state.safeRestTurns = 0;
      return;
    }

    const baseProgressGain = actionType === "move" ? 0.5 : actionType === "wait" ? 1 : 0;
    const showcaseBonus = baseProgressGain > 0 && isPlayerAdjacentToShowcase() ? 0.5 : 0;
    const consumableBonus = baseProgressGain > 0 ? (state.player.consumableBonuses?.safeRestProgressBonus ?? 0) : 0;
    const progressGain = baseProgressGain + showcaseBonus + consumableBonus;
    state.safeRestTurns += progressGain;
    if (state.safeRestTurns >= 4) {
      const healed = healPlayer(1);
      if (healed > 0) {
        addMessage(
          showcaseBonus > 0
            ? "In der stillen Nähe der Vitrine regenerierst du 1 Lebenspunkt."
            : "Du regenerierst langsam 1 Lebenspunkt.",
          "important",
        );
      }
      state.safeRestTurns = 0;
    }
  }

  function processSafeRegeneration(actionType = "wait") {
    processActorSafeRegeneration(getState().player, actionType);
  }

  return {
    manhattanDistance,
    chebyshevDistance,
    hasNearbyEnemy,
    processActorSafeRegeneration,
    processSafeRegeneration,
  };
}
