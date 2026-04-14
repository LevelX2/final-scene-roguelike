export const NUTRITION_MAX_BASE = 700;
export const NUTRITION_START_BASE = 501;
export const ENDURANCE_NUTRITION_BONUS_PER_POINT = 100;
export const NUTRITION_COST_PER_ACTION = 1;
export const DAMAGE_PER_ACTION_WHILE_DYING = 1;

export const HUNGER_STATE = {
  SATED: "SATED",
  NORMAL: "NORMAL",
  HUNGRY: "HUNGRY",
  STARVING: "STARVING",
  DYING: "DYING",
};

export const HUNGER_THRESHOLDS = {
  sated: 0.8,
  normal: 0.55,
  hungry: 0.3,
  starving: 0.1,
};

export const FOOD_SATIETY_ESTIMATES = [
  { max: 20, label: "Stillt kaum." },
  { max: 45, label: "Stillt wenig." },
  { max: 90, label: "Macht ordentlich satt." },
  { max: 140, label: "Stillt stark." },
  { max: Number.POSITIVE_INFINITY, label: "Ist eine schwere Mahlzeit." },
];

export function getNutritionMax(player) {
  return NUTRITION_MAX_BASE + (player.endurance ?? 0) * ENDURANCE_NUTRITION_BONUS_PER_POINT;
}

export function getNutritionStart(player) {
  return NUTRITION_START_BASE + (player.endurance ?? 0) * ENDURANCE_NUTRITION_BONUS_PER_POINT;
}

export function clampNutritionValue(value, player) {
  return Math.max(0, Math.min(getNutritionMax(player), value));
}

export function getHungerState(player) {
  const nutritionMax = Math.max(1, player.nutritionMax ?? getNutritionMax(player));
  const ratio = (player.nutrition ?? 0) / nutritionMax;

  if (ratio >= HUNGER_THRESHOLDS.sated) {
    return HUNGER_STATE.SATED;
  }
  if (ratio >= HUNGER_THRESHOLDS.normal) {
    return HUNGER_STATE.NORMAL;
  }
  if (ratio >= HUNGER_THRESHOLDS.hungry) {
    return HUNGER_STATE.HUNGRY;
  }
  if (ratio >= HUNGER_THRESHOLDS.starving) {
    return HUNGER_STATE.STARVING;
  }
  return HUNGER_STATE.DYING;
}

export function getHungerStateLabel(state) {
  return {
    [HUNGER_STATE.SATED]: "Satt",
    [HUNGER_STATE.NORMAL]: "Normal",
    [HUNGER_STATE.HUNGRY]: "Hungrig",
    [HUNGER_STATE.STARVING]: "Ausgehungert",
    [HUNGER_STATE.DYING]: "Verhungernd",
  }[state] ?? state;
}

export function getHungerStateMessage(state) {
  return {
    [HUNGER_STATE.HUNGRY]: "Du wirst hungrig.",
    [HUNGER_STATE.STARVING]: "Du bist ausgehungert.",
    [HUNGER_STATE.DYING]: "Du verhungerst.",
    [HUNGER_STATE.NORMAL]: "Dein Hunger lässt nach.",
    [HUNGER_STATE.SATED]: "Du bist wieder satt.",
  }[state] ?? null;
}

export function getFoodSatietyEstimate(amount) {
  return FOOD_SATIETY_ESTIMATES.find((entry) => amount <= entry.max)?.label ?? "Macht satt.";
}

export function getFoodOvereatMessage(restoredAmount, attemptedAmount) {
  const wastedAmount = Math.max(0, attemptedAmount - restoredAmount);
  if (wastedAmount <= 0) {
    return null;
  }

  if (wastedAmount >= attemptedAmount * 0.5) {
    return "Du warst viel zu voll und hast einen guten Teil davon wieder erbrochen.";
  }

  return "Du warst schon zu voll und hast einen Teil davon wieder erbrochen.";
}
