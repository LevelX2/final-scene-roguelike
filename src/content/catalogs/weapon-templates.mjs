import { getWeaponEffectDefinition } from './weapon-effects.mjs';

export const WEAPON_PROFILES = {
  light_melee: { id: "light_melee", damageWeight: 0.8, hitWeight: 1.25, critWeight: 1.25 },
  heavy_melee: { id: "heavy_melee", damageWeight: 1.25, hitWeight: 0.75, critWeight: 0.75 },
  precise_ranged: { id: "precise_ranged", damageWeight: 1.0, hitWeight: 1.0, critWeight: 1.0 },
  special_improv: { id: "special_improv", damageWeight: 0.9, hitWeight: 1.0, critWeight: 0.75 },
};

export const LEVEL_SCALING_TABLE = {
  1: { damage: 0, hit: 0, crit: 0 },
  2: { damage: 0, hit: 0, crit: 0 },
  3: { damage: 0, hit: 1, crit: 0 },
  4: { damage: 1, hit: 1, crit: 0 },
  5: { damage: 1, hit: 1, crit: 1 },
  6: { damage: 1, hit: 1, crit: 1 },
  7: { damage: 2, hit: 2, crit: 1 },
  8: { damage: 2, hit: 2, crit: 1 },
  9: { damage: 2, hit: 2, crit: 2 },
  10: { damage: 3, hit: 3, crit: 2 },
};

function createTemplate(config) {
  const effectDefinition = config.signatureEffect?.type
    ? getWeaponEffectDefinition(config.signatureEffect.type)
    : null;
  return {
    type: "weapon-template",
    handedness: "one-handed",
    attackMode: "melee",
    meleePenaltyHit: 0,
    weight: 30,
    iconAsset: null,
    ...config,
    signatureEffect: effectDefinition
      ? {
          tier: 1,
          ...config.signatureEffect,
          label: effectDefinition.label,
        }
      : null,
  };
}

