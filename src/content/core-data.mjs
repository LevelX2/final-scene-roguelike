export const WIDTH = 50;
export const HEIGHT = 36;
export const TILE_SIZE = 28;
export const TILE_GAP = 0;
export const BOARD_PADDING = 8;
export const LOG_LIMIT = 20;
export const HIGHSCORE_KEY = "dungeon-rogue-highscores";
export const HIGHSCORE_STORAGE_VERSION = "2";
export const HIGHSCORE_VERSION_KEY = "dungeon-rogue-highscores-version";
export const HIGHSCORE_LAST_ENTRY_KEY = "dungeon-rogue-highscores-last-entry";
export {
  ROOM_ATTEMPTS,
  MIN_ROOM_SIZE,
  MAX_ROOM_SIZE,
  VISION_RADIUS,
  BASE_HIT_CHANCE,
  MIN_HIT_CHANCE,
  MAX_HIT_CHANCE,
  MIN_CRIT_CHANCE,
  MAX_CRIT_CHANCE,
} from '../balance.mjs';

export const TILE = {
  WALL: "#",
  FLOOR: ".",
  PLAYER: "@",
  ENEMY: "G",
  POTION: "!",
  KEY: "k",
  DOOR_CLOSED: "+",
  DOOR_OPEN: "/",
  STAIRS_DOWN: ">",
  STAIRS_UP: "<",
  CHEST: "C",
  SHOWCASE: "V",
};

export const DOOR_TYPE = {
  NONE: "none",
  NORMAL: "normal",
  LOCKED: "locked",
};

export const LOCK_COLORS = ["green", "blue"];
