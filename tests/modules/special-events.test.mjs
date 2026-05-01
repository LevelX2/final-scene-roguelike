import test from 'node:test';
import assert from 'node:assert/strict';

import {
  announceSpecialEventAtPosition,
  getSpecialEventChanceForFloor,
  rollSpecialEventRecipe,
} from '../../src/content/catalogs/special-events.mjs';

test('special event chance makes events common after the first studio', () => {
  assert.equal(getSpecialEventChanceForFloor(1), 0.2);
  assert.equal(getSpecialEventChanceForFloor(2), 0.55);
  assert.equal(getSpecialEventChanceForFloor(4), 0.75);
  assert.equal(getSpecialEventChanceForFloor(7), 0.85);
});

test('special event recipe selection respects studio archetype and available room roles', () => {
  const selected = rollSpecialEventRecipe({
    floorNumber: 4,
    studioArchetypeId: 'romcom',
    roomRoles: ['props_room'],
    randomChance: () => 0,
  });

  assert.equal(selected.recipe.id, 'set_chaos_crew');
  assert.equal(selected.intensity, 'small');

  const missingRoom = rollSpecialEventRecipe({
    floorNumber: 4,
    studioArchetypeId: 'romcom',
    roomRoles: ['showcase_room'],
    randomChance: () => 0,
  });
  assert.equal(missingRoom, null);
});

test('special event announcement fires once when the player enters the event room', () => {
  const messages = [];
  const floatingTexts = [];
  const floorState = {
    rooms: [
      {
        id: 'room-1',
        floorTiles: [
          { x: 5, y: 5 },
          { x: 6, y: 5 },
        ],
      },
    ],
    specialEvents: [
      {
        id: 'set_chaos_crew',
        label: 'Chaoscrew am Set',
        roomId: 'room-1',
        introLog: 'Es raschelt.',
        floatingText: 'Chaoscrew',
        announced: false,
        announcementPosition: { x: 6, y: 5 },
      },
    ],
  };

  assert.equal(announceSpecialEventAtPosition(floorState, { x: 5, y: 5 }, {
    addMessage: (text, tone) => messages.push({ text, tone }),
    showFloatingText: (x, y, text, tone) => floatingTexts.push({ x, y, text, tone }),
  }), true);

  assert.deepEqual(messages, [{ text: 'Es raschelt.', tone: 'important' }]);
  assert.deepEqual(floatingTexts, [{ x: 6, y: 5, text: 'Chaoscrew', tone: 'important' }]);
  assert.equal(floorState.specialEvents[0].announced, true);

  assert.equal(announceSpecialEventAtPosition(floorState, { x: 6, y: 5 }, {
    addMessage: (text, tone) => messages.push({ text, tone }),
    showFloatingText: (x, y, text, tone) => floatingTexts.push({ x, y, text, tone }),
  }), false);
  assert.equal(messages.length, 1);
  assert.equal(floatingTexts.length, 1);
});
