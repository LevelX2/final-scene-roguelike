const { test, expect } = require("playwright/test");
require("./test-setup");
const { setupCombat, startRun } = require("./helpers");

test("player attacks can hit and reduce enemy hp", async ({ page }) => {
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
      hp: 20,
      maxHp: 20,
      strength: 2,
      precision: 2,
      reaction: 1,
      nerves: 0,
    },
  });

  await page.evaluate(() => window.__TEST_API__.setRandomSequence([0, 0.99, 0]));
  await page.keyboard.press("ArrowRight");

  const snapshot = await page.evaluate(() => window.__TEST_API__.getSnapshot());
  const messages = await page.evaluate(() => window.__TEST_API__.getMessages());

  expect(snapshot.enemies[0].hp).toBe(13);
  expect(messages.some((entry) => entry.text.includes("Du triffst"))).toBeTruthy();
});

test("player attacks can miss and be logged as dodged", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await setupCombat(page, {
    player: {
      strength: 4,
      precision: 1,
      reaction: 3,
      nerves: 2,
      weapon: {
        type: "weapon",
        id: "test-blade",
        name: "Testklinge",
        source: "Tests",
        damage: 3,
        hitBonus: 0,
        critBonus: 0,
        description: "Nur fuer Tests.",
      },
    },
    enemy: {
      hp: 20,
      maxHp: 20,
      reaction: 8,
      nerves: 5,
    },
  });

  await page.evaluate(() => window.__TEST_API__.setRandomSequence([0.5, 0.99]));
  await page.keyboard.press("ArrowRight");

  const snapshot = await page.evaluate(() => window.__TEST_API__.getSnapshot());
  const messages = await page.evaluate(() => window.__TEST_API__.getMessages());

  expect(snapshot.enemies[0].hp).toBe(20);
  expect(messages.some((entry) => entry.text.includes("weicht deinem Angriff aus"))).toBeTruthy();
});

test("critical hits deal increased damage and are logged", async ({ page }) => {
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
        id: "test-crit-blade",
        name: "Kritklinge",
        source: "Tests",
        damage: 4,
        hitBonus: 2,
        critBonus: 50,
        description: "Nur fuer Tests.",
      },
    },
    enemy: {
      hp: 20,
      maxHp: 20,
      reaction: 1,
      nerves: 0,
    },
  });

  await page.evaluate(() => window.__TEST_API__.setRandomSequence([0, 0, 0.99]));
  await page.keyboard.press("ArrowRight");

  const snapshot = await page.evaluate(() => window.__TEST_API__.getSnapshot());
  const messages = await page.evaluate(() => window.__TEST_API__.getMessages());

  expect(snapshot.enemies[0].hp).toBe(8);
  expect(messages.some((entry) => entry.text.includes("Kritischer Treffer"))).toBeTruthy();
});

test("enemy attacks can miss and leave player hp unchanged", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await setupCombat(page, {
    clearGrid: true,
    player: {
      hp: 20,
      maxHp: 20,
      strength: 4,
      precision: 3,
      reaction: 8,
      nerves: 5,
    },
    enemy: {
      hp: 12,
      maxHp: 12,
      strength: 4,
      precision: 1,
      reaction: 1,
      nerves: 0,
      weapon: {
        type: "weapon",
        id: "enemy-test-weapon",
        name: "Pruefklinge",
        source: "Tests",
        damage: 2,
        hitBonus: 0,
        critBonus: 0,
        description: "Nur fuer Tests.",
      },
    },
  });

  await page.evaluate(() => window.__TEST_API__.setRandomSequence([0.5]));
  await page.keyboard.press(" ");

  const snapshot = await page.evaluate(() => window.__TEST_API__.getSnapshot());
  const messages = await page.evaluate(() => window.__TEST_API__.getMessages());

  expect(snapshot.player.hp).toBe(20);
  expect(messages[0].text).toContain("Du weichst dem Angriff");
});

