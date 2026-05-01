import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildOrganicFogOverlayChannels,
  createBoardView,
} from '../../src/ui/board-view.mjs';

function createClassList() {
  const classes = new Set();
  return {
    add: (...values) => values.forEach((value) => classes.add(value)),
    remove: (...values) => values.forEach((value) => classes.delete(value)),
    toggle: (value, force) => {
      if (force === undefined) {
        if (classes.has(value)) {
          classes.delete(value);
          return false;
        }
        classes.add(value);
        return true;
      }
      if (force) {
        classes.add(value);
        return true;
      }
      classes.delete(value);
      return false;
    },
    contains: (value) => classes.has(value),
    values: () => [...classes],
  };
}

function createStyleDeclaration() {
  return {
    setProperty(name, value) {
      this[name] = value;
    },
  };
}

function createCanvasContext(width = 0, height = 0) {
  return {
    width,
    height,
    imageSmoothingEnabled: false,
    clearRect() {},
    createImageData(imageWidth, imageHeight) {
      return {
        data: new Uint8ClampedArray(imageWidth * imageHeight * 4),
      };
    },
    putImageData() {},
    drawImage() {},
  };
}

function createElementMock(tagName = 'div') {
  const classList = createClassList();
  const element = {
    tagName: String(tagName).toUpperCase(),
    children: [],
    style: createStyleDeclaration(),
    classList,
    className: '',
    textContent: '',
    attributes: {},
    eventListeners: [],
    appendChild(child) {
      this.children.push(child);
      child.parentElement = this;
      return child;
    },
    addEventListener(type, handler) {
      this.eventListeners.push({ type, handler });
    },
    setAttribute(name, value) {
      this.attributes[name] = value;
    },
    removeAttribute(name) {
      delete this.attributes[name];
    },
    querySelectorAll() {
      return [];
    },
  };

  Object.defineProperty(element, 'innerHTML', {
    get() {
      return this._innerHTML ?? '';
    },
    set(value) {
      this._innerHTML = value;
      if (value === '') {
        this.children = [];
      }
    },
  });

  Object.defineProperty(element, 'childElementCount', {
    get() {
      return this.children.length;
    },
  });

  if (tagName === 'canvas') {
    element.width = 0;
    element.height = 0;
    element.getContext = () => createCanvasContext(element.width, element.height);
  }

  return element;
}

function collectByClass(root, className) {
  const results = [];
  const visit = (node) => {
    if (!node) {
      return;
    }

    const classNames = String(node.className ?? '')
      .split(/\s+/)
      .filter(Boolean);
    if (classNames.includes(className)) {
      results.push(node);
    }

    (node.children ?? []).forEach(visit);
  };

  visit(root);
  return results;
}

test('buildOrganicFogOverlayChannels feathers explored fog onto gameplay-visible tiles', () => {
  const fogChannels = buildOrganicFogOverlayChannels({
    width: 2,
    height: 1,
    scale: 4,
    isGameplayVisible: (x) => x === 0,
    isExplored: (x) => x === 1,
  });

  assert.equal(fogChannels.hasVisibleEdge, true);
  assert.equal(fogChannels.memoryAlpha.some((value) => value > 0), true);
  assert.equal(fogChannels.unknownAlpha.every((value) => value === 0), true);
});

test('buildOrganicFogOverlayChannels keeps unknown fog separate from explored memory fog', () => {
  const fogChannels = buildOrganicFogOverlayChannels({
    width: 3,
    height: 1,
    scale: 4,
    isGameplayVisible: (x) => x === 1,
    isExplored: (x) => x === 0,
  });

  assert.equal(fogChannels.memoryAlpha.some((value) => value > 0), true);
  assert.equal(fogChannels.unknownAlpha.some((value) => value > 0), true);
});

