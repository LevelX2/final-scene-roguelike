import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getDebugEnemyTrailTile,
  recordDebugEnemyTrailStep,
} from '../../src/application/debug-enemy-trails.mjs';

test('debug enemy trails always show the hue of the most recent enemy on a tile', () => {
  const floorState = {};
  const firstEnemy = { id: 'first-raider' };
  const secondEnemy = { id: 'second-raider' };

  const firstVisit = recordDebugEnemyTrailStep(floorState, firstEnemy, { x: 4, y: 7 });
  const secondVisit = recordDebugEnemyTrailStep(floorState, secondEnemy, { x: 4, y: 7 });
  const returnedVisit = recordDebugEnemyTrailStep(floorState, firstEnemy, { x: 4, y: 7 });
  const tile = getDebugEnemyTrailTile(floorState, 4, 7);

  assert.notEqual(firstVisit.hue, secondVisit.hue);
  assert.equal(tile.enemyId, 'first-raider');
  assert.equal(tile.hue, firstVisit.hue);
  assert.equal(tile.visitCount, 2);
  assert.equal(tile.totalVisits, 3);
  assert.deepEqual(tile, returnedVisit);
});
