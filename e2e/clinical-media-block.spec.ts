import { expect, test } from "@playwright/test";

test.describe("Clinical media block", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("insere imagem nas observações, permite caption e persiste após reload", async ({
    page,
    baseURL,
  }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => {
      pageErrors.push(error.message);
    });

    const url = baseURL || "http://localhost:5173";
    const fakeJwt = [
      Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url"),
      Buffer.from(
        JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 60 * 60, sub: "clinical-media-e2e" }),
      ).toString("base64url"),
      "signature",
    ].join(".");

    await page.route(/\/get-session$/i, async (route) => {
      await route.fulfill({
        status: 200,
        headers: {
          "content-type": "application/json",
          "set-auth-jwt": fakeJwt,
        },
        body: JSON.stringify({ session: null }),
      });
    });

    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(`${url}/clinical-media-harness.html?e2e=true`, {
      waitUntil: "domcontentloaded",
    });
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(1000);
    if (pageErrors.length > 0) {
      throw new Error(`Falha ao montar harness: ${pageErrors.join(" | ")}`);
    }
    await page.getByTestId("clinical-media-reset").click();

    await expect(page.getByText("Observações clínicas")).toBeVisible({ timeout: 20000 });
    const editor = page.locator(".ProseMirror").first();
    await expect(editor).toBeVisible({ timeout: 20000 });
    await page.getByTestId("clinical-media-seed-image").click();

    const mediaBlock = page.locator(".clinical-media-node").first();
    await expect(mediaBlock).toBeVisible({ timeout: 10000 });
    await expect(mediaBlock.locator("img")).toHaveAttribute("src", /imagem-e2e\.png/);

    const caption = mediaBlock.locator(".clinical-media-caption").first();
    await caption.click();
    await page.keyboard.type("Legenda clínica E2E");
    await expect(caption).toContainText("Legenda clínica E2E");

    const toolbar = mediaBlock.locator(".clinical-media-toolbar");
    await expect(toolbar).toBeVisible();
    await toolbar.getByRole("button", { name: "75%" }).evaluate((element) => {
      (element as HTMLButtonElement).click();
    });
    await expect(mediaBlock).toHaveAttribute("style", /width:\s*75%/i);
    await toolbar.getByRole("button", { name: "Dir" }).evaluate((element) => {
      (element as HTMLButtonElement).click();
    });
    await expect(mediaBlock).toHaveAttribute("data-align", "right");

    const widthBeforeResize = await mediaBlock.evaluate((element) =>
      Math.round(element.getBoundingClientRect().width),
    );
    const resizeHandle = mediaBlock.getByRole("button", { name: "Redimensionar imagem" });
    const handleBox = await resizeHandle.boundingBox();
    if (!handleBox) throw new Error("Resize handle não encontrada");
    await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(handleBox.x + handleBox.width / 2 - 140, handleBox.y + handleBox.height / 2, {
      steps: 10,
    });
    await page.mouse.up();
    await expect
      .poll(
        () =>
          mediaBlock.evaluate((element) => Math.round(element.getBoundingClientRect().width)),
        { timeout: 5000 },
      )
      .toBeLessThan(widthBeforeResize);

    await expect(page.getByTestId("clinical-media-has-media")).toHaveText("Sim");
    await expect(page.getByTestId("clinical-media-has-caption")).toHaveText("Sim");
    await expect(page.getByTestId("clinical-media-html")).toContainText("Legenda clínica E2E");

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByText("Observações clínicas")).toBeVisible({ timeout: 20000 });
    const reloadedMediaBlock = page.locator(".clinical-media-node").first();
    await expect(reloadedMediaBlock).toBeVisible({ timeout: 10000 });
    await expect(reloadedMediaBlock.locator(".clinical-media-caption")).toContainText(
      "Legenda clínica E2E",
    );
    await expect(reloadedMediaBlock.locator("img")).toHaveAttribute("src", /imagem-e2e\.png/);
    await expect(reloadedMediaBlock).toHaveAttribute("data-align", "right");
  });
});
