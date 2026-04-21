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
        description: "Nur für Tests.",
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
  await startRun(page, { classLabel: "Stuntman" });

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
        description: "Nur für Tests.",
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
  expect(messages.some((entry) => entry.text.includes("weicht deinem Angriff mit der Testklinge aus"))).toBeTruthy();
  expect(messages.some((entry) => entry.text.includes("Als Stuntman gehst du sofort in die Szene"))).toBeTruthy();
});

test("variant monster prefixes are rendered as proper adjectives in miss logs", async ({ page }) => {
  await page.goto("/");
  await startRun(page, { classLabel: "Filmstar" });

  await setupCombat(page, {
    player: {
      strength: 4,
      precision: 0,
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
        description: "Nur für Tests.",
      },
    },
    enemy: {
      id: "motel-shlurfer",
      baseName: "Motel-Schlurfer",
      name: "Brutaler Motel-Schlurfer",
      grammar: {
        articleMode: "indefinite",
        gender: "masculine",
        namePrefixStems: ["brutal"],
      },
      hp: 12,
      maxHp: 12,
      reaction: 20,
      nerves: 10,
    },
  });

  await page.evaluate(() => window.__TEST_API__.setRandomSequence([0.5, 0.99]));
  await page.keyboard.press("ArrowRight");

  const messages = await page.evaluate(() => window.__TEST_API__.getMessages());
  expect(messages.some((entry) => entry.text.includes("der brutale Motel-Schlurfer entkommt knapp."))).toBeTruthy();
  expect(messages.some((entry) => entry.text.includes("Der brutale Motel-Schlurfer weicht deinem Angriff mit der Testklinge aus."))).toBeTruthy();
  const markedNames = await page.locator("#messageLog .log-mark-monster").evaluateAll((nodes) =>
    nodes.map((node) => node.textContent)
  );
  expect(markedNames).toContain("Der brutale Motel-Schlurfer");
});

test("Filmstar gets a boosted opening strike against a fresh enemy", async ({ page }) => {
  await page.goto("/");
  await startRun(page, { classLabel: "Filmstar" });

  await setupCombat(page, {
    player: {
      precision: 1,
      reaction: 4,
      nerves: 3,
      weapon: {
        type: "weapon",
        id: "test-mark-blade",
        name: "Markenklinge",
        source: "Tests",
        damage: 2,
        hitBonus: 0,
        critBonus: 0,
        description: "Nur für Tests.",
      },
    },
    enemy: {
      hp: 20,
      maxHp: 20,
      reaction: 5,
      nerves: 0,
    },
  });

  await page.evaluate(() => window.__TEST_API__.setRandomSequence([0.6, 0.99, 0.99]));
  await page.keyboard.press("ArrowRight");

  const snapshot = await page.evaluate(() => window.__TEST_API__.getSnapshot());
  const messages = await page.evaluate(() => window.__TEST_API__.getMessages());

  expect(snapshot.enemies[0].hp).toBe(14);
  expect(messages.some((entry) => entry.text.includes("Triff deine Marke"))).toBeTruthy();
});

test("Regisseur gets a class-specific opening strike log line", async ({ page }) => {
  await page.goto("/");
  await startRun(page, { classLabel: "Regisseur" });

  await setupCombat(page, {
    player: {
      precision: 6,
      reaction: 4,
      nerves: 3,
      weapon: {
        type: "weapon",
        id: "test-lens-blade",
        name: "Blickklinge",
        source: "Tests",
        damage: 2,
        hitBonus: 1,
        critBonus: 0,
        description: "Nur für Tests.",
      },
    },
    enemy: {
      hp: 20,
      maxHp: 20,
      reaction: 1,
      nerves: 0,
    },
  });

  await page.evaluate(() => window.__TEST_API__.setRandomSequence([0, 0.99, 0.99]));
  await page.keyboard.press("ArrowRight");

  const messages = await page.evaluate(() => window.__TEST_API__.getMessages());
  expect(messages.some((entry) => entry.text.includes("Mit Szenenblick liest du den ersten Moment richtig"))).toBeTruthy();
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
        description: "Nur für Tests.",
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
        name: "Prüfklinge",
        source: "Tests",
        damage: 2,
        hitBonus: 0,
        critBonus: 0,
        description: "Nur für Tests.",
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

test("enemy sheet shows the atmospheric temperament hint before the first fight", async ({ page }) => {
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
      temperament: "patrol",
      temperamentHint: "Zieht Bahnen, als folge es einem laengst einstudierten Ablauf.",
      special: "Kennt jeden dunklen Winkel des Archivs.",
      hp: 12,
      maxHp: 12,
      reaction: 1,
      nerves: 0,
    },
  });

  await expect(page.locator("#enemySheet")).toContainText("Auftreten");
  await expect(page.locator("#enemySheet")).toContainText("Zieht Bahnen, als folge es einem laengst einstudierten Ablauf.");
});

