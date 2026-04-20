const { test, expect } = require("playwright/test");
require("./test-setup");
const { startRun, setupChestAtPlayerStep, setupCombat, setupWeaponAtPlayerStep } = require("./helpers");

async function loadFirstSaveFromList(page) {
  await expect(page.locator("#savegamesModal")).toBeVisible();
  await page.locator("#savegameList .choice-btn", { hasText: "Laden" }).first().click();
}

async function saveIntoFirstEmptySlot(page) {
  await expect(page.locator("#savegamesModal")).toBeVisible();
  await page.locator("#savegameList .choice-btn", { hasText: "In Slot speichern" }).first().click();
}

test("start screen renders the new title", async ({ page }) => {
  await page.goto("/");

  const startScreen = page.locator("#startScreen");
  await expect(page).toHaveTitle("The Final Scene");
  await expect(startScreen).toBeVisible();
  await expect(startScreen.locator(".start-screen-title")).toContainText("DRINGE TIEFER IN DEN STUDIOKOMPLEX VOR");
  await expect(page.getByRole("button", { name: "Neues Spiel beginnen" })).toBeVisible();
  await expect(page.locator("#gameShell")).toHaveClass(/prestart-hidden/);
});

test("landing and start modal lore terms show compact tooltips", async ({ page }) => {
  await page.goto("/");

  await page.locator('#startScreen .lore-term', { hasText: 'Studios' }).hover();
  await expect(page.locator("#hoverTooltip")).toContainText("Studio");
  await expect(page.locator("#hoverTooltip")).not.toHaveText("");

  await page.getByRole("button", { name: "Neues Spiel beginnen" }).click();
  await expect(page.locator("#startModal")).toBeVisible();
  await page.locator('#startModal .lore-term', { hasText: 'Final Scene' }).last().hover();
  await expect(page.locator("#hoverTooltip")).toContainText("Final Scene");
  await expect(page.locator("#hoverTooltip")).not.toHaveText("");
});

test("start screen menu supports visible arrow-key selection", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator("#startNewGame")).toHaveClass(/selected/);
  await page.keyboard.press("ArrowDown");

  let activeStartButton = await page.evaluate(() => ({
    id: document.activeElement?.id ?? null,
    selected: Array.from(document.querySelectorAll(".start-screen-btn.selected")).map((entry) => entry.id),
  }));
  expect(activeStartButton.id).toBe("loadGameFromLanding");
  expect(activeStartButton.selected).toEqual(["loadGameFromLanding"]);

  await page.keyboard.press("ArrowDown");
  activeStartButton = await page.evaluate(() => ({
    id: document.activeElement?.id ?? null,
    selected: Array.from(document.querySelectorAll(".start-screen-btn.selected")).map((entry) => entry.id),
  }));
  expect(activeStartButton.id).toBe("openHighscoresLanding");
  expect(activeStartButton.selected).toEqual(["openHighscoresLanding"]);

  await page.keyboard.press("ArrowUp");
  activeStartButton = await page.evaluate(() => ({
    id: document.activeElement?.id ?? null,
    selected: Array.from(document.querySelectorAll(".start-screen-btn.selected")).map((entry) => entry.id),
  }));
  expect(activeStartButton.id).toBe("loadGameFromLanding");
  expect(activeStartButton.selected).toEqual(["loadGameFromLanding"]);
});

test("hovering a landing button moves the active start-menu focus instead of leaving two highlighted", async ({ page }) => {
  await page.goto("/");

  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");

  let activeStartButton = await page.evaluate(() => ({
    id: document.activeElement?.id ?? null,
    selected: Array.from(document.querySelectorAll(".start-screen-btn.selected")).map((entry) => entry.id),
  }));
  expect(activeStartButton.id).toBe("openHelpLanding");
  expect(activeStartButton.selected).toEqual(["openHelpLanding"]);

  await page.locator("#startNewGame").hover();

  activeStartButton = await page.evaluate(() => ({
    id: document.activeElement?.id ?? null,
    selected: Array.from(document.querySelectorAll(".start-screen-btn.selected")).map((entry) => entry.id),
  }));
  expect(activeStartButton.id).toBe("startNewGame");
  expect(activeStartButton.selected).toEqual(["startNewGame"]);
});

test("hero name can be changed and persists for the next session", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Neues Spiel beginnen" }).click();
  await expect(page.locator("#startModal")).toBeVisible();
  await page.locator("#heroNameInput").fill("Ripley");
  await page.locator("#startForm").evaluate((form) => form.requestSubmit());

  await expect(page.locator("#playerPanelTitle")).toContainText("Ripley");

  await page.reload();

  await expect(page.locator("#startScreen")).toBeVisible();
  await page.getByRole("button", { name: "Neues Spiel beginnen" }).click();
  await expect(page.locator("#startModal")).toBeVisible();
  await expect(page.locator("#heroNameInput")).toHaveValue("Ripley");
});

test("hero class cards can be selected from the start screen", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator("#startScreen")).toBeVisible();
  await page.getByRole("button", { name: "Neues Spiel beginnen" }).click();
  await expect(page.locator("#startModal")).toBeVisible();
  await expect(page.locator("#classOptions .class-option-art")).toHaveCount(3);
  await expect(page.locator("#classOptions")).toContainText("Triff deine Marke");
  await page.locator("#classOptions").getByText("Stuntman", { exact: true }).click();
  await expect(page.locator(".class-option.selected .class-option-title")).toHaveText("Stuntman");

  await page.locator("#startForm").evaluate((form) => form.requestSubmit());
  const heroSelection = await page.evaluate(() => {
    const playerTile = document.querySelector(".board .tile.player");
    const title = document.getElementById("playerPanelTitle");
    const snapshot = window.__TEST_API__.getSnapshot();
    return {
      playerClassId: snapshot.player.classId,
      titleIcon: title.style.getPropertyValue("--hero-class-icon"),
      tileHasVisual: Boolean(window.getComputedStyle(playerTile, "::after").backgroundImage),
    };
  });

  expect(heroSelection.playerClassId).toBe("stuntman");
  expect(heroSelection.titleIcon).not.toBe("");
  expect(heroSelection.tileHasVisual).toBeTruthy();
});

test("double-clicking a hero class card starts the run into the first studio", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Neues Spiel beginnen" }).click();
  await expect(page.locator("#startModal")).toBeVisible();

  await page.locator("#heroNameInput").fill("Doubletake");
  await page.locator("#classOptions .class-option").filter({ hasText: "Stuntman" }).dblclick();

  await expect(page.locator("#startModal")).toBeHidden();
  await expect(page.locator("#gameShell")).not.toHaveClass(/prestart-hidden/);

  const snapshot = await page.evaluate(() => window.__TEST_API__.getSnapshot());
  expect(snapshot.floor).toBe(1);
  expect(snapshot.player.name).toBe("Doubletake");
  expect(snapshot.player.classId).toBe("stuntman");
});

test("single-clicking a hero class card only selects it and does not start the run", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Neues Spiel beginnen" }).click();
  await expect(page.locator("#startModal")).toBeVisible();

  await page.locator("#heroNameInput").fill("Singletake");
  await page.locator("#classOptions .class-option").filter({ hasText: "Stuntman" }).click();

  await expect(page.locator("#startModal")).toBeVisible();
  await expect(page.locator(".class-option.selected .class-option-title")).toHaveText("Stuntman");
  await expect(page.locator("#gameShell")).toHaveClass(/prestart-hidden/);
});

test("hero class cards support arrow-key selection on the start screen", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Neues Spiel beginnen" }).click();
  await expect(page.locator("#startModal")).toBeVisible();

  await page.locator(".class-option.selected").focus();
  await page.keyboard.press("ArrowDown");
  await expect(page.locator(".class-option.selected .class-option-title")).toHaveText("Stuntman");

  await page.keyboard.press("ArrowDown");
  await expect(page.locator(".class-option.selected .class-option-title")).toHaveText("Regisseur");

  await page.keyboard.press("ArrowUp");
  await expect(page.locator(".class-option.selected .class-option-title")).toHaveText("Stuntman");
});

test("opening the class modal moves focus into class selection so arrows do not cycle the landing menu", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator("#startNewGame")).toHaveClass(/selected/);
  await page.getByRole("button", { name: "Neues Spiel beginnen" }).click();
  await expect(page.locator("#startModal")).toBeVisible();

  await expect(page.locator(".class-option.selected")).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(page.locator(".class-option.selected .class-option-title")).toHaveText("Stuntman");

  const landingSelection = await page.evaluate(() =>
    Array.from(document.querySelectorAll(".start-screen-btn.selected")).map((entry) => entry.id)
  );
  expect(landingSelection).toEqual(["startNewGame"]);
});

test("each hero class starts with its configured opening weapon setup", async ({ page }) => {
  const classExpectations = [
    {
      classLabel: "Filmstar",
      allowedIds: ["expedition-revolver"],
      attackMode: "ranged",
    },
    {
      classLabel: "Stuntman",
      allowedIds: ["combat-knife", "woodcutter-axe", "breach-axe", "bowie-knife"],
      attackMode: "melee",
    },
    {
      classLabel: "Regisseur",
      allowedIds: ["cane-blade", "electro-scalpel"],
      attackMode: "melee",
    },
  ];

  await page.goto("/");

  for (const expectation of classExpectations) {
    await startRun(page, { classLabel: expectation.classLabel });
    const inventory = await page.evaluate(() => window.__TEST_API__.getInventorySnapshot());

    expect(inventory.equippedWeapon.id).not.toBe("bare-hands");
    expect(expectation.allowedIds).toContain(inventory.equippedWeapon.id);
    expect(inventory.equippedWeapon.attackMode).toBe(expectation.attackMode);

    await page.reload();
  }
});

test("hero classes receive their configured starting loadouts", async ({ page }) => {
  const classExpectations = [
    {
      classLabel: "Filmstar",
      potionCount: 2,
      foodIds: [],
      equippedWeaponId: "expedition-revolver",
    },
    {
      classLabel: "Stuntman",
      potionCount: 1,
      foodIds: ["sandwich"],
    },
    {
      classLabel: "Regisseur",
      potionCount: 1,
      foodIds: ["energy_bar", "energy_bar"],
    },
  ];

  await page.goto("/");

  for (const expectation of classExpectations) {
    await startRun(page, { classLabel: expectation.classLabel });
    const inventory = await page.evaluate(() => window.__TEST_API__.getInventorySnapshot());

    expect(inventory.potionCount).toBe(expectation.potionCount);
    expect(inventory.items.filter((item) => item.type === "food").map((item) => item.id)).toEqual(expectation.foodIds);
    if (expectation.equippedWeaponId) {
      expect(inventory.equippedWeapon.id).toBe(expectation.equippedWeaponId);
    }

    await page.reload();
  }
});

test("starting from the modal reuses the already prepared first studio", async ({ page }) => {
  await page.goto("/");

  const beforeStart = await page.evaluate(() => window.__TEST_API__.getSnapshot());

  await page.getByRole("button", { name: "Neues Spiel beginnen" }).click();
  await page.locator("#classOptions").getByText("Stuntman", { exact: true }).click();
  await page.locator("#startForm").evaluate((form) => form.requestSubmit());
  await expect(page.locator("#startModal")).toBeHidden();
  await expect(page.locator("#gameShell")).not.toHaveClass(/prestart-hidden/);

  const afterStart = await page.evaluate(() => window.__TEST_API__.getSnapshot());

  expect(afterStart.floor).toBe(1);
  expect(afterStart.grid).toEqual(beforeStart.grid);
  expect(afterStart.stairsDown).toEqual(beforeStart.stairsDown);
  expect(afterStart.stairsUp).toEqual(beforeStart.stairsUp);
  expect(afterStart.doors).toEqual(beforeStart.doors);
  expect(afterStart.rooms).toEqual(beforeStart.rooms);
  expect(afterStart.player.classId).toBe("stuntman");
});

test("highscores render class icons for stored runs", async ({ page }) => {
  await page.goto("/");

  await page.evaluate(() => {
    window.localStorage.setItem("dungeon-rogue-highscores-version", "2");
    window.localStorage.setItem("dungeon-rogue-highscores", JSON.stringify([
      {
        marker: "icon-test",
        heroName: "Sidney",
        heroClassId: "director",
        heroClass: "Regisseur",
        date: "12.04.2026, 16:00:00",
        deathFloor: 4,
        deepestFloor: 4,
        level: 3,
        hp: 6,
        maxHp: 17,
        turns: 88,
        kills: 12,
        deathCause: "Testeintrag.",
      },
    ]));
  });

  await startRun(page);
  await page.getByRole("button", { name: "Final Scenes" }).click();
  await expect(page.locator("#highscoresModal")).toBeVisible();
  await expect(page.locator(".score-class-badge")).toHaveCount(1);
  await expect(page.locator(".score-item")).toContainText("Sidney");
  await expect(page.locator(".score-item")).toContainText("Regisseur");
  await expect(page.locator(".score-class-badge")).toBeVisible();
});

