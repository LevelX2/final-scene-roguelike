import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DECORATIVE_OVERLAY_PRESETS,
  getDecorativeOverlayPreset,
  getDecorativeOverlayPresetsForFamily,
} from '../../src/ambience/visual/decorative-overlay-presets.mjs';

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

function expectLocalAsset(relativeAssetPath) {
  const normalizedPath = relativeAssetPath.startsWith('./')
    ? relativeAssetPath.slice(2)
    : relativeAssetPath;
  assert.ok(
    fs.existsSync(path.join(PROJECT_ROOT, normalizedPath)),
    `${relativeAssetPath} should exist on disk`,
  );
}

test('decorative overlay catalog keeps every preset asset on disk', () => {
  assert.ok(DECORATIVE_OVERLAY_PRESETS.length >= 40);

  for (const preset of DECORATIVE_OVERLAY_PRESETS) {
    expectLocalAsset(preset.svgAsset);
  }
});

test('decorative overlay catalog exposes the newly imported v4 ambience families', () => {
  const expectedFamilies = ['paint', 'paper', 'glass', 'chalk', 'dust', 'footprints', 'stains', 'marks'];

  for (const family of expectedFamilies) {
    assert.ok(
      getDecorativeOverlayPresetsForFamily(family).length > 0,
      `expected presets for family ${family}`,
    );
  }
});

test('decorative overlay catalog maps representative v4 presets with intended footprints', () => {
  assert.deepEqual(
    getDecorativeOverlayPreset('paint-streak-2x1'),
    {
      id: 'paint-streak-2x1',
      family: 'paint',
      svgAsset: './assets/overlays/paint-streak-128.svg',
      widthTiles: 2,
      heightTiles: 1,
      mask: [{ x: 0, y: 0 }, { x: 1, y: 0 }],
      weight: 4,
      tags: ['streak', 'linear'],
    },
  );

  assert.deepEqual(
    getDecorativeOverlayPreset('marks-corner-2x2')?.mask,
    [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }],
  );

  assert.equal(getDecorativeOverlayPreset('stains-trail-1x2')?.heightTiles, 2);
  assert.equal(getDecorativeOverlayPreset('chalk-grid-2x2')?.widthTiles, 2);
});
