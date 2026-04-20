import { getActorBlockChance, getActorCombatSnapshot } from '../application/derived-actor-stats.mjs';

export function createCombatResolutionApi(context) {
  const {
    BASE_HIT_CHANCE,
    MIN_HIT_CHANCE,
    MAX_HIT_CHANCE,
    MIN_CRIT_CHANCE,
    MAX_CRIT_CHANCE,
    clamp,
    rollPercent,
    getState,
    getCurrentFloorState,
    getCombatWeapon,
    getOffHand,
    getWeaponConditionalDamageBonus,
    itemHasModifier,
    TILE,
    getDoorAt,
    isDoorClosed,
  } = context;

  function isInsideFloor(floorState, x, y) {
    return Boolean(
      floorState &&
      y >= 0 &&
      x >= 0 &&
      y < (floorState.grid?.length ?? 0) &&
      x < (floorState.grid?.[y]?.length ?? 0)
    );
  }

  function isOpaqueTile(floorState, x, y) {
    if (!isInsideFloor(floorState, x, y) || floorState.grid[y][x] === TILE.WALL) {
      return true;
    }

    const showcaseBlocksTile = (floorState.showcases ?? []).some((showcase) => showcase.x === x && showcase.y === y);
    return showcaseBlocksTile || isDoorClosed?.(getDoorAt?.(x, y, floorState));
  }

  function isNearCornerGraze(decision, distanceX, distanceY) {
    const threshold = Math.max(1, Math.floor((Math.min(distanceX, distanceY) + 1) / 2));
    return Math.abs(decision) <= threshold;
  }

  function getRangedCornerCover(attacker, defender, options = {}) {
    const floorState = options.floorState ?? getCurrentFloorState?.();
    const weapon = options.weapon ?? getCombatWeapon(attacker);
    const distance = Math.max(1, options.distance ?? 1);
    const isRangedAttack = weapon?.attackMode === 'ranged' && distance > 1;
    if (!isRangedAttack || !floorState) {
      return {
        penalty: 0,
        grade: 'clear',
        label: '',
        grazingCorners: [],
      };
    }

    const fromX = attacker?.x;
    const fromY = attacker?.y;
    const toX = defender?.x;
    const toY = defender?.y;
    if (![fromX, fromY, toX, toY].every(Number.isFinite)) {
      return {
        penalty: 0,
        grade: 'clear',
        label: '',
        grazingCorners: [],
      };
    }

    const deltaX = toX - fromX;
    const deltaY = toY - fromY;
    const stepX = Math.sign(deltaX);
    const stepY = Math.sign(deltaY);
    const distanceX = Math.abs(deltaX);
    const distanceY = Math.abs(deltaY);
    let currentX = fromX;
    let currentY = fromY;
    let traversedX = 0;
    let traversedY = 0;
    const grazingCorners = [];
    const grazingCornerKeys = new Set();

    while (traversedX < distanceX || traversedY < distanceY) {
      const decision = (1 + 2 * traversedX) * distanceY - (1 + 2 * traversedY) * distanceX;
      if (isNearCornerGraze(decision, distanceX, distanceY)) {
        const horizontalTile = { x: currentX + stepX, y: currentY };
        const verticalTile = { x: currentX, y: currentY + stepY };
        const horizontalOpaque = isOpaqueTile(floorState, horizontalTile.x, horizontalTile.y);
        const verticalOpaque = isOpaqueTile(floorState, verticalTile.x, verticalTile.y);

        if (horizontalOpaque !== verticalOpaque) {
          const blockerTile = horizontalOpaque ? horizontalTile : verticalTile;
          const grazeStepIndex = Math.max(traversedX, traversedY) + 1;
          const grazeKey = `${blockerTile.x},${blockerTile.y}:${grazeStepIndex}`;
          if (!grazingCornerKeys.has(grazeKey)) {
            grazingCorners.push({
              stepIndex: grazeStepIndex,
              blockerTile,
            });
            grazingCornerKeys.add(grazeKey);
          }
        }
      }

      if (decision === 0) {
        currentX += stepX;
        currentY += stepY;
        traversedX += 1;
        traversedY += 1;
      } else if (decision < 0) {
        currentX += stepX;
        traversedX += 1;
      } else {
        currentY += stepY;
        traversedY += 1;
      }
    }

    const remoteCorners = grazingCorners.filter((corner) => corner.stepIndex > 1);
    if (remoteCorners.length === 0) {
      return {
        penalty: 0,
        grade: 'clear',
        label: '',
        grazingCorners,
      };
    }

    const nearestRemoteStep = remoteCorners.reduce(
      (smallest, corner) => Math.min(smallest, corner.stepIndex),
      Number.POSITIVE_INFINITY,
    );
    let penalty = 15 + Math.max(0, remoteCorners.length - 1) * 5;
    if (nearestRemoteStep >= 3) {
      penalty += 5;
    }
    penalty = Math.min(30, penalty);

    return {
      penalty,
      grade: penalty >= 25 ? 'heavy' : 'partial',
      label: penalty >= 25 ? 'Starke Deckung' : 'Teildeckung',
      grazingCorners,
    };
  }

  function previewCombatAttack(attacker, defender, options = {}) {
    const state = getState();
    const weapon = options.weapon ?? getCombatWeapon(attacker);
    const distance = Math.max(1, options.distance ?? 1);
    const floorNumber = Math.max(1, state?.floor ?? 1);
    const isPlayerAttack = attacker === state.player && defender?.type === "monster";
    const usesOpeningStrike = isPlayerAttack && !defender?.openingStrikeSpent;
    const conditionalDamage = getWeaponConditionalDamageBonus(attacker, weapon);
    const attackSnapshot = getActorCombatSnapshot(attacker, {
      weapon,
      clamp,
      minCritChance: MIN_CRIT_CHANCE,
      maxCritChance: MAX_CRIT_CHANCE,
      distance,
      floorNumber,
      conditionalDamage,
      useOpeningStrike: usesOpeningStrike,
    });
    const defenseSnapshot = getActorCombatSnapshot(defender, {
      weapon: getCombatWeapon(defender),
      clamp,
      minCritChance: MIN_CRIT_CHANCE,
      maxCritChance: MAX_CRIT_CHANCE,
      distance: 1,
      floorNumber,
    });
    const baseHitChance = clamp(
      BASE_HIT_CHANCE + (attackSnapshot.hitValue - defenseSnapshot.dodgeValue),
      MIN_HIT_CHANCE,
      MAX_HIT_CHANCE,
    );
    const cornerCover = getRangedCornerCover(attacker, defender, {
      ...options,
      weapon,
      distance,
    });
    const hitChance = clamp(
      baseHitChance - cornerCover.penalty,
      MIN_HIT_CHANCE,
      MAX_HIT_CHANCE,
    );

    return {
      weapon,
      distance,
      conditionalDamage,
      usesOpeningStrike,
      attackSnapshot,
      defenseSnapshot,
      baseHitChance,
      hitChance,
      critChance: attackSnapshot.critChance,
      coverPenalty: cornerCover.penalty,
      coverGrade: cornerCover.grade,
      coverLabel: cornerCover.label,
      coverCorners: cornerCover.grazingCorners,
    };
  }

  function resolveBlock(defender, damage) {
    const offHand = getOffHand(defender);
    if (!offHand || offHand.subtype !== "shield") {
      return {
        blocked: false,
        damage,
        prevented: 0,
        item: null,
        reflectiveDamage: 0,
      };
    }

    const blockChance = getActorBlockChance(defender, offHand, clamp);
    if (!rollPercent(blockChance)) {
      return {
        blocked: false,
        damage,
        prevented: 0,
        item: offHand,
        reflectiveDamage: 0,
      };
    }

    const reducedDamage = Math.max(0, damage - offHand.blockValue);
    return {
      blocked: true,
      damage: reducedDamage,
      prevented: damage - reducedDamage,
      item: offHand,
      reflectiveDamage: itemHasModifier(offHand, "reflective") ? 1 : 0,
    };
  }

  function resolveCombatAttack(attacker, defender, options = {}) {
    const preview = previewCombatAttack(attacker, defender, options);
    if (preview.usesOpeningStrike) {
      defender.openingStrikeSpent = true;
    }

    if (!rollPercent(preview.hitChance)) {
      return {
        hit: false,
        critical: false,
        damage: 0,
        usedOpeningStrike: preview.usesOpeningStrike,
        hitChance: preview.hitChance,
        baseHitChance: preview.baseHitChance,
        critChance: preview.critChance,
        distance: preview.distance,
        coverPenalty: preview.coverPenalty,
        coverGrade: preview.coverGrade,
        coverLabel: preview.coverLabel,
      };
    }

    const critical = rollPercent(preview.critChance);
    const damage = critical
      ? Math.max(preview.attackSnapshot.baseDamage + 1, Math.floor(preview.attackSnapshot.baseDamage * preview.attackSnapshot.critMultiplier))
      : preview.attackSnapshot.baseDamage;

    return {
      hit: true,
      critical,
      damage,
      usedOpeningStrike: preview.usesOpeningStrike,
      hitChance: preview.hitChance,
      baseHitChance: preview.baseHitChance,
      critChance: preview.critChance,
      distance: preview.distance,
      coverPenalty: preview.coverPenalty,
      coverGrade: preview.coverGrade,
      coverLabel: preview.coverLabel,
    };
  }

  return {
    resolveBlock,
    previewCombatAttack,
    resolveCombatAttack,
  };
}
