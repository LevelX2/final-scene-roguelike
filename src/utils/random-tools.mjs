export function defaultRandomChance() {
  return Math.random();
}

export function weightedPick(entries, randomChance = defaultRandomChance, weightKey = 'weight') {
  const totalWeight = entries.reduce((sum, entry) => sum + (entry?.[weightKey] ?? 0), 0);
  if (totalWeight <= 0) {
    return entries[entries.length - 1] ?? null;
  }

  let roll = randomChance() * totalWeight;
  for (const entry of entries) {
    roll -= entry?.[weightKey] ?? 0;
    if (roll <= 0) {
      return entry;
    }
  }

  return entries[entries.length - 1] ?? null;
}

export function weightedPickFromMap(weights, randomChance = defaultRandomChance) {
  return weightedPick(
    Object.entries(weights).map(([value, weight]) => ({ value, weight })),
    randomChance,
  );
}

export function shuffleList(values, randomChance = defaultRandomChance) {
  const nextValues = [...values];
  for (let index = nextValues.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(randomChance() * (index + 1));
    [nextValues[index], nextValues[swapIndex]] = [nextValues[swapIndex], nextValues[index]];
  }
  return nextValues;
}
