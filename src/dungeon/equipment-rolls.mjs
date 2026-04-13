export function createDungeonEquipmentRolls(context) {
  const {
    OFFHAND_CATALOG,
    cloneOffHandItem,
    generateEquipmentItem,
    getState,
    createLootWeapon,
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

  function buildAvailableWeaponsForFloor() {
    return [];
  }

  function chooseWeightedWeapon(_availableWeapons, _player = null, options = {}) {
    return createLootWeapon({
      floorNumber: options.floorNumber ?? 1,
      dropSourceTag: options.dropSourceTag ?? 'floor-weapon',
      preferredArchetypeId: options.preferredArchetypeId ?? null,
      boostSpecial: Boolean(options.boostSpecial),
      runArchetypeSequence: options.runArchetypeSequence ?? null,
    });
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

    if (availableShields.length > 0 && floorNumber >= 2 && roll < 0.1) {
      return {
        type: 'offhand',
        item: generateEquipmentItem(chooseWeightedShield(availableShields, getState()?.player), {
          floorNumber,
          dropSourceTag: dropContext.dropSourceTag ?? 'chest',
        }),
      };
    }

    return {
      type: 'weapon',
      item: chooseWeightedWeapon(availableWeapons, getState()?.player, {
        floorNumber,
        dropSourceTag: dropContext.dropSourceTag ?? 'chest',
        preferredArchetypeId: dropContext.preferredArchetypeId ?? null,
        boostSpecial: Boolean(dropContext.boostSpecial),
        runArchetypeSequence: dropContext.runArchetypeSequence ?? null,
      }),
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
