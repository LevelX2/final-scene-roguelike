import test from 'node:test';
import assert from 'node:assert/strict';
import { buildWeaponGrammar, formatMonsterKillerLabel, formatWeaponDativePhrase, formatWeaponReference } from '../../src/text/combat-phrasing.mjs';
import { MONSTER_CATALOG } from '../../src/content/catalogs/monsters.mjs';

test('generic monsters receive an indefinite article in death phrasing', () => {
  assert.equal(
    formatMonsterKillerLabel({ id: 'kellerkriecher', baseName: 'Kellerkriecher' }),
    'ein Kellerkriecher',
  );
  assert.equal(
    formatMonsterKillerLabel({ id: 'besessene-puppe', baseName: 'Besessene Puppe' }),
    'eine Besessene Puppe',
  );
});

test('iconic named monsters stay article-free in death phrasing', () => {
  const ghostface = MONSTER_CATALOG.find((monster) => monster.id === 'ghostface');
  assert.equal(
    formatMonsterKillerLabel(ghostface),
    'Ghostface',
  );
});

test('weapon phrasing inflects stored prefix parts for dative death text', () => {
  const weapon = {
    id: 'expedition-revolver',
    templateId: 'expedition-revolver',
    name: 'Leuchtend Expeditionsrevolver der Flamme',
    nameParts: {
      prefix: 'Leuchtend',
      baseName: 'Expeditionsrevolver',
      suffix: 'der Flamme',
      decadeSuffix: null,
    },
  };

  weapon.grammar = buildWeaponGrammar(weapon);

  assert.equal(formatWeaponDativePhrase(weapon), 'dem leuchtenden Expeditionsrevolver der Flamme');
  assert.equal(
    formatWeaponReference(weapon, { article: 'definite', grammaticalCase: 'nominative' }),
    'der leuchtende Expeditionsrevolver der Flamme',
  );
  assert.equal(
    formatWeaponReference(weapon, { article: 'definite', grammaticalCase: 'accusative' }),
    'den leuchtenden Expeditionsrevolver der Flamme',
  );
});

test('monster catalog defines explicit grammar profiles for all entries', () => {
  for (const monster of MONSTER_CATALOG) {
    assert.ok(monster.grammar, `${monster.id} is missing grammar metadata`);
    assert.equal(typeof monster.grammar.articleMode, 'string', `${monster.id} is missing grammar.articleMode`);
    assert.equal(typeof monster.grammar.gender, 'string', `${monster.id} is missing grammar.gender`);
  }
});
