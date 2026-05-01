import { recordKillStat } from '../kill-stats.mjs';
import { recordEnemyDeathMarker } from '../application/death-marker-service.mjs';
import { buildCombatEnemyReference, formatPlayerAttackLog } from '../text/combat-log.mjs';
import { formatWeaponDativePhrase, formatWeaponReference } from '../text/combat-phrasing.mjs';
import { isBowWeapon } from '../equipment-helpers.mjs';
import { dropEnemyLoot } from '../application/enemy-loot-drop-service.mjs';

const OPENING_STRIKE_LOGS = {
  filmstar: {
    hit: (enemy) => `Triff deine Marke gibt dir den perfekten Auftakt gegen ${enemy.object}.`,
    miss: (enemy) => `Triff deine Marke setzt den ersten Beat, aber ${enemy.subject} entkommt knapp.`,
  },
  stuntman: {
    hit: (enemy) => `Als Stuntman gehst du sofort entschlossen in die Szene und bringst ${enemy.object} unter Druck.`,
    miss: (enemy) => `Als Stuntman gehst du sofort in die Szene, aber ${enemy.subject} entkommt knapp.`,
  },
  director: {
    hit: (enemy) => `Mit Szenenblick liest du den ersten Moment richtig und setzt ${enemy.object} sofort unter Druck.`,
    miss: (enemy) => `Mit Szenenblick erkennst du den Moment, aber ${enemy.subject} entkommt knapp.`,
  },
  default: {
    hit: (enemy) => `Du setzt ${enemy.object} vom ersten Moment an unter Druck.`,
    miss: (enemy) => `${enemy.subjectCapitalized} entkommt deinem ersten Ansatz knapp.`,
  },
};

const MIN_ARROW_PROJECTILE_DURATION_MS = 650;
const MAX_ARROW_PROJECTILE_DURATION_MS = 1300;

function getArrowProjectileProfile(distance) {
  const travelDistance = Math.max(1, Math.round(distance ?? 1));
  return {
    duration: Math.min(MAX_ARROW_PROJECTILE_DURATION_MS, Math.max(MIN_ARROW_PROJECTILE_DURATION_MS, 340 + travelDistance * 160)),
    steps: Math.min(10, Math.max(4, Math.round(travelDistance * 1.6))),
  };
}

