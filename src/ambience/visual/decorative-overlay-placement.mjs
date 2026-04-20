import {
  DECORATIVE_OVERLAY_PRESETS,
  OVERLAY_FAMILY_WEIGHTS,
} from './decorative-overlay-presets.mjs';
import { shuffleList, weightedPick } from '../../utils/random-tools.mjs';

const ROOM_ZONE_TYPE = 'room';
const MAIN_CORRIDOR_ZONE_TYPE = 'main-corridor';
const SIDE_CORRIDOR_ZONE_TYPE = 'side-corridor';

const ZONE_FAMILY_WEIGHT_MULTIPLIERS = Object.freeze({
  [ROOM_ZONE_TYPE]: {
    puddle: 1.08,
    cable: 0.92,
    tape: 1,
    oil: 1.08,
    sand: 1,
    grass: 0.82,
    debris: 1,
    scorch: 0.78,
    paint: 0.98,
    paper: 0.9,
    glass: 0.76,
    chalk: 0.84,
    dust: 0.92,
    footprints: 0.68,
    stains: 0.94,
    marks: 0.7,
  },
  [MAIN_CORRIDOR_ZONE_TYPE]: {
    puddle: 0.94,
    cable: 1.2,
    tape: 1.24,
    oil: 1.1,
    sand: 0.62,
    grass: 0.35,
    debris: 0.88,
    scorch: 0.5,
    paint: 1.16,
    paper: 1.02,
    glass: 0.96,
    chalk: 1.18,
    dust: 1.04,
    footprints: 1.22,
    stains: 1.1,
    marks: 1.24,
  },
  [SIDE_CORRIDOR_ZONE_TYPE]: {
    puddle: 0.9,
    cable: 1.12,
    tape: 1.18,
    oil: 1.06,
    sand: 0.55,
    grass: 0.28,
    debris: 0.82,
    scorch: 0.42,
    paint: 1.12,
    paper: 0.96,
    glass: 0.9,
    chalk: 1.08,
    dust: 0.98,
    footprints: 1.14,
    stains: 1.04,
    marks: 1.18,
  },
});

const CORRIDOR_ALLOWED_FAMILIES = Object.freeze([
  'cable',
  'tape',
  'oil',
  'puddle',
  'debris',
  'paint',
  'paper',
  'glass',
  'chalk',
  'dust',
  'footprints',
  'stains',
  'marks',
]);

const ROOM_OVERLAY_TUNING = Object.freeze({
  largeRoomChance: 0.9,
  mediumRoomChance: 0.72,
  smallRoomChance: 0.45,
  emptyRoomChanceBonus: 0.18,
  sparseRoomChanceBonus: 0.08,
  crowdedRoomChancePenalty: 0.22,
  densityChancePenaltyFactor: 0.7,
  maxDensityChancePenalty: 0.25,
  minRoomSizeForExtraOverlay: 20,
  veryLargeRoomSizeForExtraOverlay: 36,
  largeRoomContentThreshold: 2,
  veryLargeRoomContentThreshold: 1,
  largePresetFirstPlacementBias: 1.32,
  largePresetFollowupBias: 1.08,
  smallPresetFirstPlacementBias: 0.45,
  smallPresetFollowupBias: 0.72,
  repeatedFamilyPenalty: 0.74,
});

const CORRIDOR_OVERLAY_TUNING = Object.freeze({
  mainCorridorChance: 0.55,
  sideCorridorChance: 0.42,
  longCorridorChanceBonus: 0.08,
  emptyCorridorChanceBonus: 0.06,
  densityChancePenaltyFactor: 0.6,
  maxDensityChancePenalty: 0.2,
  secondOverlayMinTiles: 18,
  linearPresetBias: 1.9,
  cornerPresetBias: 1.24,
  bulkyPresetPenalty: 0.56,
  smallPresetPenalty: 0.7,
  repeatedFamilyPenalty: 0.88,
});

const GLOBAL_OVERLAY_TUNING = Object.freeze({
  areaWeightFactor: 0.85,
  firstPlacementAreaBonus: 0.65,
  followupPlacementDecay: 0.16,
  minimumFollowupWeight: 0.45,
});

