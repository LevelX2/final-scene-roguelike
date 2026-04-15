import test from 'node:test';
import assert from 'node:assert/strict';
import { MONSTER_CATALOG } from '../../src/content/catalogs/monsters.mjs';
import { STUDIO_ARCHETYPE_IDS } from '../../src/content/catalogs/studio-archetypes.mjs';

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