export function createPlayerAttackApi(context) {
  const {
    getState,
    getCombatWeapon,
    getCurrentFloorState,
    createWeaponPickup,
    createOffHandPickup,
    resolveCombatAttack,
    resolveBlock,
    tryApplyWeaponEffects,
    grantExperience,
    showFloatingText,
    playEnemyHitSound,
    playDodgeSound,
    playVictorySound,
    getWeaponConditionalDamageBonus,
    itemHasModifier,
    noteMonsterEncounter,
    addMessage,
    renderSelf,
    randomChance = Math.random,
  } = context;

  function getOpeningStrikeMessage(player, enemy, outcome) {
    const classId = player?.classId ?? 'default';
    const messages = OPENING_STRIKE_LOGS[classId] ?? OPENING_STRIKE_LOGS.default;
    return messages[outcome]?.(enemy) ?? OPENING_STRIKE_LOGS.default[outcome](enemy);
  }

  function getCoveredShotLog(enemyReference, result, outcome = 'hit') {
    const coverPenalty = Math.max(0, Math.round(result?.coverPenalty ?? 0));
    if (coverPenalty <= 0) {
      return null;
    }

    const hitChance = Math.max(0, Math.round(result?.hitChance ?? 0));
    const coverLabel = result?.coverLabel || 'Deckung';
    if (outcome === 'miss') {
      return coverPenalty >= 25
        ? `${coverLabel} frisst deinem Schuss ${coverPenalty}% Trefferchance weg. Bei nur ${hitChance}% Restchance landet der Schuss mehr Kulisse als ${enemyReference.object}.`
        : `${coverLabel} klaut deinem Schuss ${coverPenalty}% Trefferchance. Bei nur ${hitChance}% Restchance zieht ${enemyReference.subject} den Kopf im richtigen Beat weg.`;
    }

    return coverPenalty >= 25
      ? `${coverLabel} drueckt den Winkel brutal zusammen, aber du findest mit nur ${hitChance}% Restchance doch noch die eine offene Luecke.`
      : `${coverLabel} nimmt deinem Schuss ${coverPenalty}% Trefferchance, doch du erwischst ${enemyReference.object} trotz nur ${hitChance}% Restchance im richtigen Moment.`;
  }

  function attackEnemy(enemy, options = {}) {
    const state = getState();
    state.safeRestTurns = 0;
    enemy.aggro = true;
    noteMonsterEncounter(enemy);
    const weapon = getCombatWeapon(state.player);
    const result = resolveCombatAttack(state.player, enemy, {
      distance: options.distance ?? 1,
      weapon,
    });
    const enemyReference = buildCombatEnemyReference(enemy);
    const isRangedAttack = (options.distance ?? 1) > 1 && weapon?.attackMode === 'ranged';
    const weaponPhrase = formatWeaponDativePhrase(weapon);
    const usesArrowProjectile = isRangedAttack && isBowWeapon(weapon);
    const arrowProjectileProfile = usesArrowProjectile
      ? getArrowProjectileProfile(options.distance ?? 1)
      : null;
    const projectileKind = usesArrowProjectile
      ? (result.critical ? 'hero-arrow-crit' : 'hero-arrow')
      : (result.critical ? 'hero-shot-crit' : 'hero-shot');
    const rangedBoardEffect = isRangedAttack
      ? {
          boardEffect: {
            fromX: state.player.x,
            fromY: state.player.y,
            kind: projectileKind,
            flash: !usesArrowProjectile,
            duration: arrowProjectileProfile?.duration,
            steps: arrowProjectileProfile?.steps,
          },
        }
      : null;

    if (!result.hit) {
      showFloatingText(enemy.x, enemy.y, 'Dodge', 'dodge', isRangedAttack
        ? {
            title: 'Schuss vorbei',
            duration: 900,
            ...rangedBoardEffect,
          }
        : {});
      playDodgeSound();
      if (result.usedOpeningStrike) {
        addMessage(getOpeningStrikeMessage(state.player, enemyReference, 'miss'), 'important');
      }
      const coveredMissLog = getCoveredShotLog(enemyReference, result, 'miss');
      if (coveredMissLog) {
        addMessage(coveredMissLog, 'important');
      }
      addMessage(`${enemyReference.subjectCapitalized} weicht deinem Angriff mit ${weaponPhrase} aus.`, 'danger');
      renderSelf();
      return;
    }

    enemy.turnsSinceHit = 0;
    const blockResult = resolveBlock(enemy, result.damage);
    enemy.hp -= blockResult.damage;
    state.damageDealt = (state.damageDealt ?? 0) + Math.max(0, blockResult.damage);
    tryApplyWeaponEffects?.(state.player, enemy, weapon, {
      ...result,
      damage: blockResult.damage,
    });

    if (blockResult.damage > 0) {
      showFloatingText(enemy.x, enemy.y, `-${blockResult.damage}`, result.critical ? 'crit' : 'dealt', isRangedAttack
        ? {
            title: result.critical ? 'Krit-Schuss' : 'Schuss',
            duration: 950,
            ...rangedBoardEffect,
          }
        : {});
      playEnemyHitSound(result.critical, usesArrowProjectile ? 'bow' : undefined, {
        impactDelayMs: arrowProjectileProfile ? Math.max(120, arrowProjectileProfile.duration - 220) : undefined,
      });
    } else {
      showFloatingText(enemy.x, enemy.y, 'Block', 'heal', isRangedAttack
        ? {
            title: 'Schuss geblockt',
            duration: 900,
            ...rangedBoardEffect,
          }
        : {});
    }

    if (blockResult.blocked) {
      addMessage(`${enemyReference.subjectCapitalized} faengt ${blockResult.prevented} Schaden mit ${blockResult.item.name} ab.`, 'important');
      if (blockResult.reflectiveDamage > 0) {
        state.player.hp = Math.max(0, state.player.hp - blockResult.reflectiveDamage);
        state.damageTaken = (state.damageTaken ?? 0) + blockResult.reflectiveDamage;
        showFloatingText(state.player.x, state.player.y, `-${blockResult.reflectiveDamage}`, 'taken');
        addMessage(`${blockResult.item.name} wirft dir den Treffer brutal zurueck.`, 'danger');
      }
    }

    if (itemHasModifier(weapon, 'final') && getWeaponConditionalDamageBonus(state.player, weapon) > 0) {
      addMessage(`Mit ${formatWeaponReference(weapon, { article: 'definite', grammaticalCase: 'dative' })} triffst du im letzten Akt haerter zu.`, 'important');
    }
    if (result.usedOpeningStrike) {
      addMessage(getOpeningStrikeMessage(state.player, enemyReference, 'hit'), 'important');
    }
    const coveredHitLog = getCoveredShotLog(enemyReference, result, 'hit');
    if (coveredHitLog) {
      addMessage(coveredHitLog, 'important');
    }

    const attackMessage = formatPlayerAttackLog({
      enemyReference,
      weaponPhrase,
      damage: blockResult.damage,
      critical: result.critical,
    });
    addMessage(attackMessage, 'important');

    if (enemy.hp <= 0) {
      const floorState = getCurrentFloorState();
      floorState.enemies = floorState.enemies.filter((entry) => entry !== enemy);
      recordEnemyDeathMarker(floorState, enemy, state.turn);
      state.kills += 1;
      state.killStats = recordKillStat(state.killStats, enemy);
      dropEnemyLoot({
        enemy,
        floorState,
        enemyReference,
        randomChance,
        createWeaponPickup,
        createOffHandPickup,
        formatWeaponReference,
        addMessage,
      });
      playVictorySound();
      grantExperience(enemy.xpReward, enemyReference.object);
      addMessage(`${enemyReference.subjectCapitalized} ist besiegt.`, 'important');
    }
  }

  return {
    attackEnemy,
  };
}
