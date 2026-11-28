#!/usr/bin/env node
// Opens the consumer fixture's static export in Chromium and checks what only a browser can: that the
// fixture's reset (in its own layer, declared first) loses to the system's layers, so a Card and a
// Button keep their padding. Run by scripts/check-consumer.sh after the fixture builds.
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { chromium } from "playwright";
import { ROOT } from "./lib/tokens.mjs";

const out = path.join(ROOT, "fixtures", "consumer", "out");
const types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".woff2": "font/woff2", ".svg": "image/svg+xml" };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (p.endsWith("/")) p += "index.html";
  else if (!path.basename(p).includes(".")) p += ".html";
  const file = path.join(out, p);
  if (!file.startsWith(out) || !fs.existsSync(file)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "content-type": types[path.extname(file)] ?? "application/octet-stream" });
  res.end(fs.readFileSync(file));
});
await new Promise((r) => server.listen(0, r));
const base = `http://localhost:${server.address().port}`;

// The built CSS must establish the consumer's layer first.
const css = fs.readdirSync(path.join(out, "_next", "static"), { recursive: true }).filter((f) => String(f).endsWith(".css")).map((f) => fs.readFileSync(path.join(out, "_next", "static", String(f)), "utf8")).join("\n");
const firstLayer = css.match(/@layer\s+([a-z, ]+);/);
const problems = [];
if (!firstLayer || !firstLayer[1].trim().startsWith("reset")) problems.push(`the first layer statement in the built CSS is ${firstLayer ? `"@layer ${firstLayer[1]};"` : "missing"}; expected it to begin with reset`);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.goto(`${base}/`, { waitUntil: "load" });
const m = await page.evaluate(() => {
  const cs = (el) => getComputedStyle(el);
  const card = document.querySelector(".ht-card");
  const button = document.querySelector("button.ht-button");
  const row = document.querySelector(".ht-thumbnail-row");
  return {
    cardPadding: card && cs(card.querySelector(".ht-card__surface") ?? card).paddingLeft,
    buttonPadding: button && cs(button).paddingLeft + " " + cs(button).paddingTop,
    rowPadding: row && cs(row).paddingLeft,
    resetApplied: cs(document.body).margin === "0px" && cs(document.querySelector("main")).padding === "0px",
  };
});
// Layout: at phone width the card's visible box (surface plus offset) stays inside its layout box with equal
// space on both sides; the gap under a card is the same with the offset on and off; the first thumbnail
// lines up with the heading above the list; nothing scrolls sideways.
const layout = await page.evaluate(() => {
  const r = (el) => el.getBoundingClientRect();
  const main = r(document.querySelector("main"));
  const on = document.querySelector("#card-on"), off = document.querySelector("#card-off");
  const onSurface = on.querySelector(".ht-card__surface");
  const offsetPx = parseFloat(getComputedStyle(onSurface).boxShadow.match(/(\d+(?:\.\d+)?)px/)?.[1] ?? "0");
  const gapUnder = (card) => r(card.nextElementSibling).top - r(card).bottom;
  const heading = document.querySelector("main h2");
  const thumb = document.querySelector(".ht-thumbnail-row .ht-thumbnail");
  return {
    leftSpace: r(on).left - main.left,
    rightSpace: main.right - (r(onSurface).right + offsetPx),
    visualInsideBox: r(onSurface).right + offsetPx <= r(on).right + 0.5 && r(onSurface).bottom + offsetPx <= r(on).bottom + 0.5,
    gapOn: gapUnder(on),
    gapOff: gapUnder(off),
    thumbLeft: r(thumb).left,
    headingLeft: r(heading).left,
    scrollWidth: document.scrollingElement.scrollWidth,
    innerWidth,
  };
});
if (Math.abs(layout.leftSpace - layout.rightSpace) > 0.5) problems.push(`card: space on the left is ${layout.leftSpace}px and on the right ${layout.rightSpace}px at phone width; expected equal`);
if (!layout.visualInsideBox) problems.push("card: the offset is drawn outside the card's layout box");
if (Math.abs(layout.gapOn - layout.gapOff) > 0.5) problems.push(`card: the gap under a card is ${layout.gapOn}px with the offset on and ${layout.gapOff}px with it off; expected equal`);
if (Math.abs(layout.thumbLeft - layout.headingLeft) > 0.5) problems.push(`list: the first thumbnail starts at ${layout.thumbLeft}px but the heading at ${layout.headingLeft}px`);
if (layout.scrollWidth > layout.innerWidth) problems.push(`the page scrolls sideways at phone width (${layout.scrollWidth} > ${layout.innerWidth})`);
if (m.cardPadding !== "24px") problems.push(`Card padding is ${m.cardPadding}, expected 24px (inset/lg) with the reset present`);
if (m.buttonPadding !== "24px 12px") problems.push(`Button padding is ${m.buttonPadding}, expected 24px 12px with the reset present`);
if (m.rowPadding !== "16px") problems.push(`ThumbnailRow padding is ${m.rowPadding}, expected 16px with the reset present`);
if (!m.resetApplied) problems.push("the reset itself did not apply (body margin or main padding is not 0)");
await browser.close();
server.close();
if (problems.length) {
  console.error(`✗ consumer fixture in the browser:\n  ${problems.join("\n  ")}`);
  process.exit(1);
}
console.log(`✓ consumer fixture in the browser: the reset layer comes first ("@layer ${firstLayer[1]};"), the system's padding survives it, the card reserves its offset (gap ${layout.gapOn}px on and off), the first thumbnail lines up with the heading, no sideways scroll at phone width`);
