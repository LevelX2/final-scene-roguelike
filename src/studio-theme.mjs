import {
  STUDIO_ARCHETYPE_IDS,
  STUDIO_ARCHETYPE_LABELS,
  buildStudioAnnouncementText,
  getStudioArchetype,
  shuffleStudioArchetypeSequence,
  getArchetypeForFloor,
  getStudioCycleIndex,
} from './content/catalogs/studio-archetypes.mjs';

export { STUDIO_ARCHETYPE_IDS, STUDIO_ARCHETYPE_LABELS, getArchetypeForFloor, getStudioCycleIndex };

export function rollStudioArchetypeId(randomInt) {
  return STUDIO_ARCHETYPE_IDS[randomInt(0, STUDIO_ARCHETYPE_IDS.length - 1)];
}

export function createRunArchetypeSequence(randomInt) {
  return shuffleStudioArchetypeSequence(randomInt);
}

export function getStudioArchetypeLabel(archetypeId) {
  return getStudioArchetype(archetypeId)?.shortLabel ?? null;
}

export function formatStudioLabel(studioNumber) {
  return `Studio ${studioNumber}`;
}

export function formatArchetypeLabel(archetypeId) {
  const label = getStudioArchetypeLabel(archetypeId);
  return label ? `Archetyp: ${label}` : 'Archetyp: Unbekannt';
}

export function formatStudioWithArchetype(studioNumber, archetypeId) {
  const label = getStudioArchetypeLabel(archetypeId);
  return label
    ? `${formatStudioLabel(studioNumber)} - ${label}`
    : formatStudioLabel(studioNumber);
}

export function buildStudioAnnouncement(studioNumber, archetypeId) {
  return buildStudioAnnouncementText(studioNumber, archetypeId);
}
