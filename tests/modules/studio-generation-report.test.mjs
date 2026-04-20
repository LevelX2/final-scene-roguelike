import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildStudioGenerationReport,
  formatStudioGenerationReportText,
  summarizeStudioGenerationFloor,
} from '../../src/application/studio-generation-report.mjs';

test('studio-generation-report summarizes the relevant spawn and loot categories per studio', () => {
  const summary = summarizeStudioGenerationFloor(3, {
    studioArchetypeId: 'creature_feature',
    layoutId: 'branch',
    layoutVariant: 'default',
    rooms: [
      { role: 'entry_room' },
      { role: 'loot_room' },
      { role: 'loot_room' },
    ],
    enemies: [
      { spawnGroup: 'standard', variantTier: 'normal', rank: 3 },
      { spawnGroup: 'legacy_special', variantTier: 'elite', rank: 10 },
      { spawnGroup: 'standard', variantTier: 'dire', rank: 5 },
    ],
    keys: [{}, {}],
    doors: [
      { doorType: 'locked' },
      { doorType: 'normal' },
    ],
    foods: [
      { item: { nutritionRestore: 15 } },
      { item: { nutritionRestore: 30 } },
      { item: { nutritionRestore: 75 } },
    ],
    consumables: [
      { item: { heal: 8 } },
      { item: { effectFamily: 'blink' } },
    ],
    weapons: [{}, {}],
    offHands: [{}],
    chests: [
      {
        contents: [
          { type: 'weapon', item: { id: 'blade' } },
          { type: 'food', item: { id: 'rations' } },
          { type: 'consumable', item: { id: 'blink' } },
        ],
      },
    ],
    traps: [{}, {}],
    showcases: [{}],
  });

  assert.equal(summary.rooms, 3);
  assert.deepEqual(summary.roomRoleCounts, {
    entry_room: 1,
    loot_room: 2,
  });
  assert.deepEqual(summary.enemies, {
    total: 3,
    standard: 2,
    special: 1,
    elite: 1,
    dire: 1,
    boss: 1,
  });
  assert.equal(summary.keys, 2);
  assert.equal(summary.lockedDoors, 1);
  assert.equal(summary.foods, 3);
  assert.deepEqual(summary.foodNutrition, {
    count: 3,
    totalNutrition: 120,
    averageNutrition: 40,
  });
  assert.deepEqual(summary.consumables, {
    total: 2,
    healing: 1,
    utility: 1,
    healingValue: {
      count: 1,
      totalHeal: 8,
      averageHeal: 8,
    },
  });
  assert.equal(summary.floorWeapons, 2);
  assert.equal(summary.floorOffHands, 1);
  assert.equal(summary.chests, 1);
  assert.deepEqual(summary.chestContents, {
    total: 3,
    weapons: 1,
    offHands: 0,
    foods: 1,
    consumables: 1,
    unknown: 0,
  });
  assert.equal(summary.traps, 2);
  assert.equal(summary.showcases, 1);
  assert.deepEqual(summary.loot, {
    world: 8,
    total: 11,
  });
});

test('studio-generation-report aggregates totals and formats a readable debug block', () => {
  const ensureCalls = [];
  const state = {
    runSeed: 4242,
    floor: 1,
    floors: {
      1: {
        studioArchetypeId: 'action',
        rooms: [{ role: 'entry_room' }],
        enemies: [{ spawnGroup: 'standard', variantTier: 'normal', rank: 2 }],
        keys: [{}],
        doors: [],
        foods: [],
        consumables: [{ item: { heal: 8 } }],
        weapons: [{}],
        offHands: [],
        chests: [],
        traps: [],
        showcases: [],
      },
      2: {
        studioArchetypeId: 'slasher',
        rooms: [{ role: 'entry_room' }, { role: 'trap_room' }],
        enemies: [{ spawnGroup: 'legacy_special', variantTier: 'elite', rank: 10 }],
        keys: [],
        doors: [{ doorType: 'locked' }],
        foods: [{ item: { nutritionRestore: 50 } }],
        consumables: [],
        weapons: [],
        offHands: [{}],
        chests: [{ contents: [{ type: 'food', item: { id: 'snack' } }] }],
        traps: [{}, {}],
        showcases: [{}],
      },
    },
  };

  const report = buildStudioGenerationReport(state, {
    studioCount: 2,
    ensureFloorExists: (floorNumber) => ensureCalls.push(floorNumber),
  });

  assert.deepEqual(ensureCalls, [1, 2]);
  assert.equal(report.runSeed, 4242);
  assert.equal(report.currentFloor, 1);
  assert.equal(report.generatedStudioCount, 2);
  assert.equal(report.totals.enemies.total, 2);
  assert.equal(report.totals.enemies.special, 1);
  assert.equal(report.totals.enemies.elite, 1);
  assert.equal(report.totals.keys, 1);
  assert.equal(report.totals.lockedDoors, 1);
  assert.equal(report.totals.foodNutrition.totalNutrition, 50);
  assert.equal(report.totals.foodNutrition.averageNutrition, 50);
  assert.equal(report.totals.consumables.healingValue.totalHeal, 8);
  assert.equal(report.totals.consumables.healingValue.averageHeal, 8);
  assert.equal(report.totals.floorWeapons, 1);
  assert.equal(report.totals.floorOffHands, 1);
  assert.equal(report.totals.chests, 1);
  assert.equal(report.totals.chestContents.total, 1);
  assert.equal(report.totals.traps, 2);

  const text = formatStudioGenerationReportText(report, {
    formatArchetypeLabel: (id) => id === 'action' ? 'Action' : 'Slasher',
  });

  assert.match(text, /Nahrung 1 \(Nährwert 50, Schnitt 50\)/);
  assert.match(text, /Verbrauchbar 1 \(Heilung 1, Heilwert 8, Schnitt 8\)/);
  assert.match(text, /Studio-Statistik \(2\/2 generiert\)/);
  assert.match(text, /Gesamt Räume 3/);
  assert.match(text, /1\. Action \| Räume 1 \| Gegner 1/);
  assert.match(text, /2\. Slasher \| Räume 2 \| Gegner 1 \(Std 0, Special 1, Elite 1/);
});
