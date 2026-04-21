const { test, expect } = require("playwright/test");
require("./test-setup");
const { openDownstairsPrompt, setupDoorAtPlayerStep, setupKeyAtPlayerStep, setupTrapAtPlayerStep, startRun } = require("./helpers");

test("player can move with keyboard input", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  const initialIndex = await page.locator(".board .tile.player").evaluate((node) => {
    return Array.from(node.parentElement.children).indexOf(node);
  });

  const moved = await page.evaluate(async (startIndex) => {
    const board = document.getElementById("board");
    const tryKeys = ["ArrowUp", "ArrowRight", "ArrowDown", "ArrowLeft", "w", "d", "s", "a"];

    const getPlayerIndex = () => {
      const player = board.querySelector(".tile.player");
      return Array.from(board.children).indexOf(player);
    };

    for (const key of tryKeys) {
      document.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 25));
      if (getPlayerIndex() !== startIndex) {
        return true;
      }
    }

    return false;
  }, initialIndex);

  expect(moved).toBeTruthy();
});

test("player does not share the start tile with a monster", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  const snapshot = await page.evaluate(() => window.__TEST_API__.getSnapshot());
  const overlap = snapshot.enemies.some((enemy) => enemy.x === snapshot.player.x && enemy.y === snapshot.player.y);

  expect(overlap).toBeFalsy();
});

test("the first studio entrance sits in the outer wall and the player starts just inside it", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  const result = await page.evaluate(() => {
    const snapshot = window.__TEST_API__.getSnapshot();
    const anchor = snapshot.entryAnchor;
    if (!anchor || anchor.direction !== "left") {
      return { ok: false, reason: "missing-left-entry", anchor };
    }

    const transition = anchor.transitionPosition ?? snapshot.stairsUp;
    const anchorRoom = anchor.roomId != null
      ? snapshot.rooms.find((room) => room.id === anchor.roomId)
      : null;
    return {
      ok: Boolean(
        transition &&
        transition.x === 0 &&
        snapshot.player.x === anchor.position.x &&
        snapshot.player.y === anchor.position.y &&
        snapshot.grid[transition.y]?.[transition.x] === "." &&
        snapshot.grid[anchor.position.y]?.[anchor.position.x] === "." &&
        (
          (anchor.implementation?.startsWith("entry_room") &&
            anchor.position?.x === 1 &&
            anchorRoom &&
            anchorRoom.x === 0) ||
          (!anchor.implementation?.startsWith("entry_room") && anchor.position?.x === 1)
        )
      ),
      transition,
      anchorPosition: anchor.position,
      anchorRoom,
      player: snapshot.player,
    };
  });

  expect(result.ok).toBeTruthy();
});

test("stairs require confirmation before changing floors", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await openDownstairsPrompt(page);

  await expect(page.locator("#stairsModal")).toBeVisible();
  await expect(page.locator("#stairsTitle")).toContainText("Übergang");

  await page.getByRole("button", { name: "Hier bleiben" }).click();

  await expect(page.locator("#stairsModal")).toBeHidden();
  await expect(page.locator("#depthTitle")).toContainText("Studio 1");
});

test("stairs confirmation can move the player to the next floor", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await openDownstairsPrompt(page);

  await expect(page.locator("#stairsModal")).toBeVisible();
  await page.getByRole("button", { name: "Betreten" }).click();

  await expect(page.locator("#stairsModal")).toBeHidden();
  await expect(page.locator("#depthTitle")).toContainText("Studio 2");

  const snapshot = await page.evaluate(() => window.__TEST_API__.getSnapshot());
  const entryTransition = snapshot.entryAnchor?.transitionPosition ?? snapshot.stairsUp;

  expect(snapshot.player.x).toBe(entryTransition.x);
  expect(snapshot.player.y).toBe(entryTransition.y);
});

test("adjacent studios preserve the transition line across the floor change", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  const sourceSnapshot = await page.evaluate(() => window.__TEST_API__.getSnapshot());
  const sourceTransition = sourceSnapshot.exitAnchor?.transitionPosition ?? sourceSnapshot.stairsDown;
  const sourceDirection = sourceSnapshot.exitAnchor?.direction ?? null;

  await openDownstairsPrompt(page);
  await page.getByRole("button", { name: "Betreten" }).click();

  const targetSnapshot = await page.evaluate(() => window.__TEST_API__.getSnapshot());
  const targetTransition = targetSnapshot.entryAnchor?.transitionPosition ?? targetSnapshot.stairsUp;

  const preservesLine = (() => {
    if (!sourceTransition || !targetTransition || !sourceDirection) {
      return false;
    }
    if (sourceDirection === "left" || sourceDirection === "right") {
      return sourceTransition.y === targetTransition.y;
    }
    if (sourceDirection === "front" || sourceDirection === "back") {
      return sourceTransition.x === targetTransition.x;
    }
    return sourceTransition.x === targetTransition.x && sourceTransition.y === targetTransition.y;
  })();

  expect(preservesLine).toBeTruthy();
});

test("studio transitions use dedicated overlays instead of normal door art", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await page.keyboard.press("F8");

  const visuals = await page.evaluate(() => {
    const snapshot = window.__TEST_API__.getSnapshot();
    window.__TEST_API__.placeDoor({ x: snapshot.player.x + 1, y: snapshot.player.y }, { doorType: "normal", isOpen: false });

    const entryTile = document.querySelector(".tile.stairs-up");
    const exitTile = document.querySelector(".tile.stairs-down");
    const doorTile = document.querySelector(".tile.door-closed");

    return {
      entryOverlay: entryTile?.style.getPropertyValue("--tile-overlay-image") ?? "",
      exitOverlay: exitTile?.style.getPropertyValue("--tile-overlay-image") ?? "",
      doorOverlay: doorTile?.style.getPropertyValue("--tile-overlay-image") ?? "",
      entryClasses: entryTile?.className ?? "",
      exitClasses: exitTile?.className ?? "",
    };
  });

  expect(visuals.entryOverlay).toContain("studio-entry-");
  expect(
    visuals.exitOverlay.includes("studio-exit-") ||
    visuals.exitOverlay.includes("lift-") ||
    visuals.exitOverlay.includes("stairs-")
  ).toBeTruthy();
  expect(visuals.exitOverlay).not.toContain("door-open");
  expect(visuals.exitOverlay).not.toContain("door-closed");
  expect(visuals.doorOverlay).toContain("door-closed");
  expect(visuals.entryClasses).toContain("studio-transition");
  expect(visuals.exitClasses).toContain("studio-transition");
});

