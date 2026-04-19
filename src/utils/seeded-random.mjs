const UINT32_MAX = 0x100000000;

export function normalizeSeed(value, fallback = 1) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback >>> 0;
  }

  const normalized = Math.abs(Math.trunc(numeric)) >>> 0;
  return normalized === 0 ? (fallback >>> 0) : normalized;
}

export function createSeededRandomApi(seed) {
  let state = normalizeSeed(seed, 1);

  function randomChance() {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / UINT32_MAX;
  }

  function randomInt(min, max) {
    return Math.floor(randomChance() * (max - min + 1)) + min;
  }

  return {
    seed: state,
    randomChance,
    randomInt,
  };
}

export function mixSeed(...parts) {
  let hash = 2166136261;

  parts.forEach((part) => {
    const text = String(part ?? "");
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619) >>> 0;
    }
    hash ^= 124;
    hash = Math.imul(hash, 16777619) >>> 0;
  });

  return normalizeSeed(hash, 1);
}

export function deriveStudioGenerationSeed(runSeed, floorNumber) {
  return mixSeed("studio-layout", normalizeSeed(runSeed, 1), Math.max(1, Number(floorNumber) || 1));
}
