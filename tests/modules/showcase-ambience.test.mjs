import test from 'node:test';
import assert from 'node:assert/strict';
import { createShowcaseAmbienceApi } from '../../src/app/showcase-ambience.mjs';

test('showcase ambience fires once per room and emits floating text metadata', () => {
  const state = {
    player: { x: 4, y: 4 },
    floor: 1,
  };
  const floorState = {
    rooms: [{ x: 3, y: 3, width: 4, height: 4 }],
    showcases: [{
      x: 5,
      y: 4,
      item: {
        ambienceId: 'test-prop',
        source: 'Maske',
        name: 'Verfluchte Maske',
      },
    }],
    showcaseAmbienceSeen: {},
  };
  const messages = [];
  const floatingTexts = [];
  let ambiencePlays = 0;

  const api = createShowcaseAmbienceApi({
    getState: () => state,
    getCurrentFloorState: () => floorState,
    DISPLAY_CASE_AMBIENCE: {
      'test-prop': ['Ein kalter Schauder läuft dir über den Rücken.'],
    },
    randomInt: () => 0,
    addMessage: (text, tone) => messages.push({ text, tone }),
    showFloatingText: (...args) => floatingTexts.push(args),
    playShowcaseAmbienceSound: () => { ambiencePlays += 1; },
  });

  api.maybeTriggerShowcaseAmbience();
  api.maybeTriggerShowcaseAmbience();

  assert.equal(messages.length, 1);
  assert.equal(messages[0].tone, 'important');
  assert.equal(ambiencePlays, 1);
  assert.equal(floorState.showcaseAmbienceSeen[0], true);
  assert.deepEqual(floatingTexts[0].slice(0, 4), [5, 4, 'Ein kalter Schauder läuft dir über den Rücken.', 'showcase']);
  assert.equal(floatingTexts[0][4].title, 'Maske');
});
