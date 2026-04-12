const { test } = require("playwright/test");

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("dungeon-rogue-enable-test-api", "1");
  });
});