test("inventory modal toggles with keyboard controls", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await page.keyboard.press("i");
  await expect(page.locator("#inventoryModal")).toBeVisible();
  await expect(page.locator("#inventoryItemsTab")).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("#inventoryItemsPanel")).toBeVisible();
  await expect(page.locator("#inventoryHeroPanel")).toBeHidden();

  await page.keyboard.press("Escape");
  await expect(page.locator("#inventoryModal")).toBeHidden();
});

test("inventory modal keeps food rows compact after filtering", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await page.evaluate(() => {
    window.__TEST_API__.addInventoryItem({
      type: "food",
      id: "compact-layout-snack-a",
      name: "Kompakt A",
      nutritionRestore: 5,
      description: "Kurz.",
    });
    window.__TEST_API__.addInventoryItem({
      type: "food",
      id: "compact-layout-snack-b",
      name: "Kompakt B",
      nutritionRestore: 5,
      description: "Kurz.",
    });
  });

  await page.keyboard.press("i");
  await expect(page.locator("#inventoryModal")).toBeVisible();
  await page.locator('[data-filter="food"]').click();

  const compactLayout = await page.evaluate(() => {
    return [...document.querySelectorAll("#inventoryList .inventory-item")]
      .map((node) => ({
        name: node.querySelector("strong")?.textContent?.trim() ?? "",
        height: node.getBoundingClientRect().height,
      }))
      .filter((entry) => entry.name === "Kompakt A" || entry.name === "Kompakt B");
  });

  expect(compactLayout).toHaveLength(2);
  compactLayout.forEach((entry) => {
    expect(entry.height).toBeLessThan(120);
  });
});

test("inventory modal scrolls long item lists", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await page.evaluate(() => {
    for (let index = 0; index < 18; index += 1) {
      window.__TEST_API__.addInventoryItem({
        type: "food",
        id: `layout-snack-${index}`,
        name: `Layout-Snack ${index + 1}`,
        nutritionRestore: 5,
        description: "Nur fuer den Layouttest.",
      });
    }
  });

  await page.keyboard.press("i");
  await expect(page.locator("#inventoryModal")).toBeVisible();

  const inventoryLayout = await page.evaluate(() => {
    const inventoryList = document.getElementById("inventoryList");
    return {
      listOverflowY: inventoryList ? window.getComputedStyle(inventoryList).overflowY : "",
      listCanScroll: inventoryList ? inventoryList.scrollHeight > inventoryList.clientHeight : false,
    };
  });

  expect(inventoryLayout.listOverflowY).toBe("auto");
  expect(inventoryLayout.listCanScroll).toBeTruthy();
});

test("inventory modal switches between items and hero tabs without resizing", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await page.keyboard.press("i");
  await expect(page.locator("#inventoryModal")).toBeVisible();

  const inventoryModalHeight = await page.locator(".inventory-modal-card").evaluate((node) => node.getBoundingClientRect().height);

  await page.locator("#inventoryHeroTab").click();
  await expect(page.locator("#inventoryHeroTab")).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("#inventoryHeroPanel")).toBeVisible();
  await expect(page.locator("#inventoryItemsPanel")).toBeHidden();

  const heroModalHeight = await page.locator(".inventory-modal-card").evaluate((node) => node.getBoundingClientRect().height);
  expect(Math.abs(inventoryModalHeight - heroModalHeight)).toBeLessThan(2);
});

test("containers open a loot list with multiple items and keep remaining contents until emptied", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await page.evaluate(() => {
    const snapshot = window.__TEST_API__.getSnapshot();
    const target = { x: snapshot.player.x + 1, y: snapshot.player.y };
    window.__TEST_API__.clearFloorEntities();
    window.__TEST_API__.placeChest(target, [
      {
        type: "weapon",
        item: {
          type: "weapon",
          id: "container-test-blade",
          name: "Containerklinge",
          source: "Tests",
          handedness: "one-handed",
          attackMode: "melee",
          range: 1,
          damage: 3,
          hitBonus: 1,
          critBonus: 0,
          description: "Nur fuer den Container-Test.",
        },
      },
      {
        type: "food",
        item: {
          type: "food",
          id: "container-test-ration",
          name: "Requisitenration",
          nutritionRestore: 40,
          description: "Nur fuer den Container-Test.",
        },
      },
    ]);
  });

  await page.evaluate(() => {
    const snapshot = window.__TEST_API__.getSnapshot();
    const chest = snapshot.chests[0];
    window.__TEST_API__.teleportPlayer({ x: chest.x, y: chest.y });
    window.__TEST_API__.openChestAtPlayer();
  });

  await expect(page.locator("#containerLootModal")).toBeVisible();
  await expect(page.locator("#containerLootTitle")).toContainText("Requisitenkiste");
  await expect(page.locator("#containerLootList")).toContainText("Containerklinge");
  await expect(page.locator("#containerLootList")).toContainText("Requisitenration");

  const weaponRow = page.locator("#containerLootList .container-loot-item").filter({ hasText: "Containerklinge" });
  await weaponRow.getByRole("button", { name: "Wählen" }).click();
  await expect(page.locator("#containerLootTakeSelected")).toBeEnabled();
  await page.locator("#containerLootTakeSelected").click();
  await expect(page.locator("#containerLootModal")).toBeHidden();

  const afterFirstPickup = await page.evaluate(() => ({
    inventory: window.__TEST_API__.getInventorySnapshot(),
    snapshot: window.__TEST_API__.getSnapshot(),
  }));

  expect(afterFirstPickup.inventory.items.some((item) => item.name === "Containerklinge")).toBeTruthy();
  expect(afterFirstPickup.inventory.items.some((item) => item.name === "Requisitenration")).toBeFalsy();
  expect(afterFirstPickup.snapshot.chests).toHaveLength(1);
  expect(afterFirstPickup.snapshot.chests[0].opened).toBeTruthy();
  expect(afterFirstPickup.snapshot.chests[0].contents.map((entry) => entry.name)).toEqual(["Requisitenration"]);

  await page.evaluate(() => {
    const snapshot = window.__TEST_API__.getSnapshot();
    const chest = snapshot.chests[0];
    window.__TEST_API__.teleportPlayer({ x: chest.x, y: chest.y });
    window.__TEST_API__.openChestAtPlayer();
  });

  await expect(page.locator("#containerLootModal")).toBeVisible();
  await expect(page.locator("#containerLootList")).toContainText("Requisitenration");
  await expect(page.locator("#containerLootList")).not.toContainText("Containerklinge");
  await page.locator("#containerLootTakeAll").click();
  await expect(page.locator("#containerLootModal")).toBeHidden();

  const afterSecondPickup = await page.evaluate(() => ({
    inventory: window.__TEST_API__.getInventorySnapshot(),
    snapshot: window.__TEST_API__.getSnapshot(),
  }));

  expect(afterSecondPickup.inventory.items.some((item) => item.name === "Requisitenration")).toBeTruthy();
  expect(afterSecondPickup.snapshot.chests).toHaveLength(0);
});

test("stepping onto a container opens the loot modal without hanging the application", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await setupChestAtPlayerStep(page, [
    {
      type: "food",
      item: {
        type: "food",
        id: "step-test-ration",
        name: "Schrittprobe",
        nutritionRestore: 20,
        description: "Nur fuer den Schritt-auf-Kiste-Test.",
      },
    },
  ]);

  await page.keyboard.press("ArrowRight");

  await expect(page.locator("#containerLootModal")).toBeVisible();
  await expect(page.locator("#containerLootList")).toContainText("Schrittprobe");
  await expect(page.locator("#messageLog")).toContainText("Du öffnest");

  const playerCellPresentation = await page.evaluate(() => {
    const playerCell = document.querySelector(".tile.player")?.closest(".tile-cell");
    const underlay = playerCell?.querySelector(".tile-transition-underlay");
    return {
      hasChestUnderlay: underlay?.className.includes("chest") ?? false,
    };
  });

  const snapshot = await page.evaluate(() => window.__TEST_API__.getSnapshot());
  expect(playerCellPresentation.hasChestUnderlay).toBeTruthy();
  expect(snapshot.pendingContainerLoot).not.toBeNull();
  expect(snapshot.pendingContainerLoot?.chestIndex).toBe(0);
  expect(snapshot.player.x).toBeGreaterThan(0);
});

test("empty containers show an empty state and disappear after closing", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await page.evaluate(() => {
    const snapshot = window.__TEST_API__.getSnapshot();
    const target = { x: snapshot.player.x + 1, y: snapshot.player.y };
    window.__TEST_API__.clearFloorEntities();
    window.__TEST_API__.placeChest(target, []);
  });

  await page.evaluate(() => {
    const snapshot = window.__TEST_API__.getSnapshot();
    const chest = snapshot.chests[0];
    window.__TEST_API__.teleportPlayer({ x: chest.x, y: chest.y });
    window.__TEST_API__.openChestAtPlayer();
  });

  await expect(page.locator("#containerLootModal")).toBeVisible();
  await expect(page.locator("#containerLootSummary")).toContainText("leer");
  await expect(page.locator("#containerLootList")).toContainText("Diese Kiste ist leer.");
  await expect(page.locator("#containerLootTakeAll")).toBeDisabled();
  await page.locator("#containerLootClose").click();
  await expect(page.locator("#containerLootModal")).toBeHidden();

  const snapshotAfterClose = await page.evaluate(() => window.__TEST_API__.getSnapshot());
  expect(snapshotAfterClose.chests).toHaveLength(0);
});

test("heal overlay covers the studio and anchors the healing choices at the lower center", async ({ page }) => {
  await page.setViewportSize({ width: 1365, height: 768 });
  await page.addInitScript(() => {
    let existingOptions = {};
    try {
      existingOptions = JSON.parse(window.localStorage.getItem("dungeon-rogue-options") ?? "{}") ?? {};
    } catch {
      existingOptions = {};
    }

    window.localStorage.setItem("dungeon-rogue-options", JSON.stringify({
      ...existingOptions,
      uiScale: 1.3,
    }));
  });

  await page.goto("/");
  await startRun(page, { classLabel: "Stuntman" });
  await page.evaluate(() => {
    window.__TEST_API__.setupCombatScenario({
      player: {
        hp: 12,
        maxHp: 20,
      },
    });
    window.__TEST_API__.addInventoryItem({
      type: "potion",
      familyId: "heal_bandage_small",
    });
  });

  await page.keyboard.press("h");
  await expect(page.locator("#healOverlay")).toBeVisible();
  await expect(page.locator("#healOverlayItems .heal-overlay-item")).toHaveCount(2);

  const alignment = await page.evaluate(() => {
    const boardViewport = document.getElementById("boardViewport");
    const overlay = document.getElementById("healOverlay");
    const item = document.querySelector("#healOverlayItems .heal-overlay-item");
    const overlayAnchor = overlay?.parentElement ?? null;
    if (boardViewport) {
      boardViewport.scrollLeft = Math.max(0, boardViewport.scrollWidth - boardViewport.clientWidth);
      boardViewport.scrollTop = Math.max(0, boardViewport.scrollHeight - boardViewport.clientHeight);
    }
    const viewportRect = boardViewport?.getBoundingClientRect();
    const overlayRect = overlay?.getBoundingClientRect();
    const itemRect = item?.getBoundingClientRect();
    return {
      anchorHasOverlayClass: overlayAnchor?.classList.contains("heal-overlay-active") ?? false,
      viewportCenterX: viewportRect ? viewportRect.left + (viewportRect.width / 2) : 0,
      overlayCenterX: overlayRect ? overlayRect.left + (overlayRect.width / 2) : 0,
      viewportBottom: viewportRect?.bottom ?? 0,
      overlayBottom: overlayRect?.bottom ?? 0,
      itemBottom: itemRect?.bottom ?? 0,
      overlayTop: overlayRect?.top ?? 0,
      viewportTop: viewportRect?.top ?? 0,
    };
  });

  expect(alignment.anchorHasOverlayClass).toBeTruthy();
  expect(Math.abs(alignment.overlayCenterX - alignment.viewportCenterX)).toBeLessThan(2);
  expect(Math.abs(alignment.viewportBottom - alignment.overlayBottom)).toBeLessThanOrEqual(2);
  expect(alignment.viewportBottom - alignment.itemBottom).toBeGreaterThanOrEqual(10);
  expect(alignment.overlayTop).toBeGreaterThanOrEqual(alignment.viewportTop);

  await expect(page.locator("#healOverlayName")).toHaveText("Verbandspäckchen");
  await page.keyboard.press("d");
  await expect(page.locator("#healOverlayName")).toHaveText("Set-Sanitätskit");
  await page.keyboard.press("a");
  await expect(page.locator("#healOverlayName")).toHaveText("Verbandspäckchen");
  await page.keyboard.press("6");
  await expect(page.locator("#healOverlayName")).toHaveText("Set-Sanitätskit");
  await page.keyboard.press("4");
  await expect(page.locator("#healOverlayName")).toHaveText("Verbandspäckchen");

  await page.keyboard.press("w");
  await expect(page.locator("#healOverlay")).toBeVisible();
  const overlayHintMessages = await page.evaluate(() => window.__TEST_API__.getMessages());
  expect(overlayHintMessages.at(-1)?.text ?? "").toContain("Heilauswahl aktiv");

  await page.keyboard.press("Enter");
  await expect(page.locator("#healOverlay")).toBeHidden();

  const healingResult = await page.evaluate(() => {
    const snapshot = window.__TEST_API__.getSnapshot();
    const inventory = window.__TEST_API__.getInventorySnapshot();
    return {
      overlayOpen: snapshot.healOverlay?.open ?? null,
      hp: snapshot.player.hp,
      potionCount: inventory.potionCount,
    };
  });

  expect(healingResult.overlayOpen).toBeFalsy();
  expect(healingResult.hp).toBeGreaterThan(12);
  expect(healingResult.potionCount).toBe(1);
});

