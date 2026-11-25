#!/usr/bin/env node
// npm run tokens:build — Style Dictionary builds dist/tokens.css, tokens.js and tokens.d.ts from
// tokens/; this script adds the mode blocks to tokens.css, a tokens.<mode>.js/.d.ts per mode, and
// dist/tokens.json (resolved values, descriptions, contrast ratios).
// The checks run first so dist/ never holds output from a broken token set.
import fs from "node:fs";
import path from "node:path";
import StyleDictionary from "style-dictionary";
import { ROOT, PREFIX, FILES, loadTokens, checkTokens, resolvedJson, listModeFiles, cssName } from "./lib/tokens.mjs";

const data = loadTokens();
const checked = checkTokens(data);
if (checked.errors.length) {
  for (const e of checked.errors) console.error(`✗ ${e}`);
  console.error("\nNot building: fix the tokens (npm run tokens:check shows the full report).");
  process.exit(1);
}

const dist = path.join(ROOT, "dist");
fs.mkdirSync(dist, { recursive: true });
const abs = (f) => path.join(ROOT, f);
const quiet = { verbosity: "silent", warnings: "disabled" };

// Default mode: everything, with semantic properties referencing primitive ones.
const sd = new StyleDictionary({
  source: [abs(FILES.primitives), abs(FILES.semantic)],
  log: quiet,
  platforms: {
    css: {
      transformGroup: "css",
      prefix: PREFIX,
      buildPath: `${dist}/`,
      files: [{ destination: "tokens.css", format: "css/variables", options: { outputReferences: true } }],
    },
    js: {
      transformGroup: "js",
      prefix: PREFIX,
      buildPath: `${dist}/`,
      files: [
        { destination: "tokens.js", format: "javascript/es6" },
        { destination: "tokens.d.ts", format: "typescript/es6-declarations" },
      ],
    },
  },
});
await sd.hasInitialized;
await sd.buildAllPlatforms();

// Other modes. The CSS block is written here (Style Dictionary drops a reference whose target is
// outside the file being built, and every primitive lives in the default block above). JS and
// types come from Style Dictionary with the mode file's tokens only.
const modeFiles = listModeFiles();
let css = fs.readFileSync(path.join(dist, "tokens.css"), "utf8");
for (const { mode, file } of modeFiles) {
  const decls = data.list
    .filter((t) => t.tier === "semantic" && t.modes?.[mode])
    .map((t) => {
      const mv = t.modes[mode];
      const value = mv.alias ? `var(${cssName(mv.alias)})` : String(mv.resolved);
      return `  ${t.css}: ${value};${t.description ? ` /** ${t.description} */` : ""}`;
    })
    .join("\n");
  css +=
    `\n/* ${mode} mode: the same semantic tokens, re-aliased. Applied when the system prefers it and the page\n` +
    `   has set no data-theme, or whenever the page sets data-theme="${mode}". */\n` +
    `@media (prefers-color-scheme: ${mode}) {\n  :root:not([data-theme]) {\n${decls.replace(/^/gm, "  ")}\n  }\n}\n\n` +
    `:root[data-theme="${mode}"] {\n${decls}\n}\n`;

  const sdMode = new StyleDictionary({
    source: [abs(FILES.primitives), abs(file)],
    log: quiet,
    platforms: {
      js: {
        transformGroup: "js",
        prefix: PREFIX,
        buildPath: `${dist}/`,
        files: [
          { destination: `tokens.${mode}.js`, format: "javascript/es6", filter: (t) => t.filePath === abs(file) },
          { destination: `tokens.${mode}.d.ts`, format: "typescript/es6-declarations", filter: (t) => t.filePath === abs(file) },
        ],
      },
    },
  });
  await sdMode.hasInitialized;
  await sdMode.buildAllPlatforms();
}
fs.writeFileSync(path.join(dist, "tokens.css"), css);

const { version } = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
fs.writeFileSync(path.join(dist, "tokens.json"), JSON.stringify(resolvedJson(data, checked, { version }), null, 2) + "\n");

const modesNote = modeFiles.length ? `, modes: default + ${modeFiles.map((m) => m.mode).join(", ")}` : "";
console.log(`✓ built dist/tokens.css, tokens.js, tokens.d.ts, tokens.json (${data.list.length} tokens${modesNote}, v${version})`);
