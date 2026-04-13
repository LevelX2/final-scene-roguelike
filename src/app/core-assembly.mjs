export function assembleCoreModules(context) {
  const { factories, config, runtime, equipment, ui } = context;
  const {
    createItemizationApi,
    createAudioService,
    createDoorService,
    createTrapsApi,
    createDungeonApi,
    createVisibilityService,
    createStateApi,
    createSavegameService,
  } = factories;
  const {
    ITEM_RARITY_MODIFIER_COUNTS,
    getEquipmentRarityWeights,
    DOOR_TYPE,
    WIDTH,
    HEIGHT,
    ROOM_ATTEMPTS,
    MIN_ROOM_SIZE,
    MAX_ROOM_SIZE,
    TILE,
    MONSTER_CATALOG,
    WEAPON_CATALOG,
    OFFHAND_CATALOG,
    PROP_CATALOG,
    LOCK_COLORS,
    buildFoodItemsForBudget,
    rollFoodBudget,
    splitFoodBudget,
    rollMonsterPlannedDrop,
    getUnlockedMonsterRank,
    getEnemyCountForFloor,
    getPotionCountForFloor,
    shouldSpawnFloorWeapon,
    shouldSpawnChest,
    getChestCountForFloor,
    getLockedDoorCountForFloor,
    shouldPlaceLockedRoomChest,
    NON_ICONIC_MONSTER_WEIGHT_BONUS,
    ICONIC_MONSTER_WEIGHT_PENALTY,
    VISION_RADIUS,
    HIGHSCORE_KEY,
    HIGHSCORE_STORAGE_VERSION,
    HIGHSCORE_VERSION_KEY,
    OPTIONS_KEY,
    HERO_NAME_KEY,
    HERO_CLASS_KEY,
    DEFAULT_HERO_NAME,
    DEFAULT_HERO_CLASS,
    HERO_CLASSES,
    formatStudioLabel,
    formatArchetypeLabel,
    buildStudioAnnouncement,
  } = config;
  const {
    getState,
    setState,
    getCurrentFloorState,
    addMessage,
    randomChance,
    randomInt,
    createGrid,
    carveRoom,
    carveTunnel,
    roomsOverlap,
    showFloatingText,
    healPlayer,
    refreshNutritionState,
    grantExperience,
    createDeathCause,
    saveHighscoreIfNeeded,
    showDeathModal,
    renderSelf,
  } = runtime;
  const {
    cloneOffHandItem,
    createBareHandsWeapon,
  } = equipment;
  const {
    savegameStatusElement,
    startSavegameStatusElement,
    landingSavegameStatusElement,
    loadGameButtonElement,
    loadGameFromLandingButtonElement,
    saveGameButtonElement,
  } = ui;

  const itemizationApi = createItemizationApi({
    ITEM_RARITY_MODIFIER_COUNTS,
    getEquipmentRarityWeights,
    randomChance,
    randomInt,
  });

  const audioService = createAudioService({
    getState,
  });

  const doorService = createDoorService({
    DOOR_TYPE,
    getState,
    getCurrentFloorState,
    addMessage,
    playDoorOpenSound: () => audioService.playDoorOpenSound(),
    playDoorCloseSound: () => audioService.playDoorCloseSound(),
  });

  const trapsApi = createTrapsApi({
    randomInt,
    randomChance,
    getState,
    getCurrentFloorState,
    addMessage,
    showFloatingText,
    healPlayer,
    refreshNutritionState,
    grantExperience,
    createDeathCause,
    saveHighscoreIfNeeded,
    showDeathModal,
    playDeathSound: () => audioService.playDeathSound(),
  });

  const dungeonApi = createDungeonApi({
    WIDTH,
    HEIGHT,
    ROOM_ATTEMPTS,
    MIN_ROOM_SIZE,
    MAX_ROOM_SIZE,
    TILE,
    MONSTER_CATALOG,
    WEAPON_CATALOG,
    OFFHAND_CATALOG,
    PROP_CATALOG,
    DOOR_TYPE,
    LOCK_COLORS,
    buildFoodItemsForBudget,
    rollFoodBudget,
    splitFoodBudget,
    rollMonsterPlannedDrop,
    getUnlockedMonsterRank,
    getEnemyCountForFloor,
    getPotionCountForFloor,
    shouldSpawnFloorWeapon,
    shouldSpawnChest,
    getChestCountForFloor,
    getLockedDoorCountForFloor,
    shouldPlaceLockedRoomChest,
    NON_ICONIC_MONSTER_WEIGHT_BONUS,
    ICONIC_MONSTER_WEIGHT_PENALTY,
    buildTrapsForFloor: trapsApi.buildTrapsForFloor,
    generateEquipmentItem: itemizationApi.generateEquipmentItem,
    randomInt,
    createGrid: () => createGrid(WIDTH, HEIGHT, TILE.WALL),
    carveRoom: (grid, room) => carveRoom(grid, room, TILE.FLOOR),
    carveTunnel: (grid, start, end) => carveTunnel(grid, start, end, TILE.FLOOR),
    roomsOverlap,
    cloneOffHandItem,
    getState,
  });

  const visibilityService = createVisibilityService({
    WIDTH,
    HEIGHT,
    VISION_RADIUS,
    TILE,
    getState,
    getCurrentFloorState,
    getDoorAt: doorService.getDoorAt,
    isDoorClosed: doorService.isDoorClosed,
    createGrid,
    getEquippedLightBonus: (actor) => actor?.mainHand?.lightBonus ?? 0,
  });

  const stateApi = createStateApi({
    HIGHSCORE_KEY,
    HIGHSCORE_STORAGE_VERSION,
    HIGHSCORE_VERSION_KEY,
    OPTIONS_KEY,
    HERO_NAME_KEY,
    HERO_CLASS_KEY,
    DEFAULT_HERO_NAME,
    DEFAULT_HERO_CLASS,
    HERO_CLASSES,
    getState,
    setState,
    createBareHandsWeapon,
    generateEquipmentItem: itemizationApi.generateEquipmentItem,
    createDungeonLevel: dungeonApi.createDungeonLevel,
    updateVisibility: visibilityService.updateVisibility,
    addMessage,
    formatStudioLabel,
    formatArchetypeLabel,
    buildStudioAnnouncement,
    playStudioAnnouncement: (text) => audioService.playStudioAnnouncement(text),
    renderSelf,
    randomInt,
  });

  const savegameService = createSavegameService({
    getState,
    hasSavedGame: stateApi.hasSavedGame,
    getSavedGameMetadata: stateApi.getSavedGameMetadata,
    saveGame: stateApi.saveGame,
    loadSavedGame: stateApi.loadSavedGame,
    setSavegameStatus: (text) => {
      savegameStatusElement.textContent = text;
      startSavegameStatusElement.textContent = text;
      landingSavegameStatusElement.textContent = text;
    },
    setLoadButtonsDisabled: (disabled) => {
      loadGameButtonElement.disabled = disabled;
      loadGameFromLandingButtonElement.disabled = disabled;
    },
    setSaveButtonDisabled: (disabled) => {
      saveGameButtonElement.disabled = disabled;
    },
    detectNearbyTraps: trapsApi.detectNearbyTraps,
    addMessage,
    renderSelf,
    focusGameSurface: ui.focusGameSurface,
  });

  return {
    ...itemizationApi,
    ...audioService,
    ...doorService,
    ...trapsApi,
    ...dungeonApi,
    ...visibilityService,
    ...stateApi,
    ...savegameService,
  };
}