test("debug info modal shows timeline and upcoming actor order when revealed", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await page.evaluate(() => {
    window.__TEST_API__.setDebugReveal(true);
    window.__TEST_API__.clearFloorEntities();
    const snapshot = window.__TEST_API__.getSnapshot();
    window.__TEST_API__.placeEnemy({ x: snapshot.player.x + 2, y: snapshot.player.y }, {
      id: "debug-raider",
      name: "Debug-Raider",
      hp: 10,
      reaction: 2,
      baseSpeed: 80,
    });
    window.__TEST_API__.setTimelineTime(240);
    window.__TEST_API__.setPlayerSpeed({ nextActionTime: 300, baseSpeed: 100 });
    window.__TEST_API__.setEnemySpeed({ nextActionTime: 260, baseSpeed: 80 }, 0);
  });

  await page.locator("#openDebugInfo").click();

  await expect(page.locator("#debugInfoModal")).toBeVisible();
  await expect(page.locator("#debugInfoText")).toHaveValue(/Weltzeit: 240/);
  await expect(page.locator("#debugInfoText")).toHaveValue(/Spieler-Zeitpunkt: 300/);
  await expect(page.locator("#debugInfoText")).toHaveValue(/Nächster Akteur: Debug-Raider \| Floor 1/);
  await expect(page.locator("#debugInfoText")).toHaveValue(/Nächste Akteure:/);
  await expect(page.locator("#debugInfoText")).toHaveValue(/1\. Debug-Raider \| Floor 1 \| Zeit 260 \| Reaktion 2 \| Tempo Sehr schnell \(\+20 %\)/);
  await expect(page.locator("#debugInfoText")).toHaveValue(/2\. Spieler \| Floor 1 \| Zeit 300 \| Reaktion 4 \| Tempo Normal \(0 %\)/);
});

test("debug toolbar advances the timeline with the configured budget via button and N", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await page.evaluate(() => {
    window.__TEST_API__.setDebugReveal(true);
    window.__TEST_API__.clearFloorEntities();
    window.__TEST_API__.setTimelineTime(0);
    window.__TEST_API__.setPlayerSpeed({ nextActionTime: 0, baseSpeed: 100 });
  });

  await expect(page.locator("#debugToolbarControls")).toBeVisible();
  await page.locator("#debugAdvanceInput").fill("500");
  await page.locator("#debugAdvanceSpeedRange").evaluate((node) => {
    node.value = "4";
    node.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await expect(page.locator("#debugAdvanceSpeedValue")).toHaveText("Langsam");
  await page.locator("#debugAdvanceButton").click();
  await expect(page.locator("#debugAdvanceButton")).toHaveText("Läuft...");

  await expect.poll(async () => {
    const snapshot = await page.evaluate(() => window.__TEST_API__.getSnapshot());
    return `${snapshot.timelineTime}:${snapshot.player.nextActionTime}`;
  }).toBe("500:500");
  await expect(page.locator("#debugAdvanceButton")).toHaveText("Vorspulen");

  await page.keyboard.press("N");

  await expect.poll(async () => {
    const snapshot = await page.evaluate(() => window.__TEST_API__.getSnapshot());
    return `${snapshot.timelineTime}:${snapshot.player.nextActionTime}`;
  }).toBe("1000:1000");
});

test("F7 returns to the previous revealed debug studio", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await page.keyboard.press("F8");
  await expect(page.locator("#debugToolbarControls")).toBeVisible();

  await page.keyboard.press("F8");
  await expect(page.locator("#depthTitle")).toContainText("Studio 2");

  await page.keyboard.press("F7");
  await expect(page.locator("#depthTitle")).toContainText("Studio 1");
});

test("debug enemy trails render as a heatmap when the toolbar toggle is enabled", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  const trailIndex = await page.evaluate(() => {
    window.__TEST_API__.setDebugReveal(true);
    window.__TEST_API__.clearFloorEntities();
    const snapshot = window.__TEST_API__.getSnapshot();
    const enemyStart = { x: snapshot.player.x + 3, y: snapshot.player.y };
    const trailTile = { x: snapshot.player.x + 2, y: snapshot.player.y };
    window.__TEST_API__.placeEnemy(enemyStart, {
      id: "trail-raider",
      name: "Trail-Raider",
      hp: 10,
      aggro: true,
      behavior: "hunter",
      behaviorLabel: "Jäger",
      aggroRadius: 8,
      baseSpeed: 100,
      nextActionTime: 0,
    });
    window.__TEST_API__.setTimelineTime(0);
    window.__TEST_API__.setPlayerSpeed({ nextActionTime: 400, baseSpeed: 100 });
    window.__TEST_API__.setEnemySpeed({ nextActionTime: 0, baseSpeed: 100 }, 0);
    return trailTile.y * snapshot.grid[0].length + trailTile.x;
  });

  await page.locator("#toggleDebugEnemyTrail").check();
  await page.locator("#debugAdvanceInput").fill("100");
  await page.locator("#debugAdvanceButton").click();

  const trailInfo = await page.locator(".tile-cell").nth(trailIndex).locator(".tile-debug-trail").evaluate((node) => ({
    hue: node.style.getPropertyValue("--debug-trail-hue"),
    visitAlpha: node.style.getPropertyValue("--debug-trail-visit-alpha"),
    totalAlpha: node.style.getPropertyValue("--debug-trail-total-alpha"),
  }));

  expect(Number(trailInfo.hue)).toBeGreaterThan(0);
  expect(Number(trailInfo.visitAlpha)).toBeGreaterThan(0);
  expect(Number(trailInfo.totalAlpha)).toBeGreaterThan(0);
});

test("actors standing on studio transitions keep the transition marker visible", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  const visuals = await page.evaluate(() => {
    const snapshot = window.__TEST_API__.getSnapshot();
    window.__TEST_API__.clearFloorEntities();
    window.__TEST_API__.setDebugReveal(true);
    window.__TEST_API__.teleportPlayer(snapshot.stairsDown);
    window.__TEST_API__.placeEnemy(snapshot.stairsUp, {
      id: "transition-scout",
      name: "Transitionscout",
      canChangeFloors: true,
    });

    const playerCell = document.querySelector(".tile.player")?.parentElement ?? null;
    const enemyCell = document.querySelector(".tile.enemy")?.parentElement ?? null;
    const playerTransition = playerCell?.querySelector(".tile.stairs-down, .tile.stairs-up") ?? null;
    const enemyTransition = enemyCell?.querySelector(".tile.stairs-down, .tile.stairs-up") ?? null;

    return {
      playerClasses: Array.from(playerCell?.querySelectorAll(".tile") ?? []).map((node) => node.className),
      enemyClasses: Array.from(enemyCell?.querySelectorAll(".tile") ?? []).map((node) => node.className),
      playerTransitionOverlay: playerTransition?.style.getPropertyValue("--tile-overlay-image") ?? "",
      enemyTransitionOverlay: enemyTransition?.style.getPropertyValue("--tile-overlay-image") ?? "",
    };
  });

  expect(visuals.playerClasses.some((className) => className.includes("tile-transition-underlay"))).toBeTruthy();
  expect(visuals.playerClasses.some((className) => className.includes("stairs-down") || className.includes("stairs-up"))).toBeTruthy();
  expect(visuals.playerClasses.some((className) => className.includes("tile-foreground-layer") && className.includes("player"))).toBeTruthy();
  expect(visuals.enemyClasses.some((className) => className.includes("tile-transition-underlay"))).toBeTruthy();
  expect(visuals.enemyClasses.some((className) => className.includes("stairs-down") || className.includes("stairs-up"))).toBeTruthy();
  expect(visuals.enemyClasses.some((className) => className.includes("tile-foreground-layer") && className.includes("enemy"))).toBeTruthy();
  expect(
    visuals.playerTransitionOverlay.includes("studio-exit-") ||
    visuals.playerTransitionOverlay.includes("lift-") ||
    visuals.playerTransitionOverlay.includes("stairs-")
  ).toBeTruthy();
  expect(
    visuals.enemyTransitionOverlay.includes("studio-entry-") ||
    visuals.enemyTransitionOverlay.includes("lift-") ||
    visuals.enemyTransitionOverlay.includes("stairs-")
  ).toBeTruthy();
});

