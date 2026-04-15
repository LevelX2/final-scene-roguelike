import test from 'node:test';
import assert from 'node:assert/strict';
import { createStateBlueprintApi } from '../../src/application/state-blueprint.mjs';

test('state-blueprint supports fixed weapons offhands and inline loadout items', () => {
  const HERO_CLASSES = {
    tester: {
      id: 'tester',
      label: 'Tester',
      startLoadoutId: 'arsenal_demo',
      tagline: 'Tests',
      passiveName: 'Probe',
      passiveSummary: 'Probe',
      passiveDescription: 'Probe',
      maxHp: 18,
      strength: 3,
      precision: 4,
      reaction: 2,
      nerves: 2,
      intelligence: 3,
      endurance: 0,
    },
    lead: {
      id: 'lead',
      label: 'Lead',
      tagline: 'Lead',
      passiveName: 'Lead',
      passiveSummary: 'Lead',
      passiveDescription: 'Lead',
      maxHp: 20,
      strength: 4,
      precision: 4,
      reaction: 4,
      nerves: 4,
      intelligence: 2,
      endurance: 1,
    },
  };

  const api = createStateBlueprintApi({
    HERO_NAME_KEY: 'hero-name',
    HERO_CLASS_KEY: 'hero-class',
    DEFAULT_HERO_NAME: 'Final Girl',
    DEFAULT_HERO_CLASS: 'lead',
    HERO_CLASSES,
    readStorage: () => null,
    writeStorage: () => true,
    resolveHeroClassId: (value, fallback) => HERO_CLASSES[value] ? value : fallback,
    createBareHandsWeapon: () => ({
      type: 'weapon',
      id: 'bare-hands',
      name: 'Fäuste',
      damage: 1,
      hitBonus: 0,
      critBonus: 0,
      handedness: 'one-handed',
      attackMode: 'melee',
      effects: [],
      numericMods: [],
      modifiers: [],
      modifierIds: [],
      lightBonus: 0,
    }),
    generateEquipmentItem: (template) => ({
      type: 'weapon',
      id: template.id,
      templateId: template.id,
      baseItemId: template.id,
      name: template.name,
      source: template.source,
      handedness: template.handedness ?? 'one-handed',
      attackMode: template.attackMode ?? 'melee',
      range: template.range ?? 1,
      meleePenaltyHit: template.meleePenaltyHit ?? 0,
      damage: template.baseDamage ?? 1,
      hitBonus: template.baseHit ?? 0,
      critBonus: template.baseCrit ?? 0,
      lightBonus: 0,
      effects: [],
      numericMods: [],
      modifiers: [],
      modifierIds: [],
      description: template.description ?? 'Tests',
    }),
    xpForNextLevel: () => 40,
    getNutritionMax: () => 100,
    getNutritionStart: () => 80,
    getHungerState: () => 'NORMAL',
    createRunArchetypeSequence: () => ['slasher'],
    createRunStudioTopology: () => ({ nodes: { 1: { floorNumber: 1 } }, occupied: { '0,0,0': 1 }, generatedToFloor: 1 }),
    randomInt: () => 0,
  });

  const state = api.createFreshState('Tester', 'tester', { openStartModal: false });
  const inventory = api.createStartingInventory('tester');

  assert.equal(state.player.mainHand.id, 'expedition-revolver');
  assert.equal(state.player.offHand?.id, 'stuntman-bracer');
  assert.equal(state.player.endurance, 1);
  assert.equal(state.player.offHand?.statMods?.endurance, 1);

  assert.deepEqual(
    inventory.map((item) => item.type),
    ['food', 'weapon', 'key'],
  );
  assert.equal(inventory[0].id, 'custom-snack');
  assert.equal(inventory[1].id, 'training-baton');
  assert.equal(inventory[2].keyColor, 'blue');
  assert.equal(inventory[2].keyFloor, 2);
  assert.match(inventory[2].description, /Studio 2/);
});
