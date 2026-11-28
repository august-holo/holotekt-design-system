#!/usr/bin/env node
// Before the site builds: copy the self-hosted font files (woff2, Latin subset, only the files the
// system uses) and each package's licence from node_modules into site/public/fonts/, which is
// gitignored. tokens/font-stacks.json says which packages and files.
import fs from "node:fs";
import path from "node:path";
import { ROOT, FILES, parseJson } from "./lib/tokens.mjs";

const stacks = parseJson(fs.readFileSync(path.join(ROOT, FILES.stacks), "utf8"), FILES.stacks);
const dest = path.join(ROOT, "site", "public", "fonts");
fs.rmSync(dest, { recursive: true, force: true });
let copied = 0;
for (const [token, font] of Object.entries(stacks)) {
  const pkgDir = path.join(ROOT, "node_modules", font.package);
  if (!fs.existsSync(pkgDir)) {
    console.error(`✗ ${token}: package ${font.package} is not installed. Run npm install.`);
    process.exit(1);
  }
  // The family name a consumer gets from the @fontsource CSS must be the first name in the token stack,
  // or the token's font-family would fall through to the fallbacks.
  const metaFile = path.join(pkgDir, "metadata.json");
  if (fs.existsSync(metaFile)) {
    const family = JSON.parse(fs.readFileSync(metaFile, "utf8")).family;
    if (family !== font.stack[0]) {
      console.error(`✗ ${token}: ${font.package} declares the family "${family}" but the token stack starts with "${font.stack[0]}".`);
      process.exit(1);
    }
  }
  const short = font.package.split("/").pop();
  const out = path.join(dest, short);
  fs.mkdirSync(out, { recursive: true });
  for (const spec of font.files) {
    const [weight, style = "normal"] = spec.split(/\s+/);
    const name = `${short}-latin-${weight}-${style}.woff2`;
    const from = path.join(pkgDir, "files", name);
    if (!fs.existsSync(from)) {
      console.error(`✗ ${token}: ${font.package} has no file ${name}.`);
      process.exit(1);
    }
    fs.copyFileSync(from, path.join(out, name));
    copied++;
  }
  // Always written with an extension: the CDN maps extension-less paths to .html pages.
  for (const lic of ["LICENSE", "LICENSE.md", "LICENSE.txt"]) {
    if (fs.existsSync(path.join(pkgDir, lic))) {
      fs.copyFileSync(path.join(pkgDir, lic), path.join(out, "LICENSE.txt"));
      break;
    }
  }
}
console.log(`✓ copied ${copied} font files and their licences to site/public/fonts/`);