test("floor followers use the full inflected monster name in stair messages", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await page.evaluate(() => {
    const snapshot = window.__TEST_API__.getSnapshot();
    const stairsDown = snapshot.stairsDown;
    window.__TEST_API__.setupCombatScenario({
      playerPosition: stairsDown,
      enemyPosition: { x: stairsDown.x + 1, y: stairsDown.y },
      enemy: {
        id: "motel-shlurfer",
        baseName: "Motel-Schlurfer",
        name: "Brutaler Motel-Schlurfer",
        grammar: {
          articleMode: "indefinite",
          gender: "masculine",
          namePrefixStems: ["brutal"],
        },
        aggro: true,
        canChangeFloors: true,
      },
    });
    window.__TEST_API__.promptCurrentStairs();
  });

  await page.getByRole("button", { name: "Betreten" }).click();

  const messages = await page.evaluate(() => window.__TEST_API__.getMessages());
  expect(messages.some((entry) => entry.text.includes("Der brutale Motel-Schlurfer folgt dir"))).toBeTruthy();
  await expect(page.locator("#messageLog .log-mark-monster").filter({ hasText: "Der brutale Motel-Schlurfer" }).first()).toHaveText("Der brutale Motel-Schlurfer");
});

test("restart resets the run back to floor one", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await openDownstairsPrompt(page);
  await page.getByRole("button", { name: "Betreten" }).click();
  await expect(page.locator("#depthTitle")).toContainText("Studio 2");

  await page.keyboard.press("Shift+R");
  await startRun(page);

  await expect(page.locator("#depthTitle")).toContainText("Studio 1");
  await expect(page.locator("#stairsModal")).toBeHidden();
});

test("studio archetypes stay stable when returning to a previous studio", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  const firstStudioTitle = await page.locator("#depthTitle").textContent();

  await openDownstairsPrompt(page);
  await page.getByRole("button", { name: "Betreten" }).click();
  await expect(page.locator("#depthTitle")).toContainText("Studio 2");

  await page.evaluate(() => {
    const snapshot = window.__TEST_API__.getSnapshot();
    window.__TEST_API__.teleportPlayer(snapshot.stairsUp);
    window.__TEST_API__.promptCurrentStairs();
  });
  await page.getByRole("button", { name: "Zurückkehren" }).click();

  await expect(page.locator("#depthTitle")).toHaveText(firstStudioTitle);
});

test("spoken studio announcements only play on first entry to a studio", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("dungeon-rogue-options", JSON.stringify({
      stepSound: true,
      deathSound: true,
      voiceAnnouncements: true,
      showcaseAnnouncementMode: "floating-text",
      uiScale: 1,
      studioZoom: 1,
      tooltipScale: 1,
      enemyPanelMode: "detailed",
    }));
  });
  await page.goto("/");
  await startRun(page);

  let speechCalls = await page.evaluate(() => window.__speechCalls.map((entry) => entry.text));
  expect(speechCalls).toHaveLength(1);
  expect(speechCalls[0]).toContain("Sie betreten");
  expect(speechCalls[0]).not.toContain("Studio 1");

  await openDownstairsPrompt(page);
  await page.getByRole("button", { name: "Betreten" }).click();

  speechCalls = await page.evaluate(() => window.__speechCalls.map((entry) => entry.text));
  expect(speechCalls).toHaveLength(2);
  expect(speechCalls[1]).toContain("Sie betreten");
  expect(speechCalls[1]).not.toContain("Studio 2");

  await page.evaluate(() => {
    const snapshot = window.__TEST_API__.getSnapshot();
    window.__TEST_API__.teleportPlayer(snapshot.stairsUp);
    window.__TEST_API__.promptCurrentStairs();
  });
  await page.locator("#stairsConfirm").click();

  await openDownstairsPrompt(page);
  await page.getByRole("button", { name: "Betreten" }).click();

  speechCalls = await page.evaluate(() => window.__speechCalls.map((entry) => entry.text));
  expect(speechCalls).toHaveLength(2);
});

test("showcase ambience can be spoken instead of shown as flyover text", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await page.keyboard.press("o");
  await page.locator("#showcaseAnnouncementMode").selectOption("voice");
  await page.keyboard.press("Escape");

  const moveKey = await page.evaluate(() => {
    window.__TEST_API__.setRandomSequence([0]);
    const snapshot = window.__TEST_API__.getSnapshot();
    const candidates = [
      {
        key: "ArrowRight",
        moveTile: { x: snapshot.player.x + 1, y: snapshot.player.y },
        showcaseTile: { x: snapshot.player.x + 2, y: snapshot.player.y },
      },
      {
        key: "ArrowLeft",
        moveTile: { x: snapshot.player.x - 1, y: snapshot.player.y },
        showcaseTile: { x: snapshot.player.x - 2, y: snapshot.player.y },
      },
      {
        key: "ArrowDown",
        moveTile: { x: snapshot.player.x, y: snapshot.player.y + 1 },
        showcaseTile: { x: snapshot.player.x, y: snapshot.player.y + 2 },
      },
      {
        key: "ArrowUp",
        moveTile: { x: snapshot.player.x, y: snapshot.player.y - 1 },
        showcaseTile: { x: snapshot.player.x, y: snapshot.player.y - 2 },
      },
    ].filter((candidate) =>
      snapshot.grid[candidate.moveTile.y]?.[candidate.moveTile.x] === "." &&
      snapshot.grid[candidate.showcaseTile.y]?.[candidate.showcaseTile.x] === "."
    );
    const selected = candidates[0] ?? null;
    if (!selected) {
      return null;
    }

    window.__TEST_API__.clearFloorEntities();
    window.__TEST_API__.placeShowcase(selected.showcaseTile, {
      id: "test-showcase",
      ambienceId: "jason-mask",
      name: "Test-Vitrine",
      source: "Tests",
      description: "Nur für den Test.",
    });

    return selected.key;
  });

  expect(moveKey).not.toBeNull();
  await page.keyboard.press(moveKey);

  const ambienceLines = [
    "Hinter dem Glas starrt dich eine abgenutzte Hockeymaske an. Der Raum wirkt plötzlich stiller.",
    "Die Maske in der Vitrine sieht harmlos aus, bis man merkt, wie leer der Blick dahinter ist.",
    "Ein kaltes Schaudern zieht durch den Raum. Selbst hinter Glas wirkt diese Maske wie eine Warnung.",
  ];

  await expect.poll(async () => {
    const speechCalls = await page.evaluate(() => window.__speechCalls.map((entry) => entry.text));
    return speechCalls.some((text) => ambienceLines.includes(text));
  }).toBeTruthy();
  await expect(page.locator(".floating-text.showcase")).toHaveCount(0);
});

