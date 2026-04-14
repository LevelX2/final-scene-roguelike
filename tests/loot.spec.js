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

test("potions cannot be consumed from the loot modal at full health", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await page.evaluate(() => {
    window.__TEST_API__.clearFloorEntities();
    window.__TEST_API__.setupCombatScenario({
      player: {
        hp: 20,
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
  const messages = await page.evaluate(() => window.__TEST_API__.getMessages());

  expect(snapshot.player.hp).toBe(20);
  expect(messages.some((entry) => entry.text.includes("bereits bei voller Gesundheit"))).toBeTruthy();

  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowRight");
  await expect(page.locator("#choiceModal")).toBeVisible();
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
    name: "Küchenmesser",
    source: "Tests",
    damage: 2,
    hitBonus: 1,
    critBonus: 0,
    rarity: "rare",
    description: "Nur für Tests.",
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
      description: "Nur für Tests.",
    });
    window.__TEST_API__.addInventoryItem({
      type: "key",
      name: "Grüner Schlüssel",
      description: "Nur für Tests.",
      keyColor: "green",
      keyFloor: 1,
    });
    window.__TEST_API__.addInventoryItem({
      type: "weapon",
      id: "kitchen-knife",
      name: "Küchenmesser",
      source: "Tests",
      handedness: "one-handed",
      damage: 2,
      hitBonus: 0,
      critBonus: 0,
      description: "Nur für Tests.",
    });
    window.__TEST_API__.addInventoryItem({
      type: "potion",
      name: "Heiltrank",
      description: "Nur für Tests.",
      heal: 8,
    });
  });

  await page.keyboard.press("i");

  const headings = await page.locator("#inventoryList .inventory-section-title").allTextContents();
  expect(headings.slice(0, 4)).toEqual(["Waffen", "Tränke", "Essen", "Schlüssel"]);

  await page.getByRole("button", { name: "Essen", exact: true }).click();
  await expect(page.locator("#inventoryList .inventory-section-title")).toHaveText("Essen");
  await expect(page.locator("#inventoryList .inventory-item")).toHaveCount(1);
  await expect(page.locator("#inventoryList .inventory-item strong")).toHaveText("Sandwich");
});

test("inventory keeps weapon variants with different effects separate", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await page.evaluate(() => {
    const baseWeapon = {
      type: "weapon",
      id: "kitchen-knife",
      name: "Küchenmesser",
      source: "Tests",
      handedness: "one-handed",
      damage: 2,
      hitBonus: 0,
      critBonus: 0,
      rarity: "rare",
      attackMode: "melee",
      description: "Nur für Tests.",
      modifierIds: [],
      numericMods: [],
    };

    window.__TEST_API__.addInventoryItem({
      ...baseWeapon,
      effects: [],
      lightBonus: 0,
    });
    window.__TEST_API__.addInventoryItem({
      ...baseWeapon,
      effects: [{ type: "light_bonus", trigger: "passive", tier: 1, source: "mod", value: 1 }],
      lightBonus: 1,
    });
  });

  await page.keyboard.press("i");

  await expect(page.locator("#inventoryList .inventory-section-title")).toHaveText("Waffen");
  await expect(page.locator("#inventoryList .inventory-item")).toHaveCount(2);
  await expect(page.locator("#inventoryList .inventory-item strong")).toHaveText(["Küchenmesser", "Küchenmesser"]);
  await expect(page.locator("#inventoryList")).not.toContainText("Küchenmesser x2");
  await expect(page.locator("#inventoryList")).toContainText("Licht +1");
});

test("inventory weapon details show studio origin and generated modifiers", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await page.evaluate(() => {
    window.__TEST_API__.addInventoryItem({
      type: "weapon",
      id: "kitchen-knife",
      name: "Küchenmesser",
      source: "Tests",
      handedness: "one-handed",
      attackMode: "melee",
      damage: 3,
      hitBonus: 2,
      critBonus: 0,
      rarity: "uncommon",
      floorNumber: 4,
      numericMods: [{ id: "hit", stat: "hitBonus", amount: 1, label: "Präzise", namePrefix: "Präzise" }],
      effects: [],
      modifiers: [],
      description: "Nur für Tests.",
    });
  });

  await page.keyboard.press("i");

  const inventoryEntry = page.locator("#inventoryList .inventory-item").first();
  await expect(inventoryEntry).toContainText("Aus Studio 4");
  await expect(inventoryEntry).toContainText("Mods: Präzise");
});

