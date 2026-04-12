import {
  MONSTER_MOBILITY,
  MONSTER_MOBILITY_LABELS,
  MONSTER_RETREAT_PROFILE,
  MONSTER_RETREAT_LABELS,
  MONSTER_HEALING_PROFILE,
  MONSTER_HEALING_LABELS,
} from './monsters.mjs';

export const WEAPON_CATALOG = {
  bates: {
    id: "kitchen-knife",
    name: "Küchenmesser",
    source: "Psycho",
    handedness: "one-handed",
    damage: 1,
    hitBonus: 1,
    critBonus: 0,
    description: "Schlichte, schnelle Klinge aus Psycho.",
  },
  ghostface: {
    id: "buck-knife",
    name: "Buck 120",
    source: "Scream",
    handedness: "one-handed",
    damage: 2,
    hitBonus: 1,
    critBonus: 1,
    description: "Das typische Jagdmesser von Ghostface.",
  },
  chucky: {
    id: "voodoo-knife",
    name: "Voodoo-Messer",
    source: "Child's Play",
    handedness: "one-handed",
    damage: 2,
    hitBonus: 1,
    critBonus: 0,
    description: "Klein, flink und ideal für fiese Treffer.",
  },
  myers: {
    id: "chef-knife",
    name: "Chefmesser",
    source: "Halloween",
    handedness: "one-handed",
    damage: 3,
    hitBonus: 0,
    critBonus: 0,
    description: "Die ikonische Klinge von Michael Myers.",
  },
  jason: {
    id: "machete",
    name: "Machete",
    source: "Friday the 13th",
    handedness: "two-handed",
    damage: 4,
    hitBonus: -1,
    critBonus: 0,
    description: "Schwer, brachial und direkt.",
  },
  freddy: {
    id: "claw-glove",
    name: "Klauenhandschuh",
    source: "A Nightmare on Elm Street",
    handedness: "one-handed",
    damage: 3,
    hitBonus: 1,
    critBonus: 1,
    description: "Freddys berüchtigter Handschuh mit Klingen.",
  },
  pennywise: {
    id: "fear-spike",
    name: "Albtraumklaue",
    source: "It",
    handedness: "one-handed",
    damage: 3,
    hitBonus: 0,
    critBonus: 1,
    description: "Unheimliche Manifestation aus It.",
  },
  xenomorph: {
    id: "acid-tail",
    name: "Säureschweif",
    source: "Alien",
    handedness: "two-handed",
    damage: 4,
    hitBonus: 0,
    critBonus: 1,
    description: "Tropfende Alien-Waffe mit bösem Finish.",
  },
  predator: {
    id: "wrist-blades",
    name: "Handgelenksklingen",
    source: "Predator",
    handedness: "one-handed",
    damage: 5,
    hitBonus: 1,
    critBonus: 1,
    description: "Präzise Jagdklingen des Predators.",
  },
  vader: {
    id: "lightsaber",
    name: "Lichtschwert",
    source: "Star Wars",
    handedness: "two-handed",
    damage: 6,
    hitBonus: -1,
    critBonus: 2,
    description: "Schwere dunkle Klinge von Darth Vader.",
  },
  terminator: {
    id: "sawed-off-shotgun",
    name: "Abgesägte Schrotflinte",
    source: "The Terminator",
    handedness: "two-handed",
    damage: 7,
    hitBonus: -1,
    critBonus: 1,
    description: "Wuchtige Filmwaffe des Terminators.",
  },
};

