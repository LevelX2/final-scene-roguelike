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

  function hasNearbyEnemy(radius = 3) {
    const floorState = getCurrentFloorState();
    const state = getState();
    return floorState.enemies.some((enemy) => manhattanDistance(enemy, state.player) <= radius);
  }

  function isPlayerAdjacentToShowcase() {
    const floorState = getCurrentFloorState();
    const state = getState();
    return (floorState.showcases ?? []).some((showcase) =>
      manhattanDistance(showcase, state.player) === 1
    );
  }

  function processSafeRegeneration(actionType = "wait") {
    const state = getState();
    if (state.player.hp >= state.player.maxHp) {
      state.safeRestTurns = 0;
      return;
    }

    if (hasNearbyEnemy()) {
      state.safeRestTurns = 0;
      return;
    }

    const baseProgressGain = actionType === "move" ? 0.5 : actionType === "wait" ? 1 : 0;
    const showcaseBonus = baseProgressGain > 0 && isPlayerAdjacentToShowcase() ? 0.5 : 0;
    const progressGain = baseProgressGain + showcaseBonus;
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

  return {
    manhattanDistance,
    hasNearbyEnemy,
    processSafeRegeneration,
  };
}