test("player sidebar stays compact and opens hero details in the inventory modal", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await expect(page.locator("#playerSheet")).toContainText("Haupthand");
  await expect(page.locator("#playerSheet")).toContainText("Nebenhand");
  await expect(page.locator("#playerSheet")).not.toContainText("Status");
  await expect(page.locator("#openHeroDetails")).toHaveAttribute("aria-label", "Heldendetails öffnen");

  await page.locator("#openHeroDetails").click();
  await expect(page.locator("#inventoryModal")).toBeVisible();
  await expect(page.locator("#inventoryModal h2")).toContainText("Inventar & Held");
  await expect(page.locator("#inventoryHeroTab")).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("#inventoryHeroPanel")).toBeVisible();
  await expect(page.locator("#inventoryItemsPanel")).toBeHidden();
  await expect(page.locator("#heroSheet")).toContainText("Klasse");
  await expect(page.locator("#heroSheet")).toContainText("Haupthand");
  await expect(page.locator("#heroSheet")).toContainText("Weitere Slots");

  await page.locator("#inventoryItemsTab").click();
  await expect(page.locator("#inventoryItemsTab")).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("#inventoryItemsPanel")).toBeVisible();
  await expect(page.locator("#inventoryHeroPanel")).toBeHidden();
});

test("hero details show speed categories and split current speed from the base value", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await page.locator("#openHeroDetails").click();
  await expect(page.locator("#inventoryHeroPanel")).toBeVisible();
  await expect(page.locator("#heroSheet")).toContainText("Geschwindigkeit");
  await expect(page.locator("#heroSheet")).toContainText("Normal (0 %)");

  await page.evaluate(() => {
    window.__TEST_API__.setPlayerSpeed({
      baseSpeed: 90,
      speedIntervalModifiers: [
        { label: "Verletzung", value: 10 },
      ],
    });
  });

  await expect(page.locator("#heroSheet")).toContainText("Grundgeschwindigkeit");
  await expect(page.locator("#heroSheet")).toContainText("Schnell (+10 %)");
  await expect(page.locator("#heroSheet")).toContainText("Aktuelle Geschwindigkeit");
  await expect(page.locator("#heroSheet")).toContainText("Normal (0 %)");
  await expect(page.locator("#heroSheet")).toContainText("Modifikatoren");
  await expect(page.locator("#heroSheet")).toContainText("Verletzung -10 %");
});

test("hero details list attributes and explain their effects in tooltips", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await page.locator("#openHeroDetails").click();
  await expect(page.locator("#inventoryHeroPanel")).toBeVisible();
  await expect(page.locator("#heroSheet .inventory-hero-attribute")).toHaveCount(6);
  await expect(page.locator("#heroSheet")).toContainText("Stärke");
  await expect(page.locator("#heroSheet")).toContainText("Präzision");
  await expect(page.locator("#heroSheet")).toContainText("Reaktion");
  await expect(page.locator("#heroSheet")).toContainText("Nerven");
  await expect(page.locator("#heroSheet")).toContainText("Intelligenz");
  await expect(page.locator("#heroSheet")).toContainText("Ausdauer");

  await page.locator("#heroSheet .inventory-hero-attribute", { hasText: "Präzision" }).hover();
  await expect(page.locator("#hoverTooltip")).toContainText("Präzision");
  await expect(page.locator("#hoverTooltip")).toContainText("Steigert Trefferwert, Krit-Chance und die Entdeckung versteckter Fallen.");
  await expect(page.locator("body")).toHaveClass(/tooltip-open/);
  await expect(page.locator("#heroSheet .inventory-hero-attribute", { hasText: "Präzision" })).toHaveCSS("cursor", "default");

  await page.locator("#heroSheet .inventory-hero-attribute", { hasText: "Ausdauer" }).hover();
  await expect(page.locator("#hoverTooltip")).toContainText("Ausdauer");
  await expect(page.locator("#hoverTooltip")).toContainText("Reduziert erlittenen Fallenschaden und vergrößert dein Hungerpolster.");
});

test("sidebar icon buttons expose tooltips for details and collapsing", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await expect(page.locator("#openHeroDetails")).toHaveAttribute("title", /Heldendetails/);
  await expect(page.locator('[data-collapsible="log"] .collapse-btn')).toHaveAttribute("title", "Log ausblenden");
  await expect(page.locator('[data-collapsible="enemy"] .collapse-btn')).toHaveAttribute("title", "Gegnerpanel ausblenden");
  await expect(page.locator("#toggleEnemyPanelMode")).toHaveAttribute("title", "Gegneransicht kompakter schalten");
});

test("enemy sidebar omits portrait art and scrolls long detail content", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await setupCombat(page, {
    clearGrid: true,
    player: {
      strength: 4,
      precision: 9,
    },
    enemy: {
      name: "Archivschrecken",
      description: "Ein schattenhafter Schrecken aus staubigen Filmregalen mit absichtlich langem Beschreibungstext für den Layouttest.",
      temperamentHint: "Zieht Bahnen, als folge es einem laengst einstudierten Ablauf zwischen den Regalen und Projektoren.",
      special: "Kennt jeden dunklen Winkel des Archivs und fuehrt jede Waffe mit stoerender Sicherheit.",
      behaviorLabel: "Verfolger",
      mobilityLabel: "Mobil",
      retreatLabel: "Rueckt nur widerwillig zurueck",
      healingLabel: "Erholt sich langsam",
      hp: 18,
      maxHp: 18,
      reaction: 1,
      nerves: 0,
      variantLabel: "Elite",
      variantModifiers: [{ label: "Gepanzert" }, { label: "Hartnaeckig" }],
      weapon: {
        type: "weapon",
        id: "enemy-layout-test-weapon",
        name: "Archivspalter",
        source: "Tests",
        damage: 4,
        hitBonus: 2,
        critBonus: 0,
        description: "Nur fuer Tests.",
      },
    },
  });

  await page.evaluate(() => window.__TEST_API__.setRandomSequence([0, 0.99, 0]));
  await page.keyboard.press("ArrowRight");
  await expect(page.locator("#enemySheet")).toContainText("Leben");

  const enemyPanel = await page.evaluate(() => {
    const enemySheet = document.getElementById("enemySheet");
    return {
      hasPortrait: Boolean(document.querySelector(".enemy-sheet-art")),
      overflowY: window.getComputedStyle(enemySheet).overflowY,
      canScroll: enemySheet.scrollHeight > enemySheet.clientHeight,
    };
  });

  expect(enemyPanel.hasPortrait).toBeFalsy();
  expect(enemyPanel.overflowY).toBe("auto");
  expect(enemyPanel.canScroll).toBeTruthy();
});

test("enemy sidebar only reveals speed after first combat and shows the categorized value", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await setupCombat(page, {
    clearGrid: true,
    player: {
      strength: 4,
      precision: 9,
    },
    enemy: {
      name: "Tempotest",
      description: "Nur fuer Tempotests.",
      baseSpeed: 108,
      hp: 18,
      maxHp: 18,
    },
  });

  await expect(page.locator("#enemySheet")).not.toContainText("Geschwindigkeit");
  await expect(page.locator("#enemySheet")).toContainText("Mehr Details nach dem ersten Kampf.");

  await page.evaluate(() => window.__TEST_API__.setRandomSequence([0, 0.99, 0]));
  await page.keyboard.press("ArrowRight");

  await expect(page.locator("#enemySheet")).toContainText("Geschwindigkeit");
  await expect(page.locator("#enemySheet")).toContainText("Langsam (-8 %)");
});

test("enemy sidebar reflects fast normal and slow base speeds after the balancing pass", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  const scenarios = [
    { name: "Schnelltest", baseSpeed: 90, expected: "Schnell (+10 %)" },
    { name: "Normaltest", baseSpeed: 100, expected: "Normal (0 %)" },
    { name: "Langsamtest", baseSpeed: 125, expected: "Sehr langsam (-25 %)" },
  ];

  for (const scenario of scenarios) {
    await setupCombat(page, {
      clearGrid: true,
      player: {
        strength: 4,
        precision: 9,
      },
      enemy: {
        name: scenario.name,
        description: "Nur fuer Tempotests.",
        baseSpeed: scenario.baseSpeed,
        hp: 18,
        maxHp: 18,
      },
    });

    await page.evaluate(() => window.__TEST_API__.setRandomSequence([0, 0.99, 0]));
    await page.keyboard.press("ArrowRight");

    await expect(page.locator("#enemySheet")).toContainText("Geschwindigkeit");
    await expect(page.locator("#enemySheet")).toContainText(scenario.expected);
  }
});

test("enemy sidebar scroll area expands when other sidebar panels are collapsed", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await setupCombat(page, {
    clearGrid: true,
    player: {
      strength: 4,
      precision: 9,
    },
    enemy: {
      name: "Archivschrecken",
      description: "Ein schattenhafter Schrecken aus staubigen Filmregalen mit langem Beschreibungstext fuer den Layouttest.",
      temperamentHint: "Zieht Bahnen, als folge es einem laengst einstudierten Ablauf zwischen den Regalen und Projektoren.",
      special: "Kennt jeden dunklen Winkel des Archivs und fuehrt jede Waffe mit stoerender Sicherheit.",
      behaviorLabel: "Verfolger",
      mobilityLabel: "Mobil",
      retreatLabel: "Rueckt nur widerwillig zurueck",
      healingLabel: "Erholt sich langsam",
      hp: 18,
      maxHp: 18,
      reaction: 1,
      nerves: 0,
      variantLabel: "Elite",
      variantModifiers: [{ label: "Gepanzert" }, { label: "Hartnaeckig" }],
      weapon: {
        type: "weapon",
        id: "enemy-layout-growth-weapon",
        name: "Archivspalter",
        source: "Tests",
        damage: 4,
        hitBonus: 2,
        critBonus: 0,
        description: "Nur fuer Tests.",
      },
    },
  });

  await page.evaluate(() => window.__TEST_API__.setRandomSequence([0, 0.99, 0]));
  await page.keyboard.press("ArrowRight");
  await expect(page.locator("#enemySheet")).toContainText("Leben");

  const initialEnemyPanelLayout = await page.evaluate(() => {
    const enemyCardBody = document.querySelector('[data-collapsible="enemy"] .card-body');
    const enemySheet = document.getElementById("enemySheet");
    if (!enemyCardBody || !enemySheet) {
      return null;
    }

    return {
      bodyHeight: enemyCardBody.getBoundingClientRect().height,
      sheetHeight: enemySheet.getBoundingClientRect().height,
    };
  });

  await page.locator('[data-collapsible="log"] .collapse-btn').click();
  await page.locator('[data-collapsible="player"] .collapse-btn').click();

  const enemyPanelLayout = await page.evaluate(() => {
    const enemyCardBody = document.querySelector('[data-collapsible="enemy"] .card-body');
    const enemySheet = document.getElementById("enemySheet");
    if (!enemyCardBody || !enemySheet) {
      return null;
    }

    return {
      bodyHeight: enemyCardBody.getBoundingClientRect().height,
      sheetHeight: enemySheet.getBoundingClientRect().height,
    };
  });

  expect(initialEnemyPanelLayout).not.toBeNull();
  expect(enemyPanelLayout).not.toBeNull();
  expect(enemyPanelLayout.sheetHeight).toBeGreaterThan(initialEnemyPanelLayout.sheetHeight + 40);
  expect(enemyPanelLayout.sheetHeight / enemyPanelLayout.bodyHeight).toBeGreaterThan(0.9);
});

test("options modal toggles with keyboard controls", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await page.keyboard.press("o");
  await expect(page.locator("#optionsModal")).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(page.locator("#optionsModal")).toBeHidden();
});

test("save button opens the 10-slot save manager from the dungeon header", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await expect(page.getByRole("button", { name: "Speichern" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Laden" })).toHaveCount(0);
  await page.getByRole("button", { name: "Speichern" }).click();
  await expect(page.locator("#savegamesModal")).toBeVisible();
  await expect(page.locator("#savegameList .savegame-item")).toHaveCount(10);
  await expect(page.locator("#savegameList")).toContainText("Slot 1");
  await expect(page.locator("#savegameList")).toContainText("Leer");
});

test("help modal opens from the help button and lists door closing", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await page.getByRole("button", { name: "Hilfe" }).click();
  await expect(page.locator("#helpModal")).toBeVisible();
  await expect(page.locator("#helpModal")).toContainText("Benachbarte offene Tür schließen");

  await page.keyboard.press("Escape");
  await expect(page.locator("#helpModal")).toBeHidden();
});

test("highscores open from a button instead of the sidebar", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await page.getByRole("button", { name: "Final Scenes" }).click();
  await expect(page.locator("#highscoresModal")).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(page.locator("#highscoresModal")).toBeHidden();
});

