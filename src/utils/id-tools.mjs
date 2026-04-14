import { defaultRandomChance } from './random-tools.mjs';

const ID_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

export function createRandomIdSegment(length = 6, randomChance = defaultRandomChance) {
  let segment = '';
  for (let index = 0; index < length; index += 1) {
    const nextIndex = Math.floor(randomChance() * ID_ALPHABET.length);
    segment += ID_ALPHABET[nextIndex] ?? ID_ALPHABET[0];
  }
  return segment;
}

export function createTimestampedId(prefix = '', options = {}) {
  const {
    length = 6,
    randomChance = defaultRandomChance,
    now = () => Date.now(),
  } = options;
  const timestamp = now();
  const segment = createRandomIdSegment(length, randomChance);
  return prefix ? `${prefix}-${timestamp}-${segment}` : `${timestamp}-${segment}`;
}
