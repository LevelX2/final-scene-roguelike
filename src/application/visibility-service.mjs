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

    return isDoorClosed(getDoorAt(x, y, floorState));
  }

  function isStraightShot(fromX, fromY, toX, toY) {
    return fromX === toX || fromY === toY;
  }

  function hasLineOfSight(floorState, fromX, fromY, toX, toY) {
    const startX = fromX + 0.5;
    const startY = fromY + 0.5;
    const endX = toX + 0.5;
    const endY = toY + 0.5;
    const deltaX = endX - startX;
    const deltaY = endY - startY;
    const steps = Math.max(Math.abs(deltaX), Math.abs(deltaY)) * 2;

    let previousCellX = fromX;
    let previousCellY = fromY;

    for (let step = 1; step <= steps; step += 1) {
      const progress = step / steps;
      const sampleX = Math.floor(startX + deltaX * progress);
      const sampleY = Math.floor(startY + deltaY * progress);

      if (sampleX === previousCellX && sampleY === previousCellY) {
        continue;
      }

      if (sampleX !== previousCellX && sampleY !== previousCellY) {
        if (
          isOpaqueTile(floorState, previousCellX, sampleY) &&
          isOpaqueTile(floorState, sampleX, previousCellY)
        ) {
          return false;
        }
      }

      if (sampleX === toX && sampleY === toY) {
        return true;
      }

      if (isOpaqueTile(floorState, sampleX, sampleY)) {
        return false;
      }

      previousCellX = sampleX;
      previousCellY = sampleY;
    }

    return true;
  }

  function updateVisibility() {
    const state = getState();
    const floorState = getCurrentFloorState();
    if (!floorState) {
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
              floorState.grid[nextY][nextX] !== TILE.WALL
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