test("stalker enemies actively pursue once roaming aggro has latched", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await setupCombat(page, {
    clearGrid: true,
    playerPosition: { x: 2, y: 2 },
    enemyPosition: { x: 5, y: 2 },
    walls: [
      { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 }, { x: 4, y: 1 }, { x: 5, y: 1 }, { x: 6, y: 1 },
      { x: 1, y: 3 }, { x: 2, y: 3 }, { x: 3, y: 3 }, { x: 4, y: 3 }, { x: 5, y: 3 }, { x: 6, y: 3 },
    ],
    enemy: {
      behavior: "stalker",
      behaviorLabel: "Verfolger",
      temperament: "stoic",
      aggro: false,
      aggroRadius: 2,
      hp: 12,
      maxHp: 12,
      canOpenDoors: true,
    },
  });

  await page.keyboard.press(" ");

  const snapshot = await page.evaluate(() => window.__TEST_API__.getSnapshot());
  expect(snapshot.enemies[0].aggro).toBeTruthy();
  expect(snapshot.enemies[0].x).toBe(4);
  expect(snapshot.enemies[0].y).toBe(2);
});

test("hunters do not acquire aggro through multiple walls inside their radius", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await setupCombat(page, {
    clearGrid: true,
    playerPosition: { x: 2, y: 2 },
    enemyPosition: { x: 6, y: 2 },
    walls: [{ x: 3, y: 2 }, { x: 4, y: 2 }, { x: 5, y: 2 }],
    enemy: {
      behavior: "hunter",
      behaviorLabel: "Jager",
      aggro: false,
      aggroRadius: 4,
      hp: 12,
      maxHp: 12,
    },
  });

  await page.evaluate(() => window.__TEST_API__.setRandomSequence([0.99]));
  await page.keyboard.press(" ");

  const snapshot = await page.evaluate(() => window.__TEST_API__.getSnapshot());
  expect(snapshot.enemies[0].aggro).toBeFalsy();
  expect(snapshot.enemies[0].x).toBe(6);
  expect(snapshot.enemies[0].y).toBe(2);
});

test("patrol temperament gives calm hunters a real idle destination", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await setupCombat(page, {
    clearGrid: true,
    playerPosition: { x: 2, y: 2 },
    enemyPosition: { x: 10, y: 10 },
    enemy: {
      behavior: "hunter",
      behaviorLabel: "Jager",
      temperament: "patrol",
      aggro: false,
      aggroRadius: 1,
      hp: 12,
      maxHp: 12,
    },
  });

  await page.evaluate(() => window.__TEST_API__.setRandomSequence([0]));
  await page.keyboard.press(" ");

  const snapshot = await page.evaluate(() => window.__TEST_API__.getSnapshot());
  expect(snapshot.enemies[0].x === 10 && snapshot.enemies[0].y === 10).toBeFalsy();
  expect(snapshot.enemies[0].idleTarget).not.toBeNull();
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
      behaviorLabel: "Jäger",
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
    walls: [
      { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 }, { x: 4, y: 1 }, { x: 5, y: 1 }, { x: 6, y: 1 },
      { x: 1, y: 3 }, { x: 2, y: 3 }, { x: 3, y: 3 }, { x: 4, y: 3 }, { x: 5, y: 3 }, { x: 6, y: 3 },
    ],
    enemy: {
      behavior: "hunter",
      behaviorLabel: "Jäger",
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
      behaviorLabel: "Jäger",
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
      behaviorLabel: "Jäger",
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
      behaviorLabel: "Jäger",
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
      behaviorLabel: "Jäger",
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
      behaviorLabel: "Schläfer",
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
        description: "Nur für Tests.",
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
        name: "Prüfklinge",
        source: "Tests",
        handedness: "one-handed",
        damage: 2,
        hitBonus: 0,
        critBonus: 0,
        description: "Nur für Tests.",
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
        description: "Nur für Tests.",
      },
    },
  });

  await page.evaluate(() => window.__TEST_API__.setRandomSequence([0]));
  await page.keyboard.press(" ");

  await expect(page.locator("#deathModal")).toBeVisible();
  await expect(page.locator("#deathModal .modal-eyebrow")).toContainText("Abspann");
  await expect(page.locator("#deathModal h2")).toContainText("Das war der letzte Take");
});

