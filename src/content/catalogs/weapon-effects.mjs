const DECADE_DANGER_SUFFIXES = [
  "",
  "der Hölle",
  "des Abgrunds",
  "des Untergangs",
  "der Verdammnis",
  "der Katastrophe",
  "des schwarzen Finales",
  "der letzten Nacht",
  "des Fegefeuers",
  "des Weltbrands",
  "der Endzeit",
  "der Knochenhalle",
  "des Schreckensarchivs",
  "der dunklen Krone",
  "des Blutmonds",
  "der Aschekammer",
  "des Grablichts",
  "der Ewignacht",
  "des Totentanzes",
  "der letzten Pforte",
];

export const WEAPON_EFFECT_DEFS = {
  bleed: {
    id: "bleed",
    label: "Blutung",
    pool: "standard",
    trigger: "hit",
    baseChance: 22,
    durationByTier: [2, 3, 4],
    dotDamageByTier: [1, 2, 3],
    namePool: {
      prefix: ["Gezackt", "Blutig", "Rissig"],
      suffix: ["des ersten Schnitts", "des Nachblutens", "der roten Spur"],
    },
  },
  poison: {
    id: "poison",
    label: "Gift",
    pool: "standard",
    trigger: "hit",
    baseChance: 20,
    durationByTier: [2, 3, 4],
    dotDamageByTier: [1, 1, 2],
    namePool: {
      prefix: ["Toxisch", "Verdorben", "Säuregrün"],
      suffix: ["der grünen Kammer", "des Serums", "des bitteren Nachspiels"],
    },
  },
  precision_malus: {
    id: "precision_malus",
    label: "Präzisionsmalus",
    pool: "standard",
    trigger: "hit",
    baseChance: 24,
    durationByTier: [2, 3, 4],
    penaltyByTier: [1, 2, 3],
    namePool: {
      prefix: ["Blendend", "Ablenkend", "Störend"],
      suffix: ["des Flimmerns", "der Unschärfe", "des schiefen Blicks"],
    },
  },
  reaction_malus: {
    id: "reaction_malus",
    label: "Reaktionsmalus",
    pool: "standard",
    trigger: "hit",
    baseChance: 20,
    durationByTier: [2, 3, 4],
    penaltyByTier: [1, 2, 3],
    namePool: {
      prefix: ["Dröhnend", "Schwerfällig", "Störfrequent"],
      suffix: ["des Stroms", "des Taumels", "der späten Antwort"],
    },
  },
  light_bonus: {
    id: "light_bonus",
    label: "Lichtbonus",
    pool: "standard",
    trigger: "passive",
    valueByTier: [1, 2, 3],
    namePool: {
      prefix: ["Leuchtend", "Strahlend", "Projektiv"],
      suffix: ["der Flamme", "des Projektors", "der Scheinwerfer"],
    },
  },
  crit_bonus: {
    id: "crit_bonus",
    label: "Krit-Bonus",
    pool: "standard",
    trigger: "passive",
    valueByTier: [1, 2, 3],
    namePool: {
      prefix: ["Präzise", "Tödlich", "Final"],
      suffix: ["der letzten Einstellung", "des perfekten Treffers", "des sauberen Schnitts"],
    },
  },
  stun: {
    id: "stun",
    label: "Betäubung",
    pool: "highImpact",
    trigger: "hit",
    baseChance: 12,
    durationByTier: [1, 1, 2],
    namePool: {
      prefix: ["Schockend", "Betäubend", "Stromgeladen"],
      suffix: ["des Stroms", "des Knockouts", "des Aussetzers"],
    },
  },
  root: {
    id: "root",
    label: "Gefesselt",
    pool: "highImpact",
    trigger: "hit",
    baseChance: 14,
    durationByTier: [1, 2, 3],
    namePool: {
      prefix: ["Bindend", "Fangend", "Wickelnd"],
      suffix: ["des Drahts", "der Fessel", "des Lassos"],
    },
  },
};

export const STANDARD_EFFECT_IDS = Object.values(WEAPON_EFFECT_DEFS)
  .filter((entry) => entry.pool === "standard")
  .map((entry) => entry.id);

export const HIGH_IMPACT_EFFECT_IDS = Object.values(WEAPON_EFFECT_DEFS)
  .filter((entry) => entry.pool === "highImpact")
  .map((entry) => entry.id);

const WEAPON_EFFECT_CATEGORIES = Object.freeze({
  bleed: "dot",
  poison: "dot",
  precision_malus: "debuff",
  reaction_malus: "debuff",
  light_bonus: "passive",
  crit_bonus: "passive",
  stun: "control",
  root: "control",
});

function resolveEffectType(effectOrType) {
  return typeof effectOrType === "string" ? effectOrType : effectOrType?.type ?? null;
}

export function getWeaponEffectDefinition(effectType) {
  return WEAPON_EFFECT_DEFS[effectType] ?? null;
}

export function getWeaponEffectCategory(effectOrType) {
  const effectType = resolveEffectType(effectOrType);
  return effectType ? WEAPON_EFFECT_CATEGORIES[effectType] ?? "unknown" : "unknown";
}

export function isPassiveWeaponEffect(effectOrType) {
  return getWeaponEffectCategory(effectOrType) === "passive";
}

export function isOnHitWeaponEffect(effectOrType) {
  const effectType = resolveEffectType(effectOrType);
  const definition = effectType ? getWeaponEffectDefinition(effectType) : null;
  return definition?.trigger === "hit";
}

export function getWeaponEffectIdsByCategory(category) {
  return Object.keys(WEAPON_EFFECT_CATEGORIES).filter((effectType) => WEAPON_EFFECT_CATEGORIES[effectType] === category);
}

export function getProcBonusForFloor(floorNumber) {
  const slot = ((Math.max(1, floorNumber) - 1) % 10) + 1;
  if (slot <= 2) {
    return 0;
  }
  if (slot <= 4) {
    return 2;
  }
  if (slot <= 6) {
    return 4;
  }
  if (slot <= 8) {
    return 6;
  }
  return 8;
}

export function getDecadePrefix(decadeIndex) {
  return DECADE_DANGER_SUFFIXES[decadeIndex] ?? `der Dekade ${decadeIndex + 1}`;
}

export function getEffectNameParts(effectType) {
  return getWeaponEffectDefinition(effectType)?.namePool ?? { prefix: [], suffix: [] };
}

export function getEffectStateLabel(effectType) {
  switch (effectType) {
    case "poison":
      return "Vergiftet";
    case "bleed":
      return "Blutend";
    case "precision_malus":
      return "Geblendet";
    case "reaction_malus":
      return "Benommen";
    case "stun":
      return "Betäubt";
    case "root":
      return "Gefesselt";
    case "healing_over_time":
      return "Regeneration";
    default:
      return getWeaponEffectDefinition(effectType)?.label ?? effectType;
  }
}

export function getEffectSummary(effect) {
  const definition = getWeaponEffectDefinition(effect?.type);
  if (!definition) {
    return null;
  }

  if (definition.trigger === "passive") {
    if (effect.type === "light_bonus") {
      return `+${effect.value ?? 0} Sichtweite`;
    }
    if (effect.type === "crit_bonus") {
      return `+${effect.value ?? 0} Krit`;
    }
  }

  if (effect.type === "bleed" || effect.type === "poison") {
    return `${definition.label} ${effect.procChance}% (${effect.duration} Züge)`;
  }

  return `${definition.label} ${effect.procChance}%`;
}
