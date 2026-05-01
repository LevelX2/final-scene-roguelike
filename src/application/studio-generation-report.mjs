const DEFAULT_STUDIO_COUNT = 10;

function normalizeStudioCount(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return DEFAULT_STUDIO_COUNT;
  }

  return Math.max(1, Math.round(numeric));
}

function createEnemySummary() {
  return {
    total: 0,
    standard: 0,
    special: 0,
    elite: 0,
    dire: 0,
    boss: 0,
  };
}

function createConsumableSummary() {
  return {
    total: 0,
    healing: 0,
    utility: 0,
    healingValue: {
      count: 0,
      totalHeal: 0,
      averageHeal: 0,
    },
  };
}

function createFoodSummary() {
  return {
    count: 0,
    totalNutrition: 0,
    averageNutrition: 0,
  };
}

function createChestContentSummary() {
  return {
    total: 0,
    weapons: 0,
    offHands: 0,
    foods: 0,
    consumables: 0,
    unknown: 0,
  };
}

function createSpecialEventSummary() {
  return {
    total: 0,
    small: 0,
    medium: 0,
    large: 0,
    labels: [],
  };
}

function isHealingConsumable(item) {
  if (!item) {
    return false;
  }

  return Number(item.heal) > 0 ||
    item.effectFamily === 'healing' ||
    item.effectFamily === 'heal' ||
    item.itemType === 'healing';
}

function summarizeEnemies(enemies = []) {
  return enemies.reduce((summary, enemy) => {
    summary.total += 1;
    if (enemy?.spawnGroup === 'legacy_special' || enemy?.spawnGroup === 'special_event' || enemy?.specialEventId) {
      summary.special += 1;
    } else {
      summary.standard += 1;
    }

    if (enemy?.variantTier === 'elite') {
      summary.elite += 1;
    }
    if (enemy?.variantTier === 'dire') {
      summary.dire += 1;
    }
    if (Math.max(1, Number(enemy?.rank) || 1) >= 10) {
      summary.boss += 1;
    }
    return summary;
  }, createEnemySummary());
}

function summarizeSpecialEvents(specialEvents = []) {
  return specialEvents.reduce((summary, event) => {
    summary.total += 1;
    if (event?.intensity === 'small') {
      summary.small += 1;
    } else if (event?.intensity === 'medium') {
      summary.medium += 1;
    } else if (event?.intensity === 'large') {
      summary.large += 1;
    }
    if (event?.label) {
      summary.labels.push(event.label);
    }
    return summary;
  }, createSpecialEventSummary());
}

function summarizeConsumables(consumables = []) {
  const summary = consumables.reduce((summary, entry) => {
    summary.total += 1;
    if (isHealingConsumable(entry?.item)) {
      summary.healing += 1;
      summary.healingValue.count += 1;
      summary.healingValue.totalHeal += Math.max(
        0,
        Number(entry?.item?.heal ?? entry?.heal ?? entry?.item?.effectPayload?.healAmount ?? 0) || 0,
      );
    } else {
      summary.utility += 1;
    }
    return summary;
  }, createConsumableSummary());

  summary.healingValue.averageHeal = summary.healingValue.count > 0
    ? Math.round((summary.healingValue.totalHeal / summary.healingValue.count) * 100) / 100
    : 0;

  return summary;
}

function summarizeFoods(foods = []) {
  const summary = foods.reduce((nextSummary, entry) => {
    nextSummary.count += 1;
    nextSummary.totalNutrition += Math.max(
      0,
      Number(entry?.item?.nutritionRestore ?? entry?.nutritionRestore ?? 0) || 0,
    );
    return nextSummary;
  }, createFoodSummary());

  summary.averageNutrition = summary.count > 0
    ? Math.round((summary.totalNutrition / summary.count) * 100) / 100
    : 0;

  return summary;
}

function summarizeChestContents(chests = []) {
  return chests.reduce((summary, chest) => {
    const contents = Array.isArray(chest?.contents)
      ? chest.contents
      : chest?.content
        ? [chest.content]
        : [];

    contents.forEach((entry) => {
      summary.total += 1;
      if (entry?.type === 'weapon') {
        summary.weapons += 1;
      } else if (entry?.type === 'offhand') {
        summary.offHands += 1;
      } else if (entry?.type === 'food') {
        summary.foods += 1;
      } else if (entry?.type === 'consumable') {
        summary.consumables += 1;
      } else {
        summary.unknown += 1;
      }
    });

    return summary;
  }, createChestContentSummary());
}

function summarizeRoomRoles(rooms = []) {
  return rooms.reduce((summary, room) => {
    const role = room?.role ?? 'unknown';
    summary[role] = (summary[role] ?? 0) + 1;
    return summary;
  }, {});
}

