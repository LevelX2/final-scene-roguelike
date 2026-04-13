export function createRuntimeSupportApi(context) {
  const {
    getState,
    LOG_LIMIT,
    getNutritionMax,
    getNutritionStart,
    clampNutritionValue,
    getHungerState,
    getHungerStateMessage,
    HUNGER_STATE,
    NUTRITION_COST_PER_ACTION,
    DAMAGE_PER_ACTION_WHILE_DYING,
    showFloatingText,
    getPlayDeathSound,
    getSaveHighscoreIfNeeded,
    getShowDeathModal,
  } = context;

  function addMessage(text, tone = "") {
    const state = getState();
    state.messages.unshift({ text, tone });
    state.messages = state.messages.slice(0, LOG_LIMIT);
  }

  function getCurrentFloorState() {
    const state = getState();
    return state.floors[state.floor];
  }

  function getCurrentStudioArchetypeId() {
    return getCurrentFloorState()?.studioArchetypeId ?? null;
  }

  function refreshNutritionState(previousState = null) {
    const state = getState();
    state.player.nutritionMax = getNutritionMax(state.player);
    state.player.nutrition = clampNutritionValue(
      state.player.nutrition ?? getNutritionStart(state.player),
      state.player,
    );
    const nextState = getHungerState(state.player);
    state.player.hungerState = nextState;

    if (previousState && previousState !== nextState) {
      const message = getHungerStateMessage(nextState);
      if (message) {
        addMessage(message, nextState === HUNGER_STATE.DYING ? "danger" : "important");
      }
    }

    return nextState;
  }

  function restoreNutrition(amount) {
    const state = getState();
    const previous = state.player.nutrition ?? getNutritionStart(state.player);
    const previousState = state.player.hungerState;
    state.player.nutrition = previous + amount;
    refreshNutritionState(previousState);
    return Math.max(0, state.player.nutrition - previous);
  }

  function noteMonsterEncounter(enemy) {
    if (!enemy?.id) {
      return;
    }

    const state = getState();
    state.knownMonsterTypes[enemy.id] = true;
  }

  function applyPlayerNutritionTurnCost() {
    const state = getState();
    const previousState = state.player.hungerState;
    state.player.nutrition = (state.player.nutrition ?? getNutritionStart(state.player)) - NUTRITION_COST_PER_ACTION;
    const nextState = refreshNutritionState(previousState);

    if (nextState !== HUNGER_STATE.DYING) {
      return;
    }

    state.player.hp = Math.max(0, state.player.hp - DAMAGE_PER_ACTION_WHILE_DYING);
    state.damageTaken = (state.damageTaken ?? 0) + DAMAGE_PER_ACTION_WHILE_DYING;
    showFloatingText(state.player.x, state.player.y, `-${DAMAGE_PER_ACTION_WHILE_DYING}`, "taken");
    addMessage("Der Hunger zerfrisst dich.", "danger");
    if (state.player.hp <= 0) {
      state.gameOver = true;
      state.deathCause = "verhungerte hinter den Kulissen des Studiokomplexes.";
      getPlayDeathSound()?.();
      const rank = getSaveHighscoreIfNeeded()?.();
      addMessage("Du bist verhungert. Drücke R für einen neuen Versuch.", "danger");
      getShowDeathModal()?.(rank);
    }
  }

  return {
    addMessage,
    getCurrentFloorState,
    getCurrentStudioArchetypeId,
    refreshNutritionState,
    restoreNutrition,
    noteMonsterEncounter,
    applyPlayerNutritionTurnCost,
  };
}
