import test from 'node:test';
import assert from 'node:assert/strict';
import { createRunStudioTopology } from '../../src/studio-topology.mjs';

test('studio topology starts the first studio with a horizontal outer entrance', () => {
  const topology = createRunStudioTopology(() => 0, 10);

  assert.equal(topology.nodes[1].entryDirection, 'left');
  assert.equal(topology.nodes[1].entryTransitionStyle, 'passage');
  assert.notEqual(topology.nodes[1].exitDirection, 'left');
});