function summarizeFloorLoot(floorState, consumableSummary, chestContentSummary) {
  const floorWeapons = floorState?.weapons?.length ?? 0;
  const floorOffHands = floorState?.offHands?.length ?? 0;
  const floorFoods = floorState?.foods?.length ?? 0;
  const floorConsumables = consumableSummary.total;
  const worldLoot = floorWeapons + floorOffHands + floorFoods + floorConsumables;
  const totalLoot = worldLoot + chestContentSummary.total;

  return {
    world: worldLoot,
    total: totalLoot,
  };
}

export function summarizeStudioGenerationFloor(floorNumber, floorState) {
  const enemySummary = summarizeEnemies(floorState?.enemies ?? []);
  const foodSummary = summarizeFoods(floorState?.foods ?? []);
  const consumableSummary = summarizeConsumables(floorState?.consumables ?? []);
  const chestContentSummary = summarizeChestContents(floorState?.chests ?? []);
  const roomRoleCounts = summarizeRoomRoles(floorState?.rooms ?? []);
  const lootSummary = summarizeFloorLoot(floorState, consumableSummary, chestContentSummary);
  const specialEventSummary = summarizeSpecialEvents(floorState?.specialEvents ?? []);

  return {
    floorNumber,
    studioArchetypeId: floorState?.studioArchetypeId ?? null,
    layoutId: floorState?.layoutId ?? null,
    layoutVariant: floorState?.layoutVariant ?? null,
    layoutFailureReason: floorState?.layoutFailureReason ?? null,
    rooms: floorState?.rooms?.length ?? 0,
    roomRoleCounts,
    enemies: enemySummary,
    specialEvents: specialEventSummary,
    keys: floorState?.keys?.length ?? 0,
    lockedDoors: (floorState?.doors ?? []).filter((door) => door?.doorType === 'locked').length,
    foods: foodSummary.count,
    foodNutrition: foodSummary,
    consumables: consumableSummary,
    floorWeapons: floorState?.weapons?.length ?? 0,
    floorOffHands: floorState?.offHands?.length ?? 0,
    chests: floorState?.chests?.length ?? 0,
    chestContents: chestContentSummary,
    traps: floorState?.traps?.length ?? 0,
    showcases: floorState?.showcases?.length ?? 0,
    loot: lootSummary,
  };
}

function createTotalsSummary() {
  return {
    rooms: 0,
    enemies: createEnemySummary(),
    specialEvents: createSpecialEventSummary(),
    keys: 0,
    lockedDoors: 0,
    foods: 0,
    foodNutrition: createFoodSummary(),
    consumables: createConsumableSummary(),
    floorWeapons: 0,
    floorOffHands: 0,
    chests: 0,
    chestContents: createChestContentSummary(),
    traps: 0,
    showcases: 0,
    loot: {
      world: 0,
      total: 0,
    },
  };
}

function accumulateTotals(totals, studioSummary) {
  totals.rooms += studioSummary.rooms;
  totals.keys += studioSummary.keys;
  totals.lockedDoors += studioSummary.lockedDoors;
  totals.foods += studioSummary.foods;
  totals.foodNutrition.count += studioSummary.foodNutrition?.count ?? studioSummary.foods ?? 0;
  totals.foodNutrition.totalNutrition += studioSummary.foodNutrition?.totalNutrition ?? 0;
  totals.floorWeapons += studioSummary.floorWeapons;
  totals.floorOffHands += studioSummary.floorOffHands;
  totals.chests += studioSummary.chests;
  totals.traps += studioSummary.traps;
  totals.showcases += studioSummary.showcases;
  totals.loot.world += studioSummary.loot.world;
  totals.loot.total += studioSummary.loot.total;

  Object.keys(totals.enemies).forEach((key) => {
    totals.enemies[key] += studioSummary.enemies[key] ?? 0;
  });
  Object.keys(totals.specialEvents).forEach((key) => {
    if (key === 'labels') {
      return;
    }
    totals.specialEvents[key] += studioSummary.specialEvents?.[key] ?? 0;
  });
  totals.specialEvents.labels.push(...(studioSummary.specialEvents?.labels ?? []));
  Object.keys(totals.consumables).forEach((key) => {
    if (key === 'healingValue') {
      return;
    }
    totals.consumables[key] += studioSummary.consumables[key] ?? 0;
  });
  totals.consumables.healingValue.count += studioSummary.consumables.healingValue?.count
    ?? studioSummary.consumables.healing
    ?? 0;
  totals.consumables.healingValue.totalHeal += studioSummary.consumables.healingValue?.totalHeal ?? 0;
  Object.keys(totals.chestContents).forEach((key) => {
    totals.chestContents[key] += studioSummary.chestContents[key] ?? 0;
  });

  return totals;
}

