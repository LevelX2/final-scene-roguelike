import { createCombatResolutionApi } from './combat/combat-resolution.mjs';
import { createCombatProgressionApi } from './combat/combat-progression.mjs';
import { createPlayerAttackApi } from './combat/player-attack.mjs';

export function createCombatApi(context) {
  const resolutionApi = createCombatResolutionApi(context);
  const progressionApi = createCombatProgressionApi(context);
  const playerAttackApi = createPlayerAttackApi({
    ...context,
    ...resolutionApi,
    ...progressionApi,
  });

  return {
    ...resolutionApi,
    ...progressionApi,
    ...playerAttackApi,
  };
}
