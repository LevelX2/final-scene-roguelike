import { createAiAwarenessApi } from './ai/awareness.mjs';
import { createEnemyTurnApi } from './ai/enemy-turns.mjs';

export function createAiApi(context) {
  const awarenessApi = createAiAwarenessApi(context);
  const enemyTurnApi = createEnemyTurnApi({
    ...context,
    ...awarenessApi,
  });

  return {
    ...awarenessApi,
    ...enemyTurnApi,
  };
}
