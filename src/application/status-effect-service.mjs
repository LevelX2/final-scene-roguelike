import { recordKillStat } from '../kill-stats.mjs';

export function createStatusEffectService(context) {
  const {
    getEffectStateLabel,
    getState,
    getCurrentFloorState,
    addMessage,
    showFloatingText,
    noteMonsterEncounter,
    playEnemyHitSound,
    playPlayerHitSound,
    saveHighscoreIfNeeded,
    createDeathCause,
    showDeathModal,
    playDeathSound,
    grantExperience,
  } = context;

  function getStatusMessageSubject(target) {
    return target === getState().player ? "Du bist" : `${target.name} ist`;
  }

  function getStatusEffects(actor) {
    if (!actor) {
      return [];
    }
    actor.statusEffects = Array.isArray(actor.statusEffects) ? actor.statusEffects : [];
    return actor.statusEffects;
  }

  function getStatus(actor, type) {
    return getStatusEffects(actor).find((effect) => effect.type === type) ?? null;
  }

  function getStatusValue(actor, type, field = 'penalty') {
    const effect = getStatus(actor, type);
    return effect?.[field] ?? 0;
  }

  function getActorPrecisionModifier(actor) {
    return -getStatusValue(actor, 'precision_malus');
  }

  function getActorReactionModifier(actor) {
    return -getStatusValue(actor, 'reaction_malus');
  }

  function isActorRooted(actor) {
    return Boolean(getStatus(actor, 'root'));
  }

  function isActorStunned(actor) {
    return Boolean(getStatus(actor, 'stun'));
  }

  function canActorMove(actor) {
    return !isActorRooted(actor) && !isActorStunned(actor);
  }

  function getEquippedLightBonus(actor) {
    return actor?.mainHand?.lightBonus ?? 0;
  }

  function isBossLikeActor(actor) {
    return (actor?.rank ?? 0) >= 9;
  }

  function applyStatusEffect(target, effect, source = {}) {
    if (!target || !effect) {
      return false;
    }

    if (effect.type === 'stun' && isBossLikeActor(target)) {
      return false;
    }

    const effects = getStatusEffects(target);
    const existing = effects.find((entry) => entry.type === effect.type);
    const nextDuration = effect.type === 'root' && target.type === 'monster' && (target.variantTier === 'elite' || target.variantTier === 'dire')
      ? Math.max(1, (effect.duration ?? 1) - 1)
      : effect.duration ?? 1;

    const payload = {
      ...effect,
      duration: nextDuration,
      sourceActorType: source.actorType ?? null,
      sourceName: source.name ?? null,
    };

    if (existing) {
      existing.duration = Math.max(existing.duration ?? 0, payload.duration);
      existing.penalty = Math.max(existing.penalty ?? 0, payload.penalty ?? 0);
      existing.dotDamage = Math.max(existing.dotDamage ?? 0, payload.dotDamage ?? 0);
      return true;
    }

    effects.push(payload);
    return true;
  }

  function tryApplyWeaponEffects(attacker, defender, weapon, result) {
    if (!result?.hit || !weapon?.effects?.length || (result.damage ?? 0) <= 0) {
      return;
    }

    const state = getState();
    for (const effect of weapon.effects) {
      if (effect.trigger !== 'hit') {
        continue;
      }

      if (Math.random() * 100 > (effect.procChance ?? 0)) {
        continue;
      }

      const applied = applyStatusEffect(defender, effect, {
        actorType: attacker === state.player ? 'player' : 'monster',
        name: attacker?.name ?? attacker?.baseName ?? 'Unbekannt',
      });
      if (!applied) {
        continue;
      }

      if (defender.type === 'monster') {
        noteMonsterEncounter(defender);
      }
      addMessage(
        `${getStatusMessageSubject(defender)} ${String(getEffectStateLabel?.(effect.type) ?? effect.type).toLowerCase()}.`,
        defender.type === 'monster' ? 'important' : 'danger',
      );
    }
  }

  function handlePlayerDeathFromStatus(sourceName) {
    const state = getState();
    state.player.hp = 0;
    state.gameOver = true;
    state.deathCause = sourceName
      ? `wurde von ${sourceName} über mehrere Momente hinweg niedergerungen.`
      : createDeathCause({ name: 'einem Nachbeben' });
    playDeathSound?.();
    const rank = saveHighscoreIfNeeded?.();
    showDeathModal?.(rank);
  }

  function processActorStatusEffects(actor) {
    if (!actor || actor.hp <= 0) {
      return { dead: actor?.hp <= 0 };
    }

    const state = getState();
    const floorState = getCurrentFloorState();
    const effects = getStatusEffects(actor);
    const nextEffects = [];
    let dead = false;

    for (const effect of effects) {
      if ((effect.dotDamage ?? 0) > 0) {
        actor.hp = Math.max(0, actor.hp - effect.dotDamage);
        if (actor === state.player) {
          state.damageTaken = (state.damageTaken ?? 0) + effect.dotDamage;
          showFloatingText(actor.x, actor.y, `-${effect.dotDamage}`, 'taken');
          playPlayerHitSound?.(false);
        } else if (actor.type === 'monster') {
          state.damageDealt = (state.damageDealt ?? 0) + effect.dotDamage;
          showFloatingText(actor.x, actor.y, `-${effect.dotDamage}`, 'dealt');
          playEnemyHitSound?.(false);
        }
      }

      if (actor.hp <= 0) {
        dead = true;
        if (actor === state.player) {
          handlePlayerDeathFromStatus(effect.sourceName);
        } else if (actor.type === 'monster') {
          floorState.enemies = floorState.enemies.filter((entry) => entry !== actor);
          state.kills += 1;
          state.killStats = recordKillStat(state.killStats, actor);
          if (effect.sourceActorType === 'player') {
            grantExperience(actor.xpReward, actor.name);
          }
          addMessage(`${actor.name} bricht unter ${getEffectStateLabel?.(effect.type) ?? effect.type} zusammen.`, 'important');
        }
        break;
      }

      if ((effect.duration ?? 0) > 1) {
        nextEffects.push({
          ...effect,
          duration: effect.duration - 1,
        });
      }
    }

    actor.statusEffects = nextEffects;
    return { dead };
  }

  function processRoundStatusEffects() {
    const state = getState();
    if (state.gameOver) {
      return;
    }

    processActorStatusEffects(state.player);
    if (state.gameOver) {
      return;
    }

    const floorState = getCurrentFloorState();
    const enemies = [...(floorState.enemies ?? [])];
    for (const enemy of enemies) {
      processActorStatusEffects(enemy);
    }
  }

  return {
    getStatusEffects,
    getActorPrecisionModifier,
    getActorReactionModifier,
    getEquippedLightBonus,
    applyStatusEffect,
    canActorMove,
    isActorRooted,
    isActorStunned,
    tryApplyWeaponEffects,
    processRoundStatusEffects,
  };
}
