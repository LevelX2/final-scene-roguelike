const { test, expect } = require("playwright/test");
require("./test-setup");
const {
  setupChestAtPlayerStep,
  setupOffHandAtPlayerStep,
  setupCombat,
  setupPotionAtPlayerStep,
  setupWeaponAtPlayerStep,
  startRun,
} = require("./helpers");

test("walking onto a potion opens the loot choice modal", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await setupPotionAtPlayerStep(page);
  await page.keyboard.press("ArrowRight");

  await expect(page.locator("#choiceModal")).toBeVisible();
  await expect(page.locator("#choiceTitle")).toContainText("Heiltrank gefunden");
});

test("potions can be stored in the inventory from the loot modal", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await setupPotionAtPlayerStep(page);
  await page.keyboard.press("ArrowRight");
  await page.getByRole("button", { name: "Ins Inventar" }).click();

  const inventory = await page.evaluate(() => window.__TEST_API__.getInventorySnapshot());
  const messages = await page.evaluate(() => window.__TEST_API__.getMessages());

  expect(inventory.potionCount).toBe(1);
  expect(inventory.inventoryCount).toBe(1);
  expect(messages.some((entry) => entry.text.includes("verstaust den Heiltrank"))).toBeTruthy();
});

test("potions can be consumed directly from the loot modal", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await page.evaluate(() => {
    window.__TEST_API__.clearFloorEntities();
    window.__TEST_API__.setupCombatScenario({
      player: {
        hp: 10,
        maxHp: 20,
        strength: 4,
        precision: 3,
        reaction: 3,
        nerves: 2,
      },
      playerPosition: { x: 2, y: 2 },
      enemyPosition: { x: 6, y: 6 },
      enemy: {
        hp: 1,
        maxHp: 1,
      },
    });
    window.__TEST_API__.clearFloorEntities();
    window.__TEST_API__.placePotion({ x: 3, y: 2 });
  });

  await page.keyboard.press("ArrowRight");
  await page.getByRole("button", { name: "Direkt trinken" }).click();

  const snapshot = await page.evaluate(() => window.__TEST_API__.getSnapshot());
  const inventory = await page.evaluate(() => window.__TEST_API__.getInventorySnapshot());

  expect(snapshot.player.hp).toBe(18);
  expect(inventory.potionCount).toBe(0);
});

test("stored potions can be used from the inventory", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await page.evaluate(() => {
    window.__TEST_API__.clearFloorEntities();
    window.__TEST_API__.setupCombatScenario({
      player: {
        hp: 10,
        maxHp: 20,
        strength: 4,
        precision: 3,
        reaction: 3,
        nerves: 2,
      },
      playerPosition: { x: 2, y: 2 },
      enemyPosition: { x: 6, y: 6 },
      enemy: {
        hp: 1,
        maxHp: 1,
      },
    });
    window.__TEST_API__.clearFloorEntities();
    window.__TEST_API__.placePotion({ x: 3, y: 2 });
  });

  await page.keyboard.press("ArrowRight");
  await page.getByRole("button", { name: "Ins Inventar" }).click();

  await page.keyboard.press("i");
  await page.getByRole("button", { name: "Benutzen" }).click();

  const snapshot = await page.evaluate(() => window.__TEST_API__.getSnapshot());
  const inventory = await page.evaluate(() => window.__TEST_API__.getInventorySnapshot());

  expect(snapshot.player.hp).toBe(18);
  expect(inventory.potionCount).toBe(0);
});

test("inventory items render with an icon", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await setupPotionAtPlayerStep(page);
  await page.keyboard.press("ArrowRight");
  await page.getByRole("button", { name: "Ins Inventar" }).click();

  await page.keyboard.press("i");

  const icon = page.locator("#inventoryList .inventory-icon").first();
  await expect(icon).toBeVisible();
  const backgroundImage = await icon.evaluate((node) => getComputedStyle(node).backgroundImage);
  expect(backgroundImage).toContain("assets/potion.svg");
});

