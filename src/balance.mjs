import { defaultRandomChance } from './utils/random-tools.mjs';

export const ROOM_ATTEMPTS = 84;
export const MIN_ROOM_SIZE = 4;
export const MAX_ROOM_SIZE = 9;

export const VISION_RADIUS = 5;
export const BASE_HIT_CHANCE = 65;
export const MIN_HIT_CHANCE = 10;
export const MAX_HIT_CHANCE = 90;
export const MIN_CRIT_CHANCE = 0;
export const MAX_CRIT_CHANCE = 50;
export const FLOOR_WEAPON_SPAWN_CHANCE = 0.25;
export const CHEST_WEAPON_CHANCE = 0.3;
export const CHEST_SHIELD_CHANCE = 0.1;
export const DUNGEON_WEAPON_WEIGHT_BONUS = 1.35;
export const DUPLICATE_WEAPON_WEIGHT_PENALTY = 0.35;
export const NON_ICONIC_MONSTER_WEIGHT_BONUS = 1.45;
export const ICONIC_MONSTER_WEIGHT_PENALTY = 0.72;
export const LEGACY_SPECIAL_MONSTER_SPAWN_CHANCE_BASE = 0.12;
export const LEGACY_SPECIAL_MONSTER_SPAWN_CHANCE_STEP = 0.02;
export const LEGACY_SPECIAL_MONSTER_SPAWN_CHANCE_CAP = 0.24;
export const ENEMY_HP_PER_SCALE = 5;
export const ENEMY_XP_PER_SCALE = 5;
export const ENEMY_STRENGTH_SCALE_STEP = 1;
export const ENEMY_PRECISION_SCALE_STEP = 2;
export const ENEMY_REACTION_SCALE_STEP = 2;
export const ENEMY_NERVES_SCALE_STEP = 2;
export const ENEMY_INTELLIGENCE_SCALE_STEP = 3;
export const ENEMY_AGGRO_RADIUS_CAP = 4;
export const MONSTER_VARIANT_TIERS = {
  normal: {
    id: "normal",
    label: "Gewoehnlich",
    modCount: 0,
    hpMultiplier: 1,
    xpMultiplier: 1,
    weaponDropChance: 0.08,
    offHandDropChance: 0.06,
    iconicWeaponDropChance: 0.25,
  },
  elite: {
    id: "elite",
    label: "Ungewoehnlich",
    modCount: 1,
    hpMultiplier: 1.18,
    xpMultiplier: 1.35,
    weaponDropChance: 0.16,
    offHandDropChance: 0.12,
    iconicWeaponDropChance: 0.34,
  },
  dire: {
    id: "dire",
    label: "Selten",
    modCount: 2,
    hpMultiplier: 1.32,
    xpMultiplier: 1.65,
    weaponDropChance: 0.24,
    offHandDropChance: 0.18,
    iconicWeaponDropChance: 0.45,
  },
};
export const MONSTER_VARIANT_MODIFIERS = [
  {
    id: "hulking",
    label: "Kolossal",
    adjectiveStem: "kolossal",
    statChanges: { hpFlat: 4, strength: 1 },
  },
  {
    id: "brutal",
    label: "Brutal",
    adjectiveStem: "brutal",
    statChanges: { strength: 2 },
  },
  {
    id: "keen",
    label: "Präzise",
    adjectiveStem: "präzis",
    statChanges: { precision: 2 },
  },
  {
    id: "swift",
    label: "Jagend",
    adjectiveStem: "jagend",
    statChanges: { reaction: 2, aggroRadius: 1 },
  },
  {
    id: "unyielding",
    label: "Unerbittlich",
    adjectiveStem: "unerbittlich",
    statChanges: { nerves: 2, hpFlat: 2 },
  },
  {
    id: "cunning",
    label: "Listig",
    adjectiveStem: "listig",
    statChanges: { intelligence: 2, precision: 1 },
  },
];
export const ITEM_RARITY_WEIGHTS = {
  common: 70,
  uncommon: 22,
  rare: 7,
  veryRare: 1,
};
export const ITEM_RARITY_MODIFIER_COUNTS = {
  common: 0,
  uncommon: 1,
  rare: 2,
  veryRare: 3,
};

const EQUIPMENT_RARITY_ORDER = ["common", "uncommon", "rare", "veryRare"];

export const HERO_CLASS_ALIASES = {
  survivor: "filmstar",
  lead: "filmstar",
  slayer: "stuntman",
  medium: "director",
};

export const HERO_CLASS_LABEL_ALIASES = {
  Survivor: "filmstar",
  Slayer: "stuntman",
  Medium: "director",
};

