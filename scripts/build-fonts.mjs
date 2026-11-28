#!/usr/bin/env node
// Writes dist/fonts.css and dist/fonts/: the seven @font-face rules the text styles need (families,
// weights and styles from tokens/font-stacks.json), with the woff2 files and each package's licence
// copied out of the @fontsource dependencies. The URLs are relative to fonts.css, so a consumer's
// bundler emits the files with no configuration. Also checks that each @fontsource family name is
// the first name in the token's stack, or the token's font-family would fall through to a fallback.
import fs from "node:fs";
import path from "node:path";
import { ROOT, FILES, parseJson } from "./lib/tokens.mjs";

const stacks = parseJson(fs.readFileSync(path.join(ROOT, FILES.stacks), "utf8"), FILES.stacks);
const dist = path.join(ROOT, "dist");
const dest = path.join(dist, "fonts");
fs.rmSync(dest, { recursive: true, force: true });
const faces = [];
let copied = 0;
for (const [token, font] of Object.entries(stacks)) {
  const pkgDir = path.join(ROOT, "node_modules", font.package);
  if (!fs.existsSync(pkgDir)) {
    console.error(`✗ ${token}: package ${font.package} is not installed. Run npm install.`);
    process.exit(1);
  }
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
    faces.push(`@font-face {\n  font-family: "${font.stack[0]}";\n  font-style: ${style};\n  font-weight: ${weight};\n  font-display: swap;\n  src: url("./fonts/${short}/${name}") format("woff2");\n}`);
  }
  // Always written with an extension: static hosts map extension-less paths to .html pages.
  for (const lic of ["LICENSE", "LICENSE.md", "LICENSE.txt"]) {
    if (fs.existsSync(path.join(pkgDir, lic))) {
      fs.copyFileSync(path.join(pkgDir, lic), path.join(out, "LICENSE.txt"));
      break;
    }
  }
}
fs.writeFileSync(
  path.join(dist, "fonts.css"),
  `/**\n * Do not edit directly, this file was auto-generated.\n * The five families at the weights the text styles use: woff2, Latin subset, font-display swap.\n * Optional: import it once, or load the fonts your own way. The family names match the token stacks.\n * Files and licences are in ./fonts/.\n */\n\n${faces.join("\n")}\n`,
);
console.log(`✓ built dist/fonts.css (${faces.length} faces) and dist/fonts/ (${copied} files with licences)`);