test("monster details are hidden until the first fight", async ({ page }) => {
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
      description: "Ein schattenhafter Schrecken aus staubigen Filmregalen.",
      special: "Kennt jeden dunklen Winkel des Archivs.",
      hp: 12,
      maxHp: 12,
      reaction: 1,
      nerves: 0,
    },
  });

  await expect(page.locator("#enemySheet")).toContainText("Ein schattenhafter Schrecken aus staubigen Filmregalen.");
  await expect(page.locator("#enemySheet")).toContainText("Mehr Details nach dem ersten Kampf.");
  await expect(page.locator("#enemySheet")).not.toContainText("Leben");

  await page.evaluate(() => window.__TEST_API__.setRandomSequence([0, 0.99, 0]));
  await page.keyboard.press("ArrowRight");

  await expect(page.locator("#enemySheet")).toContainText("Leben");
  await expect(page.locator("#enemySheet")).toContainText("Kennt jeden dunklen Winkel des Archivs.");
});

test("enemies path around a simple wall instead of freezing in front of it", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await setupCombat(page, {
    clearGrid: true,
    player: {
      hp: 20,
      maxHp: 20,
    },
    playerPosition: { x: 2, y: 2 },
    enemyPosition: { x: 4, y: 2 },
    walls: [{ x: 3, y: 2 }],
    enemy: {
      behavior: "hunter",
      behaviorLabel: "Jaeger",
      aggro: true,
      aggroRadius: 10,
      hp: 12,
      maxHp: 12,
    },
  });

  await page.keyboard.press(" ");

  const snapshot = await page.evaluate(() => window.__TEST_API__.getSnapshot());
  const enemy = snapshot.enemies[0];
  const movedAroundWall =
    (enemy.x === 4 && enemy.y === 1) ||
    (enemy.x === 4 && enemy.y === 3) ||
    (enemy.x === 3 && enemy.y === 1) ||
    (enemy.x === 3 && enemy.y === 3);

  expect(movedAroundWall).toBeTruthy();
});

test("enemies without door handling stop at closed doors", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await setupCombat(page, {
    clearGrid: true,
    playerPosition: { x: 2, y: 2 },
    enemyPosition: { x: 5, y: 2 },
    enemy: {
      behavior: "hunter",
      behaviorLabel: "Jaeger",
      aggro: true,
      aggroRadius: 10,
      canOpenDoors: false,
    },
  });

  await page.evaluate(() => {
    window.__TEST_API__.placeDoor({ x: 4, y: 2 }, { doorType: "normal", isOpen: false });
  });
  await page.keyboard.press(" ");

  const snapshot = await page.evaluate(() => window.__TEST_API__.getSnapshot());

  expect(snapshot.enemies[0].x).toBe(5);
  expect(snapshot.doors[0].isOpen).toBeFalsy();
});

test("enemies with door handling can open normal doors", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await setupCombat(page, {
    clearGrid: true,
    playerPosition: { x: 2, y: 2 },
    enemyPosition: { x: 5, y: 2 },
    enemy: {
      behavior: "hunter",
      behaviorLabel: "Jaeger",
      aggro: true,
      aggroRadius: 10,
      canOpenDoors: true,
    },
  });

  await page.evaluate(() => {
    window.__TEST_API__.placeDoor({ x: 4, y: 2 }, { doorType: "normal", isOpen: false });
  });
  await page.keyboard.press(" ");

  const snapshot = await page.evaluate(() => window.__TEST_API__.getSnapshot());

  expect(snapshot.enemies[0].x).toBe(4);
  expect(snapshot.doors[0].isOpen).toBeTruthy();
});

test("local enemies do not pursue across the whole level", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await setupCombat(page, {
    clearGrid: true,
    playerPosition: { x: 2, y: 2 },
    enemyPosition: { x: 12, y: 2 },
    enemy: {
      behavior: "hunter",
      behaviorLabel: "Jaeger",
      mobility: "local",
      mobilityLabel: "Reviertreu",
      aggro: true,
      aggroRadius: 1,
      canOpenDoors: true,
    },
  });

  await page.keyboard.press(" ");

  const snapshot = await page.evaluate(() => window.__TEST_API__.getSnapshot());
  expect(snapshot.enemies[0].x).toBe(12);
  expect(snapshot.enemies[0].y).toBe(2);
});

