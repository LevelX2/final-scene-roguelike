export const DEATH_MARKER_PRIMARY_DURATION_TURNS = 3;
export const DEATH_MARKER_DECAY_DURATION_TURNS = 2;
export const DEATH_MARKER_SPOT_DURATION_TURNS = 1;
export const DEATH_MARKER_DURATION_TURNS =
  DEATH_MARKER_PRIMARY_DURATION_TURNS +
  DEATH_MARKER_DECAY_DURATION_TURNS +
  DEATH_MARKER_SPOT_DURATION_TURNS;
export const DEFAULT_DEATH_MARKER_ASSET_ID = 'death-mark';
export const DEATH_MARKER_VISUAL_STAGE = Object.freeze({
  FRESH: 'fresh',
  DECAY: 'decay',
  SPOT: 'spot',
});

function normalizeTurn(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.max(0, Math.round(numeric)) : 0;
}

function normalizeCoordinate(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.max(0, Math.round(numeric)) : null;
}

function normalizeMarkerEntry(entry) {
  if (!entry || typeof entry !== 'object') {
    return null;
  }

  const x = normalizeCoordinate(entry.x);
  const y = normalizeCoordinate(entry.y);
  if (x == null || y == null) {
    return null;
  }

  return {
    x,
    y,
    expiresAfterTurn: normalizeTurn(entry.expiresAfterTurn),
    markerAssetId: typeof entry.markerAssetId === 'string' && entry.markerAssetId.trim()
      ? entry.markerAssetId.trim()
      : DEFAULT_DEATH_MARKER_ASSET_ID,
  };
}

export function normalizeDeathMarkers(entries) {
  if (!Array.isArray(entries)) {
    return [];
  }

  return entries
    .map(normalizeMarkerEntry)
    .filter(Boolean);
}

export function pruneExpiredDeathMarkers(floorState, currentTurn = 0) {
  if (!floorState || typeof floorState !== 'object') {
    return [];
  }

  const normalizedTurn = normalizeTurn(currentTurn);
  const nextMarkers = normalizeDeathMarkers(floorState.recentDeaths)
    .filter((entry) => entry.expiresAfterTurn >= normalizedTurn);
  floorState.recentDeaths = nextMarkers;
  return nextMarkers;
}

export function recordEnemyDeathMarker(floorState, enemy, currentTurn = 0) {
  if (!floorState || typeof floorState !== 'object' || !enemy) {
    return null;
  }

  const x = normalizeCoordinate(enemy.x);
  const y = normalizeCoordinate(enemy.y);
  if (x == null || y == null) {
    return null;
  }

  const normalizedTurn = normalizeTurn(currentTurn);
  const nextEntry = {
    x,
    y,
    expiresAfterTurn: normalizedTurn + DEATH_MARKER_DURATION_TURNS,
    markerAssetId: DEFAULT_DEATH_MARKER_ASSET_ID,
  };

  floorState.recentDeaths = pruneExpiredDeathMarkers(floorState, normalizedTurn)
    .filter((entry) => !(entry.x === x && entry.y === y));
  floorState.recentDeaths.push(nextEntry);
  return nextEntry;
}

export function getDeathMarkerAt(floorState, x, y, currentTurn = 0) {
  const normalizedX = normalizeCoordinate(x);
  const normalizedY = normalizeCoordinate(y);
  if (normalizedX == null || normalizedY == null) {
    return null;
  }

  const normalizedTurn = normalizeTurn(currentTurn);
  return normalizeDeathMarkers(floorState?.recentDeaths)
    .find((entry) =>
      entry.x === normalizedX &&
      entry.y === normalizedY &&
      entry.expiresAfterTurn >= normalizedTurn
    ) ?? null;
}

export function getDeathMarkerVisualStage(marker, currentTurn = 0) {
  const normalizedEntry = normalizeMarkerEntry(marker);
  if (!normalizedEntry) {
    return DEATH_MARKER_VISUAL_STAGE.FRESH;
  }

  const turnsRemaining = normalizedEntry.expiresAfterTurn - normalizeTurn(currentTurn);
  if (turnsRemaining < DEATH_MARKER_SPOT_DURATION_TURNS) {
    return DEATH_MARKER_VISUAL_STAGE.SPOT;
  }

  if (turnsRemaining < DEATH_MARKER_SPOT_DURATION_TURNS + DEATH_MARKER_DECAY_DURATION_TURNS) {
    return DEATH_MARKER_VISUAL_STAGE.DECAY;
  }

  return DEATH_MARKER_VISUAL_STAGE.FRESH;
}
