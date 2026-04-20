import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatSignedPercent,
  getActorSpeedState,
  getSpeedCategoryLabel,
} from '../../src/application/actor-speed.mjs';

test('actor-speed maps interval values to categories and display percentages', () => {
  const cases = [
    { value: 75, category: 'Sehr schnell', percent: '+25 %' },
    { value: 80, category: 'Sehr schnell', percent: '+20 %' },
    { value: 81, category: 'Schnell', percent: '+19 %' },
    { value: 95, category: 'Schnell', percent: '+5 %' },
    { value: 96, category: 'Normal', percent: '+4 %' },
    { value: 100, category: 'Normal', percent: '0 %' },
    { value: 104, category: 'Normal', percent: '-4 %' },
    { value: 105, category: 'Langsam', percent: '-5 %' },
    { value: 120, category: 'Langsam', percent: '-20 %' },
    { value: 121, category: 'Sehr langsam', percent: '-21 %' },
    { value: 130, category: 'Sehr langsam', percent: '-30 %' },
  ];

  cases.forEach(({ value, category, percent }) => {
    assert.equal(getSpeedCategoryLabel(value), category);
    assert.equal(formatSignedPercent(100 - value), percent);
  });
});

test('actor-speed reports base current and modifier labels separately when modified', () => {
  const speedState = getActorSpeedState({
    baseSpeed: 90,
    speedIntervalModifiers: [
      { label: 'Verletzung', value: 10 },
      { label: 'Hast', value: -15 },
    ],
  });

  assert.equal(speedState.baseValue, 90);
  assert.equal(speedState.currentValue, 85);
  assert.equal(speedState.baseLabel, 'Schnell (+10 %)');
  assert.equal(speedState.currentLabel, 'Schnell (+15 %)');
  assert.equal(speedState.summaryLabel, 'Schnell (+15 %)');
  assert.equal(speedState.modifierLabel, 'Verletzung -10 %, Hast +15 %');
  assert.deepEqual(
    speedState.modifierEntries.map((entry) => entry.summaryLabel),
    ['Verletzung -10 %', 'Hast +15 %'],
  );
});

