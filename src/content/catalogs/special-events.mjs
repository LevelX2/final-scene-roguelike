import { weightedPick } from '../../utils/random-tools.mjs';

const INTENSITY_ORDER = ['small', 'medium', 'large'];

export const SPECIAL_EVENT_MONSTER_IDS = Object.freeze([
  'event-requisitenwusler',
  'event-kabelbeisser',
  'event-kulissenkrabbler',
  'event-hektischer-setlaeufer',
]);

export const SPECIAL_EVENT_RECIPES = Object.freeze([
  Object.freeze({
    id: 'reactor_leak_stunt_course',
    label: 'Reaktorleck',
    allowedArchetypes: Object.freeze(['space_opera', 'action', 'adventure', 'creature_feature']),
    preferredRooms: Object.freeze(['hazard_room', 'trap_room']),
    fallbackRooms: Object.freeze(['props_room', 'aggro_room']),
    minFloor: 2,
    weight: 10,
    introLog: 'Warnlichter flackern über dem Boden. Diese Szene ist nicht mehr nur Kulisse.',
    floatingText: 'Reaktorleck',
    trapProfile: Object.freeze({
      small: Object.freeze({ hazard: 2, floor: 0, alarm: 0 }),
      medium: Object.freeze({ hazard: 3, floor: 1, alarm: 0 }),
      large: Object.freeze({ hazard: 4, floor: 1, alarm: 1 }),
    }),
    rewardProfile: Object.freeze({
      consumables: Object.freeze({ small: 1, medium: 1, large: 2 }),
      chest: Object.freeze({ small: 0, medium: 0, large: 1 }),
    }),
    enemyProfile: Object.freeze({
      roleProfiles: Object.freeze(['skirmisher', 'trickster', 'marksman']),
      counts: Object.freeze({ small: 0, medium: 1, large: 1 }),
      forceVariantByIntensity: Object.freeze({ large: 'elite' }),
    }),
  }),
  Object.freeze({
    id: 'set_chaos_crew',
    label: 'Chaoscrew am Set',
    allowedArchetypes: Object.freeze(['romcom', 'creature_feature', 'slasher', 'social_drama']),
    preferredRooms: Object.freeze(['props_room', 'canteen', 'aggro_room']),
    fallbackRooms: Object.freeze(['connector_room']),
    minFloor: 2,
    weight: 12,
    introLog: 'Unter den Requisiten bricht hektisches Rascheln los. Das Set lebt plötzlich gegen dich.',
    floatingText: 'Chaoscrew',
    trapProfile: Object.freeze({
      small: Object.freeze({ hazard: 0, floor: 0, alarm: 0 }),
      medium: Object.freeze({ hazard: 0, floor: 0, alarm: 1 }),
      large: Object.freeze({ hazard: 1, floor: 0, alarm: 1 }),
    }),
    rewardProfile: Object.freeze({
      food: Object.freeze({ small: 1, medium: 2, large: 2 }),
      consumables: Object.freeze({ small: 0, medium: 1, large: 1 }),
    }),
    enemyProfile: Object.freeze({
      monsterIds: SPECIAL_EVENT_MONSTER_IDS,
      counts: Object.freeze({ small: 3, medium: 4, large: 5 }),
    }),
  }),
  Object.freeze({
    id: 'reliquary_guardian',
    label: 'Reliquienschrein',
    allowedArchetypes: Object.freeze(['fantasy', 'adventure', 'noir', 'slasher']),
    preferredRooms: Object.freeze(['showcase_room']),
    fallbackRooms: Object.freeze(['props_room', 'costume_room']),
    minFloor: 3,
    weight: 8,
    introLog: 'Zwischen den Vitrinen liegt eine unnatürliche Ruhe. Etwas bewacht diesen Fund.',
    floatingText: 'Reliquienschrein',
    trapProfile: Object.freeze({
      small: Object.freeze({ hazard: 0, floor: 0, alarm: 0 }),
      medium: Object.freeze({ hazard: 0, floor: 1, alarm: 0 }),
      large: Object.freeze({ hazard: 0, floor: 1, alarm: 1 }),
    }),
    rewardProfile: Object.freeze({
      consumables: Object.freeze({ small: 1, medium: 1, large: 1 }),
      chest: Object.freeze({ small: 0, medium: 1, large: 1 }),
    }),
    enemyProfile: Object.freeze({
      roleProfiles: Object.freeze(['guardian', 'juggernaut', 'stalker']),
      counts: Object.freeze({ small: 1, medium: 1, large: 2 }),
      forceVariantByIntensity: Object.freeze({ medium: 'elite', large: 'elite' }),
    }),
  }),
]);

export function getSpecialEventChanceForFloor(floorNumber) {
  if (floorNumber <= 1) {
    return 0.2;
  }
  if (floorNumber <= 3) {
    return 0.55;
  }
  if (floorNumber <= 6) {
    return 0.75;
  }
  return 0.85;
}