test("run stats open from a button and show current run progress", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await page.evaluate(() => {
    window.__TEST_API__.addInventoryItem({
      type: "food",
      id: "test-snack",
      name: "Testsnack",
      nutritionRestore: 10,
      description: "Nur für Tests.",
    });
    window.__TEST_API__.grantExperience(40, "Lauftest");
  });

  await page.getByRole("button", { name: "Spielverlauf" }).click();
  await expect(page.locator("#runStatsModal")).toBeVisible();
  await expect(page.locator("#runStatsSummary")).toContainText("Aktuelles Studio");
  await expect(page.locator("#runStatsSummary")).toContainText("Erreichtes Studio");
  await expect(page.locator("#runStatsSummary")).toContainText("Aktueller Archetyp");
  await expect(page.locator("#runStatsSummary")).toContainText("Heiltränke getrunken");

  await page.keyboard.press("Escape");
  await expect(page.locator("#runStatsModal")).toBeHidden();
});

test("death screen opens the normal run history modal", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await page.evaluate(() => {
    window.__TEST_API__.setupCombatScenario({
      player: { hp: 1, maxHp: 12 },
      enemy: {
        name: "Archivschrecken",
        strength: 99,
        aggro: true,
        aggroRadius: 99,
        weapon: {
          type: "weapon",
          id: "test-claw",
          name: "Testklaue",
          source: "Tests",
          handedness: "one-handed",
          damage: 99,
          hitBonus: 99,
          critBonus: 0,
          description: "Nur für Tests.",
        },
      },
      enemyPosition: { x: 3, y: 2 },
      clearGrid: true,
    });
    window.__TEST_API__.setRandomSequence([0]);
  });

  await page.keyboard.press(" ");

  await expect(page.locator("#deathModal")).toBeVisible();
  await expect(page.locator("#deathModal .modal-eyebrow")).toContainText("Abspann");
  await expect(page.locator("#deathModal h2")).toContainText("Das war der letzte Take");
  await expect(page.locator("#deathSummary")).toContainText("Der Filmstar");
  await expect(page.locator("#deathSummary")).toContainText("Archivschrecken");
  await expect(page.locator("#deathSummary")).toContainText("Filmstar");
  await expect(page.locator("#deathSummary")).toContainText("Klasse");
  await page.locator("#deathModal").getByRole("button", { name: "Spielverlauf" }).click();
  await expect(page.locator("#runStatsModal")).toBeVisible();
  await expect(page.locator("#runStatsSummary")).toContainText("Aktuelles Studio");

  await page.keyboard.press("Escape");
  await expect(page.locator("#runStatsModal")).toBeHidden();
  await expect(page.locator("#deathModal")).toBeVisible();
  await page.locator("#deathModal").getByRole("button", { name: "Zum Todesstudio" }).click();
  await expect(page.locator("#deathModal")).toBeHidden();
  await expect(page.locator("#board .tile.player")).toBeVisible();
});

test("options persist after a page reload", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  const stepSoundToggle = page.locator("#toggleStepSound");
  const deathSoundToggle = page.locator("#toggleDeathSound");
  const voiceAnnouncementsToggle = page.locator("#toggleVoiceAnnouncements");
  const directFireOnSingleTargetToggle = page.locator("#toggleDirectFireOnSingleTarget");
  const showcaseAnnouncementMode = page.locator("#showcaseAnnouncementMode");

  await page.keyboard.press("o");
  await stepSoundToggle.uncheck();
  await deathSoundToggle.uncheck();
  await voiceAnnouncementsToggle.uncheck();
  await directFireOnSingleTargetToggle.uncheck();
  await showcaseAnnouncementMode.selectOption("voice");
  await expect(stepSoundToggle).not.toBeChecked();
  await expect(deathSoundToggle).not.toBeChecked();
  await expect(voiceAnnouncementsToggle).not.toBeChecked();
  await expect(directFireOnSingleTargetToggle).not.toBeChecked();
  await expect(showcaseAnnouncementMode).toHaveValue("voice");

  await page.reload();
  await startRun(page);
  await page.keyboard.press("o");

  await expect(page.locator("#toggleStepSound")).not.toBeChecked();
  await expect(page.locator("#toggleDeathSound")).not.toBeChecked();
  await expect(page.locator("#toggleVoiceAnnouncements")).not.toBeChecked();
  await expect(page.locator("#toggleDirectFireOnSingleTarget")).not.toBeChecked();
  await expect(page.locator("#showcaseAnnouncementMode")).toHaveValue("voice");
});

test("a manual save can be loaded after a page reload", async ({ page }) => {
  await page.goto("/");
  await startRun(page, { name: "Ripley" });

  await page.evaluate(() => {
    const snapshot = window.__TEST_API__.getSnapshot();
    window.__TEST_API__.teleportPlayer(snapshot.stairsDown ?? { x: snapshot.player.x + 1, y: snapshot.player.y });
    window.__TEST_API__.addInventoryItem({
      type: "food",
      id: "saved-snack",
      name: "Saved Snack",
      nutritionRestore: 25,
      description: "Bleibt fuer den Save-Test im Inventar.",
    });
  });
  await page.keyboard.press(" ");

  const beforeReload = await page.evaluate(() => ({
    snapshot: window.__TEST_API__.getSnapshot(),
    inventory: window.__TEST_API__.getInventorySnapshot(),
  }));

  await page.getByRole("button", { name: "Speichern" }).click();
  await saveIntoFirstEmptySlot(page);
  await expect(page.locator("#startScreen")).toBeVisible();
  await expect(page.locator("#gameShell")).toHaveClass(/prestart-hidden/);
  await expect(page.locator("#loadGameFromLanding")).toBeEnabled();
  await expect(page.locator("#landingSavegameStatus")).toContainText("Ripley");

  await page.reload();

  await expect(page.locator("#startScreen")).toBeVisible();
  await expect(page.locator("#loadGameFromLanding")).toBeEnabled();
  await page.locator("#loadGameFromLanding").evaluate((button) => button.click());
  await loadFirstSaveFromList(page);
  await expect(page.locator("#startModal")).toBeHidden();

  const afterReload = await page.evaluate(() => ({
    snapshot: window.__TEST_API__.getSnapshot(),
    inventory: window.__TEST_API__.getInventorySnapshot(),
  }));

  expect(afterReload.snapshot.floor).toBe(beforeReload.snapshot.floor);
  expect(afterReload.snapshot.player.x).toBe(beforeReload.snapshot.player.x);
  expect(afterReload.snapshot.player.y).toBe(beforeReload.snapshot.player.y);
  expect(afterReload.inventory.inventoryCount).toBe(beforeReload.inventory.inventoryCount);
  expect(afterReload.inventory.foodCount).toBe(beforeReload.inventory.foodCount);
});

test("an incompatible save stays visible in the list and can be deleted", async ({ page }) => {
  await page.goto("/");

  await page.evaluate(() => {
    window.localStorage.setItem("dungeon-rogue-savegame", JSON.stringify({
      version: 999,
      savedAt: Date.now(),
      state: {
        floor: 4,
        player: {
          name: "Legacy Hero",
        },
      },
    }));
  });

  await page.reload();

  await expect(page.locator("#startScreen")).toBeVisible();
  await expect(page.locator("#loadGameFromLanding")).toBeEnabled();
  await page.locator("#loadGameFromLanding").evaluate((button) => button.click());
  await expect(page.locator("#savegamesModal")).toBeVisible();
  await expect(page.locator("#startScreen")).toBeVisible();
  await expect(page.locator("#savegameStatus")).toContainText("nicht kompatibel");
  await expect(page.locator("#savegameList")).toContainText("Legacy Hero");
  await expect(page.locator("#savegameList")).toContainText("Version 999");
  await expect(page.locator("#savegameList .choice-btn", { hasText: "Laden" })).toHaveCount(0);

  await page.locator("#savegameList .choice-btn", { hasText: "Löschen" }).click();

  await expect(page.locator("#savegameStatus")).toContainText("Kein Spielstand gefunden");
  await expect(page.locator("#savegameList")).toContainText("Slot 1");
  await expect(page.locator("#savegameList")).toContainText("Leer");
});

test("loading a saved game restores gameplay state but keeps transient modals closed", async ({ page }) => {
  await page.goto("/");
  await startRun(page, { name: "Modalcheck" });

  await page.evaluate(() => {
    window.__TEST_API__.addInventoryItem({
      type: "food",
      id: "modal-snack",
      name: "Modal Snack",
      nutritionRestore: 20,
      description: "Nur für Tests.",
    });
  });

  await page.keyboard.press("i");
  await expect(page.locator("#inventoryModal")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.keyboard.press("o");
  await expect(page.locator("#optionsModal")).toBeVisible();
  await page.locator("#saveGameQuick").evaluate((button) => button.click());
  await saveIntoFirstEmptySlot(page);
  await expect(page.locator("#startScreen")).toBeVisible();
  await expect(page.locator("#landingSavegameStatus")).toContainText("Modalcheck");

  await page.reload();
  await page.locator("#loadGameFromLanding").evaluate((button) => button.click());
  await loadFirstSaveFromList(page);
  await expect(page.locator("#startModal")).toBeHidden();
  await expect(page.locator("#inventoryModal")).toBeHidden();
  await expect(page.locator("#optionsModal")).toBeHidden();

  const inventory = await page.evaluate(() => window.__TEST_API__.getInventorySnapshot());
  expect(inventory.foodCount).toBe(1);
});

test("loading a legacy ranged weapon save restores target mode support", async ({ page }) => {
  await page.goto("/");
  await startRun(page, { name: "Legacygun" });

  await page.evaluate(() => {
    window.__TEST_API__.setupCombatScenario({
      clearGrid: true,
      playerPosition: { x: 2, y: 2 },
      enemyPosition: { x: 5, y: 2 },
      player: {
        mainHand: {
          type: "weapon",
          id: "expedition-revolver",
          name: "Expeditionsrevolver",
          source: "Abenteuer-Set",
          handedness: "one-handed",
          damage: 3,
          hitBonus: 1,
          critBonus: 1,
          description: "Nur fuer Tests.",
        },
      },
      enemy: {
        name: "Testziel",
        hp: 16,
        maxHp: 16,
      },
    });
  });

  await page.getByRole("button", { name: "Speichern" }).click();
  await saveIntoFirstEmptySlot(page);
  await expect(page.locator("#startScreen")).toBeVisible();
  await expect(page.locator("#landingSavegameStatus")).toContainText("Legacygun");

  await page.reload();
  await page.locator("#loadGameFromLanding").evaluate((button) => button.click());
  await loadFirstSaveFromList(page);
  await expect(page.locator("#startModal")).toBeHidden();

  const loadedWeapon = await page.evaluate(() => window.__TEST_API__.getInventorySnapshot().equippedWeapon);
  expect(loadedWeapon.attackMode).toBe("ranged");
  expect(loadedWeapon.range).toBe(6);

  await page.evaluate(() => window.__TEST_API__.enterTargetMode());

  await expect(page.locator(".board")).toHaveClass(/targeting-mode/);
  await expect(page.locator(".tile-cell.target-cursor-valid")).toHaveCount(1);
});

test("loaded save slots are consumed and leave the slot empty", async ({ page }) => {
  await page.goto("/");
  await startRun(page, { name: "OneShot" });

  await page.getByRole("button", { name: "Speichern" }).click();
  await saveIntoFirstEmptySlot(page);
  await expect(page.locator("#startScreen")).toBeVisible();
  await expect(page.locator("#loadGameFromLanding")).toBeEnabled();

  await page.reload();
  await page.locator("#loadGameFromLanding").click();
  await loadFirstSaveFromList(page);
  await expect(page.locator("#startModal")).toBeHidden();

  await page.reload();
  await expect(page.locator("#loadGameFromLanding")).toBeEnabled();
  await page.locator("#loadGameFromLanding").click();
  await expect(page.locator("#savegamesModal")).toBeVisible();
  await expect(page.locator("#savegameStatus")).toContainText("Kein Spielstand gefunden");
  await expect(page.locator("#savegameList")).toContainText("Slot 1");
  await expect(page.locator("#savegameList")).toContainText("Leer");
});

test("a loaded run can be saved again into an empty slot", async ({ page }) => {
  await page.goto("/");
  await startRun(page, { name: "Resaver" });

  await page.getByRole("button", { name: "Speichern" }).click();
  await saveIntoFirstEmptySlot(page);
  await expect(page.locator("#startScreen")).toBeVisible();
  await expect(page.locator("#loadGameFromLanding")).toBeEnabled();

  await page.reload();
  await page.locator("#loadGameFromLanding").click();
  await loadFirstSaveFromList(page);
  await expect(page.locator("#startModal")).toBeHidden();

  await page.getByRole("button", { name: "Speichern" }).click();
  await expect(page.locator("#savegamesModal")).toBeVisible();
  await expect(page.locator("#savegameList")).toContainText("Slot 1");
  await expect(page.locator("#savegameList")).toContainText("Leer");
  await saveIntoFirstEmptySlot(page);
  await expect(page.locator("#startScreen")).toBeVisible();
  await expect(page.locator("#loadGameFromLanding")).toBeEnabled();

  await page.reload();
  await expect(page.locator("#loadGameFromLanding")).toBeEnabled();
});

test("fresh starts allow target mode with a newly equipped expedition revolver", async ({ page }) => {
  await page.goto("/");
  await startRun(page, { name: "Freshshot", classLabel: "Filmstar" });

  await page.evaluate(() => {
    window.__TEST_API__.setupCombatScenario({
      clearGrid: true,
      playerPosition: { x: 2, y: 2 },
      enemyPosition: { x: 3, y: 2 },
      player: {
        mainHand: {
          type: "weapon",
          id: "expedition-revolver",
          templateId: "expedition-revolver",
          baseItemId: "expedition-revolver",
          name: "Expeditionsrevolver",
          source: "Abenteuer-Set",
          handedness: "one-handed",
          attackMode: "ranged",
          range: 6,
          damage: 3,
          hitBonus: 1,
          critBonus: 1,
          meleePenaltyHit: 0,
          description: "Nur fuer Tests.",
        },
      },
      enemy: {
        name: "Nahziel",
        hp: 16,
        maxHp: 16,
      },
    });
  });

  await page.evaluate(() => window.__TEST_API__.enterTargetMode());

  await expect(page.locator(".board")).toHaveClass(/targeting-mode/);
  await expect(page.locator(".tile-cell.target-cursor-valid")).toHaveCount(1);
});

test("weapon tooltips show the inflected combat-log form", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await setupWeaponAtPlayerStep(page, {
    type: "weapon",
    id: "expedition-revolver",
    templateId: "expedition-revolver",
    baseItemId: "expedition-revolver",
    name: "Leuchtend Expeditionsrevolver der Flamme",
    grammar: {
      gender: "masculine",
      displayName: "Leuchtend Expeditionsrevolver der Flamme",
      definiteForms: {
        nominative: "der leuchtende Expeditionsrevolver der Flamme",
        accusative: "den leuchtenden Expeditionsrevolver der Flamme",
        dative: "dem leuchtenden Expeditionsrevolver der Flamme",
      },
    },
    nameParts: {
      prefix: "Leuchtend",
      baseName: "Expeditionsrevolver",
      suffix: "der Flamme",
      decadeSuffix: null,
    },
    source: "Tests",
    handedness: "one-handed",
    attackMode: "ranged",
    range: 6,
    damage: 3,
    hitBonus: 1,
    critBonus: 1,
    meleePenaltyHit: 0,
    description: "Nur fuer Tests.",
  });

  await page.locator(".tile.weapon-drop").hover();
  await expect(page.locator("#hoverTooltip")).toContainText("Kampflog: mit dem leuchtenden Expeditionsrevolver der Flamme");
});

