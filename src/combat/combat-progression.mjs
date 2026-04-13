export function createCombatProgressionApi(context) {
  const {
    getState,
    showFloatingText,
    playLevelUpSound,
    xpForNextLevel,
    getLevelUpRewards,
    addMessage,
    grantExperienceHook,
  } = context;

  function healPlayer(amount) {
    const state = getState();
    const previousHp = state.player.hp;
    state.player.hp = Math.min(state.player.maxHp, state.player.hp + amount);
    const healed = state.player.hp - previousHp;
    if (healed > 0) {
      showFloatingText(state.player.x, state.player.y, `+${healed}`, "heal");
    }
    return healed;
  }

  function gainLevel() {
    const state = getState();
    const previousHp = state.player.hp;
    state.player.level += 1;
    const rewards = getLevelUpRewards(state.player.level);
    state.player.maxHp += rewards.maxHp ?? 0;
    state.player.strength += rewards.strength ?? 0;
    state.player.precision += rewards.precision ?? 0;
    state.player.reaction += rewards.reaction ?? 0;
    state.player.nerves += rewards.nerves ?? 0;
    state.player.intelligence += rewards.intelligence ?? 0;
    state.player.hp = rewards.fullHeal ? state.player.maxHp : Math.min(state.player.maxHp, state.player.hp + (rewards.heal ?? 0));
    state.player.xpToNext = xpForNextLevel(state.player.level);
    if (state.player.hp > previousHp) {
      showFloatingText(state.player.x, state.player.y, `+${state.player.hp - previousHp}`, "heal");
    }
  }

  function grantExperience(amount, source) {
    const state = getState();
    state.player.xp += amount;
    state.xpGained = (state.xpGained ?? 0) + amount;
    addMessage(`+${amount} XP durch ${source}.`, "important");

    while (state.player.xp >= state.player.xpToNext) {
      state.player.xp -= state.player.xpToNext;
      gainLevel();
      playLevelUpSound();
      addMessage(`Levelaufstieg! Du bist jetzt Stufe ${state.player.level}.`, "important");
    }

    if (grantExperienceHook) {
      grantExperienceHook();
    }
  }

  return {
    healPlayer,
    gainLevel,
    grantExperience,
  };
}
