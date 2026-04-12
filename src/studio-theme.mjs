export const STUDIO_ARCHETYPE_LABELS = {
  slasher: "Slasher",
  adventure: "Abenteuerfilm",
  space_opera: "Science-Fiction",
  noir: "Noir",
  romcom: "Liebeskomödie",
  social_drama: "Sozialdrama",
  action: "Actionfilm",
  western: "Western",
  fantasy: "Fantasy",
  creature_feature: "Monsterfilm",
};

export const STUDIO_ARCHETYPE_IDS = Object.keys(STUDIO_ARCHETYPE_LABELS);

export function rollStudioArchetypeId(randomInt) {
  return STUDIO_ARCHETYPE_IDS[randomInt(0, STUDIO_ARCHETYPE_IDS.length - 1)];
}

export function getStudioArchetypeLabel(archetypeId) {
  return STUDIO_ARCHETYPE_LABELS[archetypeId] ?? null;
}

export function formatStudioLabel(studioNumber) {
  return `Studio ${studioNumber}`;
}

export function formatArchetypeLabel(archetypeId) {
  const label = getStudioArchetypeLabel(archetypeId);
  return label ? `Archetyp: ${label}` : "Archetyp: Unbekannt";
}

export function formatStudioWithArchetype(studioNumber, archetypeId) {
  const label = getStudioArchetypeLabel(archetypeId);
  return label
    ? `${formatStudioLabel(studioNumber)} - ${label}`
    : formatStudioLabel(studioNumber);
}
