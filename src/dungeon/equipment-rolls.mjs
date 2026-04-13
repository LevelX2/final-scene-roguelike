export function createDungeonEquipmentRolls(context) {
  const {
    MONSTER_CATALOG,
    WEAPON_CATALOG,
    OFFHAND_CATALOG,
    DUNGEON_WEAPON_TIERS,
    CHEST_WEAPON_CHANCE,
    CHEST_SHIELD_CHANCE,
    DUNGEON_WEAPON_WEIGHT_BONUS,
    DUPLICATE_WEAPON_WEIGHT_PENALTY,
    cloneWeapon,
    cloneOffHandItem,
    generateEquipmentItem,
    getState,
  } = context;

  function weightedPick(entries) {
    const totalWeight = entries.reduce((sum, entry) => sum + entry.weight, 0);
    let roll = Math.random() * totalWeight;

    for (const entry of entries) {
      roll -= entry.weight;
      if (roll <= 0) {
        return entry.value;
      }
    }

    return entries[entries.length - 1]?.value ?? null;
  }

  function buildAvailableWeaponsForFloor(floorNumber, unlockedMonsterRank) {
    const signatureWeapons = MONSTER_CATALOG
      .filter((monster) => monster.rank <= unlockedMonsterRank)
      .map((monster) => WEAPON_CATALOG[monster.id])
      .filter(Boolean)
      .map((weapon) => ({
        ...cloneWeapon(weapon),
        weaponPool: "signature",
      }));

    const dungeonWeapons = DUNGEON_WEAPON_TIERS
      .filter((tier) => floorNumber >= tier.minFloor)
      .flatMap((tier) => tier.weapons.map((weapon) => ({
        ...cloneWeapon(weapon),
        weaponPool: "dungeon",
        minFloor: tier.minFloor,
      })));

    const uniqueWeapons = new Map();
    for (const weapon of [...signatureWeapons, ...dungeonWeapons]) {
      uniqueWeapons.set(weapon.id, weapon);
    }

    return [...uniqueWeapons.values()];
  }

  function chooseWeightedWeapon(availableWeapons, player = null) {
    if (!availableWeapons.length) {
      return null;
    }

    const ownedWeaponIds = new Map();
    const registerWeapon = (weapon) => {
      if (!weapon?.id) {
        return;
      }
      ownedWeaponIds.set(weapon.id, (ownedWeaponIds.get(weapon.id) ?? 0) + 1);
    };

    registerWeapon(player?.mainHand);
    (player?.inventory ?? [])
      .filter((item) => item.type === "weapon")
      .forEach(registerWeapon);

    const weightedWeapons = availableWeapons.map((weapon) => {
      const duplicateCount = ownedWeaponIds.get(weapon.id) ?? 0;
      const poolWeight = weapon.weaponPool === "dungeon" ? DUNGEON_WEAPON_WEIGHT_BONUS : 1;
      const duplicatePenalty = duplicateCount > 0
        ? Math.max(0.15, 1 - duplicateCount * DUPLICATE_WEAPON_WEIGHT_PENALTY)
        : 1;
      return {
        weapon,
        weight: poolWeight * duplicatePenalty,
      };
    });

    const totalWeight = weightedWeapons.reduce((sum, entry) => sum + entry.weight, 0);
    let roll = Math.random() * totalWeight;

    for (const entry of weightedWeapons) {
      roll -= entry.weight;
      if (roll <= 0) {
        return cloneWeapon(entry.weapon);
      }
    }

    return cloneWeapon(weightedWeapons[weightedWeapons.length - 1].weapon);
  }

  function buildAvailableShieldsForFloor(floorNumber) {
    return Object.values(OFFHAND_CATALOG)
      .filter((shield) => (shield.minFloor ?? 1) <= floorNumber)
      .map((shield) => cloneOffHandItem(shield));
  }

  function chooseWeightedShield(availableShields, player = null) {
    if (!availableShields.length) {
      return null;
    }

    const currentShieldId = player?.offHand?.id;
    const weightedShields = availableShields.map((shield) => ({
      shield,
      weight: shield.id === currentShieldId ? 0.35 : 1,
    }));
    const totalWeight = weightedShields.reduce((sum, entry) => sum + entry.weight, 0);
    let roll = Math.random() * totalWeight;

    for (const entry of weightedShields) {
      roll -= entry.weight;
      if (roll <= 0) {
        return cloneOffHandItem(entry.shield);
      }
    }

    return cloneOffHandItem(weightedShields[weightedShields.length - 1].shield);
  }

  function rollChestContent(floorNumber, availableWeapons, availableShields, dropContext = {}) {
    const roll = Math.random();

    if (availableShields.length > 0 && floorNumber >= 2 && roll < CHEST_SHIELD_CHANCE) {
      return {
        type: "offhand",
        item: generateEquipmentItem(chooseWeightedShield(availableShields, getState()?.player), {
          floorNumber,
          dropSourceTag: dropContext.dropSourceTag ?? "chest",
        }),
      };
    }

    if (availableWeapons.length > 0 && roll < CHEST_SHIELD_CHANCE + CHEST_WEAPON_CHANCE) {
      return {
        type: "weapon",
        item: generateEquipmentItem(
          chooseWeightedWeapon(availableWeapons, getState()?.player),
          {
            floorNumber,
            dropSourceTag: dropContext.dropSourceTag ?? "chest",
          },
        ),
      };
    }

    return {
      type: "potion",
      item: {
        type: "potion",
        name: "Heiltrank",
        description: "Stellt 8 Lebenspunkte wieder her.",
        heal: 8,
      },
    };
  }

  return {
    weightedPick,
    buildAvailableWeaponsForFloor,
    chooseWeightedWeapon,
    buildAvailableShieldsForFloor,
    chooseWeightedShield,
    rollChestContent,
  };
}
