import { getActorDerivedStat } from '../application/derived-actor-stats.mjs';

const IDLE_PLAN_AGE_LIMITS = Object.freeze({
  stoic: 8,
  patrol: 12,
  restless: 9,
  erratic: 7,
});

const BEHAVIOR_AGGRO_RULES = Object.freeze({
  dormant: Object.freeze({ baseBonus: 0, aggroChance: 0.55 }),
  wanderer: Object.freeze({ baseBonus: 0, roamingBonus: 1, aggroChance: 0.68 }),
  trickster: Object.freeze({ baseBonus: 1, aggroChance: 1 }),
  stalker: Object.freeze({ baseBonus: 1, aggroChance: 1 }),
  hunter: Object.freeze({ baseBonus: 1, relentlessBonus: 1, aggroChance: 1 }),
  juggernaut: Object.freeze({ baseBonus: 0, relentlessBonus: 1, aggroChance: 1 }),
});

const BEHAVIOR_IDLE_CHANCES = Object.freeze({
  dormant: 0.28,
  stalker: 0.22,
  hunter: 0.25,
  juggernaut: 0.15,
  fallback: 0.25,
});

const BEHAVIOR_ACTION_RULES = Object.freeze({
  wanderer: Object.freeze({ aggroChaseChance: 0.78 }),
  trickster: Object.freeze({ aggroChaseChance: 0.8 }),
});

const MOBILITY_AGGRO_RULES = Object.freeze({
  local: Object.freeze({ aggroBreakPadding: 4 }),
  roaming: Object.freeze({ pursuitDetectBonus: 1 }),
  relentless: Object.freeze({ pursuitDetectBonus: 2, keepAggro: true }),
});

const TEMPERAMENT_IDLE_RULES = Object.freeze({
  stoic: Object.freeze({ holdAtAnchorChance: 0.7 }),
  erratic: Object.freeze({ replanMinimumAge: 3, replanChance: 0.18 }),
});

const HEALING_RULES = Object.freeze({
  slow: Object.freeze({ cooldown: 6, heal: 1, requireCalm: false, minimumDistance: 2 }),
  steady: Object.freeze({ cooldown: 4, heal: 1, requireCalm: false, minimumDistance: 2 }),
  lurking: Object.freeze({ cooldown: 3, heal: 1, requireCalm: true, minimumDistance: 2 }),
});

export function getEnemyMobility(enemy) {
  return enemy?.mobility ?? 'roaming';
}

export function getEnemyRetreatProfile(enemy) {
  return enemy?.retreatProfile ?? 'none';
}

export function getEnemyHealingProfile(enemy) {
  return enemy?.healingProfile ?? 'slow';
}

export function getEnemyTemperament(enemy) {
  return enemy?.temperament ?? 'stoic';
}

export function getEnemyMobilityLeash(enemy) {
  return getEnemyMobility(enemy) === 'local' ? 6 : Number.POSITIVE_INFINITY;
}

export function getEnemyIdlePlanAgeLimit(enemy) {
  return IDLE_PLAN_AGE_LIMITS[getEnemyTemperament(enemy)] ?? 9;
}

export function getEnemyIdleExplorationRadius(enemy) {
  const mobility = getEnemyMobility(enemy);
  const temperament = getEnemyTemperament(enemy);
  const baseRadius = mobility === 'local'
    ? 8
    : mobility === 'relentless'
      ? 22
      : 18;

  const temperamentModifier = {
    stoic: -4,
    patrol: 0,
    restless: 3,
    erratic: 2,
  }[temperament] ?? 0;

  return Math.max(6, baseRadius + temperamentModifier);
}

export function getEnemyHealingRules(enemy) {
  return HEALING_RULES[getEnemyHealingProfile(enemy)] ?? null;
}

export function getEnemyIdleChance(enemy) {
  return BEHAVIOR_IDLE_CHANCES[enemy?.behavior] ?? BEHAVIOR_IDLE_CHANCES.fallback;
}