test("relentless enemies keep pursuing across the whole level", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await setupCombat(page, {
    clearGrid: true,
    playerPosition: { x: 2, y: 2 },
    enemyPosition: { x: 12, y: 2 },
    enemy: {
      behavior: "hunter",
      behaviorLabel: "Jaeger",
      mobility: "relentless",
      mobilityLabel: "Jagdend",
      aggro: true,
      aggroRadius: 1,
      canOpenDoors: true,
    },
  });

  await page.keyboard.press(" ");

  const snapshot = await page.evaluate(() => window.__TEST_API__.getSnapshot());
  expect(snapshot.enemies[0].x).toBe(11);
  expect(snapshot.enemies[0].y).toBe(2);
});

test("intelligent wounded enemies can retreat instead of attacking", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await setupCombat(page, {
    clearGrid: true,
    playerPosition: { x: 3, y: 2 },
    enemyPosition: { x: 4, y: 2 },
    player: {
      hp: 24,
      maxHp: 24,
      reaction: 2,
      nerves: 1,
    },
    enemy: {
      behavior: "hunter",
      behaviorLabel: "Jaeger",
      aggro: true,
      aggroRadius: 8,
      hp: 2,
      maxHp: 10,
      intelligence: 6,
      retreatProfile: "cautious",
      retreatLabel: "Vorsichtig",
      canOpenDoors: true,
    },
  });

  await page.keyboard.press(" ");

  const snapshot = await page.evaluate(() => window.__TEST_API__.getSnapshot());
  const messages = await page.evaluate(() => window.__TEST_API__.getMessages());

  expect(snapshot.player.hp).toBe(24);
  expect(snapshot.enemies[0].x).toBe(5);
  expect(snapshot.enemies[0].isRetreating).toBeTruthy();
  expect(messages.some((entry) => entry.text.includes("sucht ploetzlich Abstand"))).toBeTruthy();
});

test("enemies regenerate slowly over time when they stay out of direct melee", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await setupCombat(page, {
    clearGrid: true,
    playerPosition: { x: 2, y: 2 },
    enemyPosition: { x: 10, y: 10 },
    walls: [
      { x: 9, y: 10 }, { x: 11, y: 10 }, { x: 10, y: 9 }, { x: 10, y: 11 },
    ],
    enemy: {
      behavior: "dormant",
      behaviorLabel: "Schlaefer",
      aggro: false,
      hp: 7,
      maxHp: 10,
      healingProfile: "slow",
      healingLabel: "Langsam",
    },
  });

  for (let index = 0; index < 6; index += 1) {
    await page.keyboard.press(" ");
  }

  const snapshot = await page.evaluate(() => window.__TEST_API__.getSnapshot());
  expect(snapshot.enemies[0].hp).toBe(8);
});

test("shields can block part of incoming damage", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await setupCombat(page, {
    player: {
      hp: 20,
      maxHp: 20,
      reaction: 0,
      nerves: 0,
      offHand: {
        type: "offhand",
        subtype: "shield",
        id: "test-shield",
        name: "Test-Schild",
        source: "Tests",
        blockChance: 100,
        blockValue: 3,
        description: "Nur fuer Tests.",
      },
    },
    enemy: {
      hp: 12,
      maxHp: 12,
      strength: 4,
      precision: 9,
      reaction: 1,
      nerves: 0,
      weapon: {
        type: "weapon",
        id: "enemy-test-weapon",
        name: "Pruefklinge",
        source: "Tests",
        handedness: "one-handed",
        damage: 2,
        hitBonus: 0,
        critBonus: 0,
        description: "Nur fuer Tests.",
      },
    },
  });

  await page.evaluate(() => window.__TEST_API__.setRandomSequence([0, 0.99, 0]));
  await page.keyboard.press(" ");

  const snapshot = await page.evaluate(() => window.__TEST_API__.getSnapshot());
  const messages = await page.evaluate(() => window.__TEST_API__.getMessages());

  expect(snapshot.player.hp).toBe(17);
  expect(messages.some((entry) => entry.text.includes("faengt 3 Schaden"))).toBeTruthy();
});

