import { getActorDerivedMaxHp, getActorDerivedStats } from './derived-actor-stats.mjs';
import { getActorSpeedState } from './actor-speed.mjs';
import { buildStudioGenerationReport, formatStudioGenerationReportText } from './studio-generation-report.mjs';

export function createTestApiSnapshots(context) {
  const {
    getState,
    getCurrentFloorState,
    getMainHand,
    getOffHand,
    countPotionsInInventory,
    countFoodInInventory,
    loadHighscores,
    generateEquipmentItem,
    ensureFloorExists,
  } = context;

  function collectUniqueGroups(entries) {
    return Array.from(new Set(
      (entries ?? []).flatMap((entry) => Array.isArray(entry?.balanceGroups) ? entry.balanceGroups : [])
    )).sort((left, right) => left.localeCompare(right, 'de'));
  }

  function getSnapshot() {
    const state = getState();
    const floorState = getCurrentFloorState();
    const playerMaxHp = getActorDerivedMaxHp(state.player);
    const floorWeapons = (floorState.weapons ?? []).map((entry) => ({
      x: entry.x,
      y: entry.y,
      id: entry.item.id,
      name: entry.item.name,
      balanceGroups: [...(entry.item.balanceGroups ?? [])],
    }));
    const floorOffHands = (floorState.offHands ?? []).map((entry) => ({
      x: entry.x,
      y: entry.y,
      id: entry.item.id,
      name: entry.item.name,
      balanceGroups: [...(entry.item.balanceGroups ?? [])],
    }));
    const enemies = floorState.enemies.map((enemy) => ({
      id: enemy.id,
      name: enemy.name,
      x: enemy.x,
      y: enemy.y,
      hp: enemy.hp,
      maxHp: enemy.maxHp,
      aggro: Boolean(enemy.aggro),
      canOpenDoors: Boolean(enemy.canOpenDoors),
      spawnGroup: enemy.spawnGroup ?? null,
      spawnProfileId: enemy.spawnProfileId ?? null,
      roleProfileId: enemy.roleProfileId ?? null,
      preferredWeaponRoles: [...(enemy.preferredWeaponRoles ?? [])],
      balanceGroups: [...(enemy.balanceGroups ?? [])],
      baseSpeed: enemy.baseSpeed ?? null,
      nextActionTime: enemy.nextActionTime ?? null,
      speedIntervalModifier: enemy.speedIntervalModifier ?? 0,
      speedIntervalModifiers: (enemy.speedIntervalModifiers ?? []).map((entry) => ({ ...entry })),
      speedState: getActorSpeedState(enemy),
      derivedStats: getActorDerivedStats(enemy),
      temperament: enemy.temperament ?? "stoic",
      temperamentHint: enemy.temperamentHint ?? "",
      idleTarget: enemy.idleTarget ? { ...enemy.idleTarget } : null,
      idleTargetType: enemy.idleTargetType ?? null,
      retreatProfile: enemy.retreatProfile ?? "none",
      retreatLabel: enemy.retreatLabel ?? "Standhaft",
      healingProfile: enemy.healingProfile ?? "slow",
      healingLabel: enemy.healingLabel ?? "Langsam",
      isRetreating: Boolean(enemy.isRetreating),
      statusEffects: (enemy.statusEffects ?? []).map((effect) => ({ ...effect })),
      mainHandBalanceGroups: enemy.mainHand?.balanceGroups ? [...enemy.mainHand.balanceGroups] : [],
      offHandBalanceGroups: enemy.offHand?.balanceGroups ? [...enemy.offHand.balanceGroups] : [],
    }));
    return {
      floor: state.floor,
      turn: state.turn ?? 0,
      timelineTime: state.timelineTime ?? 0,
      player: {
        name: state.player.name,
        classId: state.player.classId,
        classLabel: state.player.classLabel,
        classPassiveName: state.player.classPassiveName,
        x: state.player.x,
        y: state.player.y,
        hp: state.player.hp,
        maxHp: playerMaxHp,
        nutrition: state.player.nutrition,
        nutritionMax: state.player.nutritionMax,
        hungerState: state.player.hungerState,
        baseSpeed: state.player.baseSpeed ?? null,
        nextActionTime: state.player.nextActionTime ?? null,
        speedIntervalModifier: state.player.speedIntervalModifier ?? 0,
        speedIntervalModifiers: (state.player.speedIntervalModifiers ?? []).map((entry) => ({ ...entry })),
        speedState: getActorSpeedState(state.player),
        progressionBonuses: { ...(state.player.progressionBonuses ?? {}) },
        derivedStats: getActorDerivedStats(state.player),
        statusEffects: (state.player.statusEffects ?? []).map((effect) => ({ ...effect })),
      },
      targeting: {
        active: Boolean(state.targeting?.active),
        cursorX: state.targeting?.cursorX ?? null,
        cursorY: state.targeting?.cursorY ?? null,
      },
      pendingContainerLoot: state.pendingContainerLoot
        ? {
            chestIndex: state.pendingContainerLoot.chestIndex ?? null,
            selectedItemIndices: [...(state.pendingContainerLoot.selectedItemIndices ?? [])],
          }
        : null,
      stairsDown: floorState.stairsDown ? { ...floorState.stairsDown } : null,
      stairsUp: floorState.stairsUp ? { ...floorState.stairsUp } : null,
      entryAnchor: floorState.entryAnchor ? {
        ...floorState.entryAnchor,
        position: { ...floorState.entryAnchor.position },
        transitionPosition: floorState.entryAnchor.transitionPosition ? { ...floorState.entryAnchor.transitionPosition } : null,
        corridorPosition: floorState.entryAnchor.corridorPosition ? { ...floorState.entryAnchor.corridorPosition } : null,
      } : null,
      exitAnchor: floorState.exitAnchor ? {
        ...floorState.exitAnchor,
        position: { ...floorState.exitAnchor.position },
        transitionPosition: floorState.exitAnchor.transitionPosition ? { ...floorState.exitAnchor.transitionPosition } : null,
        corridorPosition: floorState.exitAnchor.corridorPosition ? { ...floorState.exitAnchor.corridorPosition } : null,
      } : null,
      layoutId: floorState.layoutId ?? null,
      layoutVariant: floorState.layoutVariant ?? null,
      layoutFailureReason: floorState.layoutFailureReason ?? null,
      layoutMetadata: floorState.layoutMetadata ? JSON.parse(JSON.stringify(floorState.layoutMetadata)) : null,
      corridorWidth: floorState.corridorWidth ?? null,
      gangBoundingBox: floorState.gangBoundingBox ? { ...floorState.gangBoundingBox } : null,
      topologyNode: floorState.topologyNode
        ? {
          ...floorState.topologyNode,
          position: floorState.topologyNode.position ? { ...floorState.topologyNode.position } : null,
        }
        : null,
      grid: floorState.grid.map((row) => [...row]),
      rooms: (floorState.rooms ?? []).map((room) => ({ ...room })),
      visible: floorState.visible?.map((row) => [...row]) ?? [],
      keys: (floorState.keys ?? []).map((entry) => ({
        x: entry.x,
        y: entry.y,
        keyColor: entry.item.keyColor,
        keyFloor: entry.item.keyFloor,
      })),
      foods: (floorState.foods ?? []).map((entry) => ({
        x: entry.x,
        y: entry.y,
        id: entry.item.id,
        nutritionRestore: entry.item.nutritionRestore,
      })),
      recentDeaths: (floorState.recentDeaths ?? []).map((entry) => ({
        x: entry.x,
        y: entry.y,
        expiresAfterTurn: entry.expiresAfterTurn,
        markerAssetId: entry.markerAssetId,
      })),
      consumables: (floorState.consumables ?? []).map((entry) => ({
        x: entry.x,
        y: entry.y,
        id: entry.item.id,
        effectFamily: entry.item.effectFamily ?? null,
        tier: entry.item.tier ?? null,
      })),
      chests: (floorState.chests ?? []).map((entry) => ({
        x: entry.x,
        y: entry.y,
        opened: Boolean(entry.opened),
        containerName: entry.containerName ?? null,
        containerAssetId: entry.containerAssetId ?? null,
        contents: Array.isArray(entry.contents)
          ? entry.contents.map((content) => ({
              type: content.type,
              id: content.item?.id ?? null,
              name: content.item?.name ?? null,
            }))
          : [],
      })),
      doors: (floorState.doors ?? []).map((door) => ({
        x: door.x,
        y: door.y,
        doorType: door.doorType,
        isOpen: door.isOpen,
        lockColor: door.lockColor,
        roomIdA: door.roomIdA,
        roomIdB: door.roomIdB,
      })),
      showcases: (floorState.showcases ?? []).map((entry) => ({
        x: entry.x,
        y: entry.y,
        id: entry.item.id,
        ambienceId: entry.item.ambienceId,
        name: entry.item.name,
        source: entry.item.source,
      })),
      traps: (floorState.traps ?? []).map((trap) => ({
        id: trap.id,
        name: trap.name,
        type: trap.type,
        visibility: trap.visibility,
        state: trap.state,
        trigger: trap.trigger,
        x: trap.x,
        y: trap.y,
        effect: { ...(trap.effect ?? {}) },
      })),
      weapons: floorWeapons,
      offHands: floorOffHands,
      enemies,
      balanceGroupSummary: {
        enemies: collectUniqueGroups(enemies),
        floorWeapons: collectUniqueGroups(floorWeapons.map((entry) => ({ balanceGroups: entry.balanceGroups }))),
        floorOffHands: collectUniqueGroups(floorOffHands.map((entry) => ({ balanceGroups: entry.balanceGroups }))),
      },
    };
  }

  function getMessages() {
    const state = getState();
    return state.messages.map((entry) => ({ ...entry }));
  }

  function getInventorySnapshot() {
    const state = getState();
    return {
      inventoryCount: state.inventory.length,
      potionCount: countPotionsInInventory(),
      foodCount: countFoodInInventory(),
      equippedWeapon: getMainHand(state.player) ? { ...getMainHand(state.player) } : null,
      offHand: getOffHand(state.player) ? { ...getOffHand(state.player) } : null,
      equippedWeaponBalanceGroups: getMainHand(state.player)?.balanceGroups ? [...getMainHand(state.player).balanceGroups] : [],
      offHandBalanceGroups: getOffHand(state.player)?.balanceGroups ? [...getOffHand(state.player).balanceGroups] : [],
      items: state.inventory.map((item) => ({ ...item })),
      inventoryBalanceGroupSummary: collectUniqueGroups(state.inventory),
    };
  }

  function getOptionsSnapshot() {
    const state = getState();
    return { ...state.options };
  }

  function getHighscores() {
    return loadHighscores();
  }

  function previewGeneratedEquipment(baseItem, dropContext = {}) {
    return generateEquipmentItem(baseItem, dropContext);
  }

  function getStudioGenerationReport(options = {}) {
    return buildStudioGenerationReport(getState(), {
      ...options,
      ensureFloorExists,
    });
  }

  function getStudioGenerationReportText(options = {}) {
    return formatStudioGenerationReportText(getStudioGenerationReport(options));
  }

  return {
    getSnapshot,
    getMessages,
    getInventorySnapshot,
    getOptionsSnapshot,
    getHighscores,
    previewGeneratedEquipment,
    getStudioGenerationReport,
    getStudioGenerationReportText,
  };
}