export const ARCHETYPE_WEAPON_TEMPLATES = {
  slasher: [
    createTemplate({ id: "kitchen-knife", name: "Küchenmesser", source: "Slasher-Set", archetypeId: "slasher", weaponRole: "oneHanded", profileId: "light_melee", baseDamage: 2, baseHit: 1, baseCrit: 0 }),
    createTemplate({ id: "woodcutter-axe", name: "Holzfällerbeil", source: "Slasher-Set", archetypeId: "slasher", weaponRole: "twoHanded", handedness: "two-handed", profileId: "heavy_melee", baseDamage: 4, baseHit: -1, baseCrit: 0 }),
    createTemplate({ id: "nail-gun", name: "Nagelpistole", source: "Slasher-Set", archetypeId: "slasher", weaponRole: "ranged", attackMode: "ranged", range: 5, profileId: "precise_ranged", meleePenaltyHit: -1, baseDamage: 2, baseHit: 1, baseCrit: 0 }),
    createTemplate({ id: "butcher-hook", name: "Fleischerhaken", source: "Slasher-Set", archetypeId: "slasher", weaponRole: "special", profileId: "special_improv", baseDamage: 2, baseHit: 0, baseCrit: 0, weight: 10, signatureEffect: { type: "bleed", tier: 1 } }),
  ],
  adventure: [
    createTemplate({ id: "relic-dagger", name: "Relikt-Dolch", source: "Abenteuer-Set", archetypeId: "adventure", weaponRole: "oneHanded", profileId: "light_melee", baseDamage: 2, baseHit: 1, baseCrit: 1 }),
    createTemplate({ id: "temple-spear", name: "Tempelspeer", source: "Abenteuer-Set", archetypeId: "adventure", weaponRole: "twoHanded", handedness: "two-handed", profileId: "heavy_melee", baseDamage: 4, baseHit: 0, baseCrit: 0 }),
    createTemplate({ id: "expedition-revolver", name: "Expeditionsrevolver", source: "Abenteuer-Set", archetypeId: "adventure", weaponRole: "ranged", attackMode: "ranged", range: 6, profileId: "precise_ranged", meleePenaltyHit: -1, baseDamage: 2, baseHit: 1, baseCrit: 1 }),
    createTemplate({ id: "torch-spear", name: "Fackelspeer", source: "Abenteuer-Set", archetypeId: "adventure", weaponRole: "special", handedness: "two-handed", profileId: "special_improv", baseDamage: 2, baseHit: 0, baseCrit: 0, weight: 10, signatureEffect: { type: "light_bonus", tier: 1 } }),
  ],
  space_opera: [
    createTemplate({ id: "plasma-blade", name: "Plasmaklinge", source: "Sci-Fi-Set", archetypeId: "space_opera", weaponRole: "oneHanded", profileId: "light_melee", baseDamage: 2, baseHit: 1, baseCrit: 0 }),
    createTemplate({ id: "energy-lance", name: "Energielanze", source: "Sci-Fi-Set", archetypeId: "space_opera", weaponRole: "twoHanded", handedness: "two-handed", profileId: "heavy_melee", baseDamage: 4, baseHit: -1, baseCrit: 0 }),
    createTemplate({ id: "ion-blaster", name: "Ionenblaster", source: "Sci-Fi-Set", archetypeId: "space_opera", weaponRole: "ranged", attackMode: "ranged", range: 7, profileId: "precise_ranged", meleePenaltyHit: -1, baseDamage: 2, baseHit: 2, baseCrit: 0 }),
    createTemplate({ id: "shock-caster", name: "Schockwerfer", source: "Sci-Fi-Set", archetypeId: "space_opera", weaponRole: "special", attackMode: "ranged", range: 5, profileId: "special_improv", meleePenaltyHit: -2, baseDamage: 2, baseHit: 1, baseCrit: 0, weight: 10, signatureEffect: { type: "stun", tier: 1 } }),
  ],
  fantasy: [
    createTemplate({ id: "rune-sword", name: "Runenschwert", source: "Fantasy-Set", archetypeId: "fantasy", weaponRole: "oneHanded", profileId: "light_melee", baseDamage: 2, baseHit: 1, baseCrit: 0 }),
    createTemplate({ id: "greatsword", name: "Großschwert", source: "Fantasy-Set", archetypeId: "fantasy", weaponRole: "twoHanded", handedness: "two-handed", profileId: "heavy_melee", baseDamage: 4, baseHit: -1, baseCrit: 0 }),
    createTemplate({ id: "hunting-bow", name: "Jagdbogen", source: "Fantasy-Set", archetypeId: "fantasy", weaponRole: "ranged", attackMode: "ranged", range: 7, profileId: "precise_ranged", meleePenaltyHit: -4, baseDamage: 2, baseHit: 2, baseCrit: 1 }),
    createTemplate({ id: "moon-blade", name: "Mondklinge", source: "Fantasy-Set", archetypeId: "fantasy", weaponRole: "special", profileId: "special_improv", baseDamage: 2, baseHit: 1, baseCrit: 0, weight: 10, signatureEffect: { type: "crit_bonus", tier: 1 } }),
  ],
  creature_feature: [
    createTemplate({ id: "electro-scalpel", name: "Elektro-Skalpell", source: "Labor-Set", archetypeId: "creature_feature", weaponRole: "oneHanded", profileId: "light_melee", baseDamage: 2, baseHit: 1, baseCrit: 1 }),
    createTemplate({ id: "bone-saw", name: "Knochensäge", source: "Labor-Set", archetypeId: "creature_feature", weaponRole: "twoHanded", handedness: "two-handed", profileId: "heavy_melee", baseDamage: 4, baseHit: -1, baseCrit: 0 }),
    createTemplate({ id: "serum-launcher", name: "Serumwerfer", source: "Labor-Set", archetypeId: "creature_feature", weaponRole: "ranged", attackMode: "ranged", range: 5, profileId: "precise_ranged", meleePenaltyHit: -2, baseDamage: 2, baseHit: 1, baseCrit: 0 }),
    createTemplate({ id: "toxin-injector", name: "Toxin-Injektor", source: "Labor-Set", archetypeId: "creature_feature", weaponRole: "special", profileId: "special_improv", baseDamage: 2, baseHit: 1, baseCrit: 0, weight: 10, signatureEffect: { type: "poison", tier: 1 } }),
  ],
  noir: [
    createTemplate({ id: "cane-blade", name: "Gehstockklinge", source: "Noir-Set", archetypeId: "noir", weaponRole: "oneHanded", profileId: "light_melee", baseDamage: 2, baseHit: 1, baseCrit: 1 }),
    createTemplate({ id: "fire-axe", name: "Feuerwehraxt", source: "Noir-Set", archetypeId: "noir", weaponRole: "twoHanded", handedness: "two-handed", profileId: "heavy_melee", baseDamage: 4, baseHit: 0, baseCrit: 0 }),
    createTemplate({ id: "pocket-revolver", name: "Taschenrevolver", source: "Noir-Set", archetypeId: "noir", weaponRole: "ranged", attackMode: "ranged", range: 5, profileId: "precise_ranged", meleePenaltyHit: -1, baseDamage: 2, baseHit: 2, baseCrit: 1 }),
    createTemplate({ id: "blackjack", name: "Blackjack", source: "Noir-Set", archetypeId: "noir", weaponRole: "special", profileId: "special_improv", baseDamage: 2, baseHit: 1, baseCrit: 0, weight: 10, signatureEffect: { type: "reaction_malus", tier: 1 } }),
  ],
  romcom: [
    createTemplate({ id: "crystal-letter-opener", name: "Kristallbrieföffner", source: "Rom-Com-Set", archetypeId: "romcom", weaponRole: "oneHanded", profileId: "light_melee", baseDamage: 2, baseHit: 2, baseCrit: 0 }),
    createTemplate({ id: "champagne-sabre", name: "Champagner-Säbel", source: "Rom-Com-Set", archetypeId: "romcom", weaponRole: "twoHanded", handedness: "two-handed", profileId: "heavy_melee", baseDamage: 4, baseHit: 0, baseCrit: 1 }),
    createTemplate({ id: "sport-bow", name: "Sportbogen", source: "Rom-Com-Set", archetypeId: "romcom", weaponRole: "ranged", attackMode: "ranged", range: 6, profileId: "precise_ranged", meleePenaltyHit: -4, baseDamage: 2, baseHit: 2, baseCrit: 0 }),
    createTemplate({ id: "bouquet-throw", name: "Bouquet-Wurf", source: "Rom-Com-Set", archetypeId: "romcom", weaponRole: "special", attackMode: "ranged", range: 4, profileId: "special_improv", meleePenaltyHit: -2, baseDamage: 2, baseHit: 1, baseCrit: 0, weight: 10, signatureEffect: { type: "precision_malus", tier: 1 } }),
  ],
  social_drama: [
    createTemplate({ id: "box-cutter", name: "Teppichmesser", source: "Alltags-Set", archetypeId: "social_drama", weaponRole: "oneHanded", profileId: "light_melee", baseDamage: 2, baseHit: 1, baseCrit: 0 }),
    createTemplate({ id: "sledgehammer", name: "Vorschlaghammer", source: "Alltags-Set", archetypeId: "social_drama", weaponRole: "twoHanded", handedness: "two-handed", profileId: "heavy_melee", baseDamage: 4, baseHit: -1, baseCrit: 0 }),
    createTemplate({ id: "brick-throw", name: "Ziegelwurf", source: "Alltags-Set", archetypeId: "social_drama", weaponRole: "ranged", attackMode: "ranged", range: 4, profileId: "precise_ranged", meleePenaltyHit: -2, baseDamage: 2, baseHit: 0, baseCrit: 0 }),
    createTemplate({ id: "pepper-spray", name: "Pfefferspray", source: "Alltags-Set", archetypeId: "social_drama", weaponRole: "special", attackMode: "ranged", range: 3, profileId: "special_improv", meleePenaltyHit: -2, baseDamage: 1, baseHit: 2, baseCrit: 0, weight: 10, signatureEffect: { type: "precision_malus", tier: 1 } }),
  ],
  action: [
    createTemplate({ id: "combat-knife", name: "Kampfmesser", source: "Action-Set", archetypeId: "action", weaponRole: "oneHanded", profileId: "light_melee", baseDamage: 2, baseHit: 1, baseCrit: 0 }),
    createTemplate({ id: "breach-axe", name: "Taktische Brechaxt", source: "Action-Set", archetypeId: "action", weaponRole: "twoHanded", handedness: "two-handed", profileId: "heavy_melee", baseDamage: 4, baseHit: -1, baseCrit: 0 }),
    createTemplate({ id: "service-pistol", name: "Dienstpistole", source: "Action-Set", archetypeId: "action", weaponRole: "ranged", attackMode: "ranged", range: 6, profileId: "precise_ranged", meleePenaltyHit: -1, baseDamage: 2, baseHit: 2, baseCrit: 0 }),
    createTemplate({ id: "taser-baton", name: "Taserstab", source: "Action-Set", archetypeId: "action", weaponRole: "special", profileId: "special_improv", baseDamage: 2, baseHit: 1, baseCrit: 0, weight: 10, signatureEffect: { type: "stun", tier: 1 } }),
  ],
  western: [
    createTemplate({ id: "bowie-knife", name: "Bowie-Messer", source: "Western-Set", archetypeId: "western", weaponRole: "oneHanded", profileId: "light_melee", baseDamage: 2, baseHit: 1, baseCrit: 1 }),
    createTemplate({ id: "ranch-shotgun", name: "Rancherflinte", source: "Western-Set", archetypeId: "western", weaponRole: "twoHanded", handedness: "two-handed", attackMode: "ranged", range: 4, profileId: "heavy_melee", meleePenaltyHit: -1, baseDamage: 4, baseHit: 0, baseCrit: 0 }),
    createTemplate({ id: "revolver", name: "Revolver", source: "Western-Set", archetypeId: "western", weaponRole: "ranged", attackMode: "ranged", range: 6, profileId: "precise_ranged", meleePenaltyHit: -1, baseDamage: 2, baseHit: 2, baseCrit: 1 }),
    createTemplate({ id: "barbed-wire-lasso", name: "Stacheldraht-Lasso", source: "Western-Set", archetypeId: "western", weaponRole: "special", attackMode: "ranged", range: 4, profileId: "special_improv", meleePenaltyHit: -2, baseDamage: 2, baseHit: 1, baseCrit: 0, weight: 10, signatureEffect: { type: "root", tier: 1 } }),
  ],
};