test("board tooltips hide again when the hovered entity disappears during a rerender", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await page.evaluate(() => {
    window.__TEST_API__.setupCombatScenario({
      clearGrid: true,
      playerPosition: { x: 2, y: 2 },
      enemyPosition: { x: 4, y: 2 },
      enemy: {
        name: "Wegtester",
        description: "Verschwindet fuer den Tooltip-Test.",
      },
    });
  });

  const enemyTile = page.locator(".tile.enemy").first();
  const enemyBox = await enemyTile.boundingBox();
  expect(enemyBox).not.toBeNull();

  await page.mouse.move(
    enemyBox.x + (enemyBox.width / 2),
    enemyBox.y + (enemyBox.height / 2),
  );
  await expect(page.locator("#hoverTooltip")).toContainText("Verschwindet fuer den Tooltip-Test.");

  await page.evaluate(() => {
    window.__TEST_API__.clearFloorEntities();
  });

  await expect(page.locator("#hoverTooltip")).toBeHidden();
});

test("board tooltips do not open when an object appears under a stationary mouse", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await page.evaluate(() => {
    window.__TEST_API__.setupCombatScenario({
      clearGrid: true,
      playerPosition: { x: 2, y: 2 },
      enemyPosition: { x: 12, y: 12 },
    });
  });

  const targetPoint = await page.evaluate(() => {
    const snapshot = window.__TEST_API__.getSnapshot();
    const width = snapshot.grid[0].length;
    const x = 4;
    const y = 2;
    const cell = document.querySelectorAll(".tile-cell")[y * width + x];
    const rect = cell?.getBoundingClientRect();

    return rect ? {
      x: rect.left + (rect.width / 2),
      y: rect.top + (rect.height / 2),
    } : null;
  });

  expect(targetPoint).not.toBeNull();

  await page.mouse.move(targetPoint.x, targetPoint.y);
  await page.waitForTimeout(500);
  await expect(page.locator("#hoverTooltip")).toBeHidden();

  await page.evaluate(() => {
    window.__TEST_API__.setupCombatScenario({
      clearGrid: true,
      playerPosition: { x: 2, y: 2 },
      enemyPosition: { x: 4, y: 2 },
      enemy: {
        name: "Stillstehziel",
        description: "Soll keinen Tooltip ohne Mausbewegung ausloesen.",
      },
    });
  });

  await page.waitForTimeout(700);
  await expect(page.locator("#hoverTooltip")).toBeHidden();
});

test("monster tooltips expose debug AI details after F8 reveal", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await page.evaluate(() => {
    window.__TEST_API__.setupCombatScenario({
      clearGrid: true,
      playerPosition: { x: 2, y: 2 },
      enemyPosition: { x: 4, y: 2 },
      enemy: {
        name: "Debugjaeger",
        description: "Nur fuer Tooltip-Debug.",
        behavior: "hunter",
        behaviorLabel: "Jagdprofi",
        mobility: "local",
        mobilityLabel: "Reviertreu",
        retreatProfile: "cowardly",
        retreatLabel: "Fluchtbereit",
        healingProfile: "lurking",
        healingLabel: "Nur ausserhalb des Kampfes",
        allowedTemperaments: ["patrol", "erratic"],
        temperament: "patrol",
        temperamentHint: "Prueft Zugaenge mit beunruhigender Routine.",
        aggro: false,
        aggroRadius: 6,
        canOpenDoors: true,
        canChangeFloors: true,
        sourceArchetypeId: "action",
        idleTarget: { x: 6, y: 2 },
        idleTargetType: "door",
        mainHand: {
          type: "weapon",
          id: "debug-rifle",
          name: "Debuggewehr",
          source: "Tests",
          handedness: "two-handed",
          attackMode: "ranged",
          range: 4,
          damage: 3,
          hitBonus: 2,
          critBonus: 0,
          meleePenaltyHit: -2,
          description: "Nur fuer Tests.",
        },
      },
    });
  });

  await page.locator(".tile.enemy").hover();
  await expect(page.locator("#hoverTooltip")).toContainText("Nur fuer Tooltip-Debug.");
  await expect(page.locator("#hoverTooltip")).not.toContainText("Debug: Aktive Monstersteuerung");
  await expect(page.locator("#hoverTooltip")).not.toContainText("AI-Profil:");

  await page.evaluate(() => {
    window.__TEST_API__.setDebugReveal(true);
  });
  await page.locator(".tile.enemy").hover();

  await expect(page.locator("#hoverTooltip")).toContainText("Debug: Aktive Monstersteuerung");
  await expect(page.locator("#hoverTooltip")).toContainText("AI-Profil: Jagdprofi (hunter)");
  await expect(page.locator("#hoverTooltip")).toContainText("Mobilitaet: Reviertreu (local)");
  await expect(page.locator("#hoverTooltip")).toContainText("Rueckzug: Fluchtbereit (cowardly)");
  await expect(page.locator("#hoverTooltip")).toContainText("Temperament: patrol | erlaubt: patrol, erratic");
  await expect(page.locator("#hoverTooltip")).toContainText("Tueren: ja | Etagenwechsel: ja");
  await expect(page.locator("#hoverTooltip")).toContainText("Waffenprofil: Fernkampf 4 | Quelle: action");
});

test("topbar shows summed combat values while tooltips keep the breakdown", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await page.evaluate(() => {
    window.__TEST_API__.setupCombatScenario({
      player: {
        strength: 4,
        precision: 3,
        mainHand: {
          type: "weapon",
          id: "test-bare-hands",
          name: "Bloesse Faeuste",
          source: "Tests",
          handedness: "one-handed",
          attackMode: "melee",
          range: 1,
          damage: 1,
          hitBonus: 0,
          critBonus: 0,
          meleePenaltyHit: 0,
          lightBonus: 0,
          description: "Nur fuer Tests.",
        },
        offHand: {
          type: "offhand",
          subtype: "shield",
          id: "test-shield",
          name: "Test-Schild",
          source: "Tests",
          blockChance: 18,
          blockValue: 3,
          description: "Nur für Tests.",
        },
        nerves: 2,
      },
      enemyPosition: { x: 6, y: 6 },
    });
  });

  await expect(page.locator("#topbarDamage")).toHaveText("5");
  await expect(page.locator("#topbarHit")).toHaveText("6");
  await expect(page.locator("#topbarCrit")).toHaveText("3%");
  await expect(page.locator("#topbarBlock")).toHaveText("20%");
});

test("pressing T with a melee weapon does not enter target mode", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await page.evaluate(() => {
    window.__TEST_API__.setupCombatScenario({
      clearGrid: true,
      player: {
        mainHand: {
          type: "weapon",
          id: "test-knife",
          name: "Testmesser",
          source: "Tests",
          handedness: "one-handed",
          attackMode: "melee",
          range: 1,
          damage: 3,
          hitBonus: 1,
          critBonus: 0,
          meleePenaltyHit: 0,
          lightBonus: 0,
          description: "Nur fuer Tests.",
        },
      },
      enemyPosition: { x: 5, y: 2 },
    });
  });

  await page.keyboard.press("t");

  await expect(page.locator(".board")).not.toHaveClass(/targeting-mode/);
  await expect(page.locator("#messageLog")).toContainText(
    "Mit dieser Waffe kannst du gerade keinen Zielmodus öffnen.",
  );
});

test("ranged weapons enter target mode and mark a valid target", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await page.evaluate(() => {
    window.__TEST_API__.setupCombatScenario({
      clearGrid: true,
      player: {
        mainHand: {
          type: "weapon",
          id: "test-pistol",
          name: "Testpistole",
          source: "Tests",
          handedness: "one-handed",
          attackMode: "ranged",
          range: 6,
          damage: 3,
          hitBonus: 2,
          critBonus: 0,
          meleePenaltyHit: 0,
          lightBonus: 0,
          description: "Nur fuer Tests.",
        },
      },
      enemyPosition: { x: 5, y: 2 },
    });
  });

  await page.evaluate(() => window.__TEST_API__.enterTargetMode());

  await expect(page.locator(".board")).toHaveClass(/targeting-mode/);
  await expect(page.locator("#targetModeHint")).toContainText("Schuss frei");
  await expect(page.locator(".tile-cell.target-cursor-valid")).toHaveCount(1);
  await expect(page.locator("#enemySheet")).toContainText("Aktiv markiert");
});

test("target mode shows reduced hit chance for enemies peeking from remote corner cover", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await page.evaluate(() => {
    window.__TEST_API__.setupCombatScenario({
      clearGrid: true,
      playerPosition: { x: 1, y: 1 },
      player: {
        precision: 6,
        strength: 4,
        openingStrikeHitBonus: 0,
        openingStrikeCritBonus: 0,
        mainHand: {
          type: "weapon",
          id: "test-pistol",
          name: "Testpistole",
          source: "Tests",
          handedness: "one-handed",
          attackMode: "ranged",
          range: 6,
          damage: 3,
          hitBonus: 2,
          critBonus: 0,
          meleePenaltyHit: 0,
          lightBonus: 0,
          description: "Nur fuer Tests.",
        },
      },
      enemy: {
        name: "Eckenziel",
        reaction: 1,
        nerves: 1,
        hp: 18,
        maxHp: 18,
        openingStrikeSpent: true,
      },
      enemyPosition: { x: 5, y: 5 },
      walls: [{ x: 3, y: 2 }],
    });
  });

  await page.evaluate(() => window.__TEST_API__.enterTargetMode());

  await expect(page.locator(".board")).toHaveClass(/targeting-mode/);
  await expect(page.locator("#targetModeHint")).toContainText("Teildeckung");
  await expect(page.locator("#targetModeHint")).toContainText("61%");
  await expect(page.locator(".tile-cell.target-cursor-valid .target-hit-chance")).toHaveText("61%");
});

test("pressing T with a ranged weapon selects the first valid target", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await page.evaluate(() => {
    window.__TEST_API__.setupCombatScenario({
      clearGrid: true,
      player: {
        mainHand: {
          type: "weapon",
          id: "test-pistol",
          name: "Testpistole",
          source: "Tests",
          handedness: "one-handed",
          attackMode: "ranged",
          range: 6,
          damage: 3,
          hitBonus: 2,
          critBonus: 0,
          meleePenaltyHit: 0,
          lightBonus: 0,
          description: "Nur fuer Tests.",
        },
      },
      enemyPosition: { x: 5, y: 2 },
    });
  });

  await page.evaluate(() => window.__TEST_API__.enterTargetMode());

  await expect(page.locator(".board")).toHaveClass(/targeting-mode/);
  await expect(page.locator("#targetModeHint")).toContainText("Schuss frei");
  await expect(page.locator("#messageLog")).not.toContainText("Zielmodus aktiv: T waehlt Ziele, F feuert.");
});

