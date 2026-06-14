import { chromium, Page } from "playwright";
import path from "path";

const remainingPapers = [
  {
    file: "hip-fai-combined-tests-palsson-2020.pdf",
    doi: "10.1016/j.math.2014.11.006",
    publisher: "Elsevier",
  },
  { file: "shoulder-impingement-calis-2000.pdf", doi: "10.1136/ard.59.1.24", publisher: "BMJ" },
  {
    file: "spurling-cervical-review-rubinstein-2007.pdf",
    doi: "10.1007/s00586-006-0224-4",
    publisher: "Springer",
  },
];

const targetDir = path.join(process.cwd(), "artigos");

async function autoLoginIfNeeded(page: Page) {
  try {
    console.log("Checking if there are any visible login fields...");
    // Handle CAFe login screen if we get redirected there
    const userInput = page
      .locator(
        'input[type="email"], input[name*="user"], input[id*="user"], input[name*="login"], input[id*="identificacao"]',
      )
      .first();
    const passInput = page.locator('input[type="password"]').first();

    if (await passInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log("Password field detected! Attempting to auto-fill credentials...");
      if (await userInput.isVisible().catch(() => false)) {
        await userInput.fill("rafael.minato@usp.br");
      }
      await passInput.fill("@Fisioterapia2022");
      await page.waitForTimeout(1000);

      const submitBtn = page
        .locator(
          'button[type="submit"], input[type="submit"], button:has-text("Login"), button:has-text("Entrar"), button:has-text("Sign in")',
        )
        .first();
      if (await submitBtn.isVisible().catch(() => false)) {
        await submitBtn.click();
        console.log("Clicked login button. Waiting for page load...");
        await page.waitForTimeout(5000);
      }
    }
  } catch {
    console.log("No obvious login form to auto-fill.");
  }
}

async function main() {
  console.log("Launching automated Playwright script...");
  const userDataDir = path.join(process.cwd(), "playwright-profile-auto");

  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    viewport: { width: 1280, height: 800 },
    acceptDownloads: true,
  });

  const page = await context.newPage();

  let currentFileDest = "";
  page.on("download", async (download) => {
    if (currentFileDest) {
      console.log(`\n[EVENT] Download started! Saving to ${currentFileDest}`);
      await download.saveAs(currentFileDest);
      console.log(`[EVENT] ✅ Download completed and saved!`);
    } else {
      console.log(`\n[EVENT] Download started but no active file target! Saving as default.pdf`);
      await download.saveAs(path.join(targetDir, "default.pdf"));
    }
  });

  // Iterate over DOIs
  for (const paper of remainingPapers) {
    currentFileDest = path.join(targetDir, paper.file);
    console.log(`\n======================================================`);
    console.log(`Navigating directly to DOI: ${paper.doi} (${paper.publisher})`);

    try {
      await page.goto(`https://doi.org/${paper.doi}`, {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });
      await page.waitForTimeout(5000);

      await autoLoginIfNeeded(page);

      console.log(`\nSearching for PDF button for ${paper.file}...`);
      const pdfButton = page
        .locator(
          'a[title*="PDF"], a:text-matches("Download PDF", "i"), a:text-matches("View PDF", "i"), a.pdf-link, button:has-text("Download PDF"), a[data-test="pdf-link"], a[data-track-action="download pdf"], a.c-pdf-download__link',
        )
        .first();

      if (await pdfButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log("Found PDF button! Clicking automatically...");
        await pdfButton.click();
      } else {
        console.log("Could not find a clear PDF download button.");
      }

      console.log("\n👉 USER INTERVENTION WINDOW (60 SECONDS) 👈");
      console.log(
        "If the site requires you to click 'Sign in via Institution', please do it NOW via VNC.",
      );
      console.log("You can also type your credentials if my auto-fill missed it.");
      console.log("If you see the 'Download PDF' button, CLICK IT!");

      // Wait 60 seconds per page for the user to do whatever needs to be done.
      // The page.on('download') will catch ANY download triggered during these 60s!
      await page.waitForTimeout(60000);
    } catch (e) {
      console.log(`Error on ${paper.doi}: ${String(e)}`);
    }
  }

  console.log("\nFinished all DOIs. Closing in 10s.");
  currentFileDest = "";
  await page.waitForTimeout(10000);
  await context.close();
}

main().catch(console.error);
