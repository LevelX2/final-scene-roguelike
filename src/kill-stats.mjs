function sanitizeCount(value) {
  return Math.max(0, Number(value) || 0);
}

function buildKillStatKey(monsterId, baseName, variantTier) {
  const idPart = String(monsterId ?? baseName ?? 'unknown').trim() || 'unknown';
  const tierPart = String(variantTier ?? 'normal').trim() || 'normal';
  return `${idPart}::${tierPart}`;
}

export function formatKillStatLabel(entry) {
  if (!entry || typeof entry !== 'object') {
    return 'Unbekannt';
  }

  const baseName = entry.baseName ?? entry.name ?? 'Unbekannt';
  const variantTier = entry.variantTier ?? null;
  const variantLabel = entry.variantLabel ?? null;
  if (!variantTier || variantTier === 'normal' || !variantLabel) {
    return baseName;
  }

  return `${baseName} (${variantLabel})`;
}

export function normalizeKillStats(rawKillStats) {
  if (!rawKillStats || typeof rawKillStats !== 'object') {
    return {};
  }

  return Object.entries(rawKillStats).reduce((normalized, [legacyKey, rawEntry]) => {
    if (typeof rawEntry === 'number') {
      const count = sanitizeCount(rawEntry);
      if (count > 0) {
        normalized[legacyKey] = {
          key: legacyKey,
          monsterId: null,
          baseName: legacyKey,
          variantTier: null,
          variantLabel: null,
          count,
        };
      }
      return normalized;
    }

    if (!rawEntry || typeof rawEntry !== 'object') {
      return normalized;
    }

    const count = sanitizeCount(rawEntry.count);
    if (count <= 0) {
      return normalized;
    }

    const baseName = String(rawEntry.baseName ?? rawEntry.name ?? legacyKey).trim() || legacyKey;
    const variantTier = rawEntry.variantTier == null ? null : String(rawEntry.variantTier).trim() || null;
    const variantLabel = rawEntry.variantLabel == null ? null : String(rawEntry.variantLabel).trim() || null;
    const monsterId = rawEntry.monsterId == null ? null : String(rawEntry.monsterId).trim() || null;
    const key = String(rawEntry.key ?? buildKillStatKey(monsterId, baseName, variantTier ?? 'normal')).trim() || legacyKey;

    normalized[key] = {
      key,
      monsterId,
      baseName,
      variantTier,
      variantLabel,
      count,
    };
    return normalized;
  }, {});
}

export function recordKillStat(killStats, actor) {
  const normalized = normalizeKillStats(killStats);
  const baseName = String(actor?.baseName ?? actor?.name ?? 'Unbekannt').trim() || 'Unbekannt';
  const variantTier = String(actor?.variantTier ?? 'normal').trim() || 'normal';
  const variantLabel = String(actor?.variantLabel ?? (variantTier === 'normal' ? 'Normal' : variantTier)).trim() || null;
  const monsterId = actor?.id ?? null;
  const key = buildKillStatKey(monsterId, baseName, variantTier);
  const previous = normalized[key];

  normalized[key] = {
    key,
    monsterId,
    baseName,
    variantTier,
    variantLabel,
    count: sanitizeCount(previous?.count) + 1,
  };
  return normalized;
}

export function getKillStatEntries(killStats) {
  return Object.values(normalizeKillStats(killStats))
    .sort((left, right) =>
      right.count - left.count ||
      formatKillStatLabel(left).localeCompare(formatKillStatLabel(right), 'de')
    );
}