test("target mode can also be opened from the header button", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await page.evaluate(() => {
    window.__TEST_API__.setupCombatScenario({
      clearGrid: true,
      player: {
        mainHand: {
          type: "weapon",
          id: "test-pistol",
          name: "Testpistole",
          source: "Tests",
          handedness: "one-handed",
          attackMode: "ranged",
          range: 6,
          damage: 3,
          hitBonus: 2,
          critBonus: 0,
          meleePenaltyHit: 0,
          lightBonus: 0,
          description: "Nur fuer Tests.",
        },
      },
      enemyPosition: { x: 5, y: 2 },
    });
  });

  await page.getByRole("button", { name: "Zielen" }).click();

  await expect(page.locator(".board")).toHaveClass(/targeting-mode/);
  await expect(page.locator("#targetModeHint")).toContainText("Schuss frei");
  await expect(page.getByRole("button", { name: "Zielen" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Schießen" })).toBeVisible();
});

test("target mode shows a clear hint even without a valid straight shot target", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await page.evaluate(() => {
    window.__TEST_API__.setupCombatScenario({
      clearGrid: true,
      player: {
        mainHand: {
          type: "weapon",
          id: "test-pistol",
          name: "Testpistole",
          source: "Tests",
          handedness: "one-handed",
          attackMode: "ranged",
          range: 3,
          damage: 3,
          hitBonus: 2,
          critBonus: 0,
          meleePenaltyHit: 0,
          lightBonus: 0,
          description: "Nur fuer Tests.",
        },
      },
      enemyPosition: { x: 6, y: 2 },
    });
  });

  await page.evaluate(() => window.__TEST_API__.enterTargetMode());

  await expect(page.locator(".board")).toHaveClass(/targeting-mode/);
  await expect(page.locator("#targetModeHint")).toContainText("Kein Ziel");
  await expect(page.locator("#messageLog")).toContainText("Zielmodus aktiv: Kein Ziel. Richte das Fadenkreuz aus oder brich mit T ab.");
});

test("the header target button closes target mode again after the last target", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await page.evaluate(() => {
    window.__TEST_API__.setupCombatScenario({
      clearGrid: true,
      player: {
        mainHand: {
          type: "weapon",
          id: "test-pistol",
          name: "Testpistole",
          source: "Tests",
          handedness: "one-handed",
          attackMode: "ranged",
          range: 6,
          damage: 3,
          hitBonus: 2,
          critBonus: 0,
          meleePenaltyHit: 0,
          lightBonus: 0,
          description: "Nur fuer Tests.",
        },
      },
      enemyPosition: { x: 5, y: 2 },
    });
  });

  await page.getByRole("button", { name: "Zielen" }).click();
  await expect(page.locator(".board")).toHaveClass(/targeting-mode/);

  await page.getByRole("button", { name: "Zielen" }).click();
  await expect(page.locator(".board")).not.toHaveClass(/targeting-mode/);
});

test("pressing T while target mode is active closes it again after the last target", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await page.evaluate(() => {
    window.__TEST_API__.setupCombatScenario({
      clearGrid: true,
      player: {
        mainHand: {
          type: "weapon",
          id: "test-pistol",
          name: "Testpistole",
          source: "Tests",
          handedness: "one-handed",
          attackMode: "ranged",
          range: 6,
          damage: 3,
          hitBonus: 2,
          critBonus: 0,
          meleePenaltyHit: 0,
          lightBonus: 0,
          description: "Nur fuer Tests.",
        },
      },
      enemyPosition: { x: 5, y: 2 },
    });
  });

  await page.keyboard.press("t");
  await expect(page.locator(".board")).toHaveClass(/targeting-mode/);

  await page.keyboard.press("t");

  await expect(page.locator(".board")).not.toHaveClass(/targeting-mode/);
});

test("pressing T cycles through multiple valid targets and then exits target mode", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await page.evaluate(() => {
    window.__TEST_API__.setupCombatScenario({
      clearGrid: true,
      player: {
        mainHand: {
          type: "weapon",
          id: "test-pistol",
          name: "Testpistole",
          source: "Tests",
          handedness: "one-handed",
          attackMode: "ranged",
          range: 6,
          damage: 3,
          hitBonus: 2,
          critBonus: 0,
          meleePenaltyHit: 0,
          lightBonus: 0,
          description: "Nur fuer Tests.",
        },
      },
      enemy: {
        id: "target-one",
        name: "Ziel Eins",
      },
      enemyPosition: { x: 4, y: 2 },
    });
    window.__TEST_API__.placeEnemy({ x: 5, y: 2 }, {
      id: "target-two",
      name: "Ziel Zwei",
    });
  });

  await page.keyboard.press("t");
  let targeting = await page.evaluate(() => window.__TEST_API__.getSnapshot().targeting);
  expect(targeting.active).toBeTruthy();
  expect(targeting.cursorX).toBe(4);
  expect(targeting.cursorY).toBe(2);

  await page.keyboard.press("t");
  targeting = await page.evaluate(() => window.__TEST_API__.getSnapshot().targeting);
  expect(targeting.active).toBeTruthy();
  expect(targeting.cursorX).toBe(5);
  expect(targeting.cursorY).toBe(2);

  await page.keyboard.press("t");
  await expect(page.locator(".board")).not.toHaveClass(/targeting-mode/);
});

test("target cursor renders above tile overlays in target mode", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await page.evaluate(() => {
    window.__TEST_API__.setupCombatScenario({
      clearGrid: true,
      player: {
        mainHand: {
          type: "weapon",
          id: "test-pistol",
          name: "Testpistole",
          source: "Tests",
          handedness: "one-handed",
          attackMode: "ranged",
          range: 6,
          damage: 3,
          hitBonus: 2,
          critBonus: 0,
          meleePenaltyHit: 0,
          lightBonus: 0,
          description: "Nur fuer Tests.",
        },
      },
      enemy: {
        id: "overlay-target",
        name: "Overlayziel",
      },
      enemyPosition: { x: 4, y: 2 },
    });
  });

  await page.keyboard.press("t");

  const cursorStyles = await page.evaluate(() => {
    const cell = document.querySelector(".tile-cell.target-cursor");
    if (!(cell instanceof HTMLElement)) {
      return null;
    }

    const pseudo = window.getComputedStyle(cell, "::after");
    return {
      cellZIndex: window.getComputedStyle(cell).zIndex,
      pseudoContent: pseudo.content,
      pseudoZIndex: pseudo.zIndex,
      pseudoBoxShadow: pseudo.boxShadow,
    };
  });

  expect(cursorStyles).not.toBeNull();
  expect(cursorStyles.cellZIndex).toBe("4");
  expect(cursorStyles.pseudoContent).toBe('""');
  expect(cursorStyles.pseudoZIndex).toBe("5");
  expect(cursorStyles.pseudoBoxShadow).not.toBe("none");
});

test("pressing F fires at the currently selected target", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await page.evaluate(() => {
    window.__TEST_API__.setupCombatScenario({
      clearGrid: true,
      player: {
        strength: 4,
        precision: 5,
        mainHand: {
          type: "weapon",
          id: "test-pistol",
          name: "Testpistole",
          source: "Tests",
          handedness: "one-handed",
          attackMode: "ranged",
          range: 6,
          damage: 3,
          hitBonus: 2,
          critBonus: 0,
          meleePenaltyHit: 0,
          lightBonus: 0,
          description: "Nur fuer Tests.",
        },
      },
      enemy: {
        name: "Tastenziel",
        hp: 30,
        maxHp: 30,
        reaction: 1,
        nerves: 1,
      },
      enemyPosition: { x: 5, y: 2 },
    });
    window.__TEST_API__.setRandomSequence([0, 0]);
  });

  const before = await page.evaluate(() => window.__TEST_API__.getSnapshot().enemies[0].hp);
  await page.keyboard.press("t");
  await page.keyboard.press("f");
  const after = await page.evaluate(() => window.__TEST_API__.getSnapshot().enemies[0].hp);

  expect(after).toBeLessThan(before);
  await expect(page.locator(".board")).not.toHaveClass(/targeting-mode/);
});

test("the shoot button fires at the currently selected target", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await page.evaluate(() => {
    window.__TEST_API__.setupCombatScenario({
      clearGrid: true,
      player: {
        strength: 4,
        precision: 5,
        mainHand: {
          type: "weapon",
          id: "test-pistol",
          name: "Testpistole",
          source: "Tests",
          handedness: "one-handed",
          attackMode: "ranged",
          range: 6,
          damage: 3,
          hitBonus: 2,
          critBonus: 0,
          meleePenaltyHit: 0,
          lightBonus: 0,
          description: "Nur fuer Tests.",
        },
      },
      enemy: {
        name: "Buttonziel",
        hp: 30,
        maxHp: 30,
        reaction: 1,
        nerves: 1,
      },
      enemyPosition: { x: 5, y: 2 },
    });
    window.__TEST_API__.setRandomSequence([0, 0]);
  });

  const before = await page.evaluate(() => window.__TEST_API__.getSnapshot().enemies[0].hp);
  await page.getByRole("button", { name: "Zielen" }).click();
  await page.getByRole("button", { name: "Schießen" }).click();
  const after = await page.evaluate(() => window.__TEST_API__.getSnapshot().enemies[0].hp);

  expect(after).toBeLessThan(before);
  await expect(page.locator(".board")).not.toHaveClass(/targeting-mode/);
});

test("confirming a ranged target attack damages the enemy and leaves target mode", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await page.evaluate(() => {
    window.__TEST_API__.setupCombatScenario({
      clearGrid: true,
      player: {
        strength: 4,
        precision: 5,
        mainHand: {
          type: "weapon",
          id: "test-pistol",
          name: "Testpistole",
          source: "Tests",
          handedness: "one-handed",
          attackMode: "ranged",
          range: 6,
          damage: 3,
          hitBonus: 2,
          critBonus: 0,
          meleePenaltyHit: 0,
          lightBonus: 0,
          description: "Nur fuer Tests.",
        },
      },
      enemy: {
        name: "Fernziel",
        hp: 30,
        maxHp: 30,
        reaction: 1,
        nerves: 1,
      },
      enemyPosition: { x: 5, y: 2 },
    });
    window.__TEST_API__.setRandomSequence([0, 0]);
  });

  const before = await page.evaluate(() => window.__TEST_API__.getSnapshot().enemies[0].hp);

  await page.evaluate(() => {
    window.__TEST_API__.enterTargetMode();
    window.__TEST_API__.confirmTargetAttack();
  });

  const after = await page.evaluate(() => window.__TEST_API__.getSnapshot().enemies[0].hp);

  expect(after).toBeLessThan(before);
  await expect(page.locator(".projectile-effect-line.hero-shot, .projectile-effect-line.hero-shot-crit")).toHaveCount(1);
  await expect(page.locator(".projectile-effect-impact.hero-shot, .projectile-effect-impact.hero-shot-crit")).toHaveCount(1);
  await expect(page.locator(".projectile-effect-flash.hero-shot, .projectile-effect-flash.hero-shot-crit")).toHaveCount(1);
  await expect(page.locator(".board")).not.toHaveClass(/targeting-mode/);
});

test("a single valid ranged target can be fired directly with T and F", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await page.evaluate(() => {
    window.__TEST_API__.setupCombatScenario({
      clearGrid: true,
      player: {
        strength: 4,
        precision: 5,
        mainHand: {
          type: "weapon",
          id: "test-pistol",
          name: "Testpistole",
          source: "Tests",
          handedness: "one-handed",
          attackMode: "ranged",
          range: 6,
          damage: 3,
          hitBonus: 2,
          critBonus: 0,
          meleePenaltyHit: 0,
          lightBonus: 0,
          description: "Nur fuer Tests.",
        },
      },
      enemy: {
        name: "Sofortziel",
        hp: 30,
        maxHp: 30,
        reaction: 1,
        nerves: 1,
      },
      enemyPosition: { x: 5, y: 2 },
    });
    window.__TEST_API__.setRandomSequence([0, 0]);
  });

  const beforeT = await page.evaluate(() => window.__TEST_API__.getSnapshot().enemies[0].hp);
  await page.keyboard.press("t");
  const afterT = await page.evaluate(() => window.__TEST_API__.getSnapshot().enemies[0].hp);

  expect(afterT).toBeLessThan(beforeT);
  await expect(page.locator(".board")).not.toHaveClass(/targeting-mode/);

  await page.evaluate(() => {
    window.__TEST_API__.setupCombatScenario({
      clearGrid: true,
      player: {
        strength: 4,
        precision: 5,
        mainHand: {
          type: "weapon",
          id: "test-pistol",
          name: "Testpistole",
          source: "Tests",
          handedness: "one-handed",
          attackMode: "ranged",
          range: 6,
          damage: 3,
          hitBonus: 2,
          critBonus: 0,
          meleePenaltyHit: 0,
          lightBonus: 0,
          description: "Nur fuer Tests.",
        },
      },
      enemy: {
        name: "Sofortziel",
        hp: 30,
        maxHp: 30,
        reaction: 1,
        nerves: 1,
      },
      enemyPosition: { x: 5, y: 2 },
    });
    window.__TEST_API__.setRandomSequence([0, 0]);
  });

  const beforeF = await page.evaluate(() => window.__TEST_API__.getSnapshot().enemies[0].hp);
  await page.keyboard.press("f");
  const afterF = await page.evaluate(() => window.__TEST_API__.getSnapshot().enemies[0].hp);

  expect(afterF).toBeLessThan(beforeF);
  await expect(page.locator(".board")).not.toHaveClass(/targeting-mode/);
});