test("closed doors open automatically when the player walks into them", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await setupDoorAtPlayerStep(page, { doorType: "normal", isOpen: false });
  await page.keyboard.press("ArrowRight");

  const snapshot = await page.evaluate(() => window.__TEST_API__.getSnapshot());
  const messages = await page.evaluate(() => window.__TEST_API__.getMessages());

  expect(snapshot.player.x).toBe(snapshot.doors[0].x);
  expect(snapshot.doors[0].isOpen).toBeTruthy();
  expect(messages.some((entry) => entry.text.includes("Tür schwingt auf"))).toBeTruthy();
});

test("locked doors stay closed without the matching key", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  const start = await page.evaluate(() => window.__TEST_API__.getSnapshot().player);
  await setupDoorAtPlayerStep(page, { doorType: "locked", lockColor: "green", isOpen: false });
  await page.keyboard.press("ArrowRight");

  const snapshot = await page.evaluate(() => window.__TEST_API__.getSnapshot());

  expect(snapshot.player.x).toBe(start.x);
  expect(snapshot.doors[0].isOpen).toBeFalsy();
});

test("matching keys unlock color doors on first contact", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await setupKeyAtPlayerStep(page, "green");
  await page.keyboard.press("ArrowRight");

  let inventory = await page.evaluate(() => window.__TEST_API__.getInventorySnapshot());
  expect(inventory.items.some((item) => item.type === "key" && item.keyColor === "green" && item.keyFloor === 1)).toBeTruthy();

  await page.evaluate(() => {
    const snapshot = window.__TEST_API__.getSnapshot();
    const target = { x: snapshot.player.x + 1, y: snapshot.player.y };
    window.__TEST_API__.placeDoor(target, { doorType: "locked", lockColor: "green", isOpen: false });
  });

  await page.keyboard.press("ArrowRight");

  const snapshot = await page.evaluate(() => window.__TEST_API__.getSnapshot());
  inventory = await page.evaluate(() => window.__TEST_API__.getInventorySnapshot());

  expect(snapshot.player.x).toBe(snapshot.doors[0].x);
  expect(snapshot.doors[0].isOpen).toBeTruthy();
  expect(snapshot.doors[0].doorType).toBe("normal");
  expect(inventory.items.some((item) => item.type === "key" && item.keyColor === "green")).toBeFalsy();
});

test("keys from another floor stay in inventory but cannot open locked doors", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await setupKeyAtPlayerStep(page, "green");
  await page.keyboard.press("ArrowRight");
  await openDownstairsPrompt(page);
  await page.getByRole("button", { name: "Betreten" }).click();

  await page.evaluate(() => {
    const snapshot = window.__TEST_API__.getSnapshot();
    const target = { x: snapshot.player.x + 1, y: snapshot.player.y };
    window.__TEST_API__.clearFloorEntities();
    window.__TEST_API__.placeDoor(target, { doorType: "locked", lockColor: "green", isOpen: false });
  });

  const start = await page.evaluate(() => window.__TEST_API__.getSnapshot().player);
  await page.keyboard.press("ArrowRight");

  const snapshot = await page.evaluate(() => window.__TEST_API__.getSnapshot());
  const inventory = await page.evaluate(() => window.__TEST_API__.getInventorySnapshot());
  const messages = await page.evaluate(() => window.__TEST_API__.getMessages());

  expect(snapshot.floor).toBe(2);
  expect(snapshot.player.x).toBe(start.x);
  expect(snapshot.doors[0].isOpen).toBeFalsy();
  expect(inventory.items.some((item) => item.type === "key" && item.keyColor === "green" && item.keyFloor === 1)).toBeTruthy();
  expect(messages.some((entry) => entry.text.includes("anderen Studio"))).toBeTruthy();
});

test("player can close an adjacent open door when the tile is empty", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await setupDoorAtPlayerStep(page, { doorType: "normal", isOpen: false });
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("v");

  const snapshot = await page.evaluate(() => window.__TEST_API__.getSnapshot());

  expect(snapshot.doors[0].isOpen).toBeFalsy();
});

test("hidden floor traps trigger on entry and become consumed", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await page.evaluate(() => {
    window.__TEST_API__.setRandomSequence([0.99]);
  });
  await setupTrapAtPlayerStep(page, {
    id: "test-floor-trap",
    name: "Test-Bodenfalle",
    description: "Nur für den Test.",
    type: "floor",
    visibility: "hidden",
    state: "active",
    trigger: "on_enter",
    resetMode: "single_use",
    affectsPlayer: true,
    affectsEnemies: true,
    detectDifficulty: 99,
    reactDifficulty: 99,
    effect: { damage: 4 },
  });

  const before = await page.evaluate(() => window.__TEST_API__.getSnapshot().player.hp);
  await page.keyboard.press("ArrowRight");

  const snapshot = await page.evaluate(() => window.__TEST_API__.getSnapshot());
  const messages = await page.evaluate(() => window.__TEST_API__.getMessages());

  expect(snapshot.player.hp).toBeLessThan(before);
  expect(snapshot.traps[0].state).toBe("consumed");
  expect(messages.some((entry) => entry.text.includes("Test-Bodenfalle"))).toBeTruthy();
});

test("Stuntman reduces incoming trap damage", async ({ page }) => {
  await page.goto("/");
  await startRun(page, { classLabel: "Stuntman" });

  await page.evaluate(() => {
    window.__TEST_API__.setRandomSequence([0.99]);
  });
  await setupTrapAtPlayerStep(page, {
    id: "test-stunt-trap",
    name: "Test-Stuntfalle",
    description: "Nur für den Test.",
    type: "floor",
    visibility: "hidden",
    state: "active",
    trigger: "on_enter",
    resetMode: "single_use",
    affectsPlayer: true,
    affectsEnemies: true,
    detectDifficulty: 99,
    reactDifficulty: 99,
    effect: { damage: 4 },
  });

  const before = await page.evaluate(() => window.__TEST_API__.getSnapshot().player.hp);
  await page.keyboard.press("ArrowRight");

  const snapshot = await page.evaluate(() => window.__TEST_API__.getSnapshot());
  const messages = await page.evaluate(() => window.__TEST_API__.getMessages());

  expect(before - snapshot.player.hp).toBe(2);
  expect(messages.some((entry) => entry.text.includes("Steckt den Fall weg"))).toBeTruthy();
});

