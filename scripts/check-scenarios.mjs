#!/usr/bin/env node
// Every token named in content/scenarios.json must exist in dist/tokens.json, as a token or as a
// group of tokens (status/working covers status/working/fill, text and subtle). A renamed role
// fails the build here rather than going stale on the page. Runs after tokens:build.
import fs from "node:fs";
import path from "node:path";
import { ROOT } from "./lib/tokens.mjs";

const tokens = JSON.parse(fs.readFileSync(path.join(ROOT, "dist", "tokens.json"), "utf8")).tokens;
const scenarios = JSON.parse(fs.readFileSync(path.join(ROOT, "content", "scenarios.json"), "utf8"));
const paths = new Set(tokens.map((t) => t.path));

/** "text/primary" → the token path it names, trying the colour prefix too; null if nothing matches. */
export function resolveScenarioToken(name) {
  for (const candidate of [name, `color/${name}`]) {
    const p = candidate.replace(/\//g, ".");
    if (paths.has(p)) return p;
    if ([...paths].some((x) => x.startsWith(p + "."))) return p;
  }
  return null;
}

const problems = [];
let refs = 0;
for (const [page, rows] of Object.entries(scenarios)) {
  if (page.startsWith("_")) continue;
  rows.forEach((row, i) => {
    if (!row.when || !Array.isArray(row.use)) problems.push(`${page} row ${i + 1}: needs "when" and a "use" list.`);
    for (const part of row.use ?? []) {
      if (part.token === undefined) continue;
      refs++;
      if (!resolveScenarioToken(part.token)) problems.push(`${page}: "${row.when}" names ${part.token}, which is not a token or a group of tokens.`);
    }
  });
}
if (problems.length) {
  console.error(`✗ ${problems.length} scenario problem${problems.length === 1 ? "" : "s"}:`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log(`✓ scenarios: ${refs} token references across ${Object.keys(scenarios).filter((k) => !k.startsWith("_")).length} pages all resolve`);
