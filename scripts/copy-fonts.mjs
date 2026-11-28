#!/usr/bin/env node
// Before the site builds: copy dist/fonts/ (written by scripts/build-fonts.mjs) into site/public/fonts/,
// which is gitignored, so the licence links on the Typography page resolve. The site loads the faces
// themselves through dist/fonts.css.
import fs from "node:fs";
import path from "node:path";
import { ROOT } from "./lib/tokens.mjs";

const from = path.join(ROOT, "dist", "fonts");
const dest = path.join(ROOT, "site", "public", "fonts");
if (!fs.existsSync(from)) {
  console.error("✗ dist/fonts does not exist; run `npm run fonts:build` first.");
  process.exit(1);
}
fs.rmSync(dest, { recursive: true, force: true });
fs.cpSync(from, dest, { recursive: true });
const count = fs.readdirSync(from, { recursive: true }).filter((f) => String(f).endsWith(".txt")).length;
console.log(`✓ copied dist/fonts/ to site/public/fonts/ (${count} licences)`);
