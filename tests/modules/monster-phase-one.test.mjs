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

test('phase one spawn weights reinforce each studio archetype signature', () => {
  const hallmarkBehaviors = {
    fantasy: ['hunter', 'stalker', 'juggernaut'],
    action: ['hunter', 'juggernaut'],
    western: ['wanderer', 'hunter', 'stalker'],
    slasher: ['stalker', 'juggernaut', 'trickster'],
    noir: ['hunter', 'stalker', 'trickster'],
    adventure: ['dormant', 'hunter', 'stalker'],
    space_opera: ['hunter', 'stalker', 'trickster'],
    creature_feature: ['stalker', 'trickster'],
    romcom: ['wanderer', 'trickster'],
    social_drama: ['hunter'],
  };

  const standardMonsters = MONSTER_CATALOG.filter((monster) => monster.spawnGroup === 'standard');

  for (const archetypeId of STUDIO_ARCHETYPE_IDS) {
    const archetypeMonsters = standardMonsters.filter((monster) => monster.archetypeId === archetypeId);
    const favored = new Set(hallmarkBehaviors[archetypeId]);
    const favoredWeight = archetypeMonsters
      .filter((monster) => favored.has(monster.behavior))
      .reduce((sum, monster) => sum + monster.spawnWeight, 0);
    const otherWeight = archetypeMonsters
      .filter((monster) => !favored.has(monster.behavior))
      .reduce((sum, monster) => sum + monster.spawnWeight, 0);

    assert.ok(
      favoredWeight > otherWeight,
      `${archetypeId} should lean toward its hallmark behaviors (${favoredWeight} <= ${otherWeight})`,
    );
  }
});

test('phase one early monsters stay sturdier without frontloading early damage', () => {
  const earlyStandardMonsters = MONSTER_CATALOG.filter(
    (monster) => monster.spawnGroup === 'standard' && monster.rank >= 1 && monster.rank <= 3,
  );

  assert.ok(earlyStandardMonsters.length > 0, 'expected early standard monsters');
  assert.ok(
    earlyStandardMonsters.every((monster) => monster.hp >= 8),
    'rank 1-3 standard monsters should no longer fall into paper-thin HP ranges',
  );
  assert.ok(
    earlyStandardMonsters.every((monster) => monster.strength <= 3),
    'rank 1-3 standard monsters should not frontload damage too hard',
  );
});
