export const MOBILITY_LABELS = Object.freeze({
  local: "Reviertreu",
  roaming: "Mobil",
  relentless: "Jagdend",
});

export const RETREAT_LABELS = Object.freeze({
  none: "Standhaft",
  cautious: "Vorsichtig",
  cowardly: "Fluchtbereit",
});

export const HEALING_LABELS = Object.freeze({
  none: "Keine",
  slow: "Langsam",
  steady: "Stetig",
  lurking: "Nur außerhalb des Kampfes",
});

export const GRAMMAR = Object.freeze({
  GENERIC_MASCULINE: Object.freeze({ articleMode: "indefinite", gender: "masculine" }),
  GENERIC_FEMININE: Object.freeze({ articleMode: "indefinite", gender: "feminine" }),
  GENERIC_NEUTER: Object.freeze({ articleMode: "indefinite", gender: "neuter" }),
});

export const RANK_BASELINES = Object.freeze({
  1: Object.freeze({ hp: 9, strength: 1, precision: 2, reaction: 2, nerves: 1, intelligence: 1, xpReward: 6 }),
  2: Object.freeze({ hp: 10, strength: 1, precision: 3, reaction: 3, nerves: 2, intelligence: 2, xpReward: 8 }),
  3: Object.freeze({ hp: 12, strength: 2, precision: 3, reaction: 4, nerves: 2, intelligence: 2, xpReward: 10 }),
  4: Object.freeze({ hp: 12, strength: 4, precision: 3, reaction: 3, nerves: 3, intelligence: 2, xpReward: 13 }),
  5: Object.freeze({ hp: 14, strength: 5, precision: 4, reaction: 4, nerves: 3, intelligence: 3, xpReward: 16 }),
  6: Object.freeze({ hp: 16, strength: 5, precision: 5, reaction: 4, nerves: 4, intelligence: 4, xpReward: 20 }),
  7: Object.freeze({ hp: 18, strength: 6, precision: 5, reaction: 5, nerves: 4, intelligence: 5, xpReward: 24 }),
  8: Object.freeze({ hp: 20, strength: 7, precision: 5, reaction: 5, nerves: 5, intelligence: 5, xpReward: 28 }),
  9: Object.freeze({ hp: 22, strength: 7, precision: 6, reaction: 6, nerves: 5, intelligence: 6, xpReward: 34 }),
  10: Object.freeze({ hp: 25, strength: 8, precision: 6, reaction: 6, nerves: 6, intelligence: 6, xpReward: 44 }),
});

export const SPAWN_WEIGHT_BY_RANK = Object.freeze({
  1: 10,
  2: 9,
  3: 8,
  4: 7,
  5: 7,
  6: 6,
  7: 5,
  8: 4,
  9: 3,
  10: 2,
});

export const ROLE_PROFILES = Object.freeze({
  skirmisher: Object.freeze({
    statMods: Object.freeze({ hp: -1, strength: -1, precision: 1, reaction: 1, nerves: -1, intelligence: 0 }),
    spawnWeightMultiplier: 1.15,
  }),
  guardian: Object.freeze({
    statMods: Object.freeze({ hp: 2, strength: 0, precision: 0, reaction: -1, nerves: 1, intelligence: -1 }),
    spawnWeightMultiplier: 0.9,
  }),
  pressure: Object.freeze({
    statMods: Object.freeze({ hp: 1, strength: 1, precision: -1, reaction: 0, nerves: 0, intelligence: -1 }),
    spawnWeightMultiplier: 1.0,
  }),
  hunter: Object.freeze({
    statMods: Object.freeze({ hp: 0, strength: 1, precision: 1, reaction: 1, nerves: 0, intelligence: 0 }),
    spawnWeightMultiplier: 1.0,
  }),
  stalker: Object.freeze({
    statMods: Object.freeze({ hp: 1, strength: 0, precision: 1, reaction: 2, nerves: 0, intelligence: 1 }),
    spawnWeightMultiplier: 0.85,
  }),
  trickster: Object.freeze({
    statMods: Object.freeze({ hp: -1, strength: -1, precision: 1, reaction: 1, nerves: 0, intelligence: 2 }),
    spawnWeightMultiplier: 0.9,
  }),
  juggernaut: Object.freeze({
    statMods: Object.freeze({ hp: 3, strength: 2, precision: -1, reaction: -1, nerves: 1, intelligence: -1 }),
    spawnWeightMultiplier: 0.75,
  }),
  marksman: Object.freeze({
    statMods: Object.freeze({ hp: -1, strength: 0, precision: 2, reaction: 1, nerves: 0, intelligence: 1 }),
    spawnWeightMultiplier: 0.85,
  }),
  controller: Object.freeze({
    statMods: Object.freeze({ hp: 0, strength: -1, precision: 1, reaction: 0, nerves: 1, intelligence: 2 }),
    spawnWeightMultiplier: 0.8,
  }),
});

