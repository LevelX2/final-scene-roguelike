import test from 'node:test';
import assert from 'node:assert/strict';
import { createUiPreferencesApi } from '../../src/app/ui-preferences.mjs';

test('ui-preferences cycles card collapse modes and stores inventory filters', () => {
  const state = {
    collapsedCards: { player: 'summary', log: 'compact', enemy: false },
    preferences: { inventoryFilter: 'all' },
  };
  let renders = 0;
  const api = createUiPreferencesApi({
    getState: () => state,
    renderSelf: () => { renders += 1; },
  });

  api.toggleCardCollapse('player');
  assert.equal(state.collapsedCards.player, 'hidden');
  api.toggleCardCollapse('player');
  assert.equal(state.collapsedCards.player, 'summary');
  api.toggleCardCollapse('player');
  api.toggleCardCollapse('log');
  api.setInventoryFilter('consumables');

  assert.equal(state.collapsedCards.player, 'hidden');
  assert.equal(state.collapsedCards.log, 'full');
  assert.equal(state.preferences.inventoryFilter, 'consumables');
  assert.equal(renders, 5);
});
