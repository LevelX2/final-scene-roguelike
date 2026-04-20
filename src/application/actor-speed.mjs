export const NORMAL_SPEED_INTERVAL = 100;

const SPEED_CATEGORIES = Object.freeze([
  Object.freeze({ max: 80, label: 'Sehr schnell' }),
  Object.freeze({ max: 95, label: 'Schnell' }),
  Object.freeze({ max: 104, label: 'Normal' }),
  Object.freeze({ max: 120, label: 'Langsam' }),
  Object.freeze({ max: Number.POSITIVE_INFINITY, label: 'Sehr langsam' }),
]);

function toRoundedNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.round(numeric) : null;
}

export function normalizeSpeedIntervalValue(value, fallback = NORMAL_SPEED_INTERVAL) {
  const normalized = toRoundedNumber(value);
  if (!Number.isFinite(normalized)) {
    return fallback;
  }

  return Math.max(1, normalized);
}

export function formatSignedPercent(value) {
  const normalized = toRoundedNumber(value) ?? 0;
  if (normalized > 0) {
    return `+${normalized} %`;
  }
  if (normalized < 0) {
    return `-${Math.abs(normalized)} %`;
  }
  return '0 %';
}

export function getSpeedCategoryLabel(intervalValue) {
  const normalized = normalizeSpeedIntervalValue(intervalValue);
  return SPEED_CATEGORIES.find((entry) => normalized <= entry.max)?.label ?? 'Normal';
}

function normalizeModifierEntry(entry) {
  const value = toRoundedNumber(entry?.value) ?? 0;
  if (value === 0) {
    return null;
  }

  return {
    label: String(entry?.label ?? '').trim() || 'Temporärer Effekt',
    value,
  };
}

export function getActorSpeedModifierEntries(actor) {
  const labeledEntries = Array.isArray(actor?.speedIntervalModifiers)
    ? actor.speedIntervalModifiers
      .map((entry) => {
        const numericValue = toRoundedNumber(entry?.value);
        if (!numericValue) {
          return null;
        }

        return {
          label: String(entry?.label ?? '').trim() || 'Temporärer Effekt',
          value: numericValue,
        };
      })
      .filter(Boolean)
    : [];

  const fallbackModifier = toRoundedNumber(actor?.speedIntervalModifier) ?? 0;
  if (fallbackModifier !== 0) {
    const fallbackEntry = normalizeModifierEntry({
      label: actor?.speedIntervalModifierLabel ?? 'Temporärer Effekt',
      value: fallbackModifier,
    });
    if (fallbackEntry) {
      labeledEntries.push(fallbackEntry);
    }
  }

  return labeledEntries;
}

export function getActorSpeedState(actor) {
  const baseValue = normalizeSpeedIntervalValue(actor?.baseSpeed, NORMAL_SPEED_INTERVAL);
  const modifierEntries = getActorSpeedModifierEntries(actor);
  const totalModifier = modifierEntries.reduce((sum, entry) => sum + entry.value, 0);
  const currentValue = normalizeSpeedIntervalValue(baseValue + totalModifier, baseValue);
  const baseDisplayPercent = NORMAL_SPEED_INTERVAL - baseValue;
  const displayPercent = NORMAL_SPEED_INTERVAL - currentValue;
  const category = getSpeedCategoryLabel(currentValue);
  const baseCategory = getSpeedCategoryLabel(baseValue);

  return {
    baseValue,
    currentValue,
    totalModifier,
    baseDisplayPercent,
    displayPercent,
    category,
    baseCategory,
    summaryLabel: `${category} (${formatSignedPercent(displayPercent)})`,
    baseLabel: `${baseCategory} (${formatSignedPercent(baseDisplayPercent)})`,
    currentLabel: `${category} (${formatSignedPercent(displayPercent)})`,
    isModified: baseValue !== currentValue,
    modifierEntries: modifierEntries.map((entry) => ({
      ...entry,
      displayPercent: -entry.value,
      summaryLabel: `${entry.label} ${formatSignedPercent(-entry.value)}`,
    })),
    modifierLabel: modifierEntries.length > 0
      ? modifierEntries
        .map((entry) => `${entry.label} ${formatSignedPercent(-entry.value)}`)
        .join(', ')
      : '',
  };
}
