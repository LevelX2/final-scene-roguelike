import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildStudioFloorMapData,
  buildStudioTopologyRenderData,
  describeStudioRelativePosition,
  toStudioScenePosition,
} from '../../src/ui/studio-topology-view.mjs';

test('studio topology view maps run positions into scene coordinates', () => {
  assert.deepEqual(
    toStudioScenePosition({ x: 2, y: -1, z: 3 }, 100),
    { x: 200, y: -300, z: -100 },
  );
});

test('studio topology view describes relative studio positions in readable German', () => {
  assert.equal(
    describeStudioRelativePosition({ x: 1, y: -2, z: 3 }),
    '1 rechts vom Start | 2 vor dem Start | 3 ueber dem Start',
  );
  assert.equal(
    describeStudioRelativePosition({ x: 0, y: 0, z: 0 }),
    'am Startpunkt des Komplexes',
  );
});

test('studio topology view builds connectors and hides archetypes for future studios', () => {
  const renderData = buildStudioTopologyRenderData({
    topology: {
      nodes: {
        1: {
          floorNumber: 1,
          position: { x: 0, y: 0, z: 0 },
          entryDirection: 'left',
          entryTransitionStyle: 'passage',
          exitDirection: 'right',
          exitTransitionStyle: 'passage',
        },
        2: {
          floorNumber: 2,
          position: { x: 1, y: 0, z: 0 },
          entryDirection: 'left',
          entryTransitionStyle: 'passage',
          exitDirection: 'up',
          exitTransitionStyle: 'stairs',
        },
        3: {
          floorNumber: 3,
          position: { x: 1, y: 0, z: 1 },
          entryDirection: 'down',
          entryTransitionStyle: 'stairs',
          exitDirection: null,
          exitTransitionStyle: null,
        },
      },
    },
    sequence: ['slasher', 'action', 'fantasy'],
    currentFloor: 2,
    visitedFloors: [1, 2],
    visibleFloorLimit: 2,
    spacing: 80,
  });

  assert.equal(renderData.nodes.length, 2);
  assert.equal(renderData.segments.length, 1);
  assert.equal(renderData.currentNode?.floorNumber, 2);
  assert.equal(renderData.currentNode?.archetypeLabel, 'Actionfilm');
  assert.equal(renderData.segments[0].axis, 'x');
  assert.equal(renderData.nodes[1].isVisited, true);
  assert.equal(renderData.nodes[1].displayLabel, 'Studio 2 - Actionfilm');
});

test('studio topology view builds a minimap from explored dungeon tiles', () => {
  const floorMapData = buildStudioFloorMapData({
    TILE: { WALL: '#', FLOOR: '.' },
    currentFloor: 2,
    selectedFloor: 2,
    floorState: {
      grid: [
        ['#', '#', '#'],
        ['#', '.', '.'],
        ['#', '#', '#'],
      ],
      explored: [
        [false, false, false],
        [false, true, true],
        [false, true, false],
      ],
      visible: [
        [false, false, false],
        [false, true, false],
        [false, false, false],
      ],
      doors: [{ x: 2, y: 1, isOpen: false }],
      entryAnchor: { transitionPosition: { x: 1, y: 1 } },
      exitAnchor: { transitionPosition: { x: 2, y: 1 } },
      playerPosition: { x: 1, y: 1 },
    },
  });

  assert.equal(floorMapData.columns, 3);
  assert.equal(floorMapData.rows, 3);
  assert.equal(floorMapData.exploredCount, 3);
  assert.equal(floorMapData.cells.find((cell) => cell.x === 1 && cell.y === 1)?.kind, 'player');
  assert.equal(floorMapData.cells.find((cell) => cell.x === 2 && cell.y === 1)?.kind, 'exit');
  assert.equal(floorMapData.cells.find((cell) => cell.x === 1 && cell.y === 2)?.kind, 'wall');
});
