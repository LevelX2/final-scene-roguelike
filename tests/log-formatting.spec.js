const { test, expect } = require("playwright/test");
require("./test-setup");
const { setupCombat, startRun } = require("./helpers");

test("player damage values are highlighted separately in the log", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await setupCombat(page, {
    player: {
      strength: 4,
      precision: 9,
      reaction: 3,
      nerves: 2,
      weapon: {
        type: "weapon",
        id: "test-blade",
        name: "Testklinge",
        source: "Tests",
        damage: 3,
        hitBonus: 2,
        critBonus: 0,
        description: "Nur fuer Tests.",
      },
    },
    enemy: {
      id: "besessene-puppe",
      baseName: "Besessene Puppe",
      name: "Besessene Puppe",
      grammar: {
        articleMode: "indefinite",
        gender: "feminine",
        inflectableParts: {
          adjectiveStem: "besessen",
          noun: "Puppe",
        },
      },
      hp: 12,
      maxHp: 12,
      reaction: 1,
      nerves: 0,
    },
  });

  await page.evaluate(() => window.__TEST_API__.setRandomSequence([0, 0.99, 0]));
  await page.keyboard.press("ArrowRight");

  await expect(
    page.locator("#messageLog .log-mark-monster").filter({ hasText: /die besessene Puppe/i }).first(),
  ).toHaveText(/die besessene Puppe/i);
  await expect(page.locator("#messageLog .log-mark-damage-to-enemy").first()).toHaveText("7");
});

test("incoming damage values are highlighted separately in the log", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await setupCombat(page, {
    player: {
      hp: 20,
      maxHp: 20,
      reaction: 0,
      nerves: 0,
    },
    enemy: {
      id: "besessene-puppe",
      baseName: "Besessene Puppe",
      name: "Besessene Puppe",
      grammar: {
        articleMode: "indefinite",
        gender: "feminine",
        inflectableParts: {
          adjectiveStem: "besessen",
          noun: "Puppe",
        },
      },
      hp: 12,
      maxHp: 12,
      strength: 6,
      precision: 9,
      reaction: 1,
      nerves: 0,
      weapon: {
        type: "weapon",
        id: "combat-knife",
        templateId: "combat-knife",
        baseItemId: "combat-knife",
        name: "Blendend Kampfmesser des Flimmers",
        grammar: {
          gender: "neuter",
          displayName: "Blendend Kampfmesser des Flimmers",
          definiteForms: {
            nominative: "das blendende Kampfmesser des Flimmers",
            accusative: "das blendende Kampfmesser des Flimmers",
            dative: "dem blendenden Kampfmesser des Flimmers",
          },
        },
        nameParts: {
          prefix: "Blendend",
          baseName: "Kampfmesser",
          suffix: "des Flimmers",
          decadeSuffix: null,
        },
        source: "Tests",
        damage: 3,
        hitBonus: 2,
        critBonus: 0,
        description: "Nur fuer Tests.",
      },
    },
  });

  await page.evaluate(() => window.__TEST_API__.setRandomSequence([0, 0.99]));
  await page.keyboard.press(" ");

  await expect(page.locator("#messageLog .log-mark-monster").first()).toHaveText("Die besessene Puppe");
  await expect(page.locator("#messageLog .log-mark-damage-to-player").first()).toHaveText("9");
});

test("enemy dodge logs only highlight the monster name inside the attack phrase", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await setupCombat(page, {
    player: {
      hp: 20,
      maxHp: 20,
      reaction: 10,
      nerves: 10,
    },
    enemy: {
      id: "bates",
      baseName: "Norman Bates",
      name: "Norman Bates",
      grammar: {
        articleMode: "none",
        gender: "masculine",
      },
      hp: 12,
      maxHp: 12,
      strength: 4,
      precision: 1,
      reaction: 1,
      nerves: 0,
      weapon: {
        type: "weapon",
        id: "kitchen-knife",
        templateId: "kitchen-knife",
        baseItemId: "kitchen-knife",
        name: "Kuechenmesser",
        source: "Tests",
        damage: 2,
        hitBonus: 0,
        critBonus: 0,
        description: "Nur fuer Tests.",
      },
    },
  });

  await page.evaluate(() => window.__TEST_API__.setRandomSequence([0.99]));
  await page.keyboard.press(" ");

  const dodgeEntry = page.locator("#messageLog .log-entry", { hasText: "Du weichst dem Angriff von Norman Bates aus." }).first();
  await expect(dodgeEntry.locator(".log-mark-monster")).toHaveText("Norman Bates");
  await expect(dodgeEntry.locator(".log-mark-monster")).not.toHaveText("dem Angriff von Norman Bates");
});