function keyOf(x, y) {
  return `${x},${y}`;
}

function parseKey(tileKey) {
  const [x, y] = tileKey.split(',').map((entry) => Number(entry));
  return { x, y };
}

function countEntriesInRoom(room, entries = []) {
  if (!room || !Array.isArray(entries) || entries.length === 0) {
    return 0;
  }

  return entries.filter((entry) =>
    room.floorTiles.some((tile) => tile.x === entry.x && tile.y === entry.y)
  ).length;
}

function countRoomContents(state, room) {
  return countEntriesInRoom(room, state.showcases) +
    countEntriesInRoom(room, state.chests) +
    countEntriesInRoom(room, state.traps) +
    countEntriesInRoom(room, state.enemies) +
    countEntriesInRoom(room, state.potions) +
    countEntriesInRoom(room, state.foods) +
    countEntriesInRoom(room, state.weapons) +
    countEntriesInRoom(room, state.offHands) +
    countEntriesInRoom(room, state.keys);
}

function countEntriesOnTiles(tiles, entries = []) {
  if (!Array.isArray(tiles) || tiles.length === 0 || !Array.isArray(entries) || entries.length === 0) {
    return 0;
  }

  const tileKeys = new Set(tiles.map((tile) => keyOf(tile.x, tile.y)));
  return entries.filter((entry) => tileKeys.has(keyOf(entry.x, entry.y))).length;
}

function countTileContents(state, tiles) {
  return countEntriesOnTiles(tiles, state.showcases) +
    countEntriesOnTiles(tiles, state.chests) +
    countEntriesOnTiles(tiles, state.traps) +
    countEntriesOnTiles(tiles, state.enemies) +
    countEntriesOnTiles(tiles, state.potions) +
    countEntriesOnTiles(tiles, state.foods) +
    countEntriesOnTiles(tiles, state.weapons) +
    countEntriesOnTiles(tiles, state.offHands) +
    countEntriesOnTiles(tiles, state.keys);
}

function isRoomEligible(room) {
  if (!room || room.role === 'connector_room') {
    return false;
  }

  if ((room.width ?? 0) < 4 && (room.height ?? 0) < 4) {
    return false;
  }

  return Array.isArray(room.interiorTiles) && room.interiorTiles.length > 0;
}

function getZoneFamilyWeightMultiplier(zoneType, family) {
  return ZONE_FAMILY_WEIGHT_MULTIPLIERS[zoneType]?.[family] ?? 1;
}

function calculateRoomTargetCount(walkableTiles, contentCount) {
  if (
    walkableTiles >= ROOM_OVERLAY_TUNING.veryLargeRoomSizeForExtraOverlay &&
    contentCount <= ROOM_OVERLAY_TUNING.veryLargeRoomContentThreshold
  ) {
    return 3;
  }
  if (
    walkableTiles >= ROOM_OVERLAY_TUNING.minRoomSizeForExtraOverlay &&
    contentCount <= ROOM_OVERLAY_TUNING.largeRoomContentThreshold
  ) {
    return 2;
  }
  return 1;
}

function calculateCorridorTargetCount(walkableTiles) {
  return walkableTiles >= CORRIDOR_OVERLAY_TUNING.secondOverlayMinTiles ? 2 : 1;
}

function analyzeRoomZone(state, room) {
  const contentCount = countRoomContents(state, room);
  const walkableTiles = room.interiorTiles.length;
  const density = walkableTiles > 0 ? contentCount / walkableTiles : 1;
  const largeRoom = walkableTiles >= 20 || (room.width >= 6 && room.height >= 5);
  const mediumRoom = walkableTiles >= 12 || room.width >= 5 || room.height >= 5;

  let chance = largeRoom
    ? ROOM_OVERLAY_TUNING.largeRoomChance
    : mediumRoom
      ? ROOM_OVERLAY_TUNING.mediumRoomChance
      : ROOM_OVERLAY_TUNING.smallRoomChance;
  if (contentCount === 0) {
    chance += ROOM_OVERLAY_TUNING.emptyRoomChanceBonus;
  } else if (contentCount <= 2) {
    chance += ROOM_OVERLAY_TUNING.sparseRoomChanceBonus;
  } else if (contentCount >= 5) {
    chance -= ROOM_OVERLAY_TUNING.crowdedRoomChancePenalty;
  }

  chance -= Math.min(
    ROOM_OVERLAY_TUNING.maxDensityChancePenalty,
    density * ROOM_OVERLAY_TUNING.densityChancePenaltyFactor,
  );

  let targetCount = calculateRoomTargetCount(walkableTiles, contentCount);
  if (!mediumRoom) {
    targetCount = 1;
  } else if (contentCount >= 4) {
    targetCount = 1;
  }

  return {
    zoneType: ROOM_ZONE_TYPE,
    room,
    tiles: [...room.interiorTiles],
    contentCount,
    walkableTiles,
    density,
    chance: Math.max(0, Math.min(1, chance)),
    targetCount,
    score: walkableTiles * (1.2 - Math.min(0.8, density)),
    allowedFamilies: null,
  };
}

