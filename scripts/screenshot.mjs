/// Renders the public pages at desktop and mobile widths so layout regressions
/// are visible in review. Requires the dev server to be running.

import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const OUT = process.env.OUT_DIR ?? "/tmp/shots";

const PAGES = [
  ["home", "/"],
  ["consultation", "/consultation"],
  ["research-cohort", "/programs/research-cohort"],
  ["ecosystem", "/programs/genai-ecosystem"],
  ["resources", "/resources"],
  ["about", "/about"],
];

mkdirSync(OUT, { recursive: true });

// Point at the browser this environment ships rather than the build the
// installed Playwright expects; override with CHROMIUM_PATH elsewhere.
const executablePath = process.env.CHROMIUM_PATH || undefined;
const browser = await chromium.launch(executablePath ? { executablePath } : {});

for (const [width, height, suffix] of [
  [1280, 900, "desktop"],
  [390, 844, "mobile"],
]) {
  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();
  for (const [name, path] of PAGES) {
    await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
    await page.screenshot({ path: `${OUT}/${name}-${suffix}.png`, fullPage: true });
    console.log(`${name}-${suffix}.png`);
  }
  await context.close();
}

await browser.close();
