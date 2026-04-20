export const DEBUG_ADVANCE_SPEED_PRESETS = Object.freeze([
  { value: 0, delayMs: 0, label: 'Sofort' },
  { value: 1, delayMs: 16, label: 'Sehr schnell' },
  { value: 2, delayMs: 40, label: 'Schnell' },
  { value: 3, delayMs: 90, label: 'Mittel' },
  { value: 4, delayMs: 160, label: 'Langsam' },
]);

export const DEFAULT_DEBUG_ADVANCE_SPEED = 2;

export function normalizeDebugAdvanceSpeed(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return DEFAULT_DEBUG_ADVANCE_SPEED;
  }

  const rounded = Math.round(numeric);
  return Math.max(
    DEBUG_ADVANCE_SPEED_PRESETS[0].value,
    Math.min(DEBUG_ADVANCE_SPEED_PRESETS[DEBUG_ADVANCE_SPEED_PRESETS.length - 1].value, rounded),
  );
}

export function getDebugAdvanceSpeedPreset(value) {
  const normalized = normalizeDebugAdvanceSpeed(value);
  return DEBUG_ADVANCE_SPEED_PRESETS.find((entry) => entry.value === normalized)
    ?? DEBUG_ADVANCE_SPEED_PRESETS[DEFAULT_DEBUG_ADVANCE_SPEED];
}

export function getDebugAdvanceDelayMs(value) {
  return getDebugAdvanceSpeedPreset(value).delayMs;
}

export function getDebugAdvanceSpeedLabel(value) {
  return getDebugAdvanceSpeedPreset(value).label;
}
