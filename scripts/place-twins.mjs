#!/usr/bin/env node
// After `next build site`: move the exported Markdown twins from site/out/md-twins/ to their public
// paths (site/out/foundations/color.md …). See site/app/md-twins/[...path]/route.ts for why.
import fs from "node:fs";
import path from "node:path";
import { ROOT } from "./lib/tokens.mjs";

const out = path.join(ROOT, "site", "out");
const staged = path.join(out, "md-twins");
if (!fs.existsSync(staged)) {
  console.error("✗ site/out/md-twins does not exist; run `next build site` first.");
  process.exit(1);
}
let moved = 0;
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const from = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(from);
    else if (entry.name.endsWith(".md")) {
      const to = path.join(out, path.relative(staged, from));
      fs.mkdirSync(path.dirname(to), { recursive: true });
      fs.renameSync(from, to);
      moved++;
    }
  }
};
walk(staged);
fs.rmSync(staged, { recursive: true, force: true });
console.log(`✓ placed ${moved} Markdown twins in site/out/`);
