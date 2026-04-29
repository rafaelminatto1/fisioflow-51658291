import { test } from "@playwright/test";

test("simple check", async ({ page }) => {
  await page.goto("https://moocafisio.com.br");
  console.log("Page title:", await page.title());
});
