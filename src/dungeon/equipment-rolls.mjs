export function createDungeonEquipmentRolls(context) {
  const {
    getState,
    randomChance = Math.random,
    createLootWeapon,
    createLootShield,
    rollConsumableLootDefinition,
  } = context;

  function chooseWeightedWeapon(player = null, options = {}) {
    return createLootWeapon({
      floorNumber: options.floorNumber ?? 1,
      dropSourceTag: options.dropSourceTag ?? 'floor-weapon',
      preferredArchetypeId: options.preferredArchetypeId ?? null,
      boostSpecial: Boolean(options.boostSpecial),
      runArchetypeSequence: options.runArchetypeSequence ?? null,
    });
  }

  function chooseWeightedShield(player = null, options = {}) {
    return createLootShield({
      floorNumber: options.floorNumber ?? 1,
      dropSourceTag: options.dropSourceTag ?? 'floor-shield',
      preferredArchetypeId: options.preferredArchetypeId ?? null,
      currentShieldId: player?.offHand?.baseItemId ?? player?.offHand?.id ?? null,
      forceRarity: options.forceRarity ?? null,
      runArchetypeSequence: options.runArchetypeSequence ?? null,
    });
  }

  function rollChestContent(floorNumber, player = null, dropContext = {}) {
    const roll = randomChance();

    if (roll < 0.3) {
      const consumable = rollConsumableLootDefinition?.({
        floorNumber,
        sourceType: dropContext.dropSourceTag === 'locked-room-chest' ? 'special' : 'chest',
        archetypeId: dropContext.preferredArchetypeId ?? null,
        allowedPhase: 3,
      });
      if (consumable) {
        return {
          type: 'consumable',
          item: consumable,
        };
      }
    }

    if (floorNumber >= 2 && roll < 0.38) {
      const shield = chooseWeightedShield(player ?? getState()?.player, {
        floorNumber,
        dropSourceTag: dropContext.dropSourceTag ?? 'chest',
        preferredArchetypeId: dropContext.preferredArchetypeId ?? null,
        runArchetypeSequence: dropContext.runArchetypeSequence ?? null,
      });
      if (shield) {
        return {
          type: 'offhand',
          item: shield,
        };
      }
    }

    const weapon = chooseWeightedWeapon(player ?? getState()?.player, {
      floorNumber,
      dropSourceTag: dropContext.dropSourceTag ?? 'chest',
      preferredArchetypeId: dropContext.preferredArchetypeId ?? null,
      boostSpecial: Boolean(dropContext.boostSpecial),
      runArchetypeSequence: dropContext.runArchetypeSequence ?? null,
    });

    return {
      type: 'weapon',
      item: weapon,
    };
  }

  return {
    chooseWeightedWeapon,
    chooseWeightedShield,
    rollChestContent,
  };
}
