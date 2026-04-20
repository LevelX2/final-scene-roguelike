import test from 'node:test';
import assert from 'node:assert/strict';
import { getTargetChanceTooltip, getTargetHintLabel } from '../../src/application/targeting-service.mjs';

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