test('buildOrganicFogOverlayChannels ignores display-only structure silhouettes as fog sources', () => {
  const fogChannels = buildOrganicFogOverlayChannels({
    width: 2,
    height: 1,
    scale: 4,
    isGameplayVisible: (x) => x === 0,
    isDisplayVisibleStructure: (x) => x === 1,
    isExplored: () => false,
  });

  assert.equal(fogChannels.hasVisibleEdge, false);
  assert.equal(fogChannels.memoryAlpha.every((value) => value === 0), true);
  assert.equal(fogChannels.unknownAlpha.every((value) => value === 0), true);
});

test('board-view renderBoard exits cleanly when no current floor exists yet', () => {
  const classList = createClassList();
  classList.add('targeting-mode');

  const boardElement = {
    innerHTML: 'stale board',
    classList,
    style: {},
  };

  const boardView = createBoardView({
    WIDTH: 1,
    HEIGHT: 1,
    TILE_SIZE: 28,
    TILE_GAP: 0,
    BOARD_PADDING: 0,
    TILE: { WALL: '#' },
    boardElement,
    getState: () => ({}),
    getCurrentFloorState: () => null,
  });

  assert.doesNotThrow(() => boardView.renderBoard());
  assert.equal(boardElement.innerHTML, '');
  assert.equal(boardElement.classList.contains('targeting-mode'), false);
});

test('board-view renderBoard appends a single organic fog canvas and no tile fog edge tiles', () => {
  const previousDocument = global.document;
  global.document = {
    createElement: createElementMock,
  };

  try {
    const boardElement = createElementMock('div');
    boardElement.classList = createClassList();

    const floorState = {
      grid: [['.', '.']],
      visible: [[true, false]],
      lineOfSightVisible: [[true, false]],
      explored: [[true, true]],
      doors: [],
      showcases: [],
      enemies: [],
      chests: [],
      decorativeOverlays: [],
      debugReveal: false,
    };
    const state = {
      player: { x: -1, y: -1 },
      targeting: { active: false },
      floatingTexts: [],
      boardEffects: [],
      options: {},
      turn: 0,
      gameOver: false,
    };

    const boardView = createBoardView({
      WIDTH: 2,
      HEIGHT: 1,
      TILE_SIZE: 28,
      TILE_GAP: 0,
      BOARD_PADDING: 0,
      TILE: { WALL: '#', FLOOR: '.' },
      boardElement,
      getState: () => state,
      getCurrentFloorState: () => floorState,
      getMainHand: () => null,
      getCombatWeapon: () => null,
      getOffHand: () => null,
      renderSelf: () => {},
    });

    boardView.renderBoard();

    assert.equal(collectByClass(boardElement, 'board-fog-overlay').length, 1);
    assert.equal(collectByClass(boardElement, 'tile-fog-edge').length, 0);
  } finally {
    global.document = previousDocument;
  }
});

test('board-view renders north-south doors with the double-wing door assets', () => {
  const previousDocument = global.document;
  global.document = {
    createElement: createElementMock,
  };

  try {
    const cases = [
      {
        door: { x: 1, y: 1, isOpen: false },
        expectedAsset: './assets/transitions/door-closed-horizontal.svg',
        expectedClass: 'door-closed',
      },
      {
        door: { x: 1, y: 1, isOpen: true },
        expectedAsset: './assets/transitions/door-open-vertical.svg',
        expectedClass: 'door-open',
      },
    ];

    for (const { door, expectedAsset, expectedClass } of cases) {
      const boardElement = createElementMock('div');
      boardElement.classList = createClassList();
      const floorState = {
        grid: [
          ['.', '.', '.'],
          ['#', '.', '#'],
          ['.', '.', '.'],
        ],
        visible: [
          [true, true, true],
          [true, true, true],
          [true, true, true],
        ],
        lineOfSightVisible: [
          [true, true, true],
          [true, true, true],
          [true, true, true],
        ],
        explored: [
          [true, true, true],
          [true, true, true],
          [true, true, true],
        ],
        doors: [door],
        foods: [],
        weapons: [],
        offHands: [],
        traps: [],
        showcases: [],
        enemies: [],
        chests: [],
        decorativeOverlays: [],
        debugReveal: false,
      };
      const state = {
        player: { x: -1, y: -1 },
        targeting: { active: false },
        floatingTexts: [],
        boardEffects: [],
        options: {},
        turn: 0,
        gameOver: false,
      };

      const boardView = createBoardView({
        WIDTH: 3,
        HEIGHT: 3,
        TILE_SIZE: 28,
        TILE_GAP: 0,
        BOARD_PADDING: 0,
        TILE: { WALL: '#', FLOOR: '.', DOOR_OPEN: '/', DOOR_CLOSED: '+' },
        boardElement,
        getState: () => state,
        getCurrentFloorState: () => floorState,
        getMainHand: () => null,
        getCombatWeapon: () => null,
        getOffHand: () => null,
        renderSelf: () => {},
      });

      boardView.renderBoard();

      const foregrounds = collectByClass(boardElement, 'tile-foreground-layer');
      const doorForeground = foregrounds.find((element) => String(element.className).includes(expectedClass));
      assert.ok(doorForeground, `expected ${expectedClass} foreground layer`);
      assert.ok(String(doorForeground.className).includes('door-passage-vertical'));
      assert.equal(doorForeground.style['--tile-overlay-image'], `url("${expectedAsset}")`);
      if (!door.isOpen) {
        assert.notEqual(
          doorForeground.style['--tile-overlay-image'],
          'url("./assets/transitions/door-open-vertical.svg")',
        );
      }
    }
  } finally {
    global.document = previousDocument;
  }
});