export const ICONIC_MONSTER_WEAPON_IDS = {
  bates: "kitchen-knife",
  ghostface: "buck-knife",
  chucky: "voodoo-knife",
  myers: "chef-knife",
  jason: "machete",
  freddy: "claw-glove",
  pennywise: "fear-spike",
  xenomorph: "acid-tail",
  predator: "wrist-blades",
  vader: "lightsaber",
  terminator: "sawed-off-shotgun",
};

export const ICONIC_WEAPON_TEMPLATES = [
  createTemplate({ id: "buck-knife", name: "Buck 120", source: "Scream", archetypeId: "slasher", weaponRole: "oneHanded", profileId: "light_melee", baseDamage: 3, baseHit: 1, baseCrit: 1, signatureEffect: { type: "bleed", tier: 1 } }),
  createTemplate({ id: "voodoo-knife", name: "Voodoo-Messer", source: "Child's Play", archetypeId: "slasher", weaponRole: "oneHanded", profileId: "light_melee", baseDamage: 3, baseHit: 1, baseCrit: 0, signatureEffect: { type: "crit_bonus", tier: 1 } }),
  createTemplate({ id: "chef-knife", name: "Chefmesser", source: "Halloween", archetypeId: "slasher", weaponRole: "oneHanded", profileId: "light_melee", baseDamage: 4, baseHit: 0, baseCrit: 0, signatureEffect: { type: "bleed", tier: 1 } }),
  createTemplate({ id: "machete", name: "Machete", source: "Friday the 13th", archetypeId: "slasher", weaponRole: "twoHanded", handedness: "two-handed", profileId: "heavy_melee", baseDamage: 5, baseHit: -1, baseCrit: 0, signatureEffect: { type: "bleed", tier: 1 } }),
  createTemplate({ id: "claw-glove", name: "Klauenhandschuh", source: "A Nightmare on Elm Street", archetypeId: "slasher", weaponRole: "special", profileId: "special_improv", baseDamage: 4, baseHit: 1, baseCrit: 1, signatureEffect: { type: "reaction_malus", tier: 1 } }),
  createTemplate({ id: "fear-spike", name: "Albtraumklaue", source: "It", archetypeId: "creature_feature", weaponRole: "special", profileId: "special_improv", baseDamage: 4, baseHit: 0, baseCrit: 1, signatureEffect: { type: "precision_malus", tier: 1 } }),
  createTemplate({ id: "acid-tail", name: "Säureschweif", source: "Alien", archetypeId: "creature_feature", weaponRole: "twoHanded", handedness: "two-handed", profileId: "heavy_melee", baseDamage: 5, baseHit: 0, baseCrit: 1, signatureEffect: { type: "poison", tier: 1 } }),
  createTemplate({ id: "wrist-blades", name: "Handgelenksklingen", source: "Predator", archetypeId: "action", weaponRole: "oneHanded", profileId: "light_melee", baseDamage: 5, baseHit: 1, baseCrit: 1, signatureEffect: { type: "crit_bonus", tier: 1 } }),
  createTemplate({ id: "lightsaber", name: "Lichtschwert", source: "Star Wars", archetypeId: "space_opera", weaponRole: "special", handedness: "two-handed", profileId: "special_improv", baseDamage: 6, baseHit: 0, baseCrit: 2, signatureEffect: { type: "light_bonus", tier: 2 } }),
  createTemplate({ id: "sawed-off-shotgun", name: "Abgesägte Schrotflinte", source: "The Terminator", archetypeId: "action", weaponRole: "ranged", handedness: "two-handed", attackMode: "ranged", range: 4, profileId: "precise_ranged", meleePenaltyHit: -1, baseDamage: 6, baseHit: 0, baseCrit: 1, signatureEffect: { type: "reaction_malus", tier: 1 } }),
];

