import test from 'node:test';
import assert from 'node:assert/strict';
import { buildWeaponGrammar, formatMonsterDisplayName, formatMonsterKillerLabel, formatMonsterReference, formatWeaponDativePhrase, formatWeaponReference } from '../../src/text/combat-phrasing.mjs';
import {
  MONSTER_CATALOG,
  MONSTER_HEALING_LABELS,
  MONSTER_HEALING_PROFILE,
  MONSTER_MOBILITY,
  MONSTER_MOBILITY_LABELS,
  MONSTER_RETREAT_LABELS,
  MONSTER_RETREAT_PROFILE,
  MONSTER_TEMPERAMENT_VALUES,
} from '../../src/content/catalogs/monsters.mjs';
import { STUDIO_ARCHETYPE_IDS } from '../../src/content/catalogs/studio-archetypes.mjs';

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

test('monster catalog defines explicit AI profiles for all entries', () => {
  const mobilityValues = new Set(Object.values(MONSTER_MOBILITY));
  const retreatValues = new Set(Object.values(MONSTER_RETREAT_PROFILE));
  const healingValues = new Set(Object.values(MONSTER_HEALING_PROFILE));
  const temperamentValues = new Set(MONSTER_TEMPERAMENT_VALUES);

  for (const monster of MONSTER_CATALOG) {
    assert.ok(mobilityValues.has(monster.mobility), `${monster.id} is missing an explicit mobility profile`);
    assert.equal(monster.mobilityLabel, MONSTER_MOBILITY_LABELS[monster.mobility], `${monster.id} has a mismatched mobility label`);
    assert.ok(retreatValues.has(monster.retreatProfile), `${monster.id} is missing an explicit retreat profile`);
    assert.equal(monster.retreatLabel, MONSTER_RETREAT_LABELS[monster.retreatProfile], `${monster.id} has a mismatched retreat label`);
    assert.ok(healingValues.has(monster.healingProfile), `${monster.id} is missing an explicit healing profile`);
    assert.equal(monster.healingLabel, MONSTER_HEALING_LABELS[monster.healingProfile], `${monster.id} has a mismatched healing label`);
    assert.ok(Array.isArray(monster.allowedTemperaments), `${monster.id} is missing allowedTemperaments`);
    assert.ok(monster.allowedTemperaments.length >= 1, `${monster.id} must allow at least one temperament`);
    assert.ok(
      monster.allowedTemperaments.every((temperament) => temperamentValues.has(temperament)),
      `${monster.id} contains an unknown temperament`,
    );
  }
});

test('phase one standard monsters cover every archetype with ten curated entries', () => {
  const standardMonsters = MONSTER_CATALOG.filter((monster) => monster.spawnGroup === 'standard');

  assert.equal(standardMonsters.length, STUDIO_ARCHETYPE_IDS.length * 10);

  for (const archetypeId of STUDIO_ARCHETYPE_IDS) {
    const archetypeMonsters = standardMonsters.filter((monster) => monster.archetypeId === archetypeId);
    assert.equal(archetypeMonsters.length, 10, `${archetypeId} should have exactly ten standard monsters`);
    assert.ok(
      archetypeMonsters.every((monster) => Number.isFinite(monster.spawnWeight) && monster.spawnWeight >= 1),
      `${archetypeId} contains an invalid spawnWeight`,
    );
    assert.ok(
      archetypeMonsters.every((monster) => monster.rank >= 1 && monster.rank <= 10),
      `${archetypeId} contains a standard monster outside rank 1-10`,
    );
  }
});
