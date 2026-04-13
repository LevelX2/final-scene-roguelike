export const STUDIO_ARCHETYPES = [
  {
    id: "slasher",
    label: "Slasher / Horrorfilm",
    shortLabel: "Slasher",
    containerName: "Werkzeugtruhe",
    containerAssetId: "toolbox",
    entryAnnouncement: "Sie betreten das Studio des Slasherfilms. Hier wartet hinter jeder Kulisse der Moment, in dem das Kreischen den Takt vorgibt.",
  },
  {
    id: "adventure",
    label: "Abenteuer-Serial / Schatzjägerfilm",
    shortLabel: "Abenteuerfilm",
    containerName: "Relikttruhe",
    containerAssetId: "relic-chest",
    entryAnnouncement: "Sie betreten das Studio des Abenteuerfilms. Zwischen Staub, Fallen und alten Mythen gewinnt nur, wer Neugier mit Vorsicht verwechselt.",
  },
  {
    id: "space_opera",
    label: "Space Opera / Sci-Fi-Abenteuer",
    shortLabel: "Science-Fiction",
    containerName: "Frachtkapsel",
    containerAssetId: "cargo-pod",
    entryAnnouncement: "Sie betreten das Studio der Space Opera. Hier klingt selbst Stille nach Sternenkrieg, und jede Entscheidung hallt wie ein Funkspruch ins All.",
  },
  {
    id: "fantasy",
    label: "Fantasy / Märchen / Sword-&-Sorcery",
    shortLabel: "Fantasy",
    containerName: "Runentruhe",
    containerAssetId: "rune-chest",
    entryAnnouncement: "Sie betreten das Studio der Fantasy. Alte Eide, kalter Stahl und Magie teilen sich hier dieselbe Luft.",
  },
  {
    id: "creature_feature",
    label: "Monster-/Creature-Feature / Labor-B-Movie",
    shortLabel: "Monsterfilm",
    containerName: "Probenbehälter",
    containerAssetId: "sample-container",
    entryAnnouncement: "Sie betreten das Studio des Creature Features. Glas, Kabel und schlechte Entscheidungen haben hier schon Schlimmeres hervorgebracht als Albträume.",
  },
  {
    id: "noir",
    label: "Noir / Detektivfilm",
    shortLabel: "Noir",
    containerName: "Asservatenkiste",
    containerAssetId: "evidence-case",
    entryAnnouncement: "Sie betreten das Studio des Film Noir. Rauch, Schatten und halbe Wahrheiten liegen hier dichter in der Luft als Staub.",
  },
  {
    id: "romcom",
    label: "Rom-Com / Beziehungsfilm",
    shortLabel: "Liebeskomödie",
    containerName: "Andenkenbox",
    containerAssetId: "keepsake-box",
    entryAnnouncement: "Sie betreten das Studio der Rom-Com. Hinter Charme und Pastell lauern hier Missverständnisse mit erstaunlich scharfen Kanten.",
  },
  {
    id: "social_drama",
    label: "Sozialdrama / Alltagsrealismus",
    shortLabel: "Sozialdrama",
    containerName: "Werkzeugkasten",
    containerAssetId: "work-case",
    entryAnnouncement: "Sie betreten das Studio des Sozialdramas. Jeder Raum wirkt vertraut, und genau darin liegt seine besondere Härte.",
  },
  {
    id: "action",
    label: "Action / Polizeifilm / Militärthriller",
    shortLabel: "Actionfilm",
    containerName: "Einsatzkiste",
    containerAssetId: "tactical-crate",
    entryAnnouncement: "Sie betreten das Studio des Actionfilms. Hier antwortet die Welt auf Zögern meist mit Druckwellen und Splittern.",
  },
  {
    id: "western",
    label: "Western",
    shortLabel: "Western",
    containerName: "Sattelkiste",
    containerAssetId: "saddle-chest",
    entryAnnouncement: "Sie betreten das Studio des Westerns. Staub, Distanz und sturer Wille entscheiden hier schneller als jedes Gesetz.",
  },
];

export const STUDIO_ARCHETYPE_LABELS = Object.fromEntries(
  STUDIO_ARCHETYPES.map((entry) => [entry.id, entry.shortLabel]),
);

export const STUDIO_ARCHETYPE_IDS = STUDIO_ARCHETYPES.map((entry) => entry.id);

export const STUDIO_ARCHETYPE_INDEX = Object.fromEntries(
  STUDIO_ARCHETYPES.map((entry, index) => [entry.id, index]),
);

export function getStudioArchetype(archetypeId) {
  return STUDIO_ARCHETYPES.find((entry) => entry.id === archetypeId) ?? null;
}

export function buildStudioAnnouncementText(floorNumber, archetypeId) {
  const archetype = getStudioArchetype(archetypeId);
  if (!archetype?.entryAnnouncement) {
    return "Sie betreten ein neues Filmstudio.";
  }
  return archetype.entryAnnouncement;
}

export function shuffleStudioArchetypeSequence(randomInt) {
  const sequence = [...STUDIO_ARCHETYPE_IDS];
  for (let index = sequence.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(0, index);
    [sequence[index], sequence[swapIndex]] = [sequence[swapIndex], sequence[index]];
  }
  return sequence;
}

export function getStudioCycleIndex(floorNumber) {
  return Math.max(0, Math.floor((Math.max(1, floorNumber) - 1) / STUDIO_ARCHETYPE_IDS.length));
}

export function getStudioSlotIndex(floorNumber) {
  return (Math.max(1, floorNumber) - 1) % STUDIO_ARCHETYPE_IDS.length;
}

export function getArchetypeForFloor(sequence, floorNumber) {
  const resolvedSequence = Array.isArray(sequence) && sequence.length > 0
    ? sequence
    : STUDIO_ARCHETYPE_IDS;
  return resolvedSequence[getStudioSlotIndex(floorNumber) % resolvedSequence.length] ?? resolvedSequence[0];
}

export function buildNeighborArchetypeOptions(sequence, floorNumber) {
  const resolvedSequence = Array.isArray(sequence) && sequence.length > 0
    ? sequence
    : STUDIO_ARCHETYPE_IDS;
  const centerIndex = getStudioSlotIndex(floorNumber) % resolvedSequence.length;
  const offsets = [
    { distance: 0, archetypeId: resolvedSequence[centerIndex] },
    { distance: 1, archetypeId: resolvedSequence[(centerIndex - 1 + resolvedSequence.length) % resolvedSequence.length] },
    { distance: 1, archetypeId: resolvedSequence[(centerIndex + 1) % resolvedSequence.length] },
    { distance: 2, archetypeId: resolvedSequence[(centerIndex - 2 + resolvedSequence.length) % resolvedSequence.length] },
    { distance: 2, archetypeId: resolvedSequence[(centerIndex + 2) % resolvedSequence.length] },
  ];

  const deduped = [];
  const seen = new Set();
  for (const entry of offsets) {
    const key = `${entry.distance}:${entry.archetypeId}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(entry);
  }

  return deduped;
}

export function getContainerConfigForArchetype(archetypeId) {
  const archetype = getStudioArchetype(archetypeId);
  return {
    name: archetype?.containerName ?? "Requisitenkiste",
    assetId: archetype?.containerAssetId ?? "requisite-crate",
  };
}