test("bows render an arrow-style projectile effect instead of the generic shot beam", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await page.evaluate(() => {
    window.__TEST_API__.setupCombatScenario({
      clearGrid: true,
      player: {
        strength: 4,
        precision: 5,
        mainHand: {
          type: "weapon",
          id: "hunting-bow",
          name: "Jagdbogen",
          source: "Tests",
          handedness: "two-handed",
          attackMode: "ranged",
          range: 6,
          damage: 3,
          hitBonus: 2,
          critBonus: 0,
          meleePenaltyHit: 0,
          lightBonus: 0,
          description: "Nur fuer Tests.",
        },
      },
      enemy: {
        name: "Bogenziel",
        hp: 30,
        maxHp: 30,
        reaction: 1,
        nerves: 1,
      },
      enemyPosition: { x: 5, y: 2 },
    });
    window.__TEST_API__.setRandomSequence([0, 0]);
    window.__TEST_API__.enterTargetMode();
    window.__TEST_API__.confirmTargetAttack();
  });

  await expect(page.locator(".projectile-effect-line.hero-arrow, .projectile-effect-line.hero-arrow-crit")).toHaveCount(1);
  await expect(page.locator(".projectile-effect-impact.hero-arrow, .projectile-effect-impact.hero-arrow-crit")).toHaveCount(1);
  await expect(page.locator(".projectile-effect-flash.hero-arrow, .projectile-effect-flash.hero-arrow-crit")).toHaveCount(0);
});

test("blocked sight lines show an invalid target cursor and prevent the shot", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await page.evaluate(() => {
    window.__TEST_API__.setupCombatScenario({
      clearGrid: true,
      player: {
        mainHand: {
          type: "weapon",
          id: "test-pistol",
          name: "Testpistole",
          source: "Tests",
          handedness: "one-handed",
          attackMode: "ranged",
          range: 6,
          damage: 3,
          hitBonus: 2,
          critBonus: 0,
          meleePenaltyHit: 0,
          lightBonus: 0,
          description: "Nur fuer Tests.",
        },
      },
      enemy: {
        name: "Deckungsziel",
        hp: 18,
        maxHp: 18,
      },
      enemyPosition: { x: 5, y: 2 },
      walls: [{ x: 4, y: 2 }],
    });
  });

  const before = await page.evaluate(() => window.__TEST_API__.getSnapshot().enemies[0].hp);

  await page.evaluate(() => {
    window.__TEST_API__.enterTargetMode();
    window.__TEST_API__.moveTargetCursor(1, 0);
    window.__TEST_API__.moveTargetCursor(1, 0);
    window.__TEST_API__.moveTargetCursor(1, 0);
  });

  const targeting = await page.evaluate(() => window.__TEST_API__.getSnapshot().targeting);

  expect(targeting.active).toBeTruthy();
  expect(targeting.cursorX).toBe(5);
  expect(targeting.cursorY).toBe(2);
  await expect(page.locator(".tile-cell.target-cursor-invalid")).toHaveCount(1);

  await page.evaluate(() => window.__TEST_API__.confirmTargetAttack());

  const after = await page.evaluate(() => window.__TEST_API__.getSnapshot().enemies[0].hp);

  expect(after).toBe(before);
  await expect(page.locator("#messageLog")).toContainText("nicht sauber in Reichweite oder Sichtlinie");
});

test("diagonal targets are valid for ranged attacks with clear sight", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await page.evaluate(() => {
    window.__TEST_API__.setupCombatScenario({
      clearGrid: true,
      player: {
        mainHand: {
          type: "weapon",
          id: "test-pistol",
          name: "Testpistole",
          source: "Tests",
          handedness: "one-handed",
          attackMode: "ranged",
          range: 6,
          damage: 3,
          hitBonus: 2,
          critBonus: 0,
          meleePenaltyHit: 0,
          lightBonus: 0,
          description: "Nur fuer Tests.",
        },
      },
      enemy: {
        name: "Diagonalziel",
        hp: 18,
        maxHp: 18,
      },
      enemyPosition: { x: 4, y: 4 },
    });
  });

  await page.evaluate(() => {
    window.__TEST_API__.enterTargetMode();
  });

  await expect(page.locator(".tile-cell.target-cursor-valid")).toHaveCount(1);

  const before = await page.evaluate(() => window.__TEST_API__.getSnapshot().enemies[0].hp);
  await page.evaluate(() => window.__TEST_API__.setRandomSequence([0, 0]));
  await page.evaluate(() => window.__TEST_API__.confirmTargetAttack());
  const after = await page.evaluate(() => window.__TEST_API__.getSnapshot().enemies[0].hp);

  expect(after).toBeLessThan(before);
  await expect(page.locator("#messageLog")).toContainText("Diagonalziel");
});

test("ranged targeting uses chebyshev range for free-angle shots", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await page.evaluate(() => {
    window.__TEST_API__.setupCombatScenario({
      clearGrid: true,
      player: {
        mainHand: {
          type: "weapon",
          id: "test-pistol",
          name: "Testpistole",
          source: "Tests",
          handedness: "one-handed",
          attackMode: "ranged",
          range: 4,
          damage: 3,
          hitBonus: 2,
          critBonus: 0,
          meleePenaltyHit: 0,
          lightBonus: 0,
          description: "Nur fuer Tests.",
        },
      },
      enemy: {
        name: "Winkelziel",
        hp: 18,
        maxHp: 18,
      },
      enemyPosition: { x: 6, y: 6 },
    });
    window.__TEST_API__.setRandomSequence([0, 0]);
    window.__TEST_API__.enterTargetMode();
  });

  const targeting = await page.evaluate(() => window.__TEST_API__.getSnapshot().targeting);
  expect(targeting.active).toBeTruthy();
  expect(targeting.cursorX).toBe(6);
  expect(targeting.cursorY).toBe(6);
  await expect(page.locator(".tile-cell.target-cursor-valid")).toHaveCount(1);
  await expect(page.locator("#targetModeHint")).toContainText("Schuss frei");

  const before = await page.evaluate(() => window.__TEST_API__.getSnapshot().enemies[0].hp);
  await page.evaluate(() => window.__TEST_API__.confirmTargetAttack());
  const after = await page.evaluate(() => window.__TEST_API__.getSnapshot().enemies[0].hp);

  expect(after).toBeLessThan(before);
});

test("enemy ranged hits show explicit shot feedback", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await page.evaluate(() => {
    window.__TEST_API__.setupCombatScenario({
      clearGrid: true,
      player: {
        hp: 20,
        maxHp: 20,
      },
      playerPosition: { x: 2, y: 2 },
      enemyPosition: { x: 5, y: 2 },
      enemy: {
        name: "Schuetze",
        aggro: true,
        aggroRadius: 10,
        precision: 5,
        mainHand: {
          type: "weapon",
          id: "test-rifle",
          name: "Testgewehr",
          source: "Tests",
          handedness: "two-handed",
          attackMode: "ranged",
          range: 6,
          damage: 4,
          hitBonus: 3,
          critBonus: 0,
          meleePenaltyHit: -2,
          lightBonus: 0,
          description: "Nur fuer Tests.",
        },
      },
    });
    window.__TEST_API__.setRandomSequence([0, 0]);
  });

  await page.keyboard.press(" ");

  await expect(page.locator(".floating-text-title")).toContainText("Schuss");
  await expect(page.locator(".projectile-effect-line.hostile-shot, .projectile-effect-line.hostile-shot-crit")).toHaveCount(1);
  await expect(page.locator(".projectile-effect-impact.hostile-shot, .projectile-effect-impact.hostile-shot-crit")).toHaveCount(1);
  await expect(page.locator(".projectile-effect-flash.hostile-shot, .projectile-effect-flash.hostile-shot-crit")).toHaveCount(1);
  await expect(page.locator("#messageLog")).toContainText("aus der Distanz");
  await expect(page.locator("#messageLog")).toContainText("Testgewehr");
});

test("enemy bow shots use the arrow projectile effect", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await page.evaluate(() => {
    window.__TEST_API__.setupCombatScenario({
      clearGrid: true,
      player: {
        hp: 20,
        maxHp: 20,
      },
      playerPosition: { x: 2, y: 2 },
      enemyPosition: { x: 5, y: 2 },
      enemy: {
        name: "Bogenschuetze",
        aggro: true,
        aggroRadius: 10,
        precision: 5,
        mainHand: {
          type: "weapon",
          id: "hunting-bow",
          name: "Jagdbogen",
          source: "Tests",
          handedness: "two-handed",
          attackMode: "ranged",
          range: 6,
          damage: 3,
          hitBonus: 2,
          critBonus: 0,
          meleePenaltyHit: 0,
          lightBonus: 0,
          description: "Nur fuer Tests.",
        },
      },
    });
    window.__TEST_API__.setRandomSequence([0, 0]);
  });

  await page.keyboard.press(" ");

  await expect(page.locator(".projectile-effect-line.hostile-arrow, .projectile-effect-line.hostile-arrow-crit")).toHaveCount(1);
  await expect(page.locator(".projectile-effect-impact.hostile-arrow, .projectile-effect-impact.hostile-arrow-crit")).toHaveCount(1);
  await expect(page.locator(".projectile-effect-flash.hostile-arrow, .projectile-effect-flash.hostile-arrow-crit")).toHaveCount(0);
  await expect(page.locator("#messageLog")).toContainText("Jagdbogen");
});

test("enemies can fire ranged attacks diagonally with clear sight", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await page.evaluate(() => {
    window.__TEST_API__.setupCombatScenario({
      clearGrid: true,
      player: {
        hp: 20,
        maxHp: 20,
      },
      playerPosition: { x: 2, y: 2 },
      enemyPosition: { x: 4, y: 4 },
      enemy: {
        name: "Diagonal-Schuetze",
        aggro: true,
        aggroRadius: 10,
        precision: 5,
        mainHand: {
          type: "weapon",
          id: "test-rifle",
          name: "Testgewehr",
          source: "Tests",
          handedness: "two-handed",
          attackMode: "ranged",
          range: 6,
          damage: 4,
          hitBonus: 3,
          critBonus: 0,
          meleePenaltyHit: -2,
          lightBonus: 0,
          description: "Nur fuer Tests.",
        },
      },
    });
    window.__TEST_API__.setRandomSequence([0, 0]);
  });

  const before = await page.evaluate(() => window.__TEST_API__.getSnapshot().player.hp);
  await page.keyboard.press(" ");
  const after = await page.evaluate(() => window.__TEST_API__.getSnapshot().player.hp);

  expect(after).toBeLessThan(before);
  await expect(page.locator("#messageLog")).toContainText("aus der Distanz");
});

test("inventory weapon details include range melee penalty and light bonus", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await page.evaluate(() => {
    window.__TEST_API__.addInventoryItem({
      type: "weapon",
      id: "test-lantern-bow",
      name: "Leuchtlanze",
      source: "Tests",
      handedness: "two-handed",
      attackMode: "ranged",
      range: 5,
      damage: 4,
      hitBonus: 1,
      critBonus: 0,
      meleePenaltyHit: -3,
      lightBonus: 2,
      rarity: "rare",
      numericMods: [],
      effects: [],
      description: "Nur fuer Tests.",
    });
  });

  await page.keyboard.press("i");

  await expect(page.locator("#inventoryList")).toContainText("Leuchtlanze");
  await expect(page.locator("#inventoryList")).toContainText("Fernkampf 5");
  await expect(page.locator("#inventoryList")).toContainText("Nahkampf -3");
  await expect(page.locator("#inventoryList")).toContainText("Licht +2");
});

