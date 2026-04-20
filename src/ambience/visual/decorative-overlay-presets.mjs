/**
 * @typedef {
 *   | "puddle"
 *   | "cable"
 *   | "tape"
 *   | "oil"
 *   | "sand"
 *   | "grass"
 *   | "debris"
 *   | "scorch"
 *   | "paint"
 *   | "paper"
 *   | "glass"
 *   | "chalk"
 *   | "dust"
 *   | "footprints"
 *   | "stains"
 *   | "marks"
 * } OverlayFamily
 */

/**
 * @typedef {{ x: number, y: number }} OverlayMaskTile
 */

/**
 * @typedef {{
 *   id: string,
 *   family: OverlayFamily,
 *   svgAsset: string,
 *   widthTiles: number,
 *   heightTiles: number,
 *   mask: OverlayMaskTile[],
 *   weight: number,
 *   tags?: string[],
 * }} OverlayPreset
 */

function createRectMask(widthTiles, heightTiles) {
  const mask = [];
  for (let y = 0; y < heightTiles; y += 1) {
    for (let x = 0; x < widthTiles; x += 1) {
      mask.push({ x, y });
    }
  }
  return mask;
}

function createMask(tiles) {
  return tiles.map((tile) => ({ x: tile.x, y: tile.y }));
}

function createOverlayPreset({
  id,
  family,
  fileName,
  widthTiles,
  heightTiles,
  mask = createRectMask(widthTiles, heightTiles),
  weight,
  tags = [],
}) {
  return {
    id,
    family,
    svgAsset: `./assets/overlays/${fileName}`,
    widthTiles,
    heightTiles,
    mask,
    weight,
    tags,
  };
}

const L_CORNER_MASK = createMask([
  { x: 0, y: 0 },
  { x: 0, y: 1 },
  { x: 1, y: 1 },
]);

