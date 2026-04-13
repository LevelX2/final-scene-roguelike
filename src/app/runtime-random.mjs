export function createRuntimeRandomApi() {
  let testRandomQueue = [];

  function randomChance() {
    if (testRandomQueue.length > 0) {
      return testRandomQueue.shift();
    }
    return Math.random();
  }

  function rollPercent(chance) {
    return randomChance() * 100 < chance;
  }

  return {
    randomChance,
    rollPercent,
    setRandomSequence(values) {
      testRandomQueue = [...values];
    },
    clearRandomSequence() {
      testRandomQueue = [];
    },
  };
}
