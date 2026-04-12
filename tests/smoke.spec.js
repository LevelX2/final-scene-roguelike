const { test, expect } = require("playwright/test");

test("production runtime does not expose the test api by default", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator("#startModal")).toBeVisible();
  await expect(page.locator("#heroNameInput")).toBeVisible();

  const hasTestApi = await page.evaluate(() => "__TEST_API__" in window);
  expect(hasTestApi).toBeFalsy();
});

test("app still renders with blocked localStorage access", async ({ page }) => {
  await page.addInitScript(() => {
    const blockedStorage = {
      getItem() {
        throw new Error("blocked");
      },
      setItem() {
        throw new Error("blocked");
      },
      removeItem() {
        throw new Error("blocked");
      },
    };

    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: blockedStorage,
    });
  });

  await page.goto("/");

  await expect(page).toHaveTitle("The Final Scene");
  await expect(page.locator("#startModal")).toBeVisible();
  await page.locator("#startForm").evaluate((form) => form.requestSubmit());
  await expect(page.locator("#startModal")).toBeHidden();
  await expect(page.locator("#playerPanelTitle")).toContainText("Final Girl");
});