export const DUNGEON_WEAPON_TIERS = [
  {
    minFloor: 3,
    weapons: [
      {
        id: "stunt-baton",
        name: "Stunt-Schlagstock",
        source: "Studiofund",
        handedness: "one-handed",
        damage: 3,
        hitBonus: 1,
        critBonus: 0,
        description: "Solide Nahkampfwaffe aus einer schlecht gesicherten Requisitenkammer.",
      },
      {
        id: "stage-cleaver",
        name: "Bühnenbeil",
        source: "Backstage",
        handedness: "one-handed",
        damage: 4,
        hitBonus: 0,
        critBonus: 0,
        description: "Schwerer als ein Messer und deutlich weniger dezent.",
      },
    ],
  },
  {
    minFloor: 5,
    weapons: [
      {
        id: "ritual-dagger",
        name: "Ritualdolch",
        source: "Okulter Fund",
        handedness: "one-handed",
        damage: 4,
        hitBonus: 1,
        critBonus: 1,
        description: "Scharf, ausgewogen und ein wenig zu sauber für diesen Ort.",
      },
      {
        id: "chain-hook",
        name: "Kettenhaken",
        source: "Schlachthausset",
        handedness: "two-handed",
        damage: 5,
        hitBonus: 0,
        critBonus: 1,
        description: "Unhandlich, aber verheerend, wenn er trifft.",
      },
    ],
  },
  {
    minFloor: 8,
    weapons: [
      {
        id: "studio-halberd",
        name: "Studio-Hellebarde",
        source: "Archivkammer",
        handedness: "two-handed",
        damage: 6,
        hitBonus: 1,
        critBonus: 1,
        description: "Eine überrestaurierte Requisitenwaffe, die plötzlich erschreckend echt wirkt.",
      },
      {
        id: "execution-sabre",
        name: "Henkerssäbel",
        source: "Verbotene Sammlung",
        handedness: "one-handed",
        damage: 5,
        hitBonus: 2,
        critBonus: 1,
        description: "Spät gefunden, klar überlegen und genau deshalb selten.",
      },
    ],
  },
].map((monster) => {
  const relentlessIds = new Set([
    "ghostface",
    "maskierter-nachahmer",
    "videotheken-stalker",
    "myers",
    "stummer-maskenträger",
    "jason",
    "camp-schlaechter",
    "mutierter-hinterwaeldler",
    "pennywise",
    "kanalclown",
    "predator",
    "trophaeenjaeger",
    "soeldner-tracker",
    "vader",
    "vollstrecker",
    "inquisitor",
    "terminator",
  ]);
  const localIds = new Set([
    "bates",
    "kellerkriecher",
    "besessene-puppe",
    "gremlin",
    "friedhofsschlurfer",
    "critter",
  ]);
  const cautiousRetreatIds = new Set([
    "ghostface",
    "videotheken-stalker",
    "freddy",
    "traumwandler",
    "kesselraum-peiniger",
    "trophaeenjaeger",
    "soeldner-tracker",
  ]);
  const cowardlyRetreatIds = new Set([
    "bates",
    "pennywise",
    "kanalclown",
    "gestaltlaeufer",
  ]);
  const steadyHealingIds = new Set([
    "myers",
    "jason",
    "mutierter-hinterwaeldler",
    "terminator",
  ]);
  const lurkingHealingIds = new Set([
    "pennywise",
    "kanalclown",
    "gestaltlaeufer",
    "freddy",
    "traumwandler",
  ]);

  const mobility = relentlessIds.has(monster.id)
    ? MONSTER_MOBILITY.RELENTLESS
    : localIds.has(monster.id)
      ? MONSTER_MOBILITY.LOCAL
      : MONSTER_MOBILITY.ROAMING;
  const retreatProfile = cowardlyRetreatIds.has(monster.id)
    ? MONSTER_RETREAT_PROFILE.COWARDLY
    : cautiousRetreatIds.has(monster.id)
      ? MONSTER_RETREAT_PROFILE.CAUTIOUS
      : MONSTER_RETREAT_PROFILE.NONE;
  const healingProfile = steadyHealingIds.has(monster.id)
    ? MONSTER_HEALING_PROFILE.STEADY
    : lurkingHealingIds.has(monster.id)
      ? MONSTER_HEALING_PROFILE.LURKING
      : MONSTER_HEALING_PROFILE.SLOW;

  return {
    ...monster,
    mobility,
    mobilityLabel: MONSTER_MOBILITY_LABELS[mobility],
    retreatProfile,
    retreatLabel: MONSTER_RETREAT_LABELS[retreatProfile],
    healingProfile,
    healingLabel: MONSTER_HEALING_LABELS[healingProfile],
  };
});

