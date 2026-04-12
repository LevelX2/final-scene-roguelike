const { test, expect } = require("playwright/test");
require("./test-setup");
const { startRun } = require("./helpers");

test("start screen renders the new title", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle("The Final Scene");
  await expect(page.getByRole("heading", { name: "The Final Scene" })).toBeVisible();
  await expect(page.getByText("Fight Through a Dying Movieverse")).toBeVisible();
});

test("hero name can be changed and persists for the next session", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator("#startModal")).toBeVisible();
  await page.locator("#heroNameInput").fill("Ripley");
  await page.locator("#startForm").evaluate((form) => form.requestSubmit());

  await expect(page.locator("#playerPanelTitle")).toContainText("Ripley");
  await expect(page.locator("#heroIdentityStatus")).toContainText("Ripley");

  await page.reload();

  await expect(page.locator("#startModal")).toBeVisible();
  await expect(page.locator("#heroNameInput")).toHaveValue("Ripley");
});

test("hero class cards can be selected from the start screen", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator("#startModal")).toBeVisible();
  await expect(page.locator("#classOptions .class-option-art")).toHaveCount(3);
  await page.locator("#classOptions").getByText("Stuntman", { exact: true }).click();
  await expect(page.locator(".class-option.selected strong")).toHaveText("Stuntman");

  await page.locator("#startForm").evaluate((form) => form.requestSubmit());
  await expect(page.locator("#playerSheet")).toContainText("Stuntman");
  await expect(page.locator("#playerSheet")).toContainText("Steckt den Fall weg");

  const heroVisuals = await page.evaluate(() => {
    const playerTile = document.querySelector(".board .tile.player");
    const title = document.getElementById("playerPanelTitle");
    return {
      tileBackground: window.getComputedStyle(playerTile).backgroundImage,
      titleIcon: title.style.getPropertyValue("--hero-class-icon"),
    };
  });

  expect(heroVisuals.tileBackground).toContain("sprite-stuntman.svg");
  expect(heroVisuals.titleIcon).toContain("class-stuntman.svg");
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
  await page.getByRole("button", { name: "Highscores" }).click();
  await expect(page.locator("#highscoresModal")).toBeVisible();
  await expect(page.locator(".score-class-badge")).toHaveCount(1);

  const badgeStyle = await page.locator(".score-class-badge").evaluate((node) => node.getAttribute("style") ?? "");
  expect(badgeStyle).toContain("class-regisseur.svg");
});

test("inventory modal toggles with keyboard controls", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await page.keyboard.press("i");
  await expect(page.locator("#inventoryModal")).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(page.locator("#inventoryModal")).toBeHidden();
});

test("options modal toggles with keyboard controls", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await page.keyboard.press("o");
  await expect(page.locator("#optionsModal")).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(page.locator("#optionsModal")).toBeHidden();
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

  await page.getByRole("button", { name: "Highscores" }).click();
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

  await page.getByRole("button", { name: "Lauf" }).click();
  await expect(page.locator("#runStatsModal")).toBeVisible();
  await expect(page.locator("#runStatsSummary")).toContainText("Aktuelle Ebene");
  await expect(page.locator("#runStatsSummary")).toContainText("Tiefste Ebene");
  await expect(page.locator("#runStatsSummary")).toContainText("Heiltränke getrunken");

  await page.keyboard.press("Escape");
  await expect(page.locator("#runStatsModal")).toBeHidden();
});

test("death statistics open in a separate modal", async ({ page }) => {
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
  await page.getByRole("button", { name: "Besiegte Gegner" }).click();
  await expect(page.locator("#deathKillsModal")).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(page.locator("#deathKillsModal")).toBeHidden();
  await expect(page.locator("#deathModal")).toBeVisible();
});

test("options persist after a page reload", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  const stepSoundToggle = page.locator("#toggleStepSound");
  const deathSoundToggle = page.locator("#toggleDeathSound");

  await page.keyboard.press("o");
  await stepSoundToggle.uncheck();
  await deathSoundToggle.uncheck();
  await expect(stepSoundToggle).not.toBeChecked();
  await expect(deathSoundToggle).not.toBeChecked();

  await page.reload();
  await startRun(page);
  await page.keyboard.press("o");

  await expect(page.locator("#toggleStepSound")).not.toBeChecked();
  await expect(page.locator("#toggleDeathSound")).not.toBeChecked();
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

  await page.getByRole("button", { name: "Optionen" }).click();
  await page.getByRole("button", { name: "Spiel speichern" }).click();
  await expect(page.locator("#savegameStatus")).toContainText("Ripley");

  await page.reload();

  await expect(page.locator("#startModal")).toBeVisible();
  await expect(page.locator("#loadGameFromStart")).toBeEnabled();
  await page.locator("#loadGameFromStart").evaluate((button) => button.click());
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

test("an incompatible save is rejected with a clear message", async ({ page }) => {
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

  await expect(page.locator("#startModal")).toBeVisible();
  await expect(page.locator("#loadGameFromStart")).toBeEnabled();
  await page.locator("#loadGameFromStart").evaluate((button) => button.click());
  await expect(page.locator("#startModal")).toBeVisible();
  await expect(page.locator("#startSavegameStatus")).toContainText("nicht kompatibel");
});

test("topbar shows summed combat values while tooltips keep the breakdown", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await page.evaluate(() => {
    window.__TEST_API__.setupCombatScenario({
      player: {
        strength: 4,
        precision: 3,
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