export function getSpecialEventIntensityWeights(floorNumber) {
  if (floorNumber <= 1) {
    return [{ value: 'small', weight: 1 }];
  }
  if (floorNumber <= 3) {
    return [
      { value: 'small', weight: 0.65 },
      { value: 'medium', weight: 0.35 },
    ];
  }
  if (floorNumber <= 6) {
    return [
      { value: 'small', weight: 0.35 },
      { value: 'medium', weight: 0.5 },
      { value: 'large', weight: 0.15 },
    ];
  }
  return [
    { value: 'small', weight: 0.2 },
    { value: 'medium', weight: 0.5 },
    { value: 'large', weight: 0.3 },
  ];
}

export function intensityAtMost(intensity, maximum) {
  const intensityIndex = INTENSITY_ORDER.indexOf(intensity);
  const maximumIndex = INTENSITY_ORDER.indexOf(maximum);
  if (intensityIndex < 0 || maximumIndex < 0) {
    return 'small';
  }
  return INTENSITY_ORDER[Math.min(intensityIndex, maximumIndex)];
}

export function rollSpecialEventRecipe({
  floorNumber,
  studioArchetypeId,
  roomRoles = [],
  randomChance = Math.random,
} = {}) {
  if (randomChance() >= getSpecialEventChanceForFloor(floorNumber)) {
    return null;
  }

  const roomRoleSet = new Set(roomRoles);
  const candidates = SPECIAL_EVENT_RECIPES
    .filter((recipe) =>
      floorNumber >= recipe.minFloor &&
      recipe.allowedArchetypes.includes(studioArchetypeId) &&
      [...recipe.preferredRooms, ...recipe.fallbackRooms].some((role) => roomRoleSet.has(role))
    )
    .map((recipe) => ({ recipe, weight: recipe.weight }));

  const recipe = weightedPick(candidates, randomChance)?.recipe ?? null;
  if (!recipe) {
    return null;
  }

  const intensity = weightedPick(getSpecialEventIntensityWeights(floorNumber), randomChance)?.value ?? 'small';
  return {
    recipe,
    intensity,
  };
}

function createSpecialTrapBase(type, variantId, x, y, effect, overrides = {}) {
  const isHazard = type === 'hazard';
  return {
    id: `special-${variantId}-${x}-${y}`,
    type,
    name: overrides.name,
    description: overrides.description,
    visibility: isHazard ? 'visible' : 'hidden',
    state: 'active',
    trigger: isHazard ? 'continuous' : 'on_enter',
    resetMode: isHazard ? 'persistent' : 'single_use',
    affectsPlayer: true,
    affectsEnemies: type === 'floor' || isHazard,
    x,
    y,
    detectDifficulty: isHazard ? undefined : 4,
    reactDifficulty: isHazard ? undefined : 3,
    effect,
    specialEventId: overrides.specialEventId ?? null,
  };
}

export function createSpecialEventTrap(type, x, y, { specialEventId = null, randomInt = null } = {}) {
  const roll = typeof randomInt === 'function' ? randomInt(0, 1) : 0;
  if (type === 'alarm') {
    return createSpecialTrapBase('alarm', roll === 0 ? 'cue-light-alarm' : 'panic-cable', x, y, { alarm: true }, {
      name: roll === 0 ? 'Cue-Light-Alarm' : 'Panik-Kabel',
      description: 'Ein falscher Schritt reißt Licht und Lärm durch das Set.',
      specialEventId,
    });
  }
  if (type === 'floor') {
    return createSpecialTrapBase('floor', roll === 0 ? 'stunt-pressure-plate' : 'set-snap-panel', x, y, { damage: 4 }, {
      name: roll === 0 ? 'Stunt-Druckplatte' : 'Schnappende Setplatte',
      description: 'Der Boden ist für eine Stuntszene präpariert und wartet auf Gewicht.',
      specialEventId,
    });
  }
  return createSpecialTrapBase('hazard', roll === 0 ? 'reactor-sparks' : 'hot-cable-run', x, y, { damage: 2 }, {
    name: roll === 0 ? 'Reaktorfunken' : 'Heißer Kabelzug',
    description: 'Sichtbare Energie springt über den Boden und macht jeden Schritt teuer.',
    specialEventId,
  });
}

export function announceSpecialEventAtPosition(floorState, position, { addMessage, showFloatingText } = {}) {
  if (!floorState || !position || !Array.isArray(floorState.specialEvents)) {
    return false;
  }

  const room = (floorState.rooms ?? []).find((candidate) =>
    candidate?.floorTiles?.some((tile) => tile.x === position.x && tile.y === position.y)
  );
  if (!room) {
    return false;
  }

  const event = floorState.specialEvents.find((entry) =>
    entry?.roomId === room.id && !entry.announced
  );
  if (!event) {
    return false;
  }

  event.announced = true;
  addMessage?.(event.introLog ?? `${event.label ?? 'Eine besondere Szene'} beginnt.`, 'important');
  const floatingPosition = event.announcementPosition ?? position;
  showFloatingText?.(
    floatingPosition.x,
    floatingPosition.y,
    event.floatingText ?? event.label ?? 'Setpiece',
    'important',
  );
  return true;
}
