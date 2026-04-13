export function createAppBootstrap(context) {
  const {
    bindAppControls,
    initializeGame,
    detectNearbyTraps,
    renderSelf,
    syncStartModalControls,
  } = context;

  function bootstrapApp() {
    bindAppControls();
    initializeGame();
    detectNearbyTraps();
    renderSelf();
    syncStartModalControls();
  }

  return {
    bootstrapApp,
  };
}