function buildConnectedTileGroups(tileKeys) {
  const groups = [];
  const remaining = new Set(tileKeys);

  while (remaining.size > 0) {
    const startKey = remaining.values().next().value;
    remaining.delete(startKey);
    const group = [];
    const queue = [parseKey(startKey)];

    while (queue.length > 0) {
      const current = queue.shift();
      group.push(current);

      [
        { x: current.x + 1, y: current.y },
        { x: current.x - 1, y: current.y },
        { x: current.x, y: current.y + 1 },
        { x: current.x, y: current.y - 1 },
      ].forEach((neighbor) => {
        const neighborKey = keyOf(neighbor.x, neighbor.y);
        if (!remaining.has(neighborKey)) {
          return;
        }
        remaining.delete(neighborKey);
        queue.push(neighbor);
      });
    }

    groups.push(group);
  }

  return groups;
}

function analyzeCorridorZone(state, tiles, zoneKind) {
  const walkableTiles = tiles.length;
  const contentCount = countTileContents(state, tiles);
  const density = walkableTiles > 0 ? contentCount / walkableTiles : 1;
  const isMain = zoneKind === MAIN_CORRIDOR_ZONE_TYPE;

  let chance = isMain
    ? CORRIDOR_OVERLAY_TUNING.mainCorridorChance
    : CORRIDOR_OVERLAY_TUNING.sideCorridorChance;
  if (walkableTiles >= 10) {
    chance += CORRIDOR_OVERLAY_TUNING.longCorridorChanceBonus;
  }
  if (contentCount === 0) {
    chance += CORRIDOR_OVERLAY_TUNING.emptyCorridorChanceBonus;
  }
  chance -= Math.min(
    CORRIDOR_OVERLAY_TUNING.maxDensityChancePenalty,
    density * CORRIDOR_OVERLAY_TUNING.densityChancePenaltyFactor,
  );

  return {
    zoneType: zoneKind,
    room: null,
    tiles,
    contentCount,
    walkableTiles,
    density,
    chance: Math.max(0, Math.min(1, chance)),
    targetCount: calculateCorridorTargetCount(walkableTiles),
    score: walkableTiles * (isMain ? 0.7 : 0.55),
    allowedFamilies: CORRIDOR_ALLOWED_FAMILIES,
  };
}

function buildZoneAnalyses(state) {
  const roomAnalyses = (state.rooms ?? [])
    .filter(isRoomEligible)
    .map((room) => analyzeRoomZone(state, room));

  const corridorAnalyses = [
    ...buildConnectedTileGroups(state.mainCorridorKeys ?? []).map((tiles) => analyzeCorridorZone(state, tiles, MAIN_CORRIDOR_ZONE_TYPE)),
    ...buildConnectedTileGroups(state.sideCorridorKeys ?? []).map((tiles) => analyzeCorridorZone(state, tiles, SIDE_CORRIDOR_ZONE_TYPE)),
  ].filter((analysis) => analysis.walkableTiles > 0);

  return [...roomAnalyses, ...corridorAnalyses];
}

