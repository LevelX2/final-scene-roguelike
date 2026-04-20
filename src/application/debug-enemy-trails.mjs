const DEBUG_TRAIL_HUES = Object.freeze([46, 56, 66, 198, 212, 226]);

function hashText(value) {
  const text = String(value ?? '');
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash * 31) + text.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function createTileKey(x, y) {
  return `${x},${y}`;
}

function createVisitKey(enemyId, x, y) {
  return `${enemyId}@${createTileKey(x, y)}`;
}

function getEnemyTrailIdentity(enemy) {
  return String(enemy?.id ?? enemy?.name ?? enemy?.baseName ?? 'enemy');
}

export function isDebugEnemyTrailEnabled(state) {
  return Boolean(state?.debug?.enemyTrailEnabled);
}

export function getDebugEnemyTrailHue(enemy) {
  const hash = hashText(getEnemyTrailIdentity(enemy));
  return DEBUG_TRAIL_HUES[hash % DEBUG_TRAIL_HUES.length];
}

export function ensureFloorDebugEnemyTrailState(floorState) {
  if (!floorState || typeof floorState !== 'object') {
    return {
      tiles: {},
      visits: {},
    };
  }

  floorState.debugEnemyTrailTiles ??= {};
  floorState.debugEnemyTrailVisits ??= {};
  return {
    tiles: floorState.debugEnemyTrailTiles,
    visits: floorState.debugEnemyTrailVisits,
  };
}

export function recordDebugEnemyTrailStep(floorState, enemy, position) {
  if (!floorState || !enemy || !position) {
    return null;
  }

  const enemyId = getEnemyTrailIdentity(enemy);
  const hue = getDebugEnemyTrailHue(enemy);
  const { tiles, visits } = ensureFloorDebugEnemyTrailState(floorState);
  const tileKey = createTileKey(position.x, position.y);
  const visitKey = createVisitKey(enemyId, position.x, position.y);
  const previousTile = tiles[tileKey] ?? null;
  const visitCount = Math.max(1, (Number(visits[visitKey]) || 0) + 1);
  const totalVisits = Math.max(1, (Number(previousTile?.totalVisits) || 0) + 1);

  visits[visitKey] = visitCount;
  tiles[tileKey] = {
    x: position.x,
    y: position.y,
    enemyId,
    hue,
    visitCount,
    totalVisits,
  };

  return tiles[tileKey];
}

export function getDebugEnemyTrailTile(floorState, x, y) {
  return floorState?.debugEnemyTrailTiles?.[createTileKey(x, y)] ?? null;
}

export function normalizeDebugEnemyTrailTiles(rawTiles) {
  if (!rawTiles || typeof rawTiles !== 'object') {
    return {};
  }

  return Object.fromEntries(
    Object.entries(rawTiles)
      .map(([key, value]) => {
        if (!value || typeof value !== 'object') {
          return null;
        }

        const x = Number(value.x);
        const y = Number(value.y);
        const hue = Number(value.hue);
        const visitCount = Number(value.visitCount);
        const totalVisits = Number(value.totalVisits);

        if (!Number.isFinite(x) || !Number.isFinite(y)) {
          return null;
        }

        return [
          key,
          {
            x: Math.round(x),
            y: Math.round(y),
            enemyId: String(value.enemyId ?? 'enemy'),
            hue: Number.isFinite(hue) ? Math.round(hue) : DEBUG_TRAIL_HUES[0],
            visitCount: Number.isFinite(visitCount) ? Math.max(1, Math.round(visitCount)) : 1,
            totalVisits: Number.isFinite(totalVisits) ? Math.max(1, Math.round(totalVisits)) : 1,
          },
        ];
      })
      .filter(Boolean),
  );
}

export function normalizeDebugEnemyTrailVisits(rawVisits) {
  if (!rawVisits || typeof rawVisits !== 'object') {
    return {};
  }

  return Object.fromEntries(
    Object.entries(rawVisits)
      .map(([key, value]) => {
        const count = Number(value);
        if (!Number.isFinite(count) || Math.round(count) <= 0) {
          return null;
        }
        return [key, Math.round(count)];
      })
      .filter(Boolean),
  );
}
