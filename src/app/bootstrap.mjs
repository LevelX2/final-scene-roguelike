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
    initializeGame({}, { openStartModal: false, view: "start" });
    detectNearbyTraps();
    renderSelf();
    syncStartModalControls();
  }

  return {
    bootstrapApp,
  };
}
