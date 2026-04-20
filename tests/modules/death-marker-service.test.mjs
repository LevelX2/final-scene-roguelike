import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEATH_MARKER_DURATION_TURNS,
  DEFAULT_DEATH_MARKER_ASSET_ID,
  getDeathMarkerAt,
  pruneExpiredDeathMarkers,
  recordEnemyDeathMarker,
} from '../../src/application/death-marker-service.mjs';

test('recordEnemyDeathMarker creates a marker with the default duration and asset', () => {
  const floorState = { recentDeaths: [] };

  const marker = recordEnemyDeathMarker(floorState, { x: 4, y: 7 }, 10);

  assert.deepEqual(marker, {
    x: 4,
    y: 7,
    expiresAfterTurn: 10 + DEATH_MARKER_DURATION_TURNS,
    markerAssetId: DEFAULT_DEATH_MARKER_ASSET_ID,
  });
  assert.deepEqual(floorState.recentDeaths, [marker]);
});

test('recordEnemyDeathMarker refreshes an existing marker on the same tile', () => {
  const floorState = {
    recentDeaths: [{ x: 4, y: 7, expiresAfterTurn: 8, markerAssetId: DEFAULT_DEATH_MARKER_ASSET_ID }],
  };

  recordEnemyDeathMarker(floorState, { x: 4, y: 7 }, 12);

  assert.deepEqual(floorState.recentDeaths, [{
    x: 4,
    y: 7,
    expiresAfterTurn: 12 + DEATH_MARKER_DURATION_TURNS,
    markerAssetId: DEFAULT_DEATH_MARKER_ASSET_ID,
  }]);
});

test('getDeathMarkerAt only returns markers that have not expired yet', () => {
  const floorState = {
    recentDeaths: [{ x: 2, y: 3, expiresAfterTurn: 6, markerAssetId: DEFAULT_DEATH_MARKER_ASSET_ID }],
  };

  assert.equal(getDeathMarkerAt(floorState, 2, 3, 6)?.markerAssetId, DEFAULT_DEATH_MARKER_ASSET_ID);
  assert.equal(getDeathMarkerAt(floorState, 2, 3, 7), null);
});

test('pruneExpiredDeathMarkers removes only expired markers', () => {
  const floorState = {
    recentDeaths: [
      { x: 1, y: 1, expiresAfterTurn: 5, markerAssetId: DEFAULT_DEATH_MARKER_ASSET_ID },
      { x: 2, y: 2, expiresAfterTurn: 6, markerAssetId: DEFAULT_DEATH_MARKER_ASSET_ID },
      { x: 3, y: 3, expiresAfterTurn: 9, markerAssetId: DEFAULT_DEATH_MARKER_ASSET_ID },
    ],
  };

  const remaining = pruneExpiredDeathMarkers(floorState, 7);

  assert.deepEqual(remaining, [
    { x: 3, y: 3, expiresAfterTurn: 9, markerAssetId: DEFAULT_DEATH_MARKER_ASSET_ID },
  ]);
  assert.deepEqual(floorState.recentDeaths, remaining);
});
