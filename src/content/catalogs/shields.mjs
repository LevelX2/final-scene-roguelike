function createShield(config) {
  return {
    type: "offhand",
    itemType: "shield",
    subtype: "shield",
    minFloor: 1,
    weight: 10,
    iconAssetId: config.iconAssetId ?? config.id,
    statMods: { ...(config.statMods ?? {}) },
    ...config,
  };
}

function cloneShieldTemplate(template) {
  if (!template) {
    return null;
  }

  return {
    ...template,
    statMods: { ...(template.statMods ?? {}) },
  };
}

export const ARCHETYPE_SHIELD_TEMPLATES = {
  slasher: [
    createShield({
      id: "clapperboard-shield",
      name: "Klappenbrett-Schild",
      archetypeId: "slasher",
      minFloor: 1,
      blockChance: 16,
      blockValue: 2,
      source: "Slasher-Set",
      statMods: { reaction: 1 },
      description: "Leichtes Requisitenschild aus einem Klappenbrett. Schnell, handlich und ideal für aggressive Nahkämpfe.",
    }),
    createShield({
      id: "fire-escape-buckler",
      name: "Feuerleiter-Buckler",
      archetypeId: "slasher",
      minFloor: 2,
      blockChance: 18,
      blockValue: 2,
      source: "Slasher-Set",
      statMods: { reaction: 1 },
      description: "Ein improvisierter Metallschutz aus der Feuerleiter. Schnell im Handling und perfekt für enge Flure.",
    }),
    createShield({
      id: "ice-hockey-chest-guard",
      name: "Hockey-Brustschutz",
      archetypeId: "slasher",
      minFloor: 6,
      blockChance: 22,
      blockValue: 3,
      source: "Camp-Slasher-Set",
      statMods: { endurance: 1, reaction: -1 },
      description: "Sportlicher Schutz aus einem Sommercamp-Albtraum. Hält einiges aus, macht aber schwerfälliger.",
    }),
  ],
  adventure: [
    createShield({
      id: "temple-reliquary-guard",
      iconAssetId: "cathedral-reliquary-guard",
      name: "Tempel-Reliquienschild",
      archetypeId: "adventure",
      minFloor: 4,
      blockChance: 18,
      blockValue: 3,
      source: "Abenteuer-Set",
      statMods: { nerves: 1 },
      description: "Ein vergoldeter Reliquienschutz aus einer vergessenen Grabkammer. Stabil und beruhigend in alten Ruinen.",
    }),
  ],
  space_opera: [
    createShield({
      id: "satellite-dish-guard",
      name: "Satellitenschüssel-Schild",
      archetypeId: "space_opera",
      minFloor: 2,
      blockChance: 15,
      blockValue: 2,
      source: "Sci-Fi-Set",
      statMods: { precision: 1 },
      description: "Technischer Reflektor-Schutz mit sauberer Linienführung und gutem Timing.",
    }),
  ],
  fantasy: [
    createShield({
      id: "knight-prop-tower",
      name: "Ritterturm-Schild",
      archetypeId: "fantasy",
      minFloor: 6,
      blockChance: 23,
      blockValue: 4,
      source: "Fantasy-Set",
      statMods: { strength: 1, reaction: -1 },
      description: "Breites Turnier-Requisit mit hoher Deckung und massivem Gewicht.",
    }),
    createShield({
      id: "cathedral-reliquary-guard",
      name: "Reliquiar-Schild",
      archetypeId: "fantasy",
      minFloor: 4,
      blockChance: 18,
      blockValue: 3,
      source: "Fantasy-Set",
      statMods: { nerves: 1 },
      description: "Gesegnet wirkender Reliquienschutz für starke Nerven in düsteren Hallen.",
    }),
  ],
  creature_feature: [
    createShield({
      id: "lab-containment-shield",
      name: "Labor-Kontaminationsschild",
      archetypeId: "creature_feature",
      minFloor: 4,
      blockChance: 17,
      blockValue: 3,
      source: "Labor-Set",
      statMods: { nerves: 1 },
      description: "Versiegeltes Schutzpanel aus dem Laborbereich. Stabil gegen das Unbekannte.",
    }),
    createShield({
      id: "mausoleum-plate",
      name: "Kryptaplatte",
      archetypeId: "creature_feature",
      minFloor: 4,
      blockChance: 21,
      blockValue: 3,
      source: "Creature-Feature-Set",
      statMods: { reaction: -1 },
      description: "Schwere Steinplatte aus einem Set zwischen Gruft und Monsterlabor. Verlässlich, aber sperrig.",
    }),
  ],
  noir: [
    createShield({
      id: "projection-booth-plate",
      name: "Projektorplatten-Schild",
      archetypeId: "noir",
      minFloor: 4,
      blockChance: 20,
      blockValue: 3,
      source: "Noir-Set",
      statMods: { precision: 1 },
      description: "Projektorplatte mit solidem Kern und gutem Blick für Winkel.",
    }),
    createShield({
      id: "paparazzi-flash-shield",
      name: "Blitzreflektor-Schild",
      archetypeId: "noir",
      minFloor: 3,
      blockChance: 12,
      blockValue: 2,
      source: "Noir-Set",
      statMods: { reaction: 1, precision: 1, nerves: -1 },
      description: "Leichter Blitzreflektor, der Sicht und Tempo verbessert, aber die Ruhe kostet.",
    }),
  ],
  romcom: [
    createShield({
      id: "neon-diner-tray",
      name: "Neon-Diner-Tablett",
      archetypeId: "romcom",
      minFloor: 1,
      blockChance: 14,
      blockValue: 2,
      source: "Rom-Com-Set",
      statMods: { charm: 1 },
      description: "Improvisierter Schutz aus einem Diner-Serviertablett. Elegant, aber nicht sonderlich robust.",
    }),
    createShield({
      id: "showmaster-aegis",
      name: "Showmaster-Aegis",
      archetypeId: "romcom",
      minFloor: 2,
      blockChance: 13,
      blockValue: 2,
      source: "Rom-Com-Set",
      statMods: { strength: -1, charm: 1 },
      description: "Blendender Show-Schutz für große Auftritte und kleine Tricks.",
    }),
  ],
  social_drama: [
    createShield({
      id: "worksite-bracer",
      iconAssetId: "stuntman-bracer",
      name: "Arbeitsschutz-Armschild",
      archetypeId: "social_drama",
      minFloor: 2,
      blockChance: 17,
      blockValue: 2,
      source: "Alltags-Set",
      statMods: { endurance: 1 },
      description: "Abgenutzter Armschutz aus rauem Arbeitsalltag. Unspektakulär, aber verlässlich.",
    }),
    createShield({
      id: "taxi-door-shield",
      name: "Taxitür-Schild",
      archetypeId: "social_drama",
      minFloor: 4,
      blockChance: 19,
      blockValue: 3,
      source: "Alltags-Set",
      statMods: { endurance: 1, precision: -1 },
      description: "Abgerissene Autotür als urbanes Notschild. Klobig, aber zäh.",
    }),
  ],
  action: [
    createShield({
      id: "riot-cop-shield",
      name: "Riot-Cop Shield",
      archetypeId: "action",
      minFloor: 6,
      blockChance: 24,
      blockValue: 4,
      source: "Action-Set",
      statMods: { reaction: -1 },
      description: "Schweres Einsatzschild mit starker Defensive, aber träger Bewegung.",
    }),
    createShield({
      id: "stuntman-bracer",
      name: "Stuntman-Bracer",
      archetypeId: "action",
      minFloor: 2,
      blockChance: 17,
      blockValue: 2,
      source: "Action-Set",
      statMods: { endurance: 1 },
      description: "Robuster Armschutz für riskante Stunts und harte Trefferfolgen.",
    }),
  ],
  western: [
    createShield({
      id: "stagecoach-door-shield",
      iconAssetId: "taxi-door-shield",
      name: "Kutschentür-Schild",
      archetypeId: "western",
      minFloor: 4,
      blockChance: 19,
      blockValue: 3,
      source: "Western-Set",
      statMods: { endurance: 1, precision: -1 },
      description: "Eine schwere Kutschentür als improvisierter Schutz. Rau, sperrig und erstaunlich widerstandsfähig.",
    }),
  ],
};

export const ALL_SHIELD_TEMPLATES = Object.values(ARCHETYPE_SHIELD_TEMPLATES).flat();

export const SHIELD_TEMPLATE_INDEX = Object.fromEntries(
  ALL_SHIELD_TEMPLATES.map((template) => [template.id, template]),
);

export function getShieldTemplate(templateId) {
  return cloneShieldTemplate(SHIELD_TEMPLATE_INDEX[templateId] ?? null);
}

export function getArchetypeShieldTemplates(archetypeId) {
  return ARCHETYPE_SHIELD_TEMPLATES[archetypeId]?.map(cloneShieldTemplate) ?? [];
}

export const SHIELD_CATALOG = Object.fromEntries(
  ALL_SHIELD_TEMPLATES.map((template) => [template.id, cloneShieldTemplate(template)]),
);

export const OFFHAND_CATALOG = SHIELD_CATALOG;