test("weapon icons use the dedicated asset folder when available", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await setupWeaponAtPlayerStep(page, {
    type: "weapon",
    id: "kitchen-knife",
    name: "Kuechenmesser",
    source: "Tests",
    damage: 2,
    hitBonus: 1,
    critBonus: 0,
    rarity: "rare",
    description: "Nur fuer Tests.",
  });

  await page.keyboard.press("ArrowRight");
  await page.getByRole("button", { name: "Ins Inventar" }).click();
  await page.keyboard.press("i");

  const icon = page.locator("#inventoryList .inventory-icon-weapon").first();
  const backgroundImage = await icon.evaluate((node) => getComputedStyle(node).backgroundImage);
  expect(backgroundImage).toContain("assets/weapons/kitchen-knife.svg");
  await expect(icon).toHaveClass(/rarity-rare/);
});

test("inventory sorts items by class and can be filtered", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await page.evaluate(() => {
    window.__TEST_API__.addInventoryItem({
      type: "food",
      id: "sandwich",
      icon: "sandwich",
      name: "Sandwich",
      nutritionRestore: 150,
      description: "Nur fuer Tests.",
    });
    window.__TEST_API__.addInventoryItem({
      type: "key",
      name: "Gruener Schluessel",
      description: "Nur fuer Tests.",
      keyColor: "green",
      keyFloor: 1,
    });
    window.__TEST_API__.addInventoryItem({
      type: "weapon",
      id: "kitchen-knife",
      name: "Kuechenmesser",
      source: "Tests",
      handedness: "one-handed",
      damage: 2,
      hitBonus: 0,
      critBonus: 0,
      description: "Nur fuer Tests.",
    });
    window.__TEST_API__.addInventoryItem({
      type: "potion",
      name: "Heiltrank",
      description: "Nur fuer Tests.",
      heal: 8,
    });
  });

  await page.keyboard.press("i");

  const headings = await page.locator("#inventoryList .inventory-section-title").allTextContents();
  expect(headings.slice(0, 4)).toEqual(["Waffen", "Traenke", "Essen", "Schluessel"]);

  await page.getByRole("button", { name: "Essen", exact: true }).click();
  await expect(page.locator("#inventoryList .inventory-section-title")).toHaveText("Essen");
  await expect(page.locator("#inventoryList .inventory-item")).toHaveCount(1);
  await expect(page.locator("#inventoryList .inventory-item strong")).toHaveText("Sandwich");
});

test("inventory uses svg icons for potions and keys when available", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await page.evaluate(() => {
    window.__TEST_API__.addInventoryItem({
      type: "potion",
      name: "Heiltrank",
      description: "Nur fuer Tests.",
      heal: 8,
    });
    window.__TEST_API__.addInventoryItem({
      type: "key",
      name: "Gruener Schluessel",
      description: "Nur fuer Tests.",
      keyColor: "green",
      keyFloor: 1,
    });
  });

  await page.keyboard.press("i");

  const potionIcon = page.locator("#inventoryList .inventory-icon-potion").first();
  const keyIcon = page.locator("#inventoryList .inventory-icon-key").first();
  const potionBackground = await potionIcon.evaluate((node) => getComputedStyle(node).backgroundImage);
  const keyBackground = await keyIcon.evaluate((node) => getComputedStyle(node).backgroundImage);

  expect(potionBackground).toContain("assets/potion.svg");
  expect(keyBackground).toContain("assets/key-green.svg");
});

test("weapons can be equipped directly from the loot modal", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await setupWeaponAtPlayerStep(page, {
    type: "weapon",
    id: "test-sabre",
    name: "Testsaebel",
    source: "Tests",
    damage: 5,
    hitBonus: 1,
    critBonus: 2,
    description: "Nur fuer Tests.",
  });

  await page.keyboard.press("ArrowRight");
  await expect(page.locator("#choiceModal")).toBeVisible();
  await page.locator("#choiceDrink").click();

  const inventory = await page.evaluate(() => window.__TEST_API__.getInventorySnapshot());
  const messages = await page.evaluate(() => window.__TEST_API__.getMessages());

  expect(inventory.equippedWeapon.name).toBe("Testsaebel");
  expect(messages.some((entry) => entry.text.includes("Du fuehrst jetzt Testsaebel"))).toBeTruthy();
});