export const ARCHETYPE_FLAVORS = Object.freeze({
  fantasy: "einer Welt aus alten Eiden, kaltem Stahl und Magie",
  action: "einem Set aus Druckwellen, Blaulicht und harter Gewalt",
  western: "Staub, Distanz und hartem Überlebenswillen",
  slasher: "engen Korridoren, schmutzigen Werkzeugen und plötzlicher Panik",
  noir: "Rauch, Neon und halben Wahrheiten",
  adventure: "Ruinen, Relikten und uralten Fallen",
  space_opera: "Stahlgängen, Funkschatten und militärischer Kälte",
  creature_feature: "Laborresten, schlechten Experimenten und organischem Schrecken",
  romcom: "verrutschter Romantik, greller Fassade und sozialem Chaos",
  social_drama: "vertrauten Räumen, angespannter Nähe und rohem Alltagsdruck",
});

export const ARCHETYPE_BEHAVIOR_SPAWN_BIAS = Object.freeze({
  fantasy: Object.freeze({ dormant: 0.68, wanderer: 0.68, hunter: 1.25, stalker: 1.45, trickster: 0.84, juggernaut: 1.28 }),
  action: Object.freeze({ dormant: 0.9, wanderer: 0.82, hunter: 1.28, stalker: 1.06, trickster: 0.86, juggernaut: 1.16 }),
  western: Object.freeze({ dormant: 0.8, wanderer: 1.08, hunter: 1.18, stalker: 1.22, trickster: 0.94, juggernaut: 0.86 }),
  slasher: Object.freeze({ dormant: 0.92, wanderer: 0.78, hunter: 0.84, stalker: 1.52, trickster: 0.8, juggernaut: 1.2 }),
  noir: Object.freeze({ dormant: 0.72, wanderer: 0.86, hunter: 1.24, stalker: 1.45, trickster: 1.02, juggernaut: 0.82 }),
  adventure: Object.freeze({ dormant: 1.06, wanderer: 0.92, hunter: 1.08, stalker: 1.18, trickster: 0.94, juggernaut: 1.02 }),
  space_opera: Object.freeze({ dormant: 0.88, wanderer: 0.94, hunter: 1.18, stalker: 1.12, trickster: 1.02, juggernaut: 0.9 }),
  creature_feature: Object.freeze({ dormant: 0.86, wanderer: 1.0, hunter: 0.9, stalker: 1.28, trickster: 1.12, juggernaut: 0.96 }),
  romcom: Object.freeze({ dormant: 0.8, wanderer: 1.16, hunter: 0.96, stalker: 0.92, trickster: 1.2, juggernaut: 0.74 }),
  social_drama: Object.freeze({ dormant: 0.72, wanderer: 0.94, hunter: 1.14, stalker: 1.02, trickster: 1.0, juggernaut: 0.88 }),
});

export const BEHAVIOR_SPECIALS = Object.freeze({
  dormant: "Hält Position, bis ein Ziel seinen Bereich stört.",
  wanderer: "Erzeugt Druck vor allem über Raumwechsel und Präsenz.",
  hunter: "Sucht nach Sichtkontakt direkte Wege und hält den Vorwärtsdruck hoch.",
  stalker: "Bleibt in der Verfolgung schwer abzuschütteln und liest Wege gut.",
  trickster: "Sucht unangenehme Winkel und bricht klare Schlagabtausche auf.",
  juggernaut: "Gewinnt Kämpfe über rohe Präsenz, Standfestigkeit und Druck.",
});
