import test from 'node:test';
import assert from 'node:assert/strict';
import { createRunStudioTopology, ensureRunStudioTopology } from '../../src/studio-topology.mjs';

test('studio topology starts the first studio with a horizontal outer entrance', () => {
  const topology = createRunStudioTopology(() => 0, 10);

  assert.equal(topology.nodes[1].entryDirection, 'left');
  assert.equal(topology.nodes[1].entryTransitionStyle, 'passage');
  assert.notEqual(topology.nodes[1].exitDirection, 'left');
});

test('vertical topology transitions can become lifts instead of stairs', () => {
  const topology = {
    nodes: {
      1: {
        floorNumber: 1,
        position: { x: 0, y: 0, z: 0 },
        entryDirection: 'left',
        entryTransitionStyle: 'passage',
        exitDirection: null,
        exitTransitionStyle: null,
      },
    },
    occupied: {
      '0,0,0': 1,
      '1,0,0': 99,
      '0,-1,0': 98,
      '0,1,0': 97,
    },
    generatedToFloor: 1,
  };

  ensureRunStudioTopology(topology, 2, (min, max) => max);

  assert.equal(topology.nodes[1].exitDirection, 'up');
  assert.equal(topology.nodes[1].exitTransitionStyle, 'lift');
  assert.equal(topology.nodes[2].entryDirection, 'down');
  assert.equal(topology.nodes[2].entryTransitionStyle, 'lift');
});