test("Regisseur discovers nearby traps more reliably", async ({ page }) => {
  await page.goto("/");
  await startRun(page, { classLabel: "Regisseur" });

  await page.evaluate(() => {
    const snapshot = window.__TEST_API__.getSnapshot();
    window.__TEST_API__.clearFloorEntities();
    window.__TEST_API__.placeTrap({ x: snapshot.player.x + 1, y: snapshot.player.y }, {
      id: "test-director-trap",
      name: "Test-Regiefalle",
      description: "Nur für den Test.",
      type: "floor",
      visibility: "hidden",
      state: "active",
      trigger: "on_enter",
      resetMode: "single_use",
      affectsPlayer: true,
      affectsEnemies: true,
      detectDifficulty: 3,
      reactDifficulty: 3,
      effect: { damage: 4 },
    });
    window.__TEST_API__.setRandomSequence([0.5]);
  });

  await page.keyboard.press(" ");

  const snapshot = await page.evaluate(() => window.__TEST_API__.getSnapshot());
  const messages = await page.evaluate(() => window.__TEST_API__.getMessages());

  expect(snapshot.traps[0].visibility).toBe("discovered");
  expect(messages.some((entry) => entry.text.includes("Du entdeckst Test-Regiefalle"))).toBeTruthy();
});

test("alarm traps alarm nearby enemies", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await page.evaluate(() => {
    window.__TEST_API__.setupCombatScenario({
      clearGrid: true,
      playerPosition: { x: 2, y: 2 },
      enemyPosition: { x: 5, y: 2 },
      enemy: { aggro: false },
    });
    window.__TEST_API__.setRandomSequence([0.99]);
    window.__TEST_API__.placeTrap({ x: 3, y: 2 }, {
      id: "test-alarm-trap",
      name: "Test-Alarmfalle",
      description: "Nur für den Test.",
      type: "alarm",
      visibility: "hidden",
      state: "active",
      trigger: "on_enter",
      resetMode: "single_use",
      affectsPlayer: true,
      affectsEnemies: false,
      detectDifficulty: 99,
      reactDifficulty: 99,
      effect: { alarm: true },
    });
  });

  await page.keyboard.press("ArrowRight");

  const snapshot = await page.evaluate(() => window.__TEST_API__.getSnapshot());
  const messages = await page.evaluate(() => window.__TEST_API__.getMessages());

  expect(snapshot.enemies[0].aggro).toBeTruthy();
  expect(snapshot.traps[0].state).toBe("consumed");
  expect(messages.some((entry) => entry.text.includes("aufhorchen"))).toBeTruthy();
});

test("visible hazards damage actors that remain on them", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await page.evaluate(() => {
    const snapshot = window.__TEST_API__.getSnapshot();
    window.__TEST_API__.clearFloorEntities();
    window.__TEST_API__.placeTrap({ x: snapshot.player.x, y: snapshot.player.y }, {
      id: "test-hazard",
      name: "Test-Gefahrenfeld",
      description: "Nur für den Test.",
      type: "hazard",
      visibility: "visible",
      state: "active",
      trigger: "continuous",
      resetMode: "persistent",
      affectsPlayer: true,
      affectsEnemies: true,
      effect: { damage: 2 },
    });
  });

  const before = await page.evaluate(() => window.__TEST_API__.getSnapshot().player.hp);
  await page.keyboard.press(" ");

  const snapshot = await page.evaluate(() => window.__TEST_API__.getSnapshot());
  const messages = await page.evaluate(() => window.__TEST_API__.getMessages());

  expect(snapshot.player.hp).toBeLessThan(before);
  expect(snapshot.traps[0].state).toBe("active");
  expect(messages.some((entry) => entry.text.includes("Test-Gefahrenfeld"))).toBeTruthy();
});

test("closed doors block visibility into the space behind them", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await page.evaluate(() => {
    window.__TEST_API__.setupCombatScenario({
      clearGrid: true,
      playerPosition: { x: 2, y: 2 },
      enemyPosition: { x: 10, y: 10 },
      walls: Array.from({ length: 22 }, (_, index) => ({ x: 4, y: index + 1 })).filter((wall) => wall.y !== 2),
    });
    window.__TEST_API__.clearFloorEntities();
    window.__TEST_API__.placeDoor({ x: 4, y: 2 }, { doorType: "locked", lockColor: "green", isOpen: false });
  });

  let snapshot = await page.evaluate(() => window.__TEST_API__.getSnapshot());
  expect(snapshot.visible[2][5]).toBeFalsy();

  await page.evaluate(() => {
    window.__TEST_API__.placeKey({ x: 3, y: 2 }, "green");
  });
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");

  snapshot = await page.evaluate(() => window.__TEST_API__.getSnapshot());
  expect(snapshot.visible[2][5]).toBeTruthy();
});

test("open doors keep the doorway overlay aligned with the current board styling", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  const metrics = await page.evaluate(() => {
    window.__TEST_API__.setupCombatScenario({
      clearGrid: true,
      playerPosition: { x: 2, y: 2 },
      enemyPosition: { x: 10, y: 10 },
    });
    window.__TEST_API__.clearFloorEntities();
    window.__TEST_API__.placeDoor({ x: 3, y: 2 }, { doorType: "normal", isOpen: false });
    window.__TEST_API__.placeDoor({ x: 4, y: 2 }, { doorType: "normal", isOpen: true });

    const closedDoor = document.querySelector(".tile.door-closed");
    const openDoor = document.querySelector(".tile.door-open");
    const closedStyle = getComputedStyle(closedDoor, "::after");
    const openStyle = getComputedStyle(openDoor, "::after");
    const openPassage = getComputedStyle(openDoor, "::before");

    return {
      closedSize: closedStyle.backgroundSize,
      openSize: openStyle.backgroundSize,
      openLeft: openStyle.left,
      openRight: openStyle.right,
      openPassageContent: openPassage.content,
    };
  });

  expect(metrics.closedSize).toBe("32px 32px");
  expect(metrics.openSize).toBe("32px 32px");
  expect(metrics.openLeft).toBe("-2px");
  expect(metrics.openRight).toBe("-2px");
  expect(metrics.openPassageContent).toBe("none");
});

