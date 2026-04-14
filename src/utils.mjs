import { defaultRandomChance } from './utils/random-tools.mjs';

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function randomInt(min, max) {
  return Math.floor(defaultRandomChance() * (max - min + 1)) + min;
}

export function createGrid(width, height, fillValue) {
  return Array.from({ length: height }, () => Array(width).fill(fillValue));
}

export function carveRoom(grid, room, floorTile) {
  for (let y = room.y; y < room.y + room.height; y += 1) {
    for (let x = room.x; x < room.x + room.width; x += 1) {
      grid[y][x] = floorTile;
    }
  }
}

export function carveTunnel(grid, start, end, floorTile) {
  let x = start.x;
  let y = start.y;

  while (x !== end.x) {
    grid[y][x] = floorTile;
    x += x < end.x ? 1 : -1;
  }

  while (y !== end.y) {
    grid[y][x] = floorTile;
    y += y < end.y ? 1 : -1;
  }

  grid[y][x] = floorTile;
}

export function roomsOverlap(a, b) {
  return !(
    a.x + a.width + 1 < b.x ||
    b.x + b.width + 1 < a.x ||
    a.y + a.height + 1 < b.y ||
    b.y + b.height + 1 < a.y
  );
}