const OVERLAY_PRESET_DEFINITIONS = Object.freeze([
  {
    id: 'puddle-small-1x1',
    family: 'puddle',
    fileName: 'puddle-small-1x1.svg',
    widthTiles: 1,
    heightTiles: 1,
    weight: 5,
    tags: ['small', 'common'],
  },
  {
    id: 'puddle-wide-2x1',
    family: 'puddle',
    fileName: 'puddle-wide-2x1.svg',
    widthTiles: 2,
    heightTiles: 1,
    weight: 4,
    tags: ['wide', 'common'],
  },
  {
    id: 'puddle-large-2x2',
    family: 'puddle',
    fileName: 'puddle-large-2x2.svg',
    widthTiles: 2,
    heightTiles: 2,
    weight: 2,
    tags: ['large'],
  },
  {
    id: 'cable-straight-1x3',
    family: 'cable',
    fileName: 'cable-straight-1x3.svg',
    widthTiles: 1,
    heightTiles: 3,
    weight: 4,
    tags: ['long', 'linear'],
  },
  {
    id: 'cable-corner-2x2',
    family: 'cable',
    fileName: 'cable-corner-2x2.svg',
    widthTiles: 2,
    heightTiles: 2,
    mask: L_CORNER_MASK,
    weight: 3,
    tags: ['corner', 'shape-l'],
  },
  {
    id: 'cable-snake-3x2',
    family: 'cable',
    fileName: 'cable-snake-3x2.svg',
    widthTiles: 3,
    heightTiles: 2,
    mask: createMask([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
    ]),
    weight: 2,
    tags: ['large', 'organic'],
  },
  {
    id: 'tape-short-1x2',
    family: 'tape',
    fileName: 'tape-short-1x2.svg',
    widthTiles: 1,
    heightTiles: 2,
    weight: 5,
    tags: ['short', 'linear'],
  },
  {
    id: 'tape-long-1x4',
    family: 'tape',
    fileName: 'tape-long-1x4.svg',
    widthTiles: 1,
    heightTiles: 4,
    weight: 3,
    tags: ['long', 'linear'],
  },
  {
    id: 'tape-corner-2x2',
    family: 'tape',
    fileName: 'tape-corner-2x2.svg',
    widthTiles: 2,
    heightTiles: 2,
    mask: L_CORNER_MASK,
    weight: 2,
    tags: ['corner', 'shape-l'],
  },
  {
    id: 'oil-streak-1x2',
    family: 'oil',
    fileName: 'oil-streak-1x2.svg',
    widthTiles: 1,
    heightTiles: 2,
    weight: 5,
    tags: ['streak', 'common'],
  },
  {
    id: 'oil-patch-2x2',
    family: 'oil',
    fileName: 'oil-patch-2x2.svg',
    widthTiles: 2,
    heightTiles: 2,
    weight: 3,
    tags: ['patch', 'common'],
  },
  {
    id: 'sand-small-2x2',
    family: 'sand',
    fileName: 'sand-small-2x2.svg',
    widthTiles: 2,
    heightTiles: 2,
    weight: 3,
    tags: ['small'],
  },
  {
    id: 'sand-wide-3x2',
    family: 'sand',
    fileName: 'sand-wide-3x2.svg',
    widthTiles: 3,
    heightTiles: 2,
    weight: 2,
    tags: ['wide', 'large'],
  },
  {
    id: 'grass-patch-2x2',
    family: 'grass',
    fileName: 'grass-patch-2x2.svg',
    widthTiles: 2,
    heightTiles: 2,
    weight: 2,
    tags: ['patch', 'rare'],
  },
  {
    id: 'debris-small-1x1',
    family: 'debris',
    fileName: 'debris-small-1x1.svg',
    widthTiles: 1,
    heightTiles: 1,
    weight: 4,
    tags: ['small'],
  },
  {
    id: 'debris-cluster-2x2',
    family: 'debris',
    fileName: 'debris-cluster-2x2.svg',
    widthTiles: 2,
    heightTiles: 2,
    weight: 3,
    tags: ['cluster'],
  },
  {
    id: 'scorch-small-1x1',
    family: 'scorch',
    fileName: 'scorch-small-1x1.svg',
    widthTiles: 1,
    heightTiles: 1,
    weight: 3,
    tags: ['small', 'rare'],
  },
  {
    id: 'scorch-large-2x2',
    family: 'scorch',
    fileName: 'scorch-large-2x2.svg',
    widthTiles: 2,
    heightTiles: 2,
    weight: 1,
    tags: ['large', 'rare'],
  },
  {
    id: 'puddle-trail-2x1',
    family: 'puddle',
    fileName: 'puddle-trail-128.svg',
    widthTiles: 2,
    heightTiles: 1,
    weight: 3,
    tags: ['trail', 'linear'],
  },
  {
    id: 'oil-trail-2x1',
    family: 'oil',
    fileName: 'oil-trail-128.svg',
    widthTiles: 2,
    heightTiles: 1,
    weight: 3,
    tags: ['trail', 'linear'],
  },
  {
    id: 'cable-coil-2x2',
    family: 'cable',
    fileName: 'cable-coil-128.svg',
    widthTiles: 2,
    heightTiles: 2,
    weight: 2,
    tags: ['coil', 'large'],
  },
  {
    id: 'cable-bundle-2x1',
    family: 'cable',
    fileName: 'cable-bundle-128.svg',
    widthTiles: 2,
    heightTiles: 1,
    weight: 3,
    tags: ['bundle', 'linear'],
  },
  {
    id: 'tape-cross-2x2',
    family: 'tape',
    fileName: 'tape-cross-128.svg',
    widthTiles: 2,
    heightTiles: 2,
    weight: 2,
    tags: ['cross', 'large'],
  },
  {
    id: 'sand-patch-2x2',
    family: 'sand',
    fileName: 'sand-patch-128.svg',
    widthTiles: 2,
    heightTiles: 2,
    weight: 2,
    tags: ['patch', 'large'],
  },
  {
    id: 'grass-field-2x2',
    family: 'grass',
    fileName: 'grass-field-128.svg',
    widthTiles: 2,
    heightTiles: 2,
    weight: 1,
    tags: ['field', 'large', 'rare'],
  },
  {
    id: 'debris-field-2x2',
    family: 'debris',
    fileName: 'debris-field-128.svg',
    widthTiles: 2,
    heightTiles: 2,
    weight: 2,
    tags: ['field', 'large'],
  },
  {
    id: 'paint-streak-2x1',
    family: 'paint',
    fileName: 'paint-streak-128.svg',
    widthTiles: 2,
    heightTiles: 1,
    weight: 4,
    tags: ['streak', 'linear'],
  },
  {
    id: 'paint-splatter-2x2',
    family: 'paint',
    fileName: 'paint-splatter-128.svg',
    widthTiles: 2,
    heightTiles: 2,
    weight: 3,
    tags: ['splatter', 'large'],
  },
  {
    id: 'paint-drips-1x2',
    family: 'paint',
    fileName: 'paint-drips-128.svg',
    widthTiles: 1,
    heightTiles: 2,
    weight: 3,
    tags: ['drips', 'linear'],
  },
  {
    id: 'paper-bits-1x1',
    family: 'paper',
    fileName: 'paper-bits-128.svg',
    widthTiles: 1,
    heightTiles: 1,
    weight: 4,
    tags: ['bits', 'small'],
  },
  {
    id: 'paper-scatter-2x2',
    family: 'paper',
    fileName: 'paper-scatter-128.svg',
    widthTiles: 2,
    heightTiles: 2,
    weight: 3,
    tags: ['scatter', 'large'],
  },
  {
    id: 'paper-bundle-1x1',
    family: 'paper',
    fileName: 'paper-bundle-128.svg',
    widthTiles: 1,
    heightTiles: 1,
    weight: 3,
    tags: ['bundle'],
  },
  {
    id: 'glass-bits-1x1',
    family: 'glass',
    fileName: 'glass-bits-128.svg',
    widthTiles: 1,
    heightTiles: 1,
    weight: 3,
    tags: ['bits', 'small'],
  },
  {
    id: 'glass-scatter-2x2',
    family: 'glass',
    fileName: 'glass-scatter-128.svg',
    widthTiles: 2,
    heightTiles: 2,
    weight: 2,
    tags: ['scatter', 'large'],
  },
  {
    id: 'glass-burst-2x2',
    family: 'glass',
    fileName: 'glass-burst-128.svg',
    widthTiles: 2,
    heightTiles: 2,
    weight: 1,
    tags: ['burst', 'large', 'rare'],
  },
  {
    id: 'chalk-numbers-1x1',
    family: 'chalk',
    fileName: 'chalk-numbers-128.svg',
    widthTiles: 1,
    heightTiles: 1,
    weight: 2,
    tags: ['numbers'],
  },
  {
    id: 'chalk-arrows-2x1',
    family: 'chalk',
    fileName: 'chalk-arrows-128.svg',
    widthTiles: 2,
    heightTiles: 1,
    weight: 3,
    tags: ['arrows', 'linear'],
  },
  {
    id: 'chalk-grid-2x2',
    family: 'chalk',
    fileName: 'chalk-grid-128.svg',
    widthTiles: 2,
    heightTiles: 2,
    weight: 2,
    tags: ['grid', 'large'],
  },
  {
    id: 'dust-light-2x2',
    family: 'dust',
    fileName: 'dust-light-128.svg',
    widthTiles: 2,
    heightTiles: 2,
    weight: 2,
    tags: ['light', 'large', 'soft'],
  },
  {
    id: 'dust-patch-2x2',
    family: 'dust',
    fileName: 'dust-patch-128.svg',
    widthTiles: 2,
    heightTiles: 2,
    weight: 3,
    tags: ['patch', 'large', 'soft'],
  },
  {
    id: 'dust-trail-2x1',
    family: 'dust',
    fileName: 'dust-trail-128.svg',
    widthTiles: 2,
    heightTiles: 1,
    weight: 4,
    tags: ['trail', 'linear', 'soft'],
  },
  {
    id: 'footprints-dusty-2x1',
    family: 'footprints',
    fileName: 'footprints-dusty-128.svg',
    widthTiles: 2,
    heightTiles: 1,
    weight: 3,
    tags: ['trail', 'linear', 'footprints'],
  },
  {
    id: 'footprints-wet-2x1',
    family: 'footprints',
    fileName: 'footprints-wet-128.svg',
    widthTiles: 2,
    heightTiles: 1,
    weight: 2,
    tags: ['trail', 'linear', 'footprints'],
  },
  {
    id: 'stains-spots-1x1',
    family: 'stains',
    fileName: 'stains-spots-128.svg',
    widthTiles: 1,
    heightTiles: 1,
    weight: 4,
    tags: ['spots', 'small'],
  },
  {
    id: 'stains-patch-2x2',
    family: 'stains',
    fileName: 'stains-patch-128.svg',
    widthTiles: 2,
    heightTiles: 2,
    weight: 3,
    tags: ['patch', 'large'],
  },
  {
    id: 'stains-trail-1x2',
    family: 'stains',
    fileName: 'stains-trail-128.svg',
    widthTiles: 1,
    heightTiles: 2,
    weight: 3,
    tags: ['trail', 'linear'],
  },
  {
    id: 'marks-lane-2x1',
    family: 'marks',
    fileName: 'marks-lane-128.svg',
    widthTiles: 2,
    heightTiles: 1,
    weight: 3,
    tags: ['lane', 'linear'],
  },
  {
    id: 'marks-corner-2x2',
    family: 'marks',
    fileName: 'marks-corner-128.svg',
    widthTiles: 2,
    heightTiles: 2,
    mask: L_CORNER_MASK,
    weight: 2,
    tags: ['corner', 'shape-l'],
  },
  {
    id: 'marks-dashes-2x1',
    family: 'marks',
    fileName: 'marks-dashes-128.svg',
    widthTiles: 2,
    heightTiles: 1,
    weight: 3,
    tags: ['dashes', 'linear'],
  },
]);