test("walls do not reveal an unentered side room from the adjacent corridor", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await page.evaluate(() => {
    window.__TEST_API__.setupCombatScenario({
      clearGrid: true,
      playerPosition: { x: 5, y: 6 },
      enemyPosition: { x: 10, y: 10 },
      walls: [
        ...Array.from({ length: 10 }, (_, index) => ({ x: 7, y: index + 1 })),
      ],
    });
    window.__TEST_API__.clearFloorEntities();
  });

  const snapshot = await page.evaluate(() => window.__TEST_API__.getSnapshot());
  expect(snapshot.visible[6][8]).toBeFalsy();
  expect(snapshot.visible[5][8]).toBeFalsy();
});

test("visible room floors also reveal adjacent wall corners", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await page.evaluate(() => {
    window.__TEST_API__.setupCombatScenario({
      clearGrid: true,
      playerPosition: { x: 5, y: 5 },
      enemyPosition: { x: 10, y: 10 },
      walls: [
        { x: 3, y: 3 }, { x: 4, y: 3 }, { x: 5, y: 3 }, { x: 6, y: 3 }, { x: 7, y: 3 },
        { x: 3, y: 4 }, { x: 7, y: 4 },
        { x: 3, y: 5 }, { x: 7, y: 5 },
        { x: 3, y: 6 }, { x: 7, y: 6 },
        { x: 3, y: 7 }, { x: 4, y: 7 }, { x: 5, y: 7 }, { x: 6, y: 7 }, { x: 7, y: 7 },
      ],
    });
    window.__TEST_API__.clearFloorEntities();
  });

  const snapshot = await page.evaluate(() => window.__TEST_API__.getSnapshot());
  expect(snapshot.visible[3][3]).toBeTruthy();
  expect(snapshot.visible[3][7]).toBeTruthy();
  expect(snapshot.visible[7][3]).toBeTruthy();
  expect(snapshot.visible[7][7]).toBeTruthy();
});

test("locked doors only appear when a matching key is reachable on the same floor", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  for (let floor = 1; floor <= 6; floor += 1) {
    const result = await page.evaluate(() => {
      const snapshot = window.__TEST_API__.getSnapshot();
      const lockedDoor = snapshot.doors.find((door) => door.doorType === "locked");
      if (!lockedDoor) {
        return { ok: true };
      }

      const matchingKey = snapshot.keys.find((key) =>
        key.keyColor === lockedDoor.lockColor &&
        key.keyFloor === snapshot.floor
      );
      if (!matchingKey) {
        return { ok: false, reason: "missing-key", floor: snapshot.floor };
      }

      const queue = [{ x: snapshot.player.x, y: snapshot.player.y }];
      const seen = new Set([`${snapshot.player.x},${snapshot.player.y}`]);
      const dirs = [
        { x: 1, y: 0 },
        { x: -1, y: 0 },
        { x: 0, y: 1 },
        { x: 0, y: -1 },
      ];

      while (queue.length > 0) {
        const current = queue.shift();
        if (current.x === matchingKey.x && current.y === matchingKey.y) {
          return { ok: true };
        }

        for (const dir of dirs) {
          const nextX = current.x + dir.x;
          const nextY = current.y + dir.y;
          const posKey = `${nextX},${nextY}`;

          if (seen.has(posKey)) {
            continue;
          }

          if (
            nextX < 0 ||
            nextY < 0 ||
            nextY >= snapshot.grid.length ||
            nextX >= snapshot.grid[0].length
          ) {
            continue;
          }

          if (snapshot.grid[nextY][nextX] === "#") {
            continue;
          }

          if (lockedDoor.x === nextX && lockedDoor.y === nextY && !lockedDoor.isOpen) {
            continue;
          }

          seen.add(posKey);
          queue.push({ x: nextX, y: nextY });
        }
      }

      return { ok: false, reason: "unreachable-key", floor: snapshot.floor };
    });

    expect(result.ok).toBeTruthy();

    if (floor < 6) {
      await page.evaluate(() => {
        window.__TEST_API__.clearFloorEntities();
      });
      await openDownstairsPrompt(page);
      await page.getByRole("button", { name: "Betreten" }).click();
    }
  }
});

test("locked rooms cannot be entered through an alternate corridor", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  for (let floor = 1; floor <= 6; floor += 1) {
    const result = await page.evaluate(() => {
      const snapshot = window.__TEST_API__.getSnapshot();
      const lockedDoor = snapshot.doors.find((door) => door.doorType === "locked");
      if (!lockedDoor) {
        return { ok: true };
      }

      const lockedRoom = snapshot.rooms?.[lockedDoor.roomIdB];
      if (!lockedRoom) {
        return { ok: false, reason: "missing-room", floor: snapshot.floor, door: lockedDoor };
      }

      const queue = [{ x: snapshot.player.x, y: snapshot.player.y }];
      const seen = new Set([`${snapshot.player.x},${snapshot.player.y}`]);
      const dirs = [
        { x: 1, y: 0 },
        { x: -1, y: 0 },
        { x: 0, y: 1 },
        { x: 0, y: -1 },
      ];

      while (queue.length > 0) {
        const current = queue.shift();
        const insideLockedRoom =
          current.x >= lockedRoom.x &&
          current.x < lockedRoom.x + lockedRoom.width &&
          current.y >= lockedRoom.y &&
          current.y < lockedRoom.y + lockedRoom.height;

        if (insideLockedRoom) {
          return { ok: false, reason: "alternate-entry", floor: snapshot.floor, door: lockedDoor, room: lockedRoom };
        }

        for (const dir of dirs) {
          const nextX = current.x + dir.x;
          const nextY = current.y + dir.y;
          const posKey = `${nextX},${nextY}`;

          if (seen.has(posKey)) {
            continue;
          }

          if (
            nextX < 0 ||
            nextY < 0 ||
            nextY >= snapshot.grid.length ||
            nextX >= snapshot.grid[0].length
          ) {
            continue;
          }

          if (snapshot.grid[nextY][nextX] === "#") {
            continue;
          }

          if (lockedDoor.x === nextX && lockedDoor.y === nextY && !lockedDoor.isOpen) {
            continue;
          }

          seen.add(posKey);
          queue.push({ x: nextX, y: nextY });
        }
      }

      return { ok: true };
    });

    expect(result.ok).toBeTruthy();

    if (floor < 6) {
      await openDownstairsPrompt(page);
      await page.getByRole("button", { name: "Betreten" }).click();
    }
  }
});

test("a floor spawns at most three locked doors and one key per locked door", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  for (let floor = 1; floor <= 10; floor += 1) {
    const result = await page.evaluate(() => {
      const snapshot = window.__TEST_API__.getSnapshot();
      const lockedDoors = snapshot.doors.filter((door) => door.doorType === "locked");
      return {
        floor: snapshot.floor,
        lockedDoorCount: lockedDoors.length,
        keyCount: snapshot.keys.length,
      };
    });

    expect(result.lockedDoorCount).toBeLessThanOrEqual(3);
    expect(result.keyCount).toBe(result.lockedDoorCount);

    if (floor < 10) {
      await page.evaluate(() => {
        window.__TEST_API__.clearFloorEntities();
      });
      await openDownstairsPrompt(page);
      await page.evaluate(() => {
        document.getElementById("stairsConfirm")?.click();
      });
    }
  }
});