export const HERO_CLASSES = {
  filmstar: {
    id: "filmstar",
    startLoadoutId: "filmstar_opening",
    label: "Filmstar",
    assetSlug: "filmstar",
    tagline: "Kämpft über Timing, Präsenz und den ersten sauberen Moment.",
    passiveName: "Triff deine Marke",
    passiveSummary: "Der erste Angriff gegen einen Gegner erhält Bonus auf Treffer und Krit.",
    passiveDescription: "Der erste Angriff gegen einen Gegner erhält +6 Trefferchance und +8% Krit-Chance.",
    maxHp: 20,
    strength: 4,
    precision: 5,
    reaction: 4,
    nerves: 3,
    intelligence: 2,
    endurance: 2,
    openingStrikeHitBonus: 6,
    openingStrikeCritBonus: 8,
  },
  stuntman: {
    id: "stuntman",
    startLoadoutId: "stuntman_kit",
    label: "Stuntman",
    assetSlug: "stuntman",
    tagline: "Geht voran, steckt Set-Gefahren weg und arbeitet stark mit Schilden.",
    passiveName: "Steckt den Fall weg",
    passiveSummary: "Erleidet weniger Schaden durch Fallen und blockt etwas sicherer mit Schilden.",
    passiveDescription: "Erhält 1 weniger Schaden durch Fallen und Gefahrenfelder sowie +5% Schild-Blockchance.",
    maxHp: 22,
    strength: 5,
    precision: 3,
    reaction: 3,
    nerves: 2,
    intelligence: 1,
    endurance: 3,
    trapDamageReduction: 1,
    shieldBlockBonus: 5,
  },
  director: {
    id: "director",
    startLoadoutId: "director_cache",
    label: "Regisseur",
    assetSlug: "regisseur",
    tagline: "Kontrolliert die Szene, liest Räume früh und reagiert sicherer auf Fallen.",
    passiveName: "Szenenblick",
    passiveSummary: "Entdeckt Fallen früher und reagiert besser auf vorbereitete Gefahren.",
    passiveDescription: "Erhält +20% auf Fallenentdeckung und +15% auf Fallenvermeidung.",
    maxHp: 17,
    strength: 2,
    precision: 4,
    reaction: 3,
    nerves: 4,
    intelligence: 5,
    endurance: 3,
    trapDetectionBonus: 20,
    trapAvoidBonus: 15,
  },
};

export function resolveHeroClassId(classId, fallback = "filmstar") {
  if (HERO_CLASSES[classId]) {
    return classId;
  }

  if (HERO_CLASS_ALIASES[classId] && HERO_CLASSES[HERO_CLASS_ALIASES[classId]]) {
    return HERO_CLASS_ALIASES[classId];
  }

  return fallback;
}

export function resolveHeroClassReference(reference, fallback = "filmstar") {
  if (typeof reference !== "string" || !reference.trim()) {
    return fallback;
  }

  const resolvedId = resolveHeroClassId(reference, "");
  if (resolvedId) {
    return resolvedId;
  }

  const byCurrentLabel = Object.values(HERO_CLASSES).find((heroClass) => heroClass.label === reference);
  if (byCurrentLabel) {
    return byCurrentLabel.id;
  }

  if (HERO_CLASS_LABEL_ALIASES[reference]) {
    return HERO_CLASS_LABEL_ALIASES[reference];
  }

  return fallback;
}

export function getHeroClassAssets(reference, fallback = "filmstar") {
  const resolvedClassId = resolveHeroClassReference(reference, fallback);
  const heroClass = HERO_CLASSES[resolvedClassId] ?? HERO_CLASSES[fallback];
  const assetSlug = heroClass?.assetSlug;

  return {
    classId: resolvedClassId,
    iconUrl: assetSlug ? `./assets/classes/class-${assetSlug}.svg` : null,
    spriteUrl: assetSlug ? `./assets/classes/sprite-${assetSlug}.svg` : null,
  };
}

export function xpForNextLevel(level) {
  return 40 + (level - 1) * 28 + Math.floor((level - 1) * (level - 1) * 6);
}

export function getLevelUpRewards(nextLevel) {
  return {
    maxHp: 3,
    strength: nextLevel % 2 === 0 ? 1 : 0,
    reaction: nextLevel % 3 === 0 ? 1 : 0,
    intelligence: nextLevel % 4 === 0 ? 1 : 0,
    nerves: nextLevel % 2 === 1 ? 1 : 0,
    precision: nextLevel % 2 === 1 ? 1 : 0,
    fullHeal: true,
  };
}

export function getUnlockedMonsterRank(floorNumber, monsterCatalog) {
  const highestRank = monsterCatalog.reduce((max, monster) => Math.max(max, monster.rank), 1);
  const unlockedRank = floorNumber === 1 ? 1 : floorNumber + 1;
  return Math.min(highestRank, unlockedRank);
}

export function getEnemyCountForFloor(floorNumber) {
  return Math.min(15, floorNumber === 1 ? 5 : 5 + Math.ceil(floorNumber * 1.05));
}

export function getEnemyScaleForFloor(floorNumber, monsterRank) {
  return Math.max(0, floorNumber - monsterRank);
}

export function getLegacySpecialMonsterSpawnChance(floorNumber) {
  const normalizedFloor = Math.max(1, Number(floorNumber) || 1);
  const growthSteps = Math.max(0, Math.floor((normalizedFloor - 1) / 3));
  return Math.min(
    LEGACY_SPECIAL_MONSTER_SPAWN_CHANCE_CAP,
    LEGACY_SPECIAL_MONSTER_SPAWN_CHANCE_BASE + growthSteps * LEGACY_SPECIAL_MONSTER_SPAWN_CHANCE_STEP,
  );
}