test("player death opens the death modal", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await setupCombat(page, {
    player: {
      hp: 4,
      maxHp: 20,
      reaction: 0,
      nerves: 0,
    },
    enemy: {
      name: "Henker",
      hp: 12,
      maxHp: 12,
      strength: 6,
      precision: 9,
      reaction: 1,
      nerves: 0,
      weapon: {
        type: "weapon",
        id: "execution-blade",
        name: "Henkerklinge",
        source: "Tests",
        damage: 3,
        hitBonus: 2,
        critBonus: 0,
        description: "Nur fuer Tests.",
      },
    },
  });

  await page.evaluate(() => window.__TEST_API__.setRandomSequence([0]));
  await page.keyboard.press(" ");

  await expect(page.locator("#deathModal")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Du bist gefallen" })).toBeVisible();
});

test("a death writes a highscore entry", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await page.evaluate(() => localStorage.removeItem("dungeon-rogue-highscores"));

  await setupCombat(page, {
    player: {
      hp: 4,
      maxHp: 20,
      reaction: 0,
      nerves: 0,
    },
    enemy: {
      name: "Henker",
      hp: 12,
      maxHp: 12,
      strength: 6,
      precision: 9,
      reaction: 1,
      nerves: 0,
      weapon: {
        type: "weapon",
        id: "execution-blade",
        name: "Henkerklinge",
        source: "Tests",
        damage: 3,
        hitBonus: 2,
        critBonus: 0,
        description: "Nur fuer Tests.",
      },
    },
  });

  await page.evaluate(() => window.__TEST_API__.setRandomSequence([0]));
  await page.keyboard.press(" ");

  const scores = await page.evaluate(() => window.__TEST_API__.getHighscores());
  expect(scores.length).toBe(1);
  expect(scores[0].deepestFloor).toBe(1);
});

test("death modal shows out of ranking when a new score misses the stored top 100", async ({ page }) => {
  await page.addInitScript(() => {
    const strongScores = Array.from({ length: 100 }, (_, index) => ({
      marker: `seed-${index}`,
      heroName: `Seed ${index}`,
      heroClass: "Slayer",
      date: "12.04.2026, 10:00:00",
      deathFloor: 99,
      deepestFloor: 99,
      level: 20,
      hp: 20,
      maxHp: 20,
      turns: 1,
      kills: 999 - index,
      deathCause: "Seeded for tests.",
    }));

    window.localStorage.setItem("dungeon-rogue-highscores-version", "2");
    window.localStorage.setItem("dungeon-rogue-highscores", JSON.stringify(strongScores));
  });

  await page.goto("/");
  await startRun(page);

  await setupCombat(page, {
    player: {
      hp: 4,
      maxHp: 20,
      reaction: 0,
      nerves: 0,
    },
    enemy: {
      name: "Henker",
      hp: 12,
      maxHp: 12,
      strength: 6,
      precision: 9,
      reaction: 1,
      nerves: 0,
      weapon: {
        type: "weapon",
        id: "execution-blade",
        name: "Henkerklinge",
        source: "Tests",
        damage: 3,
        hitBonus: 2,
        critBonus: 0,
        description: "Nur fuer Tests.",
      },
    },
  });

  await page.evaluate(() => window.__TEST_API__.setRandomSequence([0]));
  await page.keyboard.press(" ");

  await expect(page.locator("#deathModal")).toBeVisible();
  await expect(page.locator("#deathSummary")).toContainText("Ausser Wertung");

  const scores = await page.evaluate(() => window.__TEST_API__.getHighscores());
  expect(scores).toHaveLength(100);
  expect(scores.some((entry) => entry.marker?.startsWith("run-"))).toBeFalsy();
});
