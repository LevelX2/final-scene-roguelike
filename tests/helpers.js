const { expect } = require("playwright/test");

async function startRun(page, options = {}) {
  if (await page.locator("#startModal").isVisible()) {
    if (options.name) {
      await page.locator("#heroNameInput").fill(options.name);
    }

    if (options.classLabel) {
      await page.locator("#classOptions").getByText(options.classLabel, { exact: true }).click();
    }

    await page.locator("#startForm").evaluate((form) => form.requestSubmit());
    await expect(page.locator("#startModal")).toBeHidden();
  }
}

async function walkTo(page, target) {
  const path = await page.evaluate((goal) => {
    const snapshot = window.__TEST_API__.getSnapshot();
    const width = snapshot.grid[0].length;
    const height = snapshot.grid.length;
    const start = snapshot.player;
    const queue = [{ x: start.x, y: start.y, path: [] }];
    const seen = new Set([`${start.x},${start.y}`]);
    const dirs = [
      { dx: 1, dy: 0, key: "ArrowRight" },
      { dx: -1, dy: 0, key: "ArrowLeft" },
      { dx: 0, dy: 1, key: "ArrowDown" },
      { dx: 0, dy: -1, key: "ArrowUp" },
    ];

    while (queue.length > 0) {
      const current = queue.shift();
      if (current.x === goal.x && current.y === goal.y) {
        return current.path;
      }

      for (const dir of dirs) {
        const nextX = current.x + dir.dx;
        const nextY = current.y + dir.dy;

        if (nextX < 0 || nextY < 0 || nextX >= width || nextY >= height) {
          continue;
        }

        if (snapshot.grid[nextY][nextX] === "#") {
          continue;
        }

        const key = `${nextX},${nextY}`;
        if (seen.has(key)) {
          continue;
        }

        seen.add(key);
        queue.push({
          x: nextX,
          y: nextY,
          path: [...current.path, dir.key],
        });
      }
    }

    return null;
  }, target);

  expect(path).not.toBeNull();

  for (const key of path) {
    await page.keyboard.press(key);
    if (await page.locator("#choiceModal").isVisible()) {
      await page.getByRole("button", { name: "Liegen lassen" }).click();
    }
  }
}

async function openDownstairsPrompt(page) {
  await page.evaluate(() => {
    const snapshot = window.__TEST_API__.getSnapshot();
    window.__TEST_API__.teleportPlayer(snapshot.stairsDown);
    window.__TEST_API__.promptCurrentStairs();
  });
}

async function setupCombat(page, config) {
  await page.evaluate((scenario) => {
    window.__TEST_API__.setupCombatScenario(scenario);
  }, config);
}

async function setupPotionAtPlayerStep(page) {
  await page.evaluate(() => {
    const snapshot = window.__TEST_API__.getSnapshot();
    const target = { x: snapshot.player.x + 1, y: snapshot.player.y };
    window.__TEST_API__.clearFloorEntities();
    window.__TEST_API__.placePotion(target);
  });
}

async function setupFoodAtPlayerStep(page, item) {
  await page.evaluate((foodItem) => {
    const snapshot = window.__TEST_API__.getSnapshot();
    const target = { x: snapshot.player.x + 1, y: snapshot.player.y };
    window.__TEST_API__.clearFloorEntities();
    window.__TEST_API__.placeFood(target, foodItem);
  }, item);
}

async function setupWeaponAtPlayerStep(page, weapon) {
  await page.evaluate((item) => {
    const snapshot = window.__TEST_API__.getSnapshot();
    const target = { x: snapshot.player.x + 1, y: snapshot.player.y };
    window.__TEST_API__.clearFloorEntities();
    window.__TEST_API__.placeWeapon(target, item);
  }, weapon);
}

async function setupOffHandAtPlayerStep(page, item) {
  await page.evaluate((offHand) => {
    const snapshot = window.__TEST_API__.getSnapshot();
    const target = { x: snapshot.player.x + 1, y: snapshot.player.y };
    window.__TEST_API__.clearFloorEntities();
    window.__TEST_API__.placeOffHand(target, offHand);
  }, item);
}

async function setupChestAtPlayerStep(page, content) {
  await page.evaluate((chestContent) => {
    const snapshot = window.__TEST_API__.getSnapshot();
    const target = { x: snapshot.player.x + 1, y: snapshot.player.y };
    window.__TEST_API__.clearFloorEntities();
    window.__TEST_API__.placeChest(target, chestContent);
  }, content);
}

async function setupDoorAtPlayerStep(page, config = {}) {
  await page.evaluate((doorConfig) => {
    const snapshot = window.__TEST_API__.getSnapshot();
    const target = { x: snapshot.player.x + 1, y: snapshot.player.y };
    window.__TEST_API__.clearFloorEntities();
    window.__TEST_API__.placeDoor(target, doorConfig);
  }, config);
}

async function setupTrapAtPlayerStep(page, trap = {}) {
  await page.evaluate((trapConfig) => {
    const snapshot = window.__TEST_API__.getSnapshot();
    const target = { x: snapshot.player.x + 1, y: snapshot.player.y };
    window.__TEST_API__.clearFloorEntities();
    window.__TEST_API__.placeTrap(target, trapConfig);
  }, trap);
}

async function setupKeyAtPlayerStep(page, color = "green") {
  await page.evaluate((keyColor) => {
    const snapshot = window.__TEST_API__.getSnapshot();
    const target = { x: snapshot.player.x + 1, y: snapshot.player.y };
    window.__TEST_API__.clearFloorEntities();
    window.__TEST_API__.placeKey(target, keyColor);
  }, color);
}

module.exports = {
  openDownstairsPrompt,
  setupChestAtPlayerStep,
  setupDoorAtPlayerStep,
  setupOffHandAtPlayerStep,
  setupCombat,
  setupFoodAtPlayerStep,
  setupKeyAtPlayerStep,
  setupPotionAtPlayerStep,
  setupTrapAtPlayerStep,
  setupWeaponAtPlayerStep,
  startRun,
  walkTo,
};