export function getEnemyBehaviorActionRule(enemy) {
  return BEHAVIOR_ACTION_RULES[enemy?.behavior] ?? null;
}

export function getEnemyAggroRule(enemy) {
  return BEHAVIOR_AGGRO_RULES[enemy?.behavior] ?? null;
}

export function getEnemyAggroBreakDistance(enemy) {
  const mobilityRule = MOBILITY_AGGRO_RULES[getEnemyMobility(enemy)];
  if (!mobilityRule?.aggroBreakPadding) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.max(0, (enemy?.aggroRadius ?? 0) + mobilityRule.aggroBreakPadding);
}

export function getEnemyAggroPursuitDetectionBonus(enemy) {
  return MOBILITY_AGGRO_RULES[getEnemyMobility(enemy)]?.pursuitDetectBonus ?? 0;
}

export function shouldEnemyKeepAggroByMobility(enemy) {
  return Boolean(MOBILITY_AGGRO_RULES[getEnemyMobility(enemy)]?.keepAggro);
}

export function getEnemyRetreatMinimumIntelligence(enemy) {
  return getEnemyRetreatProfile(enemy) === 'cowardly' ? 1 : 3;
}

export function getEnemyRetreatDistanceLimit(enemy) {
  const retreatProfile = getEnemyRetreatProfile(enemy);
  if (retreatProfile === 'cowardly') {
    return enemy?.isRetreating ? 6 : 5;
  }
  return enemy?.isRetreating ? 4 : 3;
}

export function getEnemyRetreatHealthThreshold(enemy) {
  return getEnemyRetreatProfile(enemy) === 'cowardly' ? 0.55 : 0.4;
}

export function estimateEnemyBaseStrikeDamage(enemy, weaponDamage = 0, rangedDamagePenalty = 0) {
  return Math.max(1, getActorDerivedStat(enemy, 'strength') + weaponDamage - rangedDamagePenalty);
}

export function getEnemyAggroChaseChance(enemy) {
  return getEnemyBehaviorActionRule(enemy)?.aggroChaseChance ?? 1;
}

export function getEnemyRangedDetectionBonus(enemy, weapon) {
  const weaponRange = Math.max(1, weapon?.range ?? 1);
  return Math.max(0, weaponRange - (enemy?.aggroRadius ?? 0));
}

export function shouldEnemyFallbackFromCloseRange(enemy, weapon, distanceToPlayer) {
  return weapon?.attackMode === 'ranged' && distanceToPlayer <= 2;
}

export function shouldEnemyReplanIdleErratically(enemy, randomChance = Math.random) {
  const temperamentRule = TEMPERAMENT_IDLE_RULES[getEnemyTemperament(enemy)];
  if (!temperamentRule?.replanChance) {
    return false;
  }

  return (enemy?.idlePlanAge ?? 0) >= (temperamentRule.replanMinimumAge ?? Number.POSITIVE_INFINITY)
    && randomChance() < temperamentRule.replanChance;
}

export function shouldEnemyPauseAtIdleTarget(enemy, randomChance = Math.random) {
  const holdChance = TEMPERAMENT_IDLE_RULES[getEnemyTemperament(enemy)]?.holdAtAnchorChance ?? 0;
  return holdChance > 0 && randomChance() < holdChance;
}

export function shouldEnemyAggroFromDetection(enemy, detectsPlayer, randomChance = Math.random) {
  const rule = getEnemyAggroRule(enemy);
  if (!rule) {
    return detectsPlayer();
  }

  const mobility = getEnemyMobility(enemy);
  const rangeBonus = (rule.baseBonus ?? 0)
    + (mobility === 'roaming' ? (rule.roamingBonus ?? 0) : 0)
    + (mobility === 'relentless' ? (rule.relentlessBonus ?? 0) : 0);

  if (!detectsPlayer(rangeBonus)) {
    return false;
  }

  return (rule.aggroChance ?? 1) >= 1
    ? true
    : randomChance() < (rule.aggroChance ?? 1);
}
