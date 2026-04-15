export function isTargetModeWeapon(weapon) {
  return Boolean(
    weapon?.attackMode === 'ranged' &&
    (weapon?.range ?? 1) > 1,
  );
}

function fallbackDistance(enemy, player) {
  return Math.abs((enemy?.x ?? 0) - (player?.x ?? 0)) + Math.abs((enemy?.y ?? 0) - (player?.y ?? 0));
}

export function evaluateTargetSelection(context) {
  const {
    state,
    floorState,
    weapon,
    x,
    y,
    manhattanDistance,
    isStraightShot,
    hasLineOfSight,
  } = context;

  const enemy = floorState?.enemies?.find((entry) => entry.x === x && entry.y === y) ?? null;
  const distance = enemy
    ? (manhattanDistance?.(enemy, state?.player) ?? fallbackDistance(enemy, state?.player))
    : null;
  const hasRange = Boolean(enemy && isTargetModeWeapon(weapon) && distance <= (weapon?.range ?? 1));
  const hasAlignment = Boolean(
    enemy &&
    isStraightShot?.(state?.player?.x, state?.player?.y, enemy.x, enemy.y),
  );
  const hasSight = Boolean(
    enemy &&
    hasLineOfSight?.(floorState, state?.player?.x, state?.player?.y, enemy.x, enemy.y),
  );

  return {
    enemy,
    distance,
    hasRange,
    hasAlignment,
    hasSight,
    valid: Boolean(enemy && hasRange && hasAlignment && hasSight),
  };
}

export function getVisibleTargetSelections(context) {
  const {
    state,
    floorState,
    weapon,
    manhattanDistance,
    isStraightShot,
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
      const distance = manhattanDistance?.(enemy, state?.player) ?? fallbackDistance(enemy, state?.player);
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
      manhattanDistance,
      isStraightShot,
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