export const ALL_WEAPON_TEMPLATES = [
  ...Object.values(ARCHETYPE_WEAPON_TEMPLATES).flat(),
  ...ICONIC_WEAPON_TEMPLATES,
];

export const WEAPON_TEMPLATE_INDEX = Object.fromEntries(
  ALL_WEAPON_TEMPLATES.map((template) => [template.id, template]),
);

export function getWeaponProfile(profileId) {
  return WEAPON_PROFILES[profileId] ?? WEAPON_PROFILES.light_melee;
}

export function getWeaponTemplate(templateId) {
  return WEAPON_TEMPLATE_INDEX[templateId] ?? null;
}

export function getArchetypeWeaponTemplates(archetypeId) {
  return ARCHETYPE_WEAPON_TEMPLATES[archetypeId]?.map((template) => ({ ...template })) ?? [];
}

export function getIconicWeaponTemplateForMonster(monsterId) {
  const templateId = ICONIC_MONSTER_WEAPON_IDS[monsterId];
  return templateId ? getWeaponTemplate(templateId) : null;
}

export function getFloorScalingBonus(floorNumber) {
  const normalizedFloor = Math.max(1, floorNumber);
  const cycle = Math.floor((normalizedFloor - 1) / 10);
  const slot = ((normalizedFloor - 1) % 10) + 1;
  const base = LEVEL_SCALING_TABLE[slot] ?? LEVEL_SCALING_TABLE[1];
  return {
    damage: base.damage + cycle * 5,
    hit: base.hit + cycle * 3,
    crit: base.crit + cycle * 2,
  };
}
