function addGroup(target, value) {
  if (!value || target.includes(value)) {
    return;
  }

  target.push(value);
}

function getRankBand(rank) {
  const normalizedRank = Math.max(1, Number(rank) || 1);
  if (normalizedRank >= 10) {
    return 'boss';
  }
  if (normalizedRank >= 7) {
    return 'high';
  }
  if (normalizedRank >= 4) {
    return 'mid';
  }
  return 'low';
}

function getAggroBand(aggroRadius) {
  const radius = Math.max(0, Number(aggroRadius) || 0);
  if (radius >= 9) {
    return 'long';
  }
  if (radius >= 6) {
    return 'medium';
  }
  return 'short';
}

function getPrimaryAttackBand(enemy) {
  const weapon = enemy?.mainHand ?? null;
  if (!weapon) {
    return 'unarmed';
  }

  if (weapon.attackMode === 'ranged' && (weapon.range ?? 1) > 1) {
    return weapon.weaponRole === 'special' ? 'special-ranged' : 'ranged';
  }

  return weapon.weaponRole === 'special' ? 'special-melee' : 'melee';
}

export function getEnemyBalanceGroups(enemy) {
  const groups = [];
  const preferredWeaponRoles = Array.isArray(enemy?.preferredWeaponRoles)
    ? enemy.preferredWeaponRoles.filter(Boolean)
    : [];

  addGroup(groups, 'enemy:monster');
  addGroup(groups, `archetype:${enemy?.archetypeId ?? 'unknown'}`);
  addGroup(groups, `spawn-group:${enemy?.spawnGroup ?? 'unknown'}`);
  addGroup(groups, `spawn-profile:${enemy?.spawnProfileId ?? 'unknown'}`);
  addGroup(groups, `role-profile:${enemy?.roleProfileId ?? enemy?.behavior ?? 'unknown'}`);
  addGroup(groups, `behavior:${enemy?.behavior ?? 'unknown'}`);
  addGroup(groups, `mobility:${enemy?.mobility ?? 'unknown'}`);
  addGroup(groups, `retreat:${enemy?.retreatProfile ?? 'unknown'}`);
  addGroup(groups, `healing:${enemy?.healingProfile ?? 'unknown'}`);
  addGroup(groups, `temperament:${enemy?.temperament ?? 'unknown'}`);
  addGroup(groups, `variant:${enemy?.variantTier ?? 'normal'}`);
  addGroup(groups, `rank:${Math.max(1, Number(enemy?.rank) || 1)}`);
  addGroup(groups, `rank-band:${getRankBand(enemy?.rank)}`);
  addGroup(groups, `aggro-band:${getAggroBand(enemy?.aggroRadius)}`);
  addGroup(groups, `attack-band:${getPrimaryAttackBand(enemy)}`);

  if (enemy?.canOpenDoors) {
    addGroup(groups, 'door:opens');
  } else {
    addGroup(groups, 'door:closed');
  }

  if (enemy?.canChangeFloors) {
    addGroup(groups, 'floor-travel:yes');
  }

  if (enemy?.legacySpecialPool) {
    addGroup(groups, 'legacy-special:yes');
  }

  preferredWeaponRoles.forEach((role) => addGroup(groups, `preferred-weapon:${role}`));
  return groups;
}

