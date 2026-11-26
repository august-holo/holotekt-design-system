#!/usr/bin/env node
// npm run tokens:build — Style Dictionary builds dist/tokens.css, tokens.js and tokens.d.ts; this
// script adds the mode blocks and the text-style variables to tokens.css, writes text-styles.css
// (one utility class per style), tokens.<mode>.js/.d.ts per mode, and tokens.json.
// The checks run first so dist/ never holds output from a broken token set.
import fs from "node:fs";
import path from "node:path";
import StyleDictionary from "style-dictionary";
import { ROOT, PREFIX, BASES, DEFAULT_MODE, loadTokens, checkTokens, resolvedJson, listModeFiles, cssName, cssValue, className, typographyProps, parseJson } from "./lib/tokens.mjs";
import { MODE_CSS } from "./lib/modes.mjs";

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
const baseFiles = BASES.filter((b) => fs.existsSync(abs(b.file))).map((b) => abs(b.file));

// px dimensions become rem so text follows the reader's browser setting.
StyleDictionary.registerTransform({
  name: "ht/px-to-rem",
  type: "value",
  filter: (token, options) => (options.usesDtcg ? token.$type : token.type) === "dimension" && typeof (options.usesDtcg ? token.$value : token.value)?.value === "number" && (options.usesDtcg ? token.$value : token.value).unit === "px",
  transform: (token, _platform, options) => `${Number(((options.usesDtcg ? token.$value : token.value).value / 16).toFixed(4))}rem`,
});
// Ahead of Style Dictionary's own size/rem, which would otherwise stringify the px value first.
const withRem = (group) => {
  const list = [...group];
  list.splice(Math.max(0, list.indexOf("size/rem")), 0, "ht/px-to-rem");
  return list;
};
const cssTransforms = withRem(StyleDictionary.hooks.transformGroups.css);
const jsTransforms = withRem(StyleDictionary.hooks.transformGroups.js);

// The default build reads a merged tree with the fallback stacks applied to the font families.
const merged = {};
const deepMerge = (into, from) => {
  for (const [k, v] of Object.entries(from)) {
    if (v && typeof v === "object" && !Array.isArray(v) && into[k] && typeof into[k] === "object") deepMerge(into[k], v);
    else into[k] = v;
  }
};
for (const f of baseFiles) deepMerge(merged, parseJson(fs.readFileSync(f, "utf8"), f));
for (const t of data.list) {
  if (t.type !== "fontFamily" || !data.stacks[t.path]) continue;
  let node = merged;
  for (const seg of t.path.split(".")) node = node[seg];
  node.$value = data.stacks[t.path].stack;
}

const notComposite = (token, options) => (options.usesDtcg ? token.$type : token.type) !== "typography";
const sd = new StyleDictionary({
  tokens: merged,
  log: quiet,
  platforms: {
    css: {
      transforms: cssTransforms,
      prefix: PREFIX,
      buildPath: `${dist}/`,
      // Composite text styles are written below as six properties each, not as a font shorthand.
      files: [{ destination: "tokens.css", format: "css/variables", filter: notComposite, options: { outputReferences: true } }],
    },
    js: {
      transforms: jsTransforms,
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

let css = fs.readFileSync(path.join(dist, "tokens.css"), "utf8");

// Text styles: six variables per style, in the default block.
const styles = data.list.filter((t) => t.tier === "style");
if (styles.length) {
  const decls = styles
    .flatMap((t) => {
      const props = typographyProps(t, data.stacks);
      return [t.description ? `  /* ${t.path}: ${t.description} */` : `  /* ${t.path} */`, ...Object.entries(props).filter(([, v]) => v !== undefined).map(([p, v]) => `  ${t.css}-${p}: ${v};`)];
    })
    .join("\n");
  css += `\n/* Text styles. Each one is also a class in text-styles.css. */\n:root {\n${decls}\n}\n`;
}

// Modes: the same tokens re-aliased; one block per mode, shaped by scripts/lib/modes.mjs.
const modeFiles = listModeFiles();
for (const { mode } of modeFiles.filter((m, i, arr) => arr.findIndex((x) => x.mode === m.mode) === i)) {
  const rule = MODE_CSS[mode];
  const decls = data.list
    .filter((t) => t.modes?.[mode])
    .map((t) => {
      const mv = t.modes[mode];
      const value = mv.alias ? `var(${cssName(mv.alias)})` : cssValue(t.type, t.resolvedIn[mode], data.stacks, t.path);
      return `  ${t.css}: ${value};${t.description ? ` /** ${t.description} */` : ""}`;
    })
    .join("\n");
  if (rule.kind === "scheme") {
    css +=
      `\n/* ${mode} mode: the same tokens, re-aliased. Applied when the system prefers it and the page has set\n   no data-theme, or whenever the page sets data-theme="${mode}". */\n` +
      `@media (prefers-color-scheme: ${mode}) {\n  :root:not([data-theme]) {\n${decls.replace(/^/gm, "  ")}\n  }\n}\n\n:root[data-theme="${mode}"] {\n${decls}\n}\n`;
  } else {
    css += `\n/* ${mode}: the same tokens, re-aliased, inside ${rule.media}. */\n@media ${rule.media} {\n  :root {\n${decls.replace(/^/gm, "  ")}\n  }\n}\n`;
  }
  const modeSources = modeFiles.filter((m) => m.mode === mode).map((m) => abs(m.file));
  const sdMode = new StyleDictionary({
    source: [...baseFiles, ...modeSources],
    log: quiet,
    platforms: {
      js: {
        transforms: jsTransforms,
        prefix: PREFIX,
        buildPath: `${dist}/`,
        files: [
          { destination: `tokens.${mode}.js`, format: "javascript/es6", filter: (t) => modeSources.includes(t.filePath) },
          { destination: `tokens.${mode}.d.ts`, format: "typescript/es6-declarations", filter: (t) => modeSources.includes(t.filePath) },
        ],
      },
    },
  });
  await sdMode.hasInitialized;
  await sdMode.buildAllPlatforms();
}
fs.writeFileSync(path.join(dist, "tokens.css"), css);

// One utility class per text style, in the components layer. Sizes follow the breakpoint variables.
if (styles.length) {
  const classes = styles
    .map((t) => {
      const props = typographyProps(t, data.stacks);
      const body = Object.keys(props).filter((p) => props[p] !== undefined).map((p) => `    ${p}: var(${t.css}-${p});`).join("\n");
      return `  /* ${t.description ?? t.path} */\n  .${className(t.path)} {\n${body}\n  }`;
    })
    .join("\n\n");
  fs.writeFileSync(path.join(dist, "text-styles.css"), `/**\n * Do not edit directly, this file was auto-generated.\n * One class per text style; every value comes from tokens.css.\n */\n\n@layer components {\n${classes}\n}\n`);
}

const { version } = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
fs.writeFileSync(path.join(dist, "tokens.json"), JSON.stringify(resolvedJson(data, checked, { version }), null, 2) + "\n");

const modesNote = data.modeNames.length ? `, modes: ${DEFAULT_MODE} + ${data.modeNames.join(", ")}` : "";
console.log(`✓ built dist/tokens.css${styles.length ? ", text-styles.css" : ""}, tokens.js, tokens.d.ts, tokens.json (${data.list.length} tokens${modesNote}, v${version})`);