test('board-view assigns stable closed-door visual variants from door position', () => {
  const previousDocument = global.document;
  global.document = {
    createElement: createElementMock,
  };

  function renderDoorAsset(door) {
    const boardElement = createElementMock('div');
    boardElement.classList = createClassList();
    const matrix = Array.from({ length: 3 }, () => Array.from({ length: 5 }, () => true));
    const grid = Array.from({ length: 3 }, () => Array.from({ length: 5 }, () => '.'));
    grid[door.y][door.x - 1] = '#';
    grid[door.y][door.x + 1] = '#';
    const floorState = {
      grid,
      visible: matrix,
      lineOfSightVisible: matrix,
      explored: matrix,
      doors: [door],
      foods: [],
      weapons: [],
      offHands: [],
      traps: [],
      showcases: [],
      enemies: [],
      chests: [],
      decorativeOverlays: [],
      debugReveal: false,
    };
    const state = {
      player: { x: -1, y: -1 },
      targeting: { active: false },
      floatingTexts: [],
      boardEffects: [],
      options: {},
      turn: 0,
      gameOver: false,
    };
    const boardView = createBoardView({
      WIDTH: 5,
      HEIGHT: 3,
      TILE_SIZE: 28,
      TILE_GAP: 0,
      BOARD_PADDING: 0,
      TILE: { WALL: '#', FLOOR: '.', DOOR_OPEN: '/', DOOR_CLOSED: '+' },
      boardElement,
      getState: () => state,
      getCurrentFloorState: () => floorState,
      getMainHand: () => null,
      getCombatWeapon: () => null,
      getOffHand: () => null,
      renderSelf: () => {},
    });

    boardView.renderBoard();

    const foregrounds = collectByClass(boardElement, 'tile-foreground-layer');
    const doorForeground = foregrounds.find((element) => String(element.className).includes('door-closed'));
    assert.ok(doorForeground, 'expected closed door foreground layer');
    return {
      className: String(doorForeground.className),
      asset: doorForeground.style['--tile-overlay-image'],
    };
  }

  try {
    const reinforcedDoor = renderDoorAsset({ x: 2, y: 1, isOpen: false });
    assert.ok(reinforcedDoor.className.includes('door-variant-reinforced'));
    assert.equal(
      reinforcedDoor.asset,
      'url("./assets/transitions/door-closed-horizontal-reinforced.svg")',
    );

    const serviceDoor = renderDoorAsset({ x: 3, y: 1, isOpen: false });
    assert.ok(serviceDoor.className.includes('door-variant-service'));
    assert.equal(
      serviceDoor.asset,
      'url("./assets/transitions/door-closed-horizontal-service.svg")',
    );
  } finally {
    global.document = previousDocument;
  }
});
