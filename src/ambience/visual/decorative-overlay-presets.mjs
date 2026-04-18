/**
 * @typedef {"puddle" | "cable" | "tape" | "oil" | "sand" | "grass" | "debris" | "scorch"} OverlayFamily
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

export const OVERLAY_FAMILY_WEIGHTS = {
  puddle: 10,
  cable: 6,
  tape: 10,
  oil: 10,
  sand: 6,
  grass: 3,
  debris: 6,
  scorch: 3,
};

export const DECORATIVE_OVERLAY_PRESETS = [
  createOverlayPreset({
    id: "puddle-small-1x1",
    family: "puddle",
    fileName: "puddle-small-1x1.svg",
    widthTiles: 1,
    heightTiles: 1,
    weight: 5,
    tags: ["small", "common"],
  }),
  createOverlayPreset({
    id: "puddle-wide-2x1",
    family: "puddle",
    fileName: "puddle-wide-2x1.svg",
    widthTiles: 2,
    heightTiles: 1,
    weight: 4,
    tags: ["wide", "common"],
  }),
  createOverlayPreset({
    id: "puddle-large-2x2",
    family: "puddle",
    fileName: "puddle-large-2x2.svg",
    widthTiles: 2,
    heightTiles: 2,
    weight: 2,
    tags: ["large"],
  }),
  createOverlayPreset({
    id: "cable-straight-1x3",
    family: "cable",
    fileName: "cable-straight-1x3.svg",
    widthTiles: 1,
    heightTiles: 3,
    weight: 4,
    tags: ["long", "linear"],
  }),
  createOverlayPreset({
    id: "cable-corner-2x2",
    family: "cable",
    fileName: "cable-corner-2x2.svg",
    widthTiles: 2,
    heightTiles: 2,
    mask: createMask([
      { x: 0, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
    ]),
    weight: 3,
    tags: ["corner", "shape-l"],
  }),
  createOverlayPreset({
    id: "cable-snake-3x2",
    family: "cable",
    fileName: "cable-snake-3x2.svg",
    widthTiles: 3,
    heightTiles: 2,
    mask: createMask([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
    ]),
    weight: 2,
    tags: ["large", "organic"],
  }),
  createOverlayPreset({
    id: "tape-short-1x2",
    family: "tape",
    fileName: "tape-short-1x2.svg",
    widthTiles: 1,
    heightTiles: 2,
    weight: 5,
    tags: ["short", "linear"],
  }),
  createOverlayPreset({
    id: "tape-long-1x4",
    family: "tape",
    fileName: "tape-long-1x4.svg",
    widthTiles: 1,
    heightTiles: 4,
    weight: 3,
    tags: ["long", "linear"],
  }),
  createOverlayPreset({
    id: "tape-corner-2x2",
    family: "tape",
    fileName: "tape-corner-2x2.svg",
    widthTiles: 2,
    heightTiles: 2,
    mask: createMask([
      { x: 0, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
    ]),
    weight: 2,
    tags: ["corner", "shape-l"],
  }),
  createOverlayPreset({
    id: "oil-streak-1x2",
    family: "oil",
    fileName: "oil-streak-1x2.svg",
    widthTiles: 1,
    heightTiles: 2,
    weight: 5,
    tags: ["streak", "common"],
  }),
  createOverlayPreset({
    id: "oil-patch-2x2",
    family: "oil",
    fileName: "oil-patch-2x2.svg",
    widthTiles: 2,
    heightTiles: 2,
    weight: 3,
    tags: ["patch", "common"],
  }),
  createOverlayPreset({
    id: "sand-small-2x2",
    family: "sand",
    fileName: "sand-small-2x2.svg",
    widthTiles: 2,
    heightTiles: 2,
    weight: 3,
    tags: ["small"],
  }),
  createOverlayPreset({
    id: "sand-wide-3x2",
    family: "sand",
    fileName: "sand-wide-3x2.svg",
    widthTiles: 3,
    heightTiles: 2,
    weight: 2,
    tags: ["wide", "large"],
  }),
  createOverlayPreset({
    id: "grass-patch-2x2",
    family: "grass",
    fileName: "grass-patch-2x2.svg",
    widthTiles: 2,
    heightTiles: 2,
    weight: 2,
    tags: ["patch", "rare"],
  }),
  createOverlayPreset({
    id: "debris-small-1x1",
    family: "debris",
    fileName: "debris-small-1x1.svg",
    widthTiles: 1,
    heightTiles: 1,
    weight: 4,
    tags: ["small"],
  }),
  createOverlayPreset({
    id: "debris-cluster-2x2",
    family: "debris",
    fileName: "debris-cluster-2x2.svg",
    widthTiles: 2,
    heightTiles: 2,
    weight: 3,
    tags: ["cluster"],
  }),
  createOverlayPreset({
    id: "scorch-small-1x1",
    family: "scorch",
    fileName: "scorch-small-1x1.svg",
    widthTiles: 1,
    heightTiles: 1,
    weight: 3,
    tags: ["small", "rare"],
  }),
  createOverlayPreset({
    id: "scorch-large-2x2",
    family: "scorch",
    fileName: "scorch-large-2x2.svg",
    widthTiles: 2,
    heightTiles: 2,
    weight: 1,
    tags: ["large", "rare"],
  }),
];

export const DECORATIVE_OVERLAY_PRESET_IDS = DECORATIVE_OVERLAY_PRESETS.map((preset) => preset.id);

export const DECORATIVE_OVERLAY_PRESET_INDEX = Object.fromEntries(
  DECORATIVE_OVERLAY_PRESETS.map((preset) => [preset.id, preset]),
);

export const DECORATIVE_OVERLAY_PRESETS_BY_FAMILY = Object.freeze(
  Object.fromEntries(
    Object.keys(OVERLAY_FAMILY_WEIGHTS).map((family) => [
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
