export function createCombatApi(context) {
  const {
    BASE_HIT_CHANCE,
    MIN_HIT_CHANCE,
    MAX_HIT_CHANCE,
    MIN_CRIT_CHANCE,
    MAX_CRIT_CHANCE,
    clamp,
    rollPercent,
    getState,
    getCombatWeapon,
    getOffHand,
    getCurrentFloorState,
    createWeaponPickup,
    createOffHandPickup,
    createFoodPickup,
    showFloatingText,
    playEnemyHitSound,
    playDodgeSound,
    playVictorySound,
    playLevelUpSound,
    xpForNextLevel,
    getLevelUpRewards,
    getWeaponConditionalDamageBonus,
    itemHasModifier,
    noteMonsterEncounter,
    addMessage,
    grantExperienceHook,
    renderSelf,
  } = context;

  function resolveBlock(defender, damage) {
    const offHand = getOffHand(defender);
    if (!offHand || offHand.subtype !== "shield") {
      return {
        blocked: false,
        damage,
        prevented: 0,
        item: null,
        reflectiveDamage: 0,
      };
    }

    const blockChance = clamp(offHand.blockChance + defender.nerves, 5, 75);
    if (!rollPercent(blockChance)) {
      return {
        blocked: false,
        damage,
        prevented: 0,
        item: offHand,
        reflectiveDamage: 0,
      };
    }

    const reducedDamage = Math.max(0, damage - offHand.blockValue);
    return {
      blocked: true,
      damage: reducedDamage,
      prevented: damage - reducedDamage,
      item: offHand,
      reflectiveDamage: itemHasModifier(offHand, "reflective") ? 1 : 0,
    };
  }

  function resolveCombatAttack(attacker, defender) {
    const weapon = getCombatWeapon(attacker);
    const hitValue = attacker.precision * 2 + weapon.hitBonus;
    const dodgeValue = defender.reaction * 2 + defender.nerves;
    const hitChance = clamp(BASE_HIT_CHANCE + (hitValue - dodgeValue), MIN_HIT_CHANCE, MAX_HIT_CHANCE);

    if (!rollPercent(hitChance)) {
      return {
        hit: false,
        critical: false,
        damage: 0,
      };
    }

    const critChance = clamp(attacker.precision + weapon.critBonus, MIN_CRIT_CHANCE, MAX_CRIT_CHANCE);
    const critical = rollPercent(critChance);
    const conditionalDamage = getWeaponConditionalDamageBonus(attacker, weapon);
    const baseDamage = Math.max(1, attacker.strength + weapon.damage + conditionalDamage);
    const damage = critical ? Math.floor(baseDamage * 1.5) : baseDamage;

    return {
      hit: true,
      critical,
      damage,
    };
  }

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

  function attackEnemy(enemy) {
    const state = getState();
    state.safeRestTurns = 0;
    enemy.aggro = true;
    noteMonsterEncounter(enemy);
    const weapon = getCombatWeapon(state.player);
    const result = resolveCombatAttack(state.player, enemy);

    if (!result.hit) {
      showFloatingText(enemy.x, enemy.y, "Dodge", "dodge");
      playDodgeSound();
      addMessage(`${enemy.name} weicht deinem Angriff aus.`, "danger");
      renderSelf();
      return;
    }

    enemy.turnsSinceHit = 0;
    const blockResult = resolveBlock(enemy, result.damage);
    enemy.hp -= blockResult.damage;
    state.damageDealt = (state.damageDealt ?? 0) + Math.max(0, blockResult.damage);

    if (blockResult.damage > 0) {
      showFloatingText(enemy.x, enemy.y, `-${blockResult.damage}`, result.critical ? "crit" : "dealt");
      playEnemyHitSound(result.critical);
    } else {
      showFloatingText(enemy.x, enemy.y, "Block", "heal");
    }

    if (blockResult.blocked) {
      addMessage(`${enemy.name} faengt ${blockResult.prevented} Schaden mit ${blockResult.item.name} ab.`, "important");
      if (blockResult.reflectiveDamage > 0) {
        state.player.hp = Math.max(0, state.player.hp - blockResult.reflectiveDamage);
        state.damageTaken = (state.damageTaken ?? 0) + blockResult.reflectiveDamage;
        showFloatingText(state.player.x, state.player.y, `-${blockResult.reflectiveDamage}`, "taken");
        addMessage(`${blockResult.item.name} wirft dir den Treffer brutal zurueck.`, "danger");
      }
    }

    if (itemHasModifier(weapon, "final") && getWeaponConditionalDamageBonus(state.player, weapon) > 0) {
      addMessage(`${weapon.name} trifft im letzten Akt haerter zu.`, "important");
    }

    addMessage(
      result.critical
        ? `Kritischer Treffer gegen ${enemy.name} fuer ${blockResult.damage} Schaden!`
        : `Du triffst ${enemy.name} fuer ${blockResult.damage} Schaden.`,
      "important",
    );

    if (enemy.hp <= 0) {
      const floorState = getCurrentFloorState();
      floorState.enemies = floorState.enemies.filter((entry) => entry !== enemy);
      state.kills += 1;
      state.killStats[enemy.name] = (state.killStats[enemy.name] ?? 0) + 1;
      if (enemy.lootWeapon && Math.random() < (enemy.weaponDropChance ?? 0.55)) {
        floorState.weapons.push(createWeaponPickup(enemy.lootWeapon, enemy.x, enemy.y));
        addMessage(`${enemy.name} laesst ${enemy.lootWeapon.name} fallen.`, "important");
      }
      if (enemy.lootOffHand && Math.random() < (enemy.offHandDropChance ?? 0.45)) {
        floorState.offHands.push(createOffHandPickup(enemy.lootOffHand, enemy.x, enemy.y));
        addMessage(`${enemy.name} verliert ${enemy.lootOffHand.name}.`, "important");
      }
      if (enemy.lootDrop?.item?.type === "food") {
        floorState.foods.push(createFoodPickup(enemy.lootDrop.item, enemy.x, enemy.y));
        addMessage(`${enemy.name} laesst ${enemy.lootDrop.item.name} fallen.`, "important");
      }
      playVictorySound();
      grantExperience(enemy.xpReward, enemy.name);
      addMessage(`${enemy.name} ist besiegt.`, "important");
    }
  }

  return {
    resolveBlock,
    resolveCombatAttack,
    healPlayer,
    gainLevel,
    grantExperience,
    attackEnemy,
  };
}
