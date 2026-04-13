import test from 'node:test';
import assert from 'node:assert/strict';
import { buildWeaponGrammar, formatMonsterDisplayName, formatMonsterKillerLabel, formatMonsterReference, formatWeaponDativePhrase, formatWeaponReference } from '../../src/text/combat-phrasing.mjs';
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

test('monster phrasing inflects article-backed names across combat cases', () => {
  const doll = MONSTER_CATALOG.find((monster) => monster.id === 'besessene-puppe');

  assert.equal(
    formatMonsterReference(doll, { article: 'definite', grammaticalCase: 'nominative' }),
    'die besessene Puppe',
  );
  assert.equal(
    formatMonsterReference(doll, { article: 'definite', grammaticalCase: 'dative' }),
    'der besessenen Puppe',
  );
  assert.equal(
    formatMonsterReference(doll, { article: 'indefinite', grammaticalCase: 'nominative' }),
    'eine besessene Puppe',
  );
});

test('monster display and sentence phrasing support variant adjective prefixes', () => {
  const brute = {
    baseName: 'Motel-Schlurfer',
    grammar: {
      articleMode: 'indefinite',
      gender: 'masculine',
      namePrefixStems: ['brutal'],
    },
  };

  assert.equal(
    formatMonsterDisplayName(brute),
    'Brutaler Motel-Schlurfer',
  );
  assert.equal(
    formatMonsterReference(brute, { article: 'definite', grammaticalCase: 'nominative' }),
    'der brutale Motel-Schlurfer',
  );
  assert.equal(
    formatMonsterReference(brute, { article: 'definite', grammaticalCase: 'dative' }),
    'dem brutalen Motel-Schlurfer',
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

test('catalog inflection profiles cover the adjective-backed monster names', () => {
  for (const monsterId of [
    'maskierter-nachahmer',
    'besessene-puppe',
    'stummer-maskentraeger',
    'mutierter-hinterwaeldler',
    'dunkler-vollstrecker',
  ]) {
    const monster = MONSTER_CATALOG.find((entry) => entry.id === monsterId);
    assert.ok(monster?.grammar?.inflectableParts, `${monsterId} is missing grammar.inflectableParts`);
  }
});