function finalizeTotalsSummary(totals) {
  totals.foodNutrition.averageNutrition = totals.foodNutrition.count > 0
    ? Math.round((totals.foodNutrition.totalNutrition / totals.foodNutrition.count) * 100) / 100
    : 0;
  totals.consumables.healingValue.averageHeal = totals.consumables.healingValue.count > 0
    ? Math.round((totals.consumables.healingValue.totalHeal / totals.consumables.healingValue.count) * 100) / 100
    : 0;
  return totals;
}

export function buildStudioGenerationReport(state, options = {}) {
  const studioCount = normalizeStudioCount(options.studioCount);
  const ensureFloorExists = options.ensureFloorExists;

  if (typeof ensureFloorExists === 'function') {
    for (let floorNumber = 1; floorNumber <= studioCount; floorNumber += 1) {
      ensureFloorExists(floorNumber);
    }
  }

  const studios = [];
  for (let floorNumber = 1; floorNumber <= studioCount; floorNumber += 1) {
    const floorState = state?.floors?.[floorNumber];
    if (!floorState) {
      continue;
    }
    studios.push(summarizeStudioGenerationFloor(floorNumber, floorState));
  }

  return {
    runSeed: state?.runSeed ?? null,
    currentFloor: state?.floor ?? 1,
    studioCount,
    generatedStudioCount: studios.length,
    studios,
    totals: finalizeTotalsSummary(studios.reduce(accumulateTotals, createTotalsSummary())),
  };
}

function formatArchetype(studio, formatArchetypeLabel) {
  const label = typeof formatArchetypeLabel === 'function'
    ? formatArchetypeLabel(studio.studioArchetypeId)
    : null;
  return label ?? studio.studioArchetypeId ?? '-';
}

function formatStudioLine(studio, formatArchetypeLabel) {
  return [
    `${studio.floorNumber}. ${formatArchetype(studio, formatArchetypeLabel)}`,
    `Events ${studio.specialEvents.total}${studio.specialEvents.labels.length ? ` (${studio.specialEvents.labels.join(', ')})` : ''}`,
    `Räume ${studio.rooms}`,
    `Gegner ${studio.enemies.total} (Std ${studio.enemies.standard}, Special ${studio.enemies.special}, Elite ${studio.enemies.elite}, Dire ${studio.enemies.dire}, Boss ${studio.enemies.boss})`,
    `Keys ${studio.keys}`,
    `Nahrung ${studio.foods} (Nährwert ${studio.foodNutrition.totalNutrition}, Schnitt ${studio.foodNutrition.averageNutrition})`,
    `Verbrauchbar ${studio.consumables.total} (Heilung ${studio.consumables.healing}, Heilwert ${studio.consumables.healingValue.totalHeal}, Schnitt ${studio.consumables.healingValue.averageHeal})`,
    `Bodenloot W${studio.floorWeapons}/S${studio.floorOffHands}`,
    `Truhen ${studio.chests} (${studio.chestContents.total} Inhalte, Schilde ${studio.chestContents.offHands})`,
    `Fallen ${studio.traps}`,
    `Vitrinen ${studio.showcases}`,
  ].join(' | ');
}

export function formatStudioGenerationReportText(report, options = {}) {
  const studios = Array.isArray(report?.studios) ? report.studios : [];
  const totals = report?.totals ?? createTotalsSummary();
  const formatArchetypeLabel = options.formatArchetypeLabel;

  const lines = [
    `Studio-Statistik (${studios.length}/${report?.studioCount ?? studios.length} generiert)`,
    [
      `Gesamt Räume ${totals.rooms}`,
      `Events ${totals.specialEvents.total} (klein ${totals.specialEvents.small}, mittel ${totals.specialEvents.medium}, groß ${totals.specialEvents.large})`,
      `Gegner ${totals.enemies.total} (Std ${totals.enemies.standard}, Special ${totals.enemies.special}, Elite ${totals.enemies.elite}, Dire ${totals.enemies.dire}, Boss ${totals.enemies.boss})`,
      `Keys ${totals.keys}`,
      `Nahrung ${totals.foods} (Nährwert ${totals.foodNutrition.totalNutrition}, Schnitt ${totals.foodNutrition.averageNutrition})`,
      `Verbrauchbar ${totals.consumables.total} (Heilung ${totals.consumables.healing}, Heilwert ${totals.consumables.healingValue.totalHeal}, Schnitt ${totals.consumables.healingValue.averageHeal})`,
      `Bodenloot ${totals.loot.world}`,
      `Truhen ${totals.chests} (${totals.chestContents.total} Inhalte, Schilde ${totals.chestContents.offHands})`,
      `Fallen ${totals.traps}`,
      `Vitrinen ${totals.showcases}`,
    ].join(' | '),
  ];

  studios.forEach((studio) => {
    lines.push(formatStudioLine(studio, formatArchetypeLabel));
  });

  return lines.join('\n');
}