test("inventory uses svg icons for potions and keys when available", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await page.evaluate(() => {
    window.__TEST_API__.addInventoryItem({
      type: "potion",
      name: "Heiltrank",
      description: "Nur für Tests.",
      heal: 8,
    });
    window.__TEST_API__.addInventoryItem({
      type: "key",
      name: "Grüner Schlüssel",
      description: "Nur für Tests.",
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
    description: "Nur für Tests.",
  });

  await page.keyboard.press("ArrowRight");
  await expect(page.locator("#choiceModal")).toBeVisible();
  await page.locator("#choiceDrink").click();

  const inventory = await page.evaluate(() => window.__TEST_API__.getInventorySnapshot());
  const messages = await page.evaluate(() => window.__TEST_API__.getMessages());

  expect(inventory.equippedWeapon.name).toBe("Testsaebel");
  expect(messages.some((entry) => entry.text.includes("Du führst jetzt den Testsaebel."))).toBeTruthy();
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
          description: "Nur für Tests.",
        },
      },
    });
    window.__TEST_API__.clearFloorEntities();
    window.__TEST_API__.placeWeapon({ x: 3, y: 2 }, {
      type: "weapon",
      id: "kitchen-knife",
      name: "Küchenmesser",
      source: "Tests",
      handedness: "one-handed",
      damage: 4,
      hitBonus: 2,
      critBonus: 1,
      rarity: "rare",
      description: "Nur für Tests.",
    });
  });

  await page.keyboard.press("ArrowRight");
  await expect(page.locator("#choiceModal")).toBeVisible();
  await expect(page.locator("#choiceText")).toContainText("Derzeit getragen");
  await expect(page.locator("#choiceText")).toContainText("Küchenmesser");
  await expect(page.locator("#choiceText")).toContainText("Buck Knife");
  await expect(page.locator("#choiceText .choice-rarity.rarity-rare")).toContainText("Selten");
  await expect(page.locator("#choiceText .choice-rarity.rarity-uncommon")).toContainText("Ungewöhnlich");
});

test("weapon loot details show studio origin and numeric modifiers", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await setupWeaponAtPlayerStep(page, {
    type: "weapon",
    id: "kitchen-knife",
    name: "Küchenmesser",
    source: "Tests",
    handedness: "one-handed",
    attackMode: "melee",
    damage: 3,
    hitBonus: 2,
    critBonus: 0,
    rarity: "uncommon",
    floorNumber: 3,
    numericMods: [{ id: "hit", stat: "hitBonus", amount: 1, label: "Präzise", namePrefix: "Präzise" }],
    effects: [],
    modifiers: [],
    description: "Nur für Tests.",
  });

  await page.keyboard.press("ArrowRight");

  const foundCard = page.locator("#choiceText .choice-compare-card").first();
  await expect(page.locator("#choiceModal")).toBeVisible();
  await expect(foundCard).toContainText("Aus Studio 3");
  await expect(foundCard).toContainText("Mods: Präzise");
  await expect(foundCard).not.toContainText("Keine Modifikatoren");
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
    description: "Nur für Tests.",
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
      description: "Nur für Tests.",
    },
  });

  await page.keyboard.press("ArrowRight");

  await expect(page.locator("#choiceModal")).toBeVisible();
  const messages = await page.evaluate(() => window.__TEST_API__.getMessages());
  expect(messages.some((entry) => entry.text.includes("Requisitenkiste"))).toBeTruthy();
});

test("potion chests chain directly into the potion choice modal on the same tile", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await setupChestAtPlayerStep(page, {
    type: "potion",
    item: {
      type: "potion",
      name: "Heiltrank",
      description: "Nur für Tests.",
      heal: 8,
    },
  });

  await page.keyboard.press("ArrowRight");

  await expect(page.locator("#choiceModal")).toBeVisible();
  await expect(page.locator("#choiceTitle")).toContainText("Heiltrank gefunden");
  const messages = await page.evaluate(() => window.__TEST_API__.getMessages());
  expect(messages.some((entry) => entry.text.includes("Requisitenkiste"))).toBeTruthy();
});

test("equipment rarity modifiers are applied to generated drops", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  const generated = await page.evaluate(() => window.__TEST_API__.previewGeneratedEquipment(
    {
      type: "offhand",
      subtype: "shield",
      itemType: "shield",
      id: "preview-shield",
      name: "Preview-Schild",
      source: "Tests",
      blockChance: 16,
      blockValue: 2,
      description: "Nur für Tests.",
    },
    {
      forceRarity: "rare",
      forceModifiers: ["sturdy", "reactive"],
      dropSourceTag: "chest",
    },
  ));

  expect(generated.rarity).toBe("rare");
  expect(generated.modifiers).toHaveLength(2);
  expect(generated.blockChance).toBe(21);
  expect(generated.blockValue).toBe(3);
  expect(generated.name).toContain("Preview-Schild");
});

test("early floors cap top weapon rarities by depth", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  const rarities = await page.evaluate(() => {
    const template = {
      type: "weapon-template",
      id: "depth-test-revolver",
      name: "Tiefentest-Revolver",
      source: "Tests",
      archetypeId: "western",
      weaponRole: "ranged",
      attackMode: "ranged",
      range: 6,
      profileId: "precise_ranged",
      baseDamage: 3,
      baseHit: 2,
      baseCrit: 1,
      description: "Nur fuer Tests.",
    };

    function previewRarity(floorNumber) {
      window.__TEST_API__.setRandomSequence([0.999]);
      return window.__TEST_API__.previewGeneratedEquipment(template, {
        floorNumber,
        dropSourceTag: "monster:test-enemy",
      }).rarity;
    }

    return {
      floor1: previewRarity(1),
      floor3: previewRarity(3),
      floor4: previewRarity(4),
    };
  });

  expect(rarities.floor1).toBe("uncommon");
  expect(rarities.floor3).toBe("rare");
  expect(rarities.floor4).toBe("veryRare");
});
