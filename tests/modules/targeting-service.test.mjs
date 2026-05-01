import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateTargetSelection,
  getTargetChanceTooltip,
  getTargetHintLabel,
} from '../../src/application/targeting-service.mjs';

test('getTargetHintLabel keeps clear shots compact while still showing percent', () => {
  const label = getTargetHintLabel({
    enemy: { id: 'clear-shot' },
    valid: true,
    hitChance: 76,
    coverPenalty: 0,
  });

  assert.equal(label, 'Schuss frei - 76%');
});

test('getTargetChanceTooltip explains base chance and cover penalty for covered shots', () => {
  const tooltip = getTargetChanceTooltip({
    enemy: { id: 'corner-shot' },
    valid: true,
    hitChance: 61,
    baseHitChance: 76,
    coverPenalty: 15,
    coverLabel: 'Teildeckung',
  });

  assert.deepEqual(tooltip, {
    title: 'Trefferchance',
    lines: [
      'Dieser Schuss trifft aktuell mit 61%.',
      'Ohne Deckung waeren es 76%.',
      'Teildeckung kostet 15 Prozentpunkte.',
    ],
  });
});

test('getTargetChanceTooltip marks clear shots as uncovered', () => {
  const tooltip = getTargetChanceTooltip({
    enemy: { id: 'open-shot' },
    valid: true,
    hitChance: 76,
    baseHitChance: 76,
    coverPenalty: 0,
  });

  assert.deepEqual(tooltip, {
    title: 'Trefferchance',
    lines: [
      'Dieser Schuss trifft aktuell mit 76%.',
      'Keine Deckung auf der Schusslinie.',
    ],
  });
});

test('evaluateTargetSelection allows visible corner-cover bow shots', () => {
  const enemy = { id: 'corner-cover', x: 2, y: 3 };
  const selection = evaluateTargetSelection({
    state: { player: { x: 1, y: 1 } },
    floorState: { enemies: [enemy] },
    weapon: { attackMode: 'ranged', range: 5 },
    x: 2,
    y: 3,
    rangeDistance: () => 2,
    canPerceive: () => true,
    hasProjectileLine: () => false,
    previewCombatAttack: () => ({
      baseHitChance: 76,
      hitChance: 61,
      critChance: 5,
      coverPenalty: 15,
      coverGrade: 'partial',
      coverLabel: 'Teildeckung',
      coverCorners: [{ stepIndex: 2, blockerTile: { x: 2, y: 2 } }],
    }),
  });

  assert.equal(selection.valid, true);
  assert.equal(selection.hasProjectileLine, true);
  assert.equal(selection.coverPenalty, 15);
  assert.equal(selection.hitChance, 61);
});

test('evaluateTargetSelection allows a covered shooting angle even without extra near-corner penalty', () => {
  const enemy = { id: 'near-corner-cover', x: 4, y: 4 };
  const selection = evaluateTargetSelection({
    state: { player: { x: 1, y: 1 } },
    floorState: { enemies: [enemy] },
    weapon: { attackMode: 'ranged', range: 5 },
    x: 4,
    y: 4,
    rangeDistance: () => 3,
    canPerceive: () => true,
    hasProjectileLine: () => false,
    previewCombatAttack: () => ({
      baseHitChance: 76,
      hitChance: 76,
      critChance: 5,
      coverPenalty: 0,
      coverGrade: 'clear',
      coverLabel: '',
      coverCorners: [{ stepIndex: 1, blockerTile: { x: 1, y: 2 } }],
    }),
  });

  assert.equal(selection.valid, true);
  assert.equal(selection.hasProjectileLine, true);
  assert.equal(selection.coverPenalty, 0);
  assert.equal(selection.hitChance, 76);
});

test('evaluateTargetSelection treats visible strict-blocked enemies as valid ranged targets', () => {
  const enemy = { id: 'visible-corner-target', x: 1, y: 1 };
  const selection = evaluateTargetSelection({
    state: { player: { x: 2, y: 4 } },
    floorState: { enemies: [enemy] },
    weapon: { attackMode: 'ranged', range: 5 },
    x: 1,
    y: 1,
    rangeDistance: () => 3,
    canPerceive: () => true,
    hasProjectileLine: () => false,
    previewCombatAttack: () => ({
      baseHitChance: 76,
      hitChance: 46,
      critChance: 5,
      coverPenalty: 30,
      coverGrade: 'heavy',
      coverLabel: 'Starke Deckung',
      coverCorners: [{ stepIndex: 2, blockerTile: { x: 1, y: 2 } }],
    }),
  });

  assert.equal(selection.valid, true);
  assert.equal(selection.hasProjectileLine, true);
  assert.equal(selection.coverPenalty, 30);
  assert.equal(selection.coverLabel, 'Starke Deckung');
});
