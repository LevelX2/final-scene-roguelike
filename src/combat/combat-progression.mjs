import { createEmptyProgressionBonuses, getActorDerivedMaxHp } from '../application/derived-actor-stats.mjs';

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
    state.player.hp = Math.min(getActorDerivedMaxHp(state.player), state.player.hp + amount);
    const healed = state.player.hp - previousHp;
    if (healed > 0) {
      showFloatingText(state.player.x, state.player.y, `+${healed}`, "heal");
    }
    return healed;
  }

  function gainLevel() {
    const state = getState();
    const previousHp = state.player.hp;
    state.player.progressionBonuses ??= createEmptyProgressionBonuses();
    state.player.level += 1;
    const rewards = getLevelUpRewards(state.player.level);
    state.player.progressionBonuses.maxHp += rewards.maxHp ?? 0;
    state.player.progressionBonuses.strength += rewards.strength ?? 0;
    state.player.progressionBonuses.precision += rewards.precision ?? 0;
    state.player.progressionBonuses.reaction += rewards.reaction ?? 0;
    state.player.progressionBonuses.nerves += rewards.nerves ?? 0;
    state.player.progressionBonuses.intelligence += rewards.intelligence ?? 0;
    const maxHp = getActorDerivedMaxHp(state.player);
    state.player.hp = rewards.fullHeal ? maxHp : Math.min(maxHp, state.player.hp + (rewards.heal ?? 0));
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
