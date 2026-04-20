import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildStudioGenerationBatchReport,
  formatStudioGenerationBatchReport,
} from '../../src/application/studio-generation-batch-report.mjs';

test('studio-generation-batch-report aggregates totals and per-studio metrics', () => {
  const batchReport = buildStudioGenerationBatchReport([
    {
      studioCount: 2,
      totals: {
        rooms: 10,
        enemies: { total: 8, standard: 7, special: 1, elite: 1, dire: 0, boss: 0 },
        keys: 1,
        lockedDoors: 1,
        foods: 3,
        consumables: { total: 4, healing: 2, utility: 2 },
        floorWeapons: 1,
        floorOffHands: 0,
        chests: 2,
        chestContents: { total: 5 },
        traps: 6,
        showcases: 1,
        loot: { world: 8, total: 13 },
      },
      studios: [
        {
          floorNumber: 1,
          studioArchetypeId: 'action',
          rooms: 4,
          enemies: { total: 3, standard: 3, special: 0, elite: 0, dire: 0, boss: 0 },
          keys: 0,
          lockedDoors: 0,
          foods: 1,
          consumables: { total: 1, healing: 1, utility: 0 },
          floorWeapons: 0,
          floorOffHands: 0,
          chests: 1,
          chestContents: { total: 2 },
          traps: 2,
          showcases: 0,
          loot: { world: 2, total: 4 },
        },
        {
          floorNumber: 2,
          studioArchetypeId: 'slasher',
          rooms: 6,
          enemies: { total: 5, standard: 4, special: 1, elite: 1, dire: 0, boss: 0 },
          keys: 1,
          lockedDoors: 1,
          foods: 2,
          consumables: { total: 3, healing: 1, utility: 2 },
          floorWeapons: 1,
          floorOffHands: 0,
          chests: 1,
          chestContents: { total: 3 },
          traps: 4,
          showcases: 1,
          loot: { world: 6, total: 9 },
        },
      ],
    },
    {
      studioCount: 2,
      totals: {
        rooms: 14,
        enemies: { total: 12, standard: 10, special: 2, elite: 2, dire: 1, boss: 1 },
        keys: 2,
        lockedDoors: 2,
        foods: 5,
        consumables: { total: 6, healing: 3, utility: 3 },
        floorWeapons: 2,
        floorOffHands: 1,
        chests: 3,
        chestContents: { total: 8 },
        traps: 10,
        showcases: 2,
        loot: { world: 14, total: 22 },
      },
      studios: [
        {
          floorNumber: 1,
          studioArchetypeId: 'romcom',
          rooms: 5,
          enemies: { total: 4, standard: 4, special: 0, elite: 0, dire: 0, boss: 0 },
          keys: 0,
          lockedDoors: 0,
          foods: 2,
          consumables: { total: 2, healing: 1, utility: 1 },
          floorWeapons: 0,
          floorOffHands: 0,
          chests: 1,
          chestContents: { total: 2 },
          traps: 3,
          showcases: 0,
          loot: { world: 4, total: 6 },
        },
        {
          floorNumber: 2,
          studioArchetypeId: 'fantasy',
          rooms: 9,
          enemies: { total: 8, standard: 6, special: 2, elite: 2, dire: 1, boss: 1 },
          keys: 2,
          lockedDoors: 2,
          foods: 3,
          consumables: { total: 4, healing: 2, utility: 2 },
          floorWeapons: 2,
          floorOffHands: 1,
          chests: 2,
          chestContents: { total: 6 },
          traps: 7,
          showcases: 2,
          loot: { world: 10, total: 16 },
        },
      ],
    },
  ], {
    studioCount: 2,
  });

  assert.equal(batchReport.runCount, 2);
  assert.equal(batchReport.studioCount, 2);
  assert.equal(batchReport.totals.rooms.mean, 12);
  assert.equal(batchReport.totals.keys.max, 2);
  assert.equal(batchReport.totals['loot.total'].mean, 17.5);
  assert.equal(batchReport.perStudio[0].metrics.rooms.mean, 4.5);
  assert.equal(batchReport.perStudio[1].metrics.lockedDoors.mean, 1.5);
  assert.deepEqual(batchReport.perStudio[0].archetypeIds, ['action', 'romcom']);
});

test('studio-generation-batch-report formats a readable summary', () => {
  const text = formatStudioGenerationBatchReport({
    runCount: 2,
    studioCount: 1,
    totals: {
      rooms: { mean: 11, min: 10, max: 12 },
      'enemies.total': { mean: 9, min: 8, max: 10 },
      'enemies.standard': { mean: 8, min: 7, max: 9 },
      'enemies.special': { mean: 1, min: 1, max: 1 },
      'enemies.elite': { mean: 1.5, min: 1, max: 2 },
      'enemies.dire': { mean: 0.5, min: 0, max: 1 },
      'enemies.boss': { mean: 0.5, min: 0, max: 1 },
      keys: { mean: 1.5, min: 1, max: 2 },
      lockedDoors: { mean: 1.5, min: 1, max: 2 },
      foods: { mean: 4, min: 3, max: 5 },
      'consumables.total': { mean: 5, min: 4, max: 6 },
      'consumables.healing': { mean: 2, min: 1, max: 3 },
      'consumables.utility': { mean: 3, min: 3, max: 3 },
      floorWeapons: { mean: 1, min: 1, max: 1 },
      floorOffHands: { mean: 0.5, min: 0, max: 1 },
      chests: { mean: 2, min: 1, max: 3 },
      'chestContents.total': { mean: 6, min: 5, max: 7 },
      traps: { mean: 7, min: 6, max: 8 },
      showcases: { mean: 1, min: 1, max: 1 },
      'loot.world': { mean: 10, min: 9, max: 11 },
      'loot.total': { mean: 16, min: 14, max: 18 },
    },
    perStudio: [
      {
        floorNumber: 1,
        archetypeIds: ['action'],
        metrics: {
          rooms: { mean: 5, min: 4, max: 6 },
          'enemies.total': { mean: 4, min: 3, max: 5 },
          keys: { mean: 0.5, min: 0, max: 1 },
          lockedDoors: { mean: 0.5, min: 0, max: 1 },
          foods: { mean: 2, min: 1, max: 3 },
          'consumables.total': { mean: 2, min: 1, max: 3 },
          chests: { mean: 1, min: 1, max: 1 },
          'chestContents.total': { mean: 3, min: 2, max: 4 },
          traps: { mean: 2, min: 1, max: 3 },
          'loot.total': { mean: 7, min: 6, max: 8 },
        },
      },
    ],
  });

  assert.match(text, /Studio-Batch-Statistik/);
  assert.match(text, /Laeufe 2 \| Studios pro Lauf 1/);
  assert.match(text, /Keys 1.5 \(min 1, max 2\)/);
  assert.match(text, /Studio 1 \| Archetyp action/);
  assert.match(text, /Loot gesamt 7 \(min 6, max 8\)/);
});

