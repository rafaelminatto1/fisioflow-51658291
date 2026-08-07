import { chromium } from "playwright";
import http from "http";
import fs from "fs";
import path from "path";

const ARTIFACT_DIR = "/home/rafael/.gemini/antigravity/brain/1a754bce-1b29-4649-98cc-6e12bca2cdfb";
const DIST_DIR = "/home/rafael/Documents/fisioflow/fisioflow-51658291/apps/web/dist";

function serveStatic(port) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let filePath = path.join(DIST_DIR, req.url === "/" || !path.extname(req.url) ? "index.html" : req.url);
      if (!fs.existsSync(filePath)) filePath = path.join(DIST_DIR, "index.html");

      const ext = path.extname(filePath);
      const contentTypes = {
        ".html": "text/html",
        ".js": "text/javascript",
        ".css": "text/css",
        ".png": "image/png",
        ".svg": "image/svg+xml",
        ".json": "application/json",
      };

      try {
        const data = fs.readFileSync(filePath);
        res.writeHead(200, { "Content-Type": contentTypes[ext] || "application/octet-stream" });
        res.end(data);
      } catch (err) {
        res.writeHead(404);
        res.end("Not Found");
      }
    });

    server.listen(port, () => {
      console.log(`Server rodando em http://localhost:${port}`);
      resolve(server);
    });
  });
}

async function main() {
  const PORT = 5179;
  const server = await serveStatic(PORT);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1080 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  try {
    console.log(`Navegando para http://localhost:${PORT}/inteligencia...`);
    await page.goto(`http://localhost:${PORT}/inteligencia`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);

    const hubScreenshotPath = path.join(ARTIFACT_DIR, "hub_unificado_preview.png");
    await page.screenshot({ path: hubScreenshotPath, fullPage: true });
    console.log(`Saved: ${hubScreenshotPath}`);

  } catch (error) {
    console.error("Erro ao capturar preview:", error);
  } finally {
    await browser.close();
    server.close();
    console.log("Processo finalizado.");
  }
}

main();