test("equipped light bonuses increase visible tiles", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  const baseVisibleCount = await page.evaluate(() => {
    window.__TEST_API__.setupCombatScenario({
      clearGrid: true,
      player: {
        mainHand: {
          type: "weapon",
          id: "test-blade",
          name: "Testklinge",
          source: "Tests",
          handedness: "one-handed",
          attackMode: "melee",
          range: 1,
          damage: 2,
          hitBonus: 1,
          critBonus: 0,
          meleePenaltyHit: 0,
          lightBonus: 0,
          description: "Nur fuer Tests.",
        },
      },
      enemyPosition: { x: 12, y: 12 },
    });
    const snapshot = window.__TEST_API__.getSnapshot();
    return snapshot.visible.flat().filter(Boolean).length;
  });

  const litVisibleCount = await page.evaluate(() => {
    window.__TEST_API__.setupCombatScenario({
      clearGrid: true,
      player: {
        mainHand: {
          type: "weapon",
          id: "test-torch",
          name: "Lichtklinge",
          source: "Tests",
          handedness: "one-handed",
          attackMode: "melee",
          range: 1,
          damage: 2,
          hitBonus: 1,
          critBonus: 0,
          meleePenaltyHit: 0,
          lightBonus: 2,
          description: "Nur fuer Tests.",
        },
      },
      enemyPosition: { x: 12, y: 12 },
    });
    const snapshot = window.__TEST_API__.getSnapshot();
    return snapshot.visible.flat().filter(Boolean).length;
  });

  expect(litVisibleCount).toBeGreaterThan(baseVisibleCount);
});

test("generated weapons scale with floor depth and gain decade prefixes", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  const generated = await page.evaluate(() => {
    const template = {
      type: "weapon-template",
      id: "test-template-pistol",
      name: "Testpistole",
      source: "Tests",
      archetypeId: "action",
      weaponRole: "ranged",
      handedness: "one-handed",
      attackMode: "ranged",
      range: 6,
      profileId: "precise_ranged",
      baseDamage: 2,
      baseHit: 1,
      baseCrit: 0,
      description: "Nur fuer Tests.",
    };

    return {
      floor1: window.__TEST_API__.previewGeneratedEquipment(template, { floorNumber: 1, forceRarity: "common" }),
      floor11: window.__TEST_API__.previewGeneratedEquipment(template, { floorNumber: 11, forceRarity: "common" }),
    };
  });

  expect(generated.floor11.damage).toBeGreaterThan(generated.floor1.damage);
  expect(generated.floor11.hitBonus).toBeGreaterThan(generated.floor1.hitBonus);
  expect(generated.floor1.name).toBe("Testpistole");
  expect(generated.floor11.name).toContain("der Hölle");
});

test("bleed deals damage over time to enemies", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await page.evaluate(() => {
    window.__TEST_API__.setupCombatScenario({
      clearGrid: true,
      enemy: {
        name: "Blutziel",
        hp: 12,
        maxHp: 12,
      },
      enemyPosition: { x: 5, y: 2 },
    });
    window.__TEST_API__.applyStatusToEnemy({
      type: "bleed",
      duration: 2,
      dotDamage: 2,
    });
  });

  const before = await page.evaluate(() => window.__TEST_API__.getSnapshot().enemies[0].hp);
  await page.evaluate(() => window.__TEST_API__.processStatusRound());
  const after = await page.evaluate(() => window.__TEST_API__.getSnapshot().enemies[0].hp);

  expect(after).toBe(before - 2);
});

test("poison deals damage over time to the player", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await page.evaluate(() => {
    window.__TEST_API__.setupCombatScenario({
      clearGrid: true,
      player: {
        hp: 14,
        maxHp: 14,
      },
      enemyPosition: { x: 6, y: 2 },
    });
    window.__TEST_API__.applyStatusToPlayer({
      type: "poison",
      duration: 2,
      dotDamage: 3,
    });
  });

  await expect(page.locator("#topbarStatusSummary")).toContainText("Vergiftet 2");
  await page.locator("#openHeroDetails").click();
  await expect(page.locator("#inventoryHeroPanel")).toBeVisible();
  await expect(page.locator("#heroSheet")).toContainText("Vergiftet 2");

  const before = await page.evaluate(() => window.__TEST_API__.getSnapshot().player.hp);
  await page.evaluate(() => window.__TEST_API__.processStatusRound());
  const after = await page.evaluate(() => window.__TEST_API__.getSnapshot().player.hp);

  expect(after).toBe(before - 3);
});

test("precision malus lowers the displayed hit value", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await page.evaluate(() => {
    window.__TEST_API__.setupCombatScenario({
      clearGrid: true,
      player: {
        precision: 5,
        mainHand: {
          type: "weapon",
          id: "precision-test-blade",
          name: "Präzisionsklinge",
          source: "Tests",
          handedness: "one-handed",
          attackMode: "melee",
          range: 1,
          damage: 2,
          hitBonus: 2,
          critBonus: 0,
          meleePenaltyHit: 0,
          lightBonus: 0,
          description: "Nur fuer Tests.",
        },
      },
      enemyPosition: { x: 6, y: 2 },
    });
  });

  const before = Number(await page.locator("#topbarHit").textContent());

  await page.evaluate(() => {
    window.__TEST_API__.applyStatusToPlayer({
      type: "precision_malus",
      duration: 2,
      penalty: 2,
    });
  });

  const after = Number(await page.locator("#topbarHit").textContent());

  expect(after).toBeLessThan(before);
});

test("reaction malus lowers the displayed block value", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await page.evaluate(() => {
    window.__TEST_API__.setupCombatScenario({
      clearGrid: true,
      player: {
        nerves: 4,
        offHand: {
          type: "offhand",
          subtype: "shield",
          id: "reaction-test-shield",
          name: "Reaktionsschild",
          source: "Tests",
          blockChance: 18,
          blockValue: 3,
          description: "Nur fuer Tests.",
        },
      },
      enemyPosition: { x: 6, y: 2 },
    });
  });

  const before = await page.evaluate(() => window.__TEST_API__.getSnapshot().player.derivedStats.final.reaction);

  await page.evaluate(() => {
    window.__TEST_API__.applyStatusToPlayer({
      type: "reaction_malus",
      duration: 2,
      penalty: 2,
    });
  });

  await expect(page.locator("#topbarStatusSummary")).toContainText("Benommen 2");
  const after = await page.evaluate(() => window.__TEST_API__.getSnapshot().player.derivedStats.final.reaction);

  expect(after).toBeLessThan(before);
});

test("crit bonus effects raise generated weapon crit values", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  const generated = await page.evaluate(() => {
    const baseTemplate = {
      type: "weapon-template",
      id: "crit-test-template",
      name: "Kritklinge",
      source: "Tests",
      archetypeId: "fantasy",
      weaponRole: "special",
      handedness: "one-handed",
      attackMode: "melee",
      range: 1,
      profileId: "special_improv",
      baseDamage: 2,
      baseHit: 1,
      baseCrit: 0,
      description: "Nur fuer Tests.",
    };

    return {
      plain: window.__TEST_API__.previewGeneratedEquipment(baseTemplate, { floorNumber: 1, forceRarity: "common" }),
      crit: window.__TEST_API__.previewGeneratedEquipment({
        ...baseTemplate,
        id: "crit-test-template-bonus",
        signatureEffect: { type: "crit_bonus", tier: 1 },
      }, { floorNumber: 1, forceRarity: "common" }),
    };
  });

  expect(generated.crit.critBonus).toBeGreaterThan(generated.plain.critBonus);
  expect(generated.crit.modifiers.some((modifier) => modifier.runtimeEffect?.type === "crit_bonus")).toBeTruthy();
});

test("light bonus effects raise generated weapon light values", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  const generated = await page.evaluate(() => {
    const baseTemplate = {
      type: "weapon-template",
      id: "light-test-template",
      name: "Lichtwaffe",
      source: "Tests",
      archetypeId: "adventure",
      weaponRole: "special",
      handedness: "one-handed",
      attackMode: "melee",
      range: 1,
      profileId: "special_improv",
      baseDamage: 2,
      baseHit: 1,
      baseCrit: 0,
      description: "Nur fuer Tests.",
    };

    return {
      plain: window.__TEST_API__.previewGeneratedEquipment(baseTemplate, { floorNumber: 1, forceRarity: "common" }),
      lit: window.__TEST_API__.previewGeneratedEquipment({
        ...baseTemplate,
        id: "light-test-template-bonus",
        signatureEffect: { type: "light_bonus", tier: 1 },
      }, { floorNumber: 1, forceRarity: "common" }),
    };
  });

  expect(generated.lit.lightBonus).toBeGreaterThan(generated.plain.lightBonus ?? 0);
  expect(generated.lit.modifiers.some((modifier) => modifier.runtimeEffect?.type === "light_bonus")).toBeTruthy();
});

test("stun prevents enemies from advancing during their turn", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await page.evaluate(() => {
    window.__TEST_API__.setupCombatScenario({
      clearGrid: true,
      playerPosition: { x: 2, y: 2 },
      enemyPosition: { x: 5, y: 2 },
      enemy: {
        name: "Betäubungsziel",
        behavior: "hunter",
        aggro: true,
        aggroRadius: 10,
      },
    });
    window.__TEST_API__.applyStatusToEnemy({
      type: "stun",
      duration: 2,
    });
  });

  const before = await page.evaluate(() => window.__TEST_API__.getSnapshot().enemies[0]);
  await page.keyboard.press(" ");
  const after = await page.evaluate(() => window.__TEST_API__.getSnapshot().enemies[0]);

  expect(after.x).toBe(before.x);
  expect(after.y).toBe(before.y);
});

test("root prevents enemies from advancing during their turn", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await page.evaluate(() => {
    window.__TEST_API__.setupCombatScenario({
      clearGrid: true,
      playerPosition: { x: 2, y: 2 },
      enemyPosition: { x: 5, y: 2 },
      enemy: {
        name: "Fesselziel",
        behavior: "hunter",
        aggro: true,
        aggroRadius: 10,
      },
    });
    window.__TEST_API__.applyStatusToEnemy({
      type: "root",
      duration: 2,
    });
  });

  const before = await page.evaluate(() => window.__TEST_API__.getSnapshot().enemies[0]);
  await page.keyboard.press(" ");
  const after = await page.evaluate(() => window.__TEST_API__.getSnapshot().enemies[0]);

  expect(after.x).toBe(before.x);
  expect(after.y).toBe(before.y);
});

test("leveling up fully heals the hero", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await page.evaluate(() => {
    window.__TEST_API__.setupCombatScenario({
      player: {
        hp: 7,
        maxHp: 20,
      },
      enemyPosition: { x: 6, y: 6 },
    });
    window.__TEST_API__.grantExperience(40, "Leveltest");
  });

  const snapshot = await page.evaluate(() => window.__TEST_API__.getSnapshot());

  expect(snapshot.player.hp).toBe(snapshot.player.maxHp);
});

test("waiting four times heals the hero when no enemy is nearby", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await page.evaluate(() => {
    window.__TEST_API__.clearFloorEntities();
    window.__TEST_API__.setupCombatScenario({
      player: {
        hp: 10,
        maxHp: 20,
      },
      playerPosition: { x: 2, y: 2 },
      enemyPosition: { x: 10, y: 10 },
      enemy: {
        hp: 1,
        maxHp: 1,
      },
    });
    window.__TEST_API__.clearFloorEntities();
  });

  await page.keyboard.press(" ");
  await page.keyboard.press(" ");
  await page.keyboard.press(" ");
  await page.keyboard.press(" ");

  const snapshot = await page.evaluate(() => window.__TEST_API__.getSnapshot());
  const messages = await page.evaluate(() => window.__TEST_API__.getMessages());

  expect(snapshot.player.hp).toBe(11);
  expect(messages.some((entry) => entry.text.includes("regenerierst langsam 1 Lebenspunkt"))).toBeTruthy();
});

test("moving heals the hero slowly when no enemy is nearby", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await page.evaluate(() => {
    window.__TEST_API__.clearFloorEntities();
    window.__TEST_API__.setupCombatScenario({
      player: {
        hp: 10,
        maxHp: 20,
      },
      playerPosition: { x: 2, y: 2 },
      enemyPosition: { x: 20, y: 20 },
      enemy: {
        hp: 1,
        maxHp: 1,
      },
      clearGrid: true,
    });
    window.__TEST_API__.clearFloorEntities();
  });

  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowLeft");

  const snapshot = await page.evaluate(() => window.__TEST_API__.getSnapshot());
  const messages = await page.evaluate(() => window.__TEST_API__.getMessages());

  expect(snapshot.player.hp).toBe(11);
  expect(messages.some((entry) => entry.text.includes("regenerierst langsam 1 Lebenspunkt"))).toBeTruthy();
});

test("standing next to a showcase accelerates safe healing for the hero", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await page.evaluate(() => {
    window.__TEST_API__.clearFloorEntities();
    window.__TEST_API__.setupCombatScenario({
      player: {
        hp: 10,
        maxHp: 20,
      },
      playerPosition: { x: 2, y: 2 },
      enemyPosition: { x: 20, y: 20 },
      enemy: {
        hp: 1,
        maxHp: 1,
      },
      clearGrid: true,
    });
    window.__TEST_API__.clearFloorEntities();
    window.__TEST_API__.placeShowcase({ x: 3, y: 2 }, { id: "test-vitrine", name: "Test-Vitrine" });
  });

  await page.keyboard.press(" ");
  await page.keyboard.press(" ");
  await page.keyboard.press(" ");

  const snapshot = await page.evaluate(() => window.__TEST_API__.getSnapshot());
  const messages = await page.evaluate(() => window.__TEST_API__.getMessages());

  expect(snapshot.player.hp).toBe(11);
  expect(messages.some((entry) => entry.text.includes("Nähe der Vitrine"))).toBeTruthy();
});

