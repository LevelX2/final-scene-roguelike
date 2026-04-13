import { recordKillStat } from '../kill-stats.mjs';
import { formatWeaponReference } from '../text/combat-phrasing.mjs';

const OPENING_STRIKE_LOGS = {
  lead: {
    hit: (enemyName) => `Triff deine Marke gibt dir den perfekten Auftakt gegen ${enemyName}.`,
    miss: (enemyName) => `Triff deine Marke setzt den ersten Beat, aber ${enemyName} entkommt knapp.`,
  },
  stuntman: {
    hit: (enemyName) => `Als Stuntman gehst du sofort entschlossen in die Szene und bringst ${enemyName} unter Druck.`,
    miss: (enemyName) => `Als Stuntman gehst du sofort in die Szene, aber ${enemyName} entkommt knapp.`,
  },
  director: {
    hit: (enemyName) => `Mit Szenenblick liest du den ersten Moment richtig und setzt ${enemyName} sofort unter Druck.`,
    miss: (enemyName) => `Mit Szenenblick erkennst du den Moment, aber ${enemyName} entkommt knapp.`,
  },
  default: {
    hit: (enemyName) => `Du setzt ${enemyName} vom ersten Moment an unter Druck.`,
    miss: (enemyName) => `${enemyName} entkommt deinem ersten Ansatz knapp.`,
  },
};

export function createPlayerAttackApi(context) {
  const {
    getState,
    getCombatWeapon,
    getCurrentFloorState,
    createWeaponPickup,
    createOffHandPickup,
    createFoodPickup,
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
  } = context;

  function getOpeningStrikeMessage(player, enemyName, outcome) {
    const classId = player?.classId ?? 'default';
    const messages = OPENING_STRIKE_LOGS[classId] ?? OPENING_STRIKE_LOGS.default;
    return messages[outcome]?.(enemyName) ?? OPENING_STRIKE_LOGS.default[outcome](enemyName);
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
    const isRangedAttack = (options.distance ?? 1) > 1 && weapon?.attackMode === 'ranged';
    const rangedBoardEffect = isRangedAttack
      ? {
          boardEffect: {
            fromX: state.player.x,
            fromY: state.player.y,
            kind: result.critical ? 'hero-shot-crit' : 'hero-shot',
            flash: true,
          },
        }
      : null;

    if (!result.hit) {
      showFloatingText(enemy.x, enemy.y, "Dodge", "dodge", isRangedAttack ? {
        title: "Schuss vorbei",
        duration: 900,
        ...rangedBoardEffect,
      } : {});
      playDodgeSound();
      if (result.usedOpeningStrike) {
        addMessage(getOpeningStrikeMessage(state.player, enemy.name, 'miss'), "important");
      }
      addMessage(`${enemy.name} weicht deinem Angriff aus.`, "danger");
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
      showFloatingText(enemy.x, enemy.y, `-${blockResult.damage}`, result.critical ? "crit" : "dealt", isRangedAttack ? {
        title: result.critical ? "Krit-Schuss" : "Schuss",
        duration: 950,
        ...rangedBoardEffect,
      } : {});
      playEnemyHitSound(result.critical);
    } else {
      showFloatingText(enemy.x, enemy.y, "Block", "heal", isRangedAttack ? {
        title: "Schuss geblockt",
        duration: 900,
        ...rangedBoardEffect,
      } : {});
    }

    if (blockResult.blocked) {
      addMessage(`${enemy.name} faengt ${blockResult.prevented} Schaden mit ${blockResult.item.name} ab.`, "important");
      if (blockResult.reflectiveDamage > 0) {
        state.player.hp = Math.max(0, state.player.hp - blockResult.reflectiveDamage);
        state.damageTaken = (state.damageTaken ?? 0) + blockResult.reflectiveDamage;
        showFloatingText(state.player.x, state.player.y, `-${blockResult.reflectiveDamage}`, "taken");
        addMessage(`${blockResult.item.name} wirft dir den Treffer brutal zurück.`, "danger");
      }
    }

    if (itemHasModifier(weapon, "final") && getWeaponConditionalDamageBonus(state.player, weapon) > 0) {
      addMessage(`Mit ${formatWeaponReference(weapon, { article: "definite", grammaticalCase: "dative" })} triffst du im letzten Akt härter zu.`, "important");
    }
    if (result.usedOpeningStrike) {
      addMessage(getOpeningStrikeMessage(state.player, enemy.name, 'hit'), "important");
    }

    addMessage(
      result.critical
        ? `Kritischer Treffer gegen ${enemy.name} für ${blockResult.damage} Schaden!`
        : `Du triffst ${enemy.name} für ${blockResult.damage} Schaden.`,
      "important",
    );

    if (enemy.hp <= 0) {
      const floorState = getCurrentFloorState();
      floorState.enemies = floorState.enemies.filter((entry) => entry !== enemy);
      state.kills += 1;
      state.killStats = recordKillStat(state.killStats, enemy);
      if (enemy.lootWeapon && Math.random() < (enemy.weaponDropChance ?? 0.55)) {
        floorState.weapons.push(createWeaponPickup(enemy.lootWeapon, enemy.x, enemy.y));
        addMessage(`${enemy.name} lässt ${formatWeaponReference(enemy.lootWeapon, { article: "definite", grammaticalCase: "accusative" })} fallen.`, "important");
      }
      if (enemy.lootOffHand && Math.random() < (enemy.offHandDropChance ?? 0.45)) {
        floorState.offHands.push(createOffHandPickup(enemy.lootOffHand, enemy.x, enemy.y));
        addMessage(`${enemy.name} verliert ${enemy.lootOffHand.name}.`, "important");
      }
      if (enemy.lootDrop?.item?.type === "food") {
        floorState.foods.push(createFoodPickup(enemy.lootDrop.item, enemy.x, enemy.y));
        addMessage(`${enemy.name} lässt ${enemy.lootDrop.item.name} fallen.`, "important");
      }
      playVictorySound();
      grantExperience(enemy.xpReward, enemy.name);
      addMessage(`${enemy.name} ist besiegt.`, "important");
    }
  }

  return {
    attackEnemy,
  };
}