test("enemy deaths decay in three visual stages under loot before disappearing", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await setupCombat(page, {
    enemy: {
      hp: 1,
      maxHp: 1,
      xpReward: 1,
    },
  });

  await page.evaluate(() => {
    window.__TEST_API__.applyStatusToEnemy({
      type: "burn",
      duration: 1,
      dotDamage: 99,
    });
    window.__TEST_API__.processStatusRound();
  });

  const killState = await page.evaluate(() => {
    const snapshot = window.__TEST_API__.getSnapshot();
    const death = snapshot.recentDeaths?.[0] ?? null;
    if (!death) {
      return null;
    }

    window.__TEST_API__.placeFood(death, {
      type: "food",
      id: "test-ration",
      name: "Testration",
      nutritionRestore: 8,
      icon: "chips",
      description: "Nur für Tests.",
    });

    const refreshedSnapshot = window.__TEST_API__.getSnapshot();
    const width = snapshot.grid[0]?.length ?? 0;
    const cells = Array.from(document.querySelectorAll(".board .tile-cell"));
    const cell = cells[death.y * width + death.x] ?? null;
    const underlay = cell?.querySelector(".tile-death-underlay.death-marker") ?? null;
    return {
      death,
      recentDeaths: refreshedSnapshot.recentDeaths,
      hasDeathUnderlay: Boolean(underlay),
      deathUnderlayClass: underlay?.className ?? "",
      hasFoodForeground: Boolean(cell?.querySelector(".tile-foreground-layer.food")),
    };
  });

  expect(killState).not.toBeNull();
  expect(killState.recentDeaths).toHaveLength(1);
  expect(killState.death.expiresAfterTurn).toBe(6);
  expect(killState.hasDeathUnderlay).toBeTruthy();
  expect(killState.deathUnderlayClass).toContain("death-stage-fresh");
  expect(killState.hasFoodForeground).toBeTruthy();

  await page.keyboard.press(" ");
  await page.keyboard.press(" ");
  await page.keyboard.press(" ");
  await page.keyboard.press(" ");

  const decayPhase = await page.evaluate((death) => {
    const snapshot = window.__TEST_API__.getSnapshot();
    const width = snapshot.grid[0]?.length ?? 0;
    const cell = Array.from(document.querySelectorAll(".board .tile-cell"))[death.y * width + death.x] ?? null;
    return {
      turn: snapshot.turn,
      recentDeaths: snapshot.recentDeaths,
      hasDeathUnderlay: Boolean(cell?.querySelector(".tile-death-underlay.death-marker")),
      deathUnderlayClass: cell?.querySelector(".tile-death-underlay.death-marker")?.className ?? "",
    };
  }, killState.death);

  expect(decayPhase.turn).toBe(4);
  expect(decayPhase.recentDeaths).toHaveLength(1);
  expect(decayPhase.deathUnderlayClass).toContain("death-stage-decay");

  await page.keyboard.press(" ");
  await page.keyboard.press(" ");

  const spotPhase = await page.evaluate((death) => {
    const snapshot = window.__TEST_API__.getSnapshot();
    const width = snapshot.grid[0]?.length ?? 0;
    const cell = Array.from(document.querySelectorAll(".board .tile-cell"))[death.y * width + death.x] ?? null;
    return {
      turn: snapshot.turn,
      recentDeaths: snapshot.recentDeaths,
      hasDeathUnderlay: Boolean(cell?.querySelector(".tile-death-underlay.death-marker")),
      deathUnderlayClass: cell?.querySelector(".tile-death-underlay.death-marker")?.className ?? "",
    };
  }, killState.death);

  expect(spotPhase.turn).toBe(6);
  expect(spotPhase.recentDeaths).toHaveLength(1);
  expect(spotPhase.deathUnderlayClass).toContain("death-stage-spot");

  await page.keyboard.press(" ");

  const afterExpiry = await page.evaluate((death) => {
    const snapshot = window.__TEST_API__.getSnapshot();
    const width = snapshot.grid[0]?.length ?? 0;
    const cell = Array.from(document.querySelectorAll(".board .tile-cell"))[death.y * width + death.x] ?? null;
    return {
      turn: snapshot.turn,
      recentDeaths: snapshot.recentDeaths,
      hasDeathUnderlay: Boolean(cell?.querySelector(".tile-death-underlay.death-marker")),
    };
  }, killState.death);

  expect(afterExpiry.turn).toBe(7);
  expect(afterExpiry.recentDeaths).toHaveLength(0);
  expect(afterExpiry.hasDeathUnderlay).toBeFalsy();
});

