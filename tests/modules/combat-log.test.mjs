import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCombatEnemyReference,
  collectLogHighlights,
  createLogHighlightTerms,
  formatEnemyAttackLog,
  formatPlayerAttackLog,
} from '../../src/text/combat-log.mjs';
import { MONSTER_CATALOG } from '../../src/content/catalogs/monsters.mjs';

test('combat log helpers build consistent player and enemy attack messages', () => {
  const enemy = MONSTER_CATALOG.find((entry) => entry.id === 'besessene-puppe');
  const enemyReference = buildCombatEnemyReference(enemy);

  assert.equal(
    formatPlayerAttackLog({
      enemyReference,
      weaponPhrase: 'dem Testmesser',
      damage: 7,
      critical: false,
    }),
    'Du triffst die besessene Puppe mit dem Testmesser fuer 7 Schaden.',
  );

  assert.equal(
    formatEnemyAttackLog({
      enemyReference,
      weaponLabel: 'dem Testmesser',
      damage: 9,
      critical: true,
      ranged: true,
    }),
    'Die besessene Puppe trifft dich aus der Distanz mit dem Testmesser kritisch fuer 9 Schaden!',
  );
});

test('combat log highlight collection distinguishes outgoing and incoming damage', () => {
  const terms = createLogHighlightTerms({
    monsterNames: ['Besessene Puppe', 'Norman Bates'],
    itemNames: [],
  });

  const dealtHighlights = collectLogHighlights(
    'Du triffst die besessene Puppe mit dem Testmesser fuer 7 Schaden.',
    terms,
  );
  assert.equal(
    dealtHighlights.find((entry) => entry.className.includes('damage-to-enemy'))?.start,
    'Du triffst die besessene Puppe mit dem Testmesser fuer '.length,
  );

  const takenHighlights = collectLogHighlights(
    'Die besessene Puppe trifft dich mit dem Testmesser fuer 9 Schaden.',
    terms,
  );
  assert.equal(
    takenHighlights.find((entry) => entry.className.includes('damage-to-player'))?.start,
    'Die besessene Puppe trifft dich mit dem Testmesser fuer '.length,
  );
});

test('combat log highlight collection marks only the monster name inside dodge phrasing', () => {
  const highlights = collectLogHighlights(
    'Du weichst dem Angriff von Norman Bates aus.',
    createLogHighlightTerms({ monsterNames: ['Norman Bates'], itemNames: [] }),
  );

  assert.equal(highlights.length, 1);
  assert.equal(highlights[0].className, 'log-mark log-mark-monster');
  assert.equal(
    'Du weichst dem Angriff von Norman Bates aus.'.slice(highlights[0].start, highlights[0].end),
    'Norman Bates',
  );
});

test('combat log highlight terms include inflected adjective-backed monster names', () => {
  const mimic = MONSTER_CATALOG.find((entry) => entry.id === 'maskierter-nachahmer');
  const highlights = collectLogHighlights(
    'Du triffst den maskierten Nachahmer mit dem Expeditionsrevolver fuer 8 Schaden.',
    createLogHighlightTerms({ monsters: [mimic], itemNames: [] }),
  );

  const monsterHighlight = highlights.find((entry) => entry.className === 'log-mark log-mark-monster');
  assert.ok(monsterHighlight);
  assert.equal(
    'Du triffst den maskierten Nachahmer mit dem Expeditionsrevolver fuer 8 Schaden.'.slice(monsterHighlight.start, monsterHighlight.end),
    'den maskierten Nachahmer',
  );
});