test("placed doors stay on valid choke-point slots in the final generated layout", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  for (let floor = 1; floor <= 6; floor += 1) {
    const result = await page.evaluate(() => {
      const snapshot = window.__TEST_API__.getSnapshot();
      const invalidDoor = snapshot.doors.find((door) => {
        const leftFloor = snapshot.grid[door.y]?.[door.x - 1] === ".";
        const rightFloor = snapshot.grid[door.y]?.[door.x + 1] === ".";
        const upFloor = snapshot.grid[door.y - 1]?.[door.x] === ".";
        const downFloor = snapshot.grid[door.y + 1]?.[door.x] === ".";
        return !((leftFloor && rightFloor) || (upFloor && downFloor));
      });

      return invalidDoor
        ? { ok: false, floor: snapshot.floor, door: invalidDoor }
        : { ok: true };
    });

    expect(result.ok).toBeTruthy();

    if (floor < 6) {
      await openDownstairsPrompt(page);
      await page.getByRole("button", { name: "Betreten" }).click();
    }
  }
});

test("generated showcases stay off doors and stairs and only occupy floor tiles", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  const result = await page.evaluate(() => {
    const snapshot = window.__TEST_API__.getSnapshot();
    const invalidShowcase = (snapshot.showcases ?? []).find((showcase) => {
      const onDoor = snapshot.doors.some((door) => door.x === showcase.x && door.y === showcase.y);
      const onStairsDown = snapshot.stairsDown?.x === showcase.x && snapshot.stairsDown?.y === showcase.y;
      const onStairsUp = snapshot.stairsUp?.x === showcase.x && snapshot.stairsUp?.y === showcase.y;
      return onDoor || onStairsDown || onStairsUp || snapshot.grid[showcase.y]?.[showcase.x] !== ".";
    });

    return invalidShowcase
      ? { ok: false, showcase: invalidShowcase }
      : { ok: true, count: snapshot.showcases.length };
  });

  expect(result.ok).toBeTruthy();
});

test("generated showcases keep the tiles directly in front of room exits clear", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  const result = await page.evaluate(() => {
    const snapshot = window.__TEST_API__.getSnapshot();
    const invalidShowcase = (snapshot.showcases ?? []).find((showcase) => {
      const room = (snapshot.rooms ?? []).find((entry) => entry.id === showcase.roomId);
      if (!room) {
        return false;
      }

      return (room.doorTiles ?? []).some((door) =>
        Math.abs(door.x - showcase.x) + Math.abs(door.y - showcase.y) <= 1
      );
    });

    return invalidShowcase
      ? { ok: false, showcase: invalidShowcase }
      : { ok: true, count: snapshot.showcases.length };
  });

  expect(result.ok).toBeTruthy();
});

test("generated showcases do not cut off already reachable floor areas", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  const result = await page.evaluate(() => {
    const snapshot = window.__TEST_API__.getSnapshot();
    const blocked = new Set((snapshot.showcases ?? []).map((entry) => `${entry.x},${entry.y}`));
    const queue = [{ x: snapshot.player.x, y: snapshot.player.y }];
    const seen = new Set([`${snapshot.player.x},${snapshot.player.y}`]);
    const directions = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
    ];

    while (queue.length > 0) {
      const current = queue.shift();

      for (const direction of directions) {
        const nextX = current.x + direction.x;
        const nextY = current.y + direction.y;
        const key = `${nextX},${nextY}`;

        if (seen.has(key) || blocked.has(key)) {
          continue;
        }

        if (
          nextX < 0 ||
          nextY < 0 ||
          nextY >= snapshot.grid.length ||
          nextX >= snapshot.grid[0].length
        ) {
          continue;
        }

        if (snapshot.grid[nextY][nextX] !== ".") {
          continue;
        }

        const closedLockedDoor = snapshot.doors.some((door) =>
          door.x === nextX &&
          door.y === nextY &&
          door.doorType === "locked" &&
          !door.isOpen
        );
        if (closedLockedDoor) {
          continue;
        }

        seen.add(key);
        queue.push({ x: nextX, y: nextY });
      }
    }

    const isolatedShowcase = (snapshot.showcases ?? []).find((showcase) => {
      const neighbors = [
        { x: showcase.x + 1, y: showcase.y },
        { x: showcase.x - 1, y: showcase.y },
        { x: showcase.x, y: showcase.y + 1 },
        { x: showcase.x, y: showcase.y - 1 },
      ].filter((tile) => snapshot.grid[tile.y]?.[tile.x] === ".");

      return neighbors.some((neighbor) => !seen.has(`${neighbor.x},${neighbor.y}`));
    });

    return isolatedShowcase
      ? { ok: false, showcase: isolatedShowcase }
      : { ok: true };
  });

  expect(result.ok).toBeTruthy();
});

test("generated showcases stay unique across floors while unused props remain", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  const seenShowcaseIds = new Set();

  for (let floor = 1; floor <= 10; floor += 1) {
    const result = await page.evaluate((knownIds) => {
      const snapshot = window.__TEST_API__.getSnapshot();
      const duplicate = (snapshot.showcases ?? []).find((showcase) => knownIds.includes(showcase.id));

      return duplicate
        ? { ok: false, floor: snapshot.floor, duplicateId: duplicate.id }
        : {
            ok: true,
            floor: snapshot.floor,
            showcaseIds: (snapshot.showcases ?? []).map((showcase) => showcase.id),
          };
    }, Array.from(seenShowcaseIds));

    expect(result.ok).toBeTruthy();

    result.showcaseIds.forEach((id) => seenShowcaseIds.add(id));

    if (floor < 10) {
      await page.evaluate(() => {
        window.__TEST_API__.clearFloorEntities();
      });
      await openDownstairsPrompt(page);
      await page.evaluate(() => {
        document.getElementById("stairsConfirm")?.click();
      });
    }
  }
});

test("showcases block movement like room obstacles", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  const start = await page.evaluate(() => {
    const snapshot = window.__TEST_API__.getSnapshot();
    window.__TEST_API__.clearFloorEntities();
    window.__TEST_API__.placeShowcase({ x: snapshot.player.x + 1, y: snapshot.player.y }, {
      id: "test-showcase",
      name: "Test-Vitrine",
      source: "Tests",
      description: "Nur für den Test.",
    });
    return snapshot.player;
  });

  await page.keyboard.press("ArrowRight");

  const snapshot = await page.evaluate(() => window.__TEST_API__.getSnapshot());
  const messages = await page.evaluate(() => window.__TEST_API__.getMessages());

  expect(snapshot.player.x).toBe(start.x);
  expect(snapshot.player.y).toBe(start.y);
  expect(messages.some((entry) => entry.text.includes("Glasvitrine"))).toBeTruthy();
});