test("death markers do not stay visible in explored memory tiles", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await setupCombat(page, {
    enemy: {
      hp: 1,
      maxHp: 1,
    },
  });

  await page.evaluate(() => {
    window.__TEST_API__.applyStatusToEnemy({
      type: "burn",
      duration: 1,
      dotDamage: 99,
    });
    window.__TEST_API__.processStatusRound();
  });

  const hiddenMarkerState = await page.evaluate(() => {
    const snapshot = window.__TEST_API__.getSnapshot();
    const death = snapshot.recentDeaths?.[0] ?? null;
    const width = snapshot.grid[0]?.length ?? 0;
    if (!death) {
      return null;
    }

    const candidateTiles = [];
    for (let y = 0; y < snapshot.grid.length; y += 1) {
      for (let x = 0; x < width; x += 1) {
        if (snapshot.grid[y]?.[x] === ".") {
          candidateTiles.push({ x, y });
        }
      }
    }

    let hidingTile = null;
    for (const tile of candidateTiles) {
      window.__TEST_API__.teleportPlayer(tile);
      const nextSnapshot = window.__TEST_API__.getSnapshot();
      if (!nextSnapshot.visible?.[death.y]?.[death.x]) {
        hidingTile = tile;
        break;
      }
    }

    if (!hidingTile) {
      return null;
    }

    const cells = Array.from(document.querySelectorAll(".board .tile-cell"));
    const cell = cells[death.y * width + death.x] ?? null;
    return {
      hidingTile,
      hasDeathUnderlay: Boolean(cell?.querySelector(".tile-death-underlay.death-marker")),
      baseClass: cell?.querySelector(".tile-base")?.className ?? "",
    };
  });

  expect(hiddenMarkerState).not.toBeNull();
  expect(hiddenMarkerState.baseClass).toContain("memory");
  expect(hiddenMarkerState.hasDeathUnderlay).toBeFalsy();
});

test("death modal describes who killed the player and with which weapon", async ({ page }) => {
  await page.goto("/");
  await startRun(page, { name: "Level X2" });

  await setupCombat(page, {
    clearGrid: true,
    enemyPosition: { x: 5, y: 2 },
    player: {
      hp: 1,
      maxHp: 20,
      reaction: 0,
      nerves: 0,
      offHand: null,
    },
    enemy: {
      id: "kellerkriecher",
      baseName: "Kellerkriecher",
      name: "Kellerkriecher",
      hp: 12,
      maxHp: 12,
      strength: 99,
      precision: 99,
      reaction: 1,
      nerves: 0,
      weapon: {
        type: "weapon",
        id: "expedition-revolver",
        templateId: "expedition-revolver",
        baseItemId: "expedition-revolver",
        name: "Leuchtend Expeditionsrevolver der Flamme",
        nameParts: {
          prefix: "Leuchtend",
          baseName: "Expeditionsrevolver",
          suffix: "der Flamme",
          decadeSuffix: null,
        },
        source: "Tests",
        damage: 99,
        hitBonus: 99,
        critBonus: 0,
        attackMode: "ranged",
        range: 6,
        description: "Nur für Tests.",
      },
    },
  });

  await page.evaluate(() => window.__TEST_API__.setRandomSequence([0, 0.99]));
  await page.keyboard.press(" ");

  await expect(page.locator("#deathModal")).toBeVisible();
  await expect(page.locator("#deathSummary")).toContainText("ein Kellerkriecher");
  await expect(page.locator("#deathSummary")).toContainText("dem leuchtenden Expeditionsrevolver der Flamme");
});

