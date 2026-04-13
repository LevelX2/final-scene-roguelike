export const RARITY_LABELS = {
  common: "Gewöhnlich",
  uncommon: "Ungewöhnlich",
  rare: "Selten",
  veryRare: "Sehr selten",
};

export const WEAPON_MODIFIER_DEFS = [
  { id: "brutal", allowedItemTypes: ["weapon"], weight: 14, affix: "Brutal", summary: "+1 Schaden", statChanges: { damageAdd: 1 }, exclusiveGroup: "weapon-power" },
  { id: "fast", allowedItemTypes: ["weapon"], weight: 12, affix: "Schnell", summary: "+1 Treffer, +1 Krit", statChanges: { hitBonusAdd: 1, critBonusAdd: 1 } },
  { id: "precise", allowedItemTypes: ["weapon"], weight: 12, affix: "Präzise", summary: "+2 Treffer", statChanges: { hitBonusAdd: 2 }, exclusiveGroup: "weapon-accuracy" },
  { id: "bleeding", allowedItemTypes: ["weapon"], weight: 10, affix: "Blutig", summary: "+1 Schaden, +1 Krit", statChanges: { damageAdd: 1, critBonusAdd: 1 } },
  { id: "staggering", allowedItemTypes: ["weapon"], weight: 9, affix: "Taumel", summary: "+1 Schaden, +1 Treffer", statChanges: { damageAdd: 1, hitBonusAdd: 1 } },
  { id: "final", allowedItemTypes: ["weapon"], weight: 7, affix: "Final", summary: "Bonus bei wenig Leben", tags: ["final-strike"], statChanges: { critBonusAdd: 1 } },
  { id: "cursed", allowedItemTypes: ["weapon"], weight: 5, affix: "Verflucht", summary: "+2 Schaden, -1 Treffer", statChanges: { damageAdd: 2, hitBonusAdd: -1, critBonusAdd: 1 }, exclusiveGroup: "curse" },
  { id: "nerving", allowedItemTypes: ["weapon"], weight: 7, affix: "Nerven", summary: "+1 Treffer, +1 Krit", statChanges: { hitBonusAdd: 1, critBonusAdd: 1 } },
];

export const SHIELD_MODIFIER_DEFS = [
  { id: "sturdy", allowedItemTypes: ["shield"], weight: 16, affix: "Standhaft", summary: "+1 Blockwert", statChanges: { blockValueAdd: 1 }, exclusiveGroup: "shield-core" },
  { id: "reflective", allowedItemTypes: ["shield"], weight: 9, affix: "Reflex", summary: "+4 Block, wirft bei Block 1 Schaden zurück", tags: ["reflective"], statChanges: { blockChanceAdd: 4 } },
  { id: "calming", allowedItemTypes: ["shield"], weight: 10, affix: "Beruhigt", summary: "+3 Block, +1 Blockwert", statChanges: { blockChanceAdd: 3, blockValueAdd: 1 } },
  { id: "reactive", allowedItemTypes: ["shield"], weight: 10, affix: "Reaktiv", summary: "+5 Blockchance", statChanges: { blockChanceAdd: 5 }, exclusiveGroup: "shield-core" },
  { id: "fortified", allowedItemTypes: ["shield"], weight: 8, affix: "Befestigt", summary: "+2 Blockchance, +2 Blockwert", statChanges: { blockChanceAdd: 2, blockValueAdd: 2 }, exclusiveGroup: "shield-core" },
  { id: "cursedGuard", allowedItemTypes: ["shield"], weight: 4, affix: "Verflucht", summary: "+6 Blockchance, +2 Blockwert", statChanges: { blockChanceAdd: 6, blockValueAdd: 2 }, exclusiveGroup: "curse" },
];
