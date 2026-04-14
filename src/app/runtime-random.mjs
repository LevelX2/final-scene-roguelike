import { defaultRandomChance } from '../utils/random-tools.mjs';

export function createRuntimeRandomApi() {
  let testRandomQueue = [];

  function randomChance() {
    if (testRandomQueue.length > 0) {
      return testRandomQueue.shift();
    }
    return defaultRandomChance();
  }

  function rollPercent(chance) {
    return randomChance() * 100 < chance;
  }

  function randomInt(min, max) {
    return Math.floor(randomChance() * (max - min + 1)) + min;
  }

  return {
    randomChance,
    rollPercent,
    randomInt,
    setRandomSequence(values) {
      testRandomQueue = [...values];
    },
    clearRandomSequence() {
      testRandomQueue = [];
    },
  };
}
