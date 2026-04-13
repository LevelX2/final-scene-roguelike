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
      if (result.usedOpeningStrike) {
        addMessage(`${state.player.classPassiveName} setzt den ersten Beat, aber ${enemy.name} entkommt knapp.`, "important");
      }
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
        addMessage(`${blockResult.item.name} wirft dir den Treffer brutal zurück.`, "danger");
      }
    }

    if (itemHasModifier(weapon, "final") && getWeaponConditionalDamageBonus(state.player, weapon) > 0) {
      addMessage(`${weapon.name} trifft im letzten Akt härter zu.`, "important");
    }
    if (result.usedOpeningStrike) {
      addMessage(`${state.player.classPassiveName} gibt dir den perfekten Auftakt gegen ${enemy.name}.`, "important");
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
      state.killStats[enemy.name] = (state.killStats[enemy.name] ?? 0) + 1;
      if (enemy.lootWeapon && Math.random() < (enemy.weaponDropChance ?? 0.55)) {
        floorState.weapons.push(createWeaponPickup(enemy.lootWeapon, enemy.x, enemy.y));
        addMessage(`${enemy.name} lässt ${enemy.lootWeapon.name} fallen.`, "important");
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
