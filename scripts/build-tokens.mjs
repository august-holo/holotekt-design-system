#!/usr/bin/env node
// npm run tokens:build — Style Dictionary builds dist/tokens.css, tokens.js and tokens.d.ts from
// tokens/; this script adds dist/tokens.json (resolved values, descriptions, contrast ratios).
// The checks run first so dist/ never holds output from a broken token set.
import fs from "node:fs";
import path from "node:path";
import StyleDictionary from "style-dictionary";
import { ROOT, PREFIX, FILES, loadTokens, checkTokens, resolvedJson } from "./lib/tokens.mjs";

const data = loadTokens();
const checked = checkTokens(data);
if (checked.errors.length) {
  for (const e of checked.errors) console.error(`✗ ${e}`);
  console.error("\nNot building: fix the tokens (npm run tokens:check shows the full report).");
  process.exit(1);
}

const dist = path.join(ROOT, "dist");
fs.mkdirSync(dist, { recursive: true });

const sd = new StyleDictionary({
  source: [FILES.primitives, FILES.semantic].map((f) => path.join(ROOT, f)),
  log: { verbosity: "silent", warnings: "disabled" },
  platforms: {
    css: {
      transformGroup: "css",
      prefix: PREFIX,
      buildPath: `${dist}/`,
      files: [
        {
          destination: "tokens.css",
          format: "css/variables",
          // Semantic properties reference the primitive property, so the alias survives into CSS.
          options: { outputReferences: true },
        },
      ],
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

const { version } = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
fs.writeFileSync(path.join(dist, "tokens.json"), JSON.stringify(resolvedJson(data, checked, { version }), null, 2) + "\n");

console.log(`✓ built dist/tokens.css, tokens.js, tokens.d.ts, tokens.json (${data.list.length} tokens, v${version})`);
