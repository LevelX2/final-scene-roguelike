import { createItemizationApi } from '../itemization.mjs';
import { createTrapsApi } from '../traps.mjs';
import { createDungeonApi } from '../dungeon.mjs';
import { createStateApi } from '../state.mjs';
import { createRenderApi } from '../render.mjs';
import { createCombatApi } from '../combat.mjs';
import { createAiApi } from '../ai.mjs';
import { createItemsApi } from '../items.mjs';
import { createTestApi } from '../test-api.mjs';
import { createAudioService } from '../application/audio-service.mjs';
import { createDoorService } from '../application/door-service.mjs';
import { createFloorTransitionService } from '../application/floor-transition-service.mjs';
import { createInputController } from '../application/input-controller.mjs';
import { createModalController } from '../application/modal-controller.mjs';
import { createPlayerTurnController } from '../application/player-turn-controller.mjs';
import { createSavegameService } from '../application/savegame-service.mjs';
import { createVisibilityService } from '../application/visibility-service.mjs';

export const appFactories = {
  createItemizationApi,
  createAudioService,
  createDoorService,
  createTrapsApi,
  createDungeonApi,
  createVisibilityService,
  createStateApi,
  createSavegameService,
  createRenderApi,
  createModalController,
  createInputController,
  createCombatApi,
  createAiApi,
  createItemsApi,
  createFloorTransitionService,
  createPlayerTurnController,
  createTestApi,
};
