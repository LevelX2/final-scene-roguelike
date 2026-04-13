export function createShowcaseAmbienceApi(context) {
  const {
    getState,
    getCurrentFloorState,
    DISPLAY_CASE_AMBIENCE,
    randomInt,
    addMessage,
    showFloatingText,
    playShowcaseAmbienceSound,
  } = context;

  function getShowcaseAt(x, y, floorState = getCurrentFloorState()) {
    return floorState?.showcases?.find((showcase) => showcase.x === x && showcase.y === y) ?? null;
  }

  function getRoomIndexAtPosition(position, floorState = getCurrentFloorState()) {
    return floorState?.rooms?.findIndex((room) =>
      position.x >= room.x &&
      position.x < room.x + room.width &&
      position.y >= room.y &&
      position.y < room.y + room.height
    ) ?? -1;
  }

  function maybeTriggerShowcaseAmbience() {
    const state = getState();
    const floorState = getCurrentFloorState();
    if (!floorState?.rooms?.length || !floorState?.showcases?.length) {
      return;
    }

    floorState.showcaseAmbienceSeen = floorState.showcaseAmbienceSeen ?? {};
    const roomIndex = getRoomIndexAtPosition(state.player, floorState);
    if (roomIndex < 0 || floorState.showcaseAmbienceSeen[roomIndex]) {
      return;
    }

    const room = floorState.rooms[roomIndex];
    const showcasesInRoom = floorState.showcases.filter((showcase) =>
      showcase.x >= room.x &&
      showcase.x < room.x + room.width &&
      showcase.y >= room.y &&
      showcase.y < room.y + room.height
    );
    if (!showcasesInRoom.length) {
      return;
    }

    const selectedShowcase = showcasesInRoom[randomInt(0, showcasesInRoom.length - 1)];
    const lines = DISPLAY_CASE_AMBIENCE[selectedShowcase.item.ambienceId] ?? [];
    if (!lines.length) {
      floorState.showcaseAmbienceSeen[roomIndex] = true;
      return;
    }

    const line = lines[randomInt(0, lines.length - 1)];
    addMessage(line, "important");
    showFloatingText(
      selectedShowcase.x,
      selectedShowcase.y,
      line,
      "showcase",
      {
        title: selectedShowcase.item.source ?? selectedShowcase.item.name,
        duration: 4800,
      },
    );
    playShowcaseAmbienceSound();
    floorState.showcaseAmbienceSeen[roomIndex] = true;
  }

  return {
    getShowcaseAt,
    getRoomIndexAtPosition,
    maybeTriggerShowcaseAmbience,
  };
}
