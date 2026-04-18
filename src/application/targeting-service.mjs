export function isTargetModeWeapon(weapon) {
  return Boolean(
    weapon?.attackMode === 'ranged' &&
    (weapon?.range ?? 1) > 1,
  );
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

  return {
    enemy,
    distance,
    hasRange,
    hasSight,
    valid: Boolean(enemy && hasRange && hasSight),
  };
}

export function getVisibleTargetSelections(context) {
  const {
    state,
    floorState,
    weapon,
    rangeDistance,
    hasLineOfSight,
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
    }))
    .sort((left, right) => (left.distance ?? Number.MAX_SAFE_INTEGER) - (right.distance ?? Number.MAX_SAFE_INTEGER));

  return {
    allVisibleTargets,
    validTargets: allVisibleTargets.filter((target) => target.valid),
  };
}

export function getTargetHintLabel(targetSelection) {
  if (!targetSelection?.enemy) {
    return 'Kein Ziel';
  }

  return targetSelection.valid ? 'Schuss frei' : 'Kein Schuss';
}