test("enemy attack log uses the inflected weapon phrase", async ({ page }) => {
  await page.goto("/");
  await startRun(page);

  await setupCombat(page, {
    clearGrid: true,
    enemyPosition: { x: 5, y: 2 },
    player: {
      hp: 20,
      maxHp: 20,
      reaction: 0,
      nerves: 0,
      offHand: null,
    },
    enemy: {
      id: "kellerkriecher",
      baseName: "Kellerkriecher",
      name: "Kellerkriecher",
      hp: 12,
      maxHp: 12,
      strength: 6,
      precision: 9,
      reaction: 1,
      nerves: 0,
      weapon: {
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
        damage: 3,
        hitBonus: 2,
        critBonus: 0,
        attackMode: "ranged",
        range: 6,
        description: "Nur für Tests.",
      },
    },
  });

  await page.evaluate(() => window.__TEST_API__.setRandomSequence([0]));
  await page.keyboard.press(" ");

  const messages = await page.evaluate(() => window.__TEST_API__.getMessages());
  expect(messages.some((entry) => entry.text.includes("mit dem leuchtenden Expeditionsrevolver der Flamme"))).toBeTruthy();
});

test("combat log inflects monster names for hit xp and kill messages", async ({ page }) => {
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
        description: "Nur für Tests.",
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
      hp: 7,
      maxHp: 7,
      xpReward: 10,
      reaction: 1,
      nerves: 0,
    },
  });

  await page.evaluate(() => window.__TEST_API__.setRandomSequence([0, 0.99, 0]));
  await page.keyboard.press("ArrowRight");

  const messages = await page.evaluate(() => window.__TEST_API__.getMessages());
  expect(messages.some((entry) => entry.text.includes("Du triffst die besessene Puppe mit der Testklinge"))).toBeTruthy();
  expect(messages.some((entry) => entry.text.includes("+10 XP durch die besessene Puppe."))).toBeTruthy();
  expect(messages.some((entry) => entry.text.includes("Die besessene Puppe ist besiegt."))).toBeTruthy();
});

test("enemy attack log inflects monster names in the surrounding sentence", async ({ page }) => {
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
        description: "Nur für Tests.",
      },
    },
  });

  await page.evaluate(() => window.__TEST_API__.setRandomSequence([0, 0.99]));
  await page.keyboard.press(" ");

  const messages = await page.evaluate(() => window.__TEST_API__.getMessages());
  expect(messages.some((entry) => entry.text.includes("Die besessene Puppe trifft dich mit dem blendenden Kampfmesser des Flimmers"))).toBeTruthy();
  await expect(page.locator("#messageLog .log-mark-monster").first()).toHaveText("Die besessene Puppe");
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
        description: "Nur für Tests.",
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
      heroClass: "Stuntman",
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
        description: "Nur für Tests.",
      },
    },
  });

  await page.evaluate(() => window.__TEST_API__.setRandomSequence([0]));
  await page.keyboard.press(" ");

  await expect(page.locator("#deathModal")).toBeVisible();
  await expect(page.locator("#deathSummary")).toContainText("Außer Wertung");

  const scores = await page.evaluate(() => window.__TEST_API__.getHighscores());
  expect(scores).toHaveLength(100);
  expect(scores.some((entry) => entry.marker?.startsWith("run-"))).toBeFalsy();
});
