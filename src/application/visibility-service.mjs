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

  function isStraightShot(fromX, fromY, toX, toY) {
    return fromX === toX || fromY === toY;
  }

  function hasLineOfSight(floorState, fromX, fromY, toX, toY) {
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

  function updateVisibility() {
    const state = getState();
    const floorState = getCurrentFloorState();
    if (!floorState) {
      return;
    }
    if (floorState.debugReveal) {
      floorState.visible = createMaskGrid(true);
      floorState.explored = createMaskGrid(true);
      return;
    }
    const visionRadius = VISION_RADIUS + (getEquippedLightBonus?.(state.player) ?? 0);

    floorState.visible = createMaskGrid(false);
    floorState.visible[state.player.y][state.player.x] = true;
    floorState.explored[state.player.y][state.player.x] = true;

    for (let y = 0; y < HEIGHT; y += 1) {
      for (let x = 0; x < WIDTH; x += 1) {
        const distance = Math.max(Math.abs(x - state.player.x), Math.abs(y - state.player.y));
        if (distance > visionRadius) {
          continue;
        }

        if (!hasLineOfSight(floorState, state.player.x, state.player.y, x, y)) {
          continue;
        }

        floorState.visible[y][x] = true;
        floorState.explored[y][x] = true;
      }
    }

    for (let y = 0; y < HEIGHT; y += 1) {
      for (let x = 0; x < WIDTH; x += 1) {
        if (!floorState.visible[y][x] || floorState.grid[y][x] === TILE.WALL) {
          continue;
        }

        for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
          for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
            const nextX = x + offsetX;
            const nextY = y + offsetY;

            if (
              nextX < 0 ||
              nextY < 0 ||
              nextX >= WIDTH ||
              nextY >= HEIGHT ||
              !isStructuralRevealCandidate(floorState, nextX, nextY)
            ) {
              continue;
            }

            floorState.visible[nextY][nextX] = true;
            floorState.explored[nextY][nextX] = true;
          }
        }
      }
    }
  }

  return {
    isStraightShot,
    hasLineOfSight,
    updateVisibility,
  };
}
