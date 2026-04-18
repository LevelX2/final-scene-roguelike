export function createShowcaseAmbienceApi(context) {
  const {
    getState,
    getCurrentFloorState,
    DISPLAY_CASE_AMBIENCE,
    randomInt,
    addMessage,
    showFloatingText,
    playShowcaseAmbienceSound,
    playNarration,
  } = context;

  function getShowcaseAnnouncementMode() {
    const configuredMode = getState()?.options?.showcaseAnnouncementMode;
    return ["off", "floating-text", "voice"].includes(configuredMode)
      ? configuredMode
      : "floating-text";
  }

  function getShowcaseAt(x, y, floorState = getCurrentFloorState()) {
    return floorState?.showcases?.find((showcase) => showcase.x === x && showcase.y === y) ?? null;
  }

  function getRoomIndexAtPosition(position, floorState = getCurrentFloorState()) {
    return floorState?.rooms?.findIndex((room) =>
      Array.isArray(room.floorTiles)
        ? room.floorTiles.some((tile) => tile.x === position.x && tile.y === position.y)
        : (
          position.x >= room.x &&
          position.x < room.x + room.width &&
          position.y >= room.y &&
          position.y < room.y + room.height
        )
    ) ?? -1;
  }

  function maybeTriggerShowcaseAmbience() {
    const state = getState();
    const floorState = getCurrentFloorState();
    if (!floorState?.showcases?.length) {
      return;
    }

    floorState.showcaseAmbienceSeen = floorState.showcaseAmbienceSeen ?? {};
    const adjacentShowcaseIndex = floorState.showcases.findIndex((showcase) => {
      const distance = Math.abs(showcase.x - state.player.x) + Math.abs(showcase.y - state.player.y);
      const showcaseKey = showcase.item?.id ?? `${showcase.x},${showcase.y}`;
      return distance === 1 && !floorState.showcaseAmbienceSeen[showcaseKey];
    });
    const adjacentShowcase = adjacentShowcaseIndex >= 0 ? floorState.showcases[adjacentShowcaseIndex] : null;

    if (!adjacentShowcase) {
      return;
    }

    const showcaseKey = adjacentShowcase.item?.id ?? `${adjacentShowcase.x},${adjacentShowcase.y}`;
    const lines = DISPLAY_CASE_AMBIENCE[adjacentShowcase.item.ambienceId] ?? [];
    if (!lines.length) {
      floorState.showcaseAmbienceSeen[showcaseKey] = true;
      floorState.showcaseAmbienceSeen[adjacentShowcaseIndex] = true;
      return;
    }

    const line = lines[randomInt(0, lines.length - 1)];
    const announcementMode = getShowcaseAnnouncementMode();
    if (announcementMode !== "off") {
      addMessage(line, "important");
    }
    if (announcementMode === "floating-text") {
      showFloatingText(
        adjacentShowcase.x,
        adjacentShowcase.y,
        line,
        "showcase",
        {
          title: adjacentShowcase.item.source ?? adjacentShowcase.item.name,
          duration: 4800,
        },
      );
      playShowcaseAmbienceSound();
    } else if (announcementMode === "voice") {
      playNarration?.(line);
    }
    floorState.showcaseAmbienceSeen[showcaseKey] = true;
    floorState.showcaseAmbienceSeen[adjacentShowcaseIndex] = true;
  }

  return {
    getShowcaseAt,
    getRoomIndexAtPosition,
    maybeTriggerShowcaseAmbience,
  };
}