export function getMonsterVariantWeights(floorNumber) {
  return {
    normal: 100,
    elite: floorNumber >= 8 ? 16 : floorNumber >= 5 ? 12 : floorNumber >= 3 ? 8 : 5,
    dire: floorNumber >= 9 ? 4 : floorNumber >= 6 ? 3 : floorNumber >= 4 ? 2 : 1,
  };
}

export function getHealingConsumableCountForFloor(floorNumber) {
  return 2 + Math.floor(floorNumber / 2);
}

export function shouldSpawnFloorWeapon(floorNumber, roll = defaultRandomChance()) {
  if (floorNumber === 1) {
    return roll < 0.55;
  }

  return floorNumber >= 2 && roll < FLOOR_WEAPON_SPAWN_CHANCE;
}

export function shouldSpawnFloorShield(floorNumber, roll = defaultRandomChance()) {
  if (floorNumber === 1) {
    return roll < 0.18;
  }

  if (floorNumber === 2) {
    return roll < 0.35;
  }

  return floorNumber >= 5 && roll < 0.08;
}

export function shouldSpawnChest(floorNumber, roll = defaultRandomChance()) {
  return roll < Math.min(0.55, 0.2 + floorNumber * 0.06);
}

export function getChestCountForFloor(floorNumber, roll = defaultRandomChance()) {
  return floorNumber >= 4 && roll < 0.35 ? 2 : 1;
}

export function getLockedDoorCountForFloor(floorNumber, roll = defaultRandomChance()) {
  if (floorNumber < 3) {
    return 0;
  }

  if (floorNumber >= 8) {
    if (roll < 0.18) {
      return 3;
    }
    if (roll < 0.62) {
      return 2;
    }
    return roll < 0.95 ? 1 : 0;
  }

  if (floorNumber >= 5) {
    if (roll < 0.1) {
      return 3;
    }
    if (roll < 0.48) {
      return 2;
    }
    return roll < 0.9 ? 1 : 0;
  }

  if (roll < 0.22) {
    return 2;
  }

  return roll < 0.8 ? 1 : 0;
}

export function shouldPlaceLockedRoomChest(roll = defaultRandomChance()) {
  return roll < 0.8;
}

export function getMaxEquipmentRarity(dropContext = {}) {
  const floorNumber = Math.max(1, dropContext.floorNumber ?? 1);

  if (floorNumber <= 1) {
    return "uncommon";
  }

  if (floorNumber <= 3) {
    return "rare";
  }

  return "veryRare";
}

export function applyRarityCap(weights, maxRarity = "veryRare") {
  const maxIndex = EQUIPMENT_RARITY_ORDER.indexOf(maxRarity);
  if (maxIndex === -1) {
    return { ...weights };
  }

  const cappedWeights = { ...weights };
  EQUIPMENT_RARITY_ORDER.forEach((rarity, index) => {
    if (index > maxIndex) {
      cappedWeights[rarity] = 0;
    }
  });
  return cappedWeights;
}

export function getEquipmentRarityWeights(dropContext = {}) {
  const weights = { ...ITEM_RARITY_WEIGHTS };
  const floorNumber = dropContext.floorNumber ?? 1;
  const dropSourceTag = dropContext.dropSourceTag ?? "";

  if (floorNumber >= 4) {
    weights.common -= 6;
    weights.uncommon += 4;
    weights.rare += 2;
  }

  if (floorNumber >= 7) {
    weights.common -= 6;
    weights.uncommon += 3;
    weights.rare += 2;
    weights.veryRare += 1;
  }

  if (dropSourceTag === "chest") {
    weights.common -= 4;
    weights.uncommon += 2;
    weights.rare += 1;
    weights.veryRare += 1;
  }

  if (dropSourceTag === "locked-room-chest") {
    weights.common -= 18;
    weights.uncommon += 10;
    weights.rare += 6;
    weights.veryRare += 2;
  }

  if (dropSourceTag.startsWith("monster:")) {
    weights.common += 4;
    weights.uncommon -= 2;
    weights.rare -= 1;
    weights.veryRare -= 1;
  }

  if (dropSourceTag.endsWith(":elite")) {
    weights.common -= 6;
    weights.uncommon += 4;
    weights.rare += 2;
  }

  if (dropSourceTag.endsWith(":dire")) {
    weights.common -= 10;
    weights.uncommon += 5;
    weights.rare += 3;
    weights.veryRare += 2;
  }

  for (const key of Object.keys(weights)) {
    weights[key] = Math.max(0, weights[key]);
  }

  const cappedWeights = applyRarityCap(weights, getMaxEquipmentRarity(dropContext));
  for (const key of Object.keys(cappedWeights)) {
    cappedWeights[key] = Math.max(0, cappedWeights[key]);
  }

  const total = Object.values(cappedWeights).reduce((sum, value) => sum + value, 0);
  if (total <= 0) {
    return applyRarityCap({ ...ITEM_RARITY_WEIGHTS }, getMaxEquipmentRarity(dropContext));
  }

  return cappedWeights;
}