function buildBlockedTileSet(state) {
  const blocked = new Set();
  (state.doors ?? []).forEach((entry) => blocked.add(keyOf(entry.x, entry.y)));
  (state.showcases ?? []).forEach((entry) => blocked.add(keyOf(entry.x, entry.y)));
  (state.chests ?? []).forEach((entry) => blocked.add(keyOf(entry.x, entry.y)));
  (state.traps ?? []).forEach((entry) => blocked.add(keyOf(entry.x, entry.y)));

  if (state.stairsUp) {
    blocked.add(keyOf(state.stairsUp.x, state.stairsUp.y));
  }
  if (state.stairsDown) {
    blocked.add(keyOf(state.stairsDown.x, state.stairsDown.y));
  }
  if (state.entryAnchor?.position) {
    blocked.add(keyOf(state.entryAnchor.position.x, state.entryAnchor.position.y));
  }
  if (state.entryAnchor?.transitionPosition) {
    blocked.add(keyOf(state.entryAnchor.transitionPosition.x, state.entryAnchor.transitionPosition.y));
  }
  if (state.exitAnchor?.position) {
    blocked.add(keyOf(state.exitAnchor.position.x, state.exitAnchor.position.y));
  }
  if (state.exitAnchor?.transitionPosition) {
    blocked.add(keyOf(state.exitAnchor.transitionPosition.x, state.exitAnchor.transitionPosition.y));
  }

  return blocked;
}

function buildValidTileSet(tiles, blockedTiles) {
  return new Set(
    tiles
      .filter((tile) => !blockedTiles.has(keyOf(tile.x, tile.y)))
      .map((tile) => keyOf(tile.x, tile.y)),
  );
}

function canPlacePresetAt(anchorTile, preset, validRoomTiles, occupiedOverlayTiles) {
  return preset.mask.every((tile) => {
    const worldX = anchorTile.x + tile.x;
    const worldY = anchorTile.y + tile.y;
    const worldKey = keyOf(worldX, worldY);
    return validRoomTiles.has(worldKey) && !occupiedOverlayTiles.has(worldKey);
  });
}

function collectPresetPlacements(zoneTiles, preset, validZoneTiles, occupiedOverlayTiles) {
  return zoneTiles.filter((tile) =>
    canPlacePresetAt(tile, preset, validZoneTiles, occupiedOverlayTiles)
  );
}

function chooseOverlayPlacementForZone(
  state,
  zoneAnalysis,
  validZoneTiles,
  occupiedOverlayTiles,
  zonePlacementCount,
  usedFamiliesInZone,
) {
  const placementOptions = DECORATIVE_OVERLAY_PRESETS
    .map((preset) => {
      if (Array.isArray(zoneAnalysis.allowedFamilies) && !zoneAnalysis.allowedFamilies.includes(preset.family)) {
        return null;
      }

      const placements = collectPresetPlacements(zoneAnalysis.tiles, preset, validZoneTiles, occupiedOverlayTiles);
      if (placements.length === 0) {
        return null;
      }

      const area = preset.mask.length;
      let weight = (OVERLAY_FAMILY_WEIGHTS[preset.family] ?? 1) * (preset.weight ?? 1);
      weight *= getZoneFamilyWeightMultiplier(zoneAnalysis.zoneType, preset.family);
      weight *= Math.max(1, Math.sqrt(placements.length));
      weight *= 1 + area * GLOBAL_OVERLAY_TUNING.areaWeightFactor;
      if (zonePlacementCount === 0) {
        weight *= 1 + area * GLOBAL_OVERLAY_TUNING.firstPlacementAreaBonus;
      } else {
        weight *= Math.max(
          GLOBAL_OVERLAY_TUNING.minimumFollowupWeight,
          1 - zonePlacementCount * GLOBAL_OVERLAY_TUNING.followupPlacementDecay,
        );
      }

      if (zoneAnalysis.zoneType === ROOM_ZONE_TYPE) {
        if (area === 1) {
          weight *= zonePlacementCount === 0
            ? ROOM_OVERLAY_TUNING.smallPresetFirstPlacementBias
            : ROOM_OVERLAY_TUNING.smallPresetFollowupBias;
        }
        if (preset.tags?.includes('large') || area >= 4) {
          weight *= zonePlacementCount === 0
            ? ROOM_OVERLAY_TUNING.largePresetFirstPlacementBias
            : ROOM_OVERLAY_TUNING.largePresetFollowupBias;
        }
        if (usedFamiliesInZone.has(preset.family)) {
          weight *= ROOM_OVERLAY_TUNING.repeatedFamilyPenalty;
        }
      }

      if (zoneAnalysis.zoneType === MAIN_CORRIDOR_ZONE_TYPE || zoneAnalysis.zoneType === SIDE_CORRIDOR_ZONE_TYPE) {
        if (preset.tags?.includes('linear')) {
          weight *= CORRIDOR_OVERLAY_TUNING.linearPresetBias;
        }
        if (preset.tags?.includes('corner')) {
          weight *= CORRIDOR_OVERLAY_TUNING.cornerPresetBias;
        }
        if (preset.tags?.includes('large') && !preset.tags?.includes('linear')) {
          weight *= CORRIDOR_OVERLAY_TUNING.bulkyPresetPenalty;
        }
        if (area === 1) {
          weight *= CORRIDOR_OVERLAY_TUNING.smallPresetPenalty;
        }
        if (usedFamiliesInZone.has(preset.family)) {
          weight *= CORRIDOR_OVERLAY_TUNING.repeatedFamilyPenalty;
        }
      }

      return {
        preset,
        placements,
        weight,
      };
    })
    .filter(Boolean);

  if (placementOptions.length === 0) {
    return null;
  }

  const pickedPreset = weightedPick(placementOptions, state.randomChance);
  if (!pickedPreset) {
    return null;
  }

  const anchorTile = shuffleList(pickedPreset.placements, state.randomChance)[0] ?? null;
  if (!anchorTile) {
    return null;
  }

  return {
    presetId: pickedPreset.preset.id,
    x: anchorTile.x,
    y: anchorTile.y,
    occupiedTiles: pickedPreset.preset.mask.map((tile) => ({
      x: anchorTile.x + tile.x,
      y: anchorTile.y + tile.y,
    })),
  };
}

