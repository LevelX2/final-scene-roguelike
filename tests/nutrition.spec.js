const { test, expect } = require("playwright/test");
require("./test-setup");
const { setupFoodAtPlayerStep, startRun } = require("./helpers");

test("nutrition starts with the class endurance bonus applied", async ({ page }) => {
  await page.goto("/");
  await startRun(page, { classLabel: "Regisseur" });

  const snapshot = await page.evaluate(() => window.__TEST_API__.getSnapshot());

  expect(snapshot.player.nutritionMax).toBe(1000);
  expect(snapshot.player.nutrition).toBe(800);
  await expect(page.locator("#nutritionLabel")).toHaveText("800 / 1000");
  await expect(page.locator("#nutritionState")).toHaveText("Satt");
});

test("food can be eaten from the ground and is clamped to the nutrition maximum", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await page.evaluate(() => {
    window.__TEST_API__.setupCombatScenario({
      player: {
        nutrition: 780,
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

  await setupFoodAtPlayerStep(page, {
    id: "hunting_ration",
    type: "food",
    name: "Jagdration",
    description: "Eine schwere, aber sättigende Portion für lange Nächte.",
    nutritionRestore: 250,
  });

  await page.keyboard.press("ArrowRight");
  await expect(page.locator("#choiceModal")).toBeVisible();
  await page.getByRole("button", { name: "Jetzt essen" }).click();

  const snapshot = await page.evaluate(() => window.__TEST_API__.getSnapshot());
  const inventory = await page.evaluate(() => window.__TEST_API__.getInventorySnapshot());

  expect(snapshot.player.nutrition).toBe(899);
  expect(snapshot.player.nutritionMax).toBe(900);
  expect(inventory.foodCount).toBe(0);
  await expect(page.locator("#nutritionLabel")).toHaveText("899 / 900");
});

test("food modal defaults reliably to the first eat action", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await page.evaluate(() => {
    window.__TEST_API__.setupCombatScenario({
      player: {
        nutrition: 500,
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

  await setupFoodAtPlayerStep(page, {
    id: "chips",
    type: "food",
    name: "Chips",
    description: "Knusprig und schnell weg.",
    nutritionRestore: 30,
  });

  await page.keyboard.press("ArrowRight");
  await expect(page.locator("#choiceModal")).toBeVisible();
  await page.keyboard.press("Enter");

  const snapshot = await page.evaluate(() => window.__TEST_API__.getSnapshot());
  const inventory = await page.evaluate(() => window.__TEST_API__.getInventorySnapshot());

  expect(snapshot.player.nutrition).toBe(529);
  expect(inventory.foodCount).toBe(0);
});

test("waiting consumes nutrition and dying hunger deals damage after the action", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await page.evaluate(() => {
    window.__TEST_API__.setupCombatScenario({
      player: {
        hp: 12,
        maxHp: 20,
        nutrition: 91,
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

  let snapshot = await page.evaluate(() => window.__TEST_API__.getSnapshot());
  let messages = await page.evaluate(() => window.__TEST_API__.getMessages());

  expect(snapshot.player.nutrition).toBe(90);
  expect(snapshot.player.hungerState).toBe("STARVING");
  expect(snapshot.player.hp).toBe(12);
  expect(messages.some((entry) => entry.text.includes("Du bist ausgehungert."))).toBeTruthy();
  await expect(page.locator("#nutritionState")).toHaveText("Ausgehungert");

  await page.keyboard.press(" ");

  snapshot = await page.evaluate(() => window.__TEST_API__.getSnapshot());
  messages = await page.evaluate(() => window.__TEST_API__.getMessages());

  expect(snapshot.player.nutrition).toBe(89);
  expect(snapshot.player.hungerState).toBe("DYING");
  expect(snapshot.player.hp).toBe(11);
  expect(messages.some((entry) => entry.text.includes("Du verhungerst."))).toBeTruthy();
  expect(messages.some((entry) => entry.text.includes("Der Hunger zerfrisst dich."))).toBeTruthy();
});

test("stored food can be used from the inventory and updates the nutrition hud", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await page.evaluate(() => {
    window.__TEST_API__.setupCombatScenario({
      player: {
        nutrition: 500,
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

  await setupFoodAtPlayerStep(page, {
    id: "sandwich",
    type: "food",
    name: "Sandwich",
    description: "Kalt, aber brauchbar.",
    nutritionRestore: 150,
  });

  await page.keyboard.press("ArrowRight");
  await page.getByRole("button", { name: "Ins Inventar" }).click();

  let inventory = await page.evaluate(() => window.__TEST_API__.getInventorySnapshot());
  expect(inventory.foodCount).toBe(1);

  await page.keyboard.press("i");
  await page.getByRole("button", { name: "Benutzen" }).click();

  const snapshot = await page.evaluate(() => window.__TEST_API__.getSnapshot());
  inventory = await page.evaluate(() => window.__TEST_API__.getInventorySnapshot());

  expect(snapshot.player.nutrition).toBe(648);
  expect(inventory.foodCount).toBe(0);
  await expect(page.locator("#nutritionLabel")).toHaveText("648 / 900");
});