test("showcase tiles use a larger visual footprint inside the board", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await page.evaluate(() => {
    const snapshot = window.__TEST_API__.getSnapshot();
    window.__TEST_API__.clearFloorEntities();
    window.__TEST_API__.placeShowcase({ x: snapshot.player.x + 1, y: snapshot.player.y }, {
      id: "test-showcase-footprint",
      name: "Test-Vitrine",
      source: "Tests",
      description: "Nur fuer den Test.",
    });
  });

  const footprint = await page.locator(".tile.showcase").first().evaluate((node) => {
    const overlay = getComputedStyle(node, "::after");
    const frame = getComputedStyle(node, "::before");
    return {
      overlaySize: overlay.backgroundSize,
      overlayInsetTop: overlay.top,
      frameContent: frame.content,
    };
  });

  expect(footprint.overlaySize).toBe("34px 34px");
  expect(footprint.overlayInsetTop).toBe("-4px");
  expect(footprint.frameContent === "none" || footprint.frameContent === "\"\"").toBeTruthy();
});

test("showcases in explored memory tiles keep the dark floor base", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  const showcaseMemoryTile = await page.evaluate(() => {
    const initialSnapshot = window.__TEST_API__.getSnapshot();
    const revealTile = { x: initialSnapshot.player.x, y: initialSnapshot.player.y };
    const width = initialSnapshot.grid[0]?.length ?? 0;
    const floorTiles = [];
    const visibleFloorTiles = [];

    for (let y = 0; y < initialSnapshot.grid.length; y += 1) {
      for (let x = 0; x < width; x += 1) {
        if (initialSnapshot.grid[y]?.[x] !== ".") {
          continue;
        }

        const tile = { x, y };
        floorTiles.push(tile);
        if (initialSnapshot.visible?.[y]?.[x] && !(x === revealTile.x && y === revealTile.y)) {
          visibleFloorTiles.push(tile);
        }
      }
    }

    let scenario = null;
    for (const showcaseTile of visibleFloorTiles) {
      for (const hideTile of floorTiles) {
        window.__TEST_API__.teleportPlayer(hideTile);
        const hiddenSnapshot = window.__TEST_API__.getSnapshot();
        if (!hiddenSnapshot.visible?.[showcaseTile.y]?.[showcaseTile.x]) {
          scenario = { showcaseTile, hideTile, width };
          break;
        }
      }
      if (scenario) {
        break;
      }
    }

    if (!scenario) {
      window.__TEST_API__.teleportPlayer(revealTile);
      return null;
    }

    window.__TEST_API__.clearFloorEntities();
    window.__TEST_API__.teleportPlayer(revealTile);
    window.__TEST_API__.placeShowcase(scenario.showcaseTile, {
      id: "test-showcase-memory-floor",
      name: "Memory-Vitrine",
      source: "Tests",
      description: "Nur fuer den Memory-Test.",
    });
    window.__TEST_API__.teleportPlayer(scenario.hideTile);

    const cells = Array.from(document.querySelectorAll(".board .tile-cell"));
    const cell = cells[scenario.showcaseTile.y * scenario.width + scenario.showcaseTile.x] ?? null;
    const base = cell?.querySelector(".tile-base");
    const foreground = cell?.querySelector(".tile-foreground-layer");

    return {
      baseClass: base?.className ?? "",
      foregroundClass: foreground?.className ?? "",
      showcaseTile: scenario.showcaseTile,
      hideTile: scenario.hideTile,
    };
  });

  expect(showcaseMemoryTile).not.toBeNull();
  expect(showcaseMemoryTile.baseClass).toContain("tile-base");
  expect(showcaseMemoryTile.baseClass).toContain("floor");
  expect(showcaseMemoryTile.baseClass).toContain("memory");
  expect(showcaseMemoryTile.foregroundClass).toContain("showcase");
  expect(showcaseMemoryTile.foregroundClass).toContain("memory");
});

test("moving orthogonally next to a showcase logs one random ambience line", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  const moveKey = await page.evaluate(() => {
    const snapshot = window.__TEST_API__.getSnapshot();
    const candidates = [
      {
        key: "ArrowRight",
        moveTile: { x: snapshot.player.x + 1, y: snapshot.player.y },
        showcaseTile: { x: snapshot.player.x + 2, y: snapshot.player.y },
      },
      {
        key: "ArrowLeft",
        moveTile: { x: snapshot.player.x - 1, y: snapshot.player.y },
        showcaseTile: { x: snapshot.player.x - 2, y: snapshot.player.y },
      },
      {
        key: "ArrowDown",
        moveTile: { x: snapshot.player.x, y: snapshot.player.y + 1 },
        showcaseTile: { x: snapshot.player.x, y: snapshot.player.y + 2 },
      },
      {
        key: "ArrowUp",
        moveTile: { x: snapshot.player.x, y: snapshot.player.y - 1 },
        showcaseTile: { x: snapshot.player.x, y: snapshot.player.y - 2 },
      },
    ].filter((candidate) =>
      snapshot.grid[candidate.moveTile.y]?.[candidate.moveTile.x] === "." &&
      snapshot.grid[candidate.showcaseTile.y]?.[candidate.showcaseTile.x] === "."
    );
    const selected = candidates[0] ?? null;
    if (!selected) {
      return null;
    }

    window.__TEST_API__.clearFloorEntities();
    window.__TEST_API__.placeShowcase(selected.showcaseTile, {
      id: "test-showcase",
      ambienceId: "jason-mask",
      name: "Test-Vitrine",
      source: "Tests",
      description: "Nur für den Test.",
    });

    window.__TEST_API__.teleportPlayer({ x: snapshot.player.x, y: snapshot.player.y });
    return selected.key;
  });

  expect(moveKey).not.toBeNull();
  await page.keyboard.press(moveKey);

  const messages = await page.evaluate(() => window.__TEST_API__.getMessages().map((entry) => ({
    text: entry.text,
    tone: entry.tone,
  })));
  const ambienceLines = [
    "Hinter dem Glas starrt dich eine abgenutzte Hockeymaske an. Der Raum wirkt plötzlich stiller.",
    "Die Maske in der Vitrine sieht harmlos aus, bis man merkt, wie leer der Blick dahinter ist.",
    "Ein kaltes Schaudern zieht durch den Raum. Selbst hinter Glas wirkt diese Maske wie eine Warnung.",
  ];

  expect(messages.some((message) => ambienceLines.includes(message.text))).toBeTruthy();
  expect(messages.some((message) => ambienceLines.includes(message.text) && message.tone === "important")).toBeTruthy();
});
