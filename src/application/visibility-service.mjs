export function createVisibilityService(context) {
  const {
    WIDTH,
    HEIGHT,
    VISION_RADIUS,
    TILE,
    getState,
    getCurrentFloorState,
    getDoorAt,
    isDoorClosed,
    createGrid,
    getEquippedLightBonus,
  } = context;

  function createMaskGrid(fill = false) {
    return createGrid(WIDTH, HEIGHT, fill);
  }

  function cloneMaskGrid(mask) {
    return mask.map((row) => [...row]);
  }

  function isInsideVisionRadius(fromX, fromY, toX, toY, radius) {
    const deltaX = toX - fromX;
    const deltaY = toY - fromY;
    return ((deltaX * deltaX) + (deltaY * deltaY)) <= (radius * radius);
  }

  function isInsideBoard(x, y) {
    return x >= 0 && x < WIDTH && y >= 0 && y < HEIGHT;
  }

  function isOpaqueTile(floorState, x, y) {
    if (!isInsideBoard(x, y) || floorState.grid[y][x] === TILE.WALL) {
      return true;
    }

    const showcaseBlocksTile = (floorState.showcases ?? []).some((showcase) => showcase.x === x && showcase.y === y);
    return showcaseBlocksTile || isDoorClosed(getDoorAt(x, y, floorState));
  }

  function isStructuralRevealCandidate(floorState, x, y) {
    if (!isInsideBoard(x, y)) {
      return false;
    }

    if (floorState.grid[y][x] === TILE.WALL) {
      return true;
    }

    return Boolean(getDoorAt(x, y, floorState));
  }

  function isGameplayVisibilityTarget(floorState, x, y) {
    return isInsideBoard(x, y) && !isStructuralRevealCandidate(floorState, x, y);
  }

  function isOutsideVisionRadiusOnPlayerAxis(playerX, playerY, x, y, radius) {
    return !isInsideVisionRadius(playerX, playerY, x, y, radius)
      && (x === playerX || y === playerY);
  }

  function isStraightShot(fromX, fromY, toX, toY) {
    return fromX === toX || fromY === toY;
  }

  function isTightBlockedDiagonal(floorState, fromX, fromY, toX, toY) {
    const deltaX = toX - fromX;
    const deltaY = toY - fromY;
    if (Math.abs(deltaX) !== 1 || Math.abs(deltaY) !== 1) {
      return false;
    }

    return (
      isOpaqueTile(floorState, fromX + Math.sign(deltaX), fromY) &&
      isOpaqueTile(floorState, fromX, fromY + Math.sign(deltaY))
    );
  }

  function hasStrictLineOfSight(floorState, fromX, fromY, toX, toY) {
    if (fromX === toX && fromY === toY) {
      return true;
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

    while (traversedX < distanceX || traversedY < distanceY) {
      const decision = (1 + 2 * traversedX) * distanceY - (1 + 2 * traversedY) * distanceX;

      if (decision === 0) {
        if (
          isOpaqueTile(floorState, currentX + stepX, currentY) &&
          isOpaqueTile(floorState, currentX, currentY + stepY)
        ) {
          return false;
        }

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

      if (currentX === toX && currentY === toY) {
        return true;
      }

      if (isOpaqueTile(floorState, currentX, currentY)) {
        return false;
      }
    }

    return true;
  }

  function getFieldOfViewOctants() {
    return [
      [1, 0, 0, 1],
      [0, 1, 1, 0],
      [0, -1, 1, 0],
      [-1, 0, 0, 1],
      [-1, 0, 0, -1],
      [0, -1, -1, 0],
      [0, 1, -1, 0],
      [1, 0, 0, -1],
    ];
  }

  function computeFieldOfViewMask(floorState, originX, originY, radius) {
    const visible = createMaskGrid(false);
    const radiusSquared = radius * radius;

    function setVisible(x, y) {
      if (!isInsideBoard(x, y) || !isInsideVisionRadius(originX, originY, x, y, radius)) {
        return;
      }

      if (
        !(x === originX && y === originY) &&
        isTightBlockedDiagonal(floorState, originX, originY, x, y)
      ) {
        return;
      }

      if (
        !(x === originX && y === originY) &&
        !isGameplayVisibilityTarget(floorState, x, y)
      ) {
        return;
      }

      visible[y][x] = true;
    }

    function castLight(row, startSlope, endSlope, xx, xy, yx, yy) {
      if (startSlope < endSlope) {
        return;
      }

      let nextStartSlope = startSlope;
      for (let distance = row; distance <= radius; distance += 1) {
        let blocked = false;

        for (let deltaX = -distance; deltaX <= 0; deltaX += 1) {
          const deltaY = -distance;
          const currentX = originX + deltaX * xx + deltaY * xy;
          const currentY = originY + deltaX * yx + deltaY * yy;
          const leftSlope = (deltaX - 0.5) / (deltaY + 0.5);
          const rightSlope = (deltaX + 0.5) / (deltaY - 0.5);

          if (startSlope < rightSlope) {
            continue;
          }
          if (endSlope > leftSlope) {
            break;
          }

          if (!isInsideBoard(currentX, currentY)) {
            continue;
          }

          if (((deltaX * deltaX) + (deltaY * deltaY)) <= radiusSquared) {
            setVisible(currentX, currentY);
          }

          const opaque = isOpaqueTile(floorState, currentX, currentY);

          if (blocked) {
            if (opaque) {
              nextStartSlope = rightSlope;
              continue;
            }

            blocked = false;
            startSlope = nextStartSlope;
          } else if (opaque && distance < radius) {
            blocked = true;
            castLight(distance + 1, startSlope, leftSlope, xx, xy, yx, yy);
            nextStartSlope = rightSlope;
          }
        }

        if (blocked) {
          break;
        }
      }
    }

    setVisible(originX, originY);
    getFieldOfViewOctants().forEach(([xx, xy, yx, yy]) => {
      castLight(1, 1.0, 0.0, xx, xy, yx, yy);
    });

    return visible;
  }

  function getObserverVisionRadius(fromX, fromY) {
    const state = getState();
    if (state?.player?.x === fromX && state?.player?.y === fromY) {
      return VISION_RADIUS + (getEquippedLightBonus?.(state.player) ?? 0);
    }

    return null;
  }

  function canPerceive(floorState, fromX, fromY, toX, toY) {
    if (fromX === toX && fromY === toY) {
      return true;
    }
    if (isTightBlockedDiagonal(floorState, fromX, fromY, toX, toY)) {
      return false;
    }

    if (!isGameplayVisibilityTarget(floorState, toX, toY)) {
      return false;
    }

    const deltaX = toX - fromX;
    const deltaY = toY - fromY;
    const distance = Math.sqrt((deltaX * deltaX) + (deltaY * deltaY));
    const observerRadius = getObserverVisionRadius(fromX, fromY);
    if (observerRadius != null && distance > observerRadius) {
      return false;
    }

    const radius = observerRadius ?? Math.ceil(distance);
    const fieldOfView = computeFieldOfViewMask(floorState, fromX, fromY, radius);
    return Boolean(fieldOfView?.[toY]?.[toX]);
  }

  function hasProjectileLine(floorState, fromX, fromY, toX, toY) {
    return hasStrictLineOfSight(floorState, fromX, fromY, toX, toY);
  }

  function updateVisibility() {
    const state = getState();
    const floorState = getCurrentFloorState();
    if (!floorState) {
      return;
    }
    if (floorState.debugReveal) {
      floorState.lineOfSightVisible = createMaskGrid(true);
      floorState.visible = createMaskGrid(true);
      floorState.explored = createMaskGrid(true);
      return;
    }
    const visionRadius = VISION_RADIUS + (getEquippedLightBonus?.(state.player) ?? 0);

    const lineOfSightVisible = computeFieldOfViewMask(
      floorState,
      state.player.x,
      state.player.y,
      visionRadius,
    );
    floorState.visible = createMaskGrid(false);
    floorState.visible[state.player.y][state.player.x] = true;
    floorState.explored[state.player.y][state.player.x] = true;

    for (let y = 0; y < HEIGHT; y += 1) {
      for (let x = 0; x < WIDTH; x += 1) {
        if (lineOfSightVisible[y][x]) {
          floorState.explored[y][x] = true;
        }
      }
    }

    floorState.lineOfSightVisible = cloneMaskGrid(lineOfSightVisible);
    floorState.visible = cloneMaskGrid(lineOfSightVisible);

    function revealStructureTile(x, y) {
      if (!isInsideBoard(x, y) || !isStructuralRevealCandidate(floorState, x, y)) {
        return;
      }

      floorState.visible[y][x] = true;
      floorState.explored[y][x] = true;
    }

    function countLineOfSightVisibleNeighbors(x, y) {
      let count = 0;
      for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
        for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
          if (offsetX === 0 && offsetY === 0) {
            continue;
          }

          const nextX = x + offsetX;
          const nextY = y + offsetY;
          if (!isInsideBoard(nextX, nextY)) {
            continue;
          }

          if (floorState.lineOfSightVisible[nextY][nextX]) {
            count += 1;
          }
        }
      }

      return count;
    }

    for (let y = 0; y < HEIGHT; y += 1) {
      for (let x = 0; x < WIDTH; x += 1) {
        if (
          !floorState.lineOfSightVisible[y][x] ||
          isStructuralRevealCandidate(floorState, x, y)
        ) {
          continue;
        }

        for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
          for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
            if ((offsetX === 0 && offsetY === 0) || (offsetX !== 0 && offsetY !== 0)) {
              continue;
            }

            const nextX = x + offsetX;
            const nextY = y + offsetY;

            if (
              nextX < 0 ||
              nextY < 0 ||
              nextX >= WIDTH ||
              nextY >= HEIGHT ||
              isOutsideVisionRadiusOnPlayerAxis(state.player.x, state.player.y, nextX, nextY, visionRadius) ||
              !isStructuralRevealCandidate(floorState, nextX, nextY)
            ) {
              continue;
            }

            if (
              floorState.grid[nextY][nextX] === TILE.WALL &&
              countLineOfSightVisibleNeighbors(nextX, nextY) < 2 &&
              nextX !== state.player.x &&
              nextY !== state.player.y
            ) {
              continue;
            }

            revealStructureTile(nextX, nextY);
          }
        }

        for (const offsetY of [-1, 1]) {
          for (const offsetX of [-1, 1]) {
            const cornerX = x + offsetX;
            const cornerY = y + offsetY;
            const supportAX = x + offsetX;
            const supportAY = y;
            const supportBX = x;
            const supportBY = y + offsetY;
            const cornerDistanceSquared = ((cornerX - state.player.x) ** 2) + ((cornerY - state.player.y) ** 2);
            const supportADistanceSquared = ((supportAX - state.player.x) ** 2) + ((supportAY - state.player.y) ** 2);
            const supportBDistanceSquared = ((supportBX - state.player.x) ** 2) + ((supportBY - state.player.y) ** 2);

            if (
              !isInsideBoard(cornerX, cornerY) ||
              !isInsideBoard(supportAX, supportAY) ||
              !isInsideBoard(supportBX, supportBY) ||
              !isStructuralRevealCandidate(floorState, cornerX, cornerY) ||
              !floorState.visible[supportAY][supportAX] ||
              !floorState.visible[supportBY][supportBX] ||
              cornerDistanceSquared <= supportADistanceSquared ||
              cornerDistanceSquared <= supportBDistanceSquared
            ) {
              continue;
            }

            revealStructureTile(cornerX, cornerY);
          }
        }
      }
    }
  }

  return {
    isStraightShot,
    canPerceive,
    hasLineOfSight: canPerceive,
    hasProjectileLine,
    updateVisibility,
  };
}