export function createDecorativeOverlayPlacementApi(context = {}) {
  const {
    randomChance = Math.random,
    getState = () => null,
  } = context;

  function placeDecorativeOverlays(state) {
    if (!state) {
      return [];
    }

    const blockedTiles = buildBlockedTileSet(state);
    const occupiedOverlayTiles = new Set();
    const overlays = [];

    const roomAnalyses = shuffleList(
      buildZoneAnalyses(state)
        .sort((left, right) => right.score - left.score),
      randomChance,
    );

    roomAnalyses.forEach((analysis) => {
      if (analysis.walkableTiles <= 0 || randomChance() > analysis.chance) {
        return;
      }

      const validZoneTiles = buildValidTileSet(analysis.tiles, blockedTiles);
      if (validZoneTiles.size === 0) {
        return;
      }

      let placedInRoom = 0;
      const usedFamiliesInZone = new Set();
      while (placedInRoom < analysis.targetCount) {
        const placement = chooseOverlayPlacementForZone(
          { randomChance },
          analysis,
          validZoneTiles,
          occupiedOverlayTiles,
          placedInRoom,
          usedFamiliesInZone,
        );
        if (!placement) {
          break;
        }

        overlays.push({
          presetId: placement.presetId,
          x: placement.x,
          y: placement.y,
        });
        const preset = DECORATIVE_OVERLAY_PRESETS.find((entry) => entry.id === placement.presetId);
        if (preset) {
          usedFamiliesInZone.add(preset.family);
        }
        placement.occupiedTiles.forEach((tile) => occupiedOverlayTiles.add(keyOf(tile.x, tile.y)));
        placedInRoom += 1;
      }
    });

    state.decorativeOverlays = overlays;
    state.decorativeOverlayOccupiedTiles = [...occupiedOverlayTiles].map((tileKey) => {
      const [x, y] = tileKey.split(',').map((entry) => Number(entry));
      return { x, y };
    });

    if (getState()?.options?.decorativeOverlayDebugLog) {
      console.info('[decorative-overlays]', {
        floorNumber: state.floorNumber ?? null,
        layoutId: state.layoutId ?? null,
        roomCount: roomAnalyses.length,
        overlayCount: overlays.length,
      });
    }

    return overlays;
  }

  return {
    placeDecorativeOverlays,
  };
}
