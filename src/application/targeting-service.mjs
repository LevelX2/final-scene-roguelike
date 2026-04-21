export function isTargetModeWeapon(weapon) {
  return Boolean(
    weapon?.attackMode === 'ranged' &&
    (weapon?.range ?? 1) > 1,
  );
}

function formatTargetChance(value) {
  return Number.isFinite(value) ? `${Math.round(value)}%` : null;
}

function fallbackDistance(enemy, player) {
  return Math.max(
    Math.abs((enemy?.x ?? 0) - (player?.x ?? 0)),
    Math.abs((enemy?.y ?? 0) - (player?.y ?? 0)),
  );
}

export function evaluateTargetSelection(context) {
  const {
    state,
    floorState,
    weapon,
    x,
    y,
    rangeDistance,
    hasLineOfSight,
    previewCombatAttack,
  } = context;

  const enemy = floorState?.enemies?.find((entry) => entry.x === x && entry.y === y) ?? null;
  const distance = enemy
    ? (rangeDistance?.(enemy, state?.player) ?? fallbackDistance(enemy, state?.player))
    : null;
  const hasRange = Boolean(enemy && isTargetModeWeapon(weapon) && distance <= (weapon?.range ?? 1));
  const hasSight = Boolean(
    enemy &&
    hasLineOfSight?.(floorState, state?.player?.x, state?.player?.y, enemy.x, enemy.y),
  );
  const attackPreview = enemy && hasRange && hasSight
    ? previewCombatAttack?.(state?.player, enemy, { weapon, distance })
    : null;

  return {
    enemy,
    distance,
    hasRange,
    hasSight,
    valid: Boolean(enemy && hasRange && hasSight),
    hitChance: attackPreview?.hitChance ?? null,
    baseHitChance: attackPreview?.baseHitChance ?? null,
    critChance: attackPreview?.critChance ?? null,
    coverPenalty: attackPreview?.coverPenalty ?? 0,
    coverGrade: attackPreview?.coverGrade ?? 'clear',
    coverLabel: attackPreview?.coverLabel ?? '',
  };
}

export function getVisibleTargetSelections(context) {
  const {
    state,
    floorState,
    weapon,
    rangeDistance,
    hasLineOfSight,
    previewCombatAttack,
  } = context;

  if (!isTargetModeWeapon(weapon)) {
    return {
      allVisibleTargets: [],
      validTargets: [],
    };
  }

  const allVisibleTargets = (floorState?.enemies ?? [])
    .filter((enemy) => {
      const distance = rangeDistance?.(enemy, state?.player) ?? fallbackDistance(enemy, state?.player);
      return (
        distance <= (weapon.range ?? 1) &&
        floorState?.visible?.[enemy.y]?.[enemy.x]
      );
    })
    .map((enemy) => evaluateTargetSelection({
      state,
      floorState,
      weapon,
      x: enemy.x,
      y: enemy.y,
      rangeDistance,
      hasLineOfSight,
      previewCombatAttack,
    }))
    .sort((left, right) => (left.distance ?? Number.MAX_SAFE_INTEGER) - (right.distance ?? Number.MAX_SAFE_INTEGER));

  return {
    allVisibleTargets,
    validTargets: allVisibleTargets.filter((target) => target.valid),
  };
}

export function getSingleDirectFireTargetSelection(validTargets, directFireEnabled = true) {
  if (!directFireEnabled || validTargets.length !== 1) {
    return null;
  }

  const [targetSelection] = validTargets;
  return (
    targetSelection?.valid &&
    (targetSelection.coverPenalty ?? 0) <= 0
  )
    ? targetSelection
    : null;
}

export function getTargetHintLabel(targetSelection) {
  if (!targetSelection?.enemy) {
    return 'Kein Ziel';
  }

  if (!targetSelection.valid) {
    return 'Kein Schuss';
  }

  const chanceLabel = formatTargetChance(targetSelection.hitChance) ?? 'Schuss frei';
  if ((targetSelection.coverPenalty ?? 0) > 0) {
    return `${targetSelection.coverLabel || 'Teildeckung'} - ${chanceLabel}`;
  }

  return `Schuss frei - ${chanceLabel}`;
}

export function getTargetChanceTooltip(targetSelection) {
  if (!targetSelection?.valid || !Number.isFinite(targetSelection.hitChance)) {
    return null;
  }

  const hitChanceLabel = formatTargetChance(targetSelection.hitChance);
  const baseHitChanceLabel = formatTargetChance(targetSelection.baseHitChance);
  const coverPenalty = Math.max(0, Math.round(targetSelection.coverPenalty ?? 0));
  const lines = [`Dieser Schuss trifft aktuell mit ${hitChanceLabel}.`];

  if (coverPenalty > 0) {
    if (baseHitChanceLabel) {
      lines.push(`Ohne Deckung waeren es ${baseHitChanceLabel}.`);
    }
    lines.push(`${targetSelection.coverLabel || 'Teildeckung'} kostet ${coverPenalty} Prozentpunkte.`);
  } else {
    lines.push('Keine Deckung auf der Schusslinie.');
  }

  return {
    title: 'Trefferchance',
    lines,
  };
}