test("weapon loot modal compares against the currently equipped weapon and shows rarity", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await page.evaluate(() => {
    window.__TEST_API__.setupCombatScenario({
      clearGrid: true,
      playerPosition: { x: 2, y: 2 },
      enemyPosition: { x: 12, y: 12 },
      player: {
        mainHand: {
          type: "weapon",
          id: "buck-knife",
          name: "Buck Knife",
          source: "Tests",
          handedness: "one-handed",
          damage: 3,
          hitBonus: 1,
          critBonus: 0,
          rarity: "uncommon",
          description: "Nur fuer Tests.",
        },
      },
    });
    window.__TEST_API__.clearFloorEntities();
    window.__TEST_API__.placeWeapon({ x: 3, y: 2 }, {
      type: "weapon",
      id: "kitchen-knife",
      name: "Kuechenmesser",
      source: "Tests",
      handedness: "one-handed",
      damage: 4,
      hitBonus: 2,
      critBonus: 1,
      rarity: "rare",
      description: "Nur fuer Tests.",
    });
  });

  await page.keyboard.press("ArrowRight");
  await expect(page.locator("#choiceModal")).toBeVisible();
  await expect(page.locator("#choiceText")).toContainText("Derzeit getragen");
  await expect(page.locator("#choiceText")).toContainText("Kuechenmesser");
  await expect(page.locator("#choiceText")).toContainText("Buck Knife");
  await expect(page.locator("#choiceText .choice-rarity.rarity-rare")).toContainText("Selten");
  await expect(page.locator("#choiceText .choice-rarity.rarity-uncommon")).toContainText("Ungewoehnlich");
});

test("shields can be equipped directly into the offhand", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await setupOffHandAtPlayerStep(page, {
    type: "offhand",
    subtype: "shield",
    id: "test-shield",
    name: "Test-Schild",
    source: "Tests",
    blockChance: 20,
    blockValue: 3,
    description: "Nur fuer Tests.",
  });

  await page.keyboard.press("ArrowRight");
  await expect(page.locator("#choiceModal")).toBeVisible();
  await page.locator("#choiceDrink").click();

  const inventory = await page.evaluate(() => window.__TEST_API__.getInventorySnapshot());
  expect(inventory.offHand.name).toBe("Test-Schild");
});

test("loot chests can open into a usable reward", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await setupChestAtPlayerStep(page, {
    type: "offhand",
    item: {
      type: "offhand",
      subtype: "shield",
      id: "chest-shield",
      name: "Kistenschild",
      source: "Tests",
      blockChance: 16,
      blockValue: 2,
      description: "Nur fuer Tests.",
    },
  });

  await page.keyboard.press("ArrowRight");

  await expect(page.locator("#choiceModal")).toBeVisible();
  const messages = await page.evaluate(() => window.__TEST_API__.getMessages());
  expect(messages.some((entry) => entry.text.includes("Requisitenkiste"))).toBeTruthy();
});

test("equipment rarity modifiers are applied to generated drops", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  const generated = await page.evaluate(() => window.__TEST_API__.previewGeneratedEquipment(
    {
      type: "weapon",
      id: "preview-cleaver",
      name: "Preview-Beil",
      source: "Tests",
      handedness: "one-handed",
      damage: 3,
      hitBonus: 0,
      critBonus: 0,
      description: "Nur fuer Tests.",
    },
    {
      forceRarity: "rare",
      forceModifiers: ["brutal", "precise"],
      dropSourceTag: "chest",
    },
  ));

  expect(generated.rarity).toBe("rare");
  expect(generated.modifiers).toHaveLength(2);
  expect(generated.damage).toBe(4);
  expect(generated.hitBonus).toBe(2);
  expect(generated.name).toContain("Preview-Beil");
});
