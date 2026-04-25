import type { Env } from "../types/env";

const BROWSER_API_BASE = "https://browser.ai.cloudflare.com/api/v1";

export async function generatePdfFromHtml(env: Env, html: string): Promise<Uint8Array> {
  if (!env.BROWSER) {
    throw new Error("Browser Rendering binding (env.BROWSER) not found.");
  }

  const response = await fetch(`${BROWSER_API_BASE}/pdf`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      html,
      options: {
        format: "A4",
        printBackground: true,
        margin: { top: "20mm", bottom: "20mm", left: "15mm", right: "15mm" },
      },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Quick Actions PDF failed: ${response.status} ${text}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}