export const OVERLAY_FAMILY_WEIGHTS = Object.freeze({
  puddle: 10,
  cable: 6,
  tape: 10,
  oil: 10,
  sand: 6,
  grass: 3,
  debris: 6,
  scorch: 3,
  paint: 6,
  paper: 4,
  glass: 4,
  chalk: 4,
  dust: 5,
  footprints: 4,
  stains: 6,
  marks: 4,
});

export const DECORATIVE_OVERLAY_PRESETS = Object.freeze(
  OVERLAY_PRESET_DEFINITIONS.map((preset) => createOverlayPreset(preset)),
);

export const DECORATIVE_OVERLAY_PRESET_IDS = DECORATIVE_OVERLAY_PRESETS.map((preset) => preset.id);

export const DECORATIVE_OVERLAY_PRESET_INDEX = Object.fromEntries(
  DECORATIVE_OVERLAY_PRESETS.map((preset) => [preset.id, preset]),
);

const OVERLAY_FAMILIES = Object.freeze(Object.keys(OVERLAY_FAMILY_WEIGHTS));

export const DECORATIVE_OVERLAY_PRESETS_BY_FAMILY = Object.freeze(
  Object.fromEntries(
    OVERLAY_FAMILIES.map((family) => [
      family,
      DECORATIVE_OVERLAY_PRESETS.filter((preset) => preset.family === family),
    ]),
  ),
);

export function getDecorativeOverlayPreset(presetId) {
  return DECORATIVE_OVERLAY_PRESET_INDEX[presetId] ?? null;
}

export function getDecorativeOverlayPresetsForFamily(family) {
  return DECORATIVE_OVERLAY_PRESETS_BY_FAMILY[family] ?? [];
}
