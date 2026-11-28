#!/usr/bin/env node
// npm run tokens:build — Style Dictionary builds dist/tokens.css, tokens.js and tokens.d.ts; this
// script adds the mode blocks and the text-style variables to tokens.css, writes text-styles.css
// (one utility class per style), tokens.<mode>.js/.d.ts per mode, and tokens.json.
// The checks run first so dist/ never holds output from a broken token set.
import fs from "node:fs";
import path from "node:path";
import StyleDictionary from "style-dictionary";
import { ROOT, PREFIX, BASES, DEFAULT_MODE, loadTokens, checkTokens, resolvedJson, listModeFiles, cssName, cssValue, className, typographyProps, parseJson, modeMedia, alphaOf } from "./lib/tokens.mjs";
import { MODE_CSS } from "./lib/modes.mjs";

// Every stylesheet in the package opens with the same layer order, so the order holds whichever file a
// consumer imports first: base (page defaults) sits below components, and the consumer's own unlayered
// CSS beats both. tokens.css stays unlayered: custom properties only, nothing to override.
const LAYERS = "@layer tokens, base, components;";

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
  filter: (token, options) =>
    (options.usesDtcg ? token.$type : token.type) === "dimension" &&
    typeof (options.usesDtcg ? token.$value : token.value)?.value === "number" &&
    (options.usesDtcg ? token.$value : token.value).unit === "px" &&
    !token.$extensions?.["com.holotekt.keepPx"],
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
const nodeAt = (p) => p.split(".").reduce((n, seg) => n[seg], merged);
for (const t of data.list) {
  if (t.type === "fontFamily" && data.stacks[t.path]) nodeAt(t.path).$value = data.stacks[t.path].stack;
  if (t.keepPx) nodeAt(t.path).$extensions = { ...(nodeAt(t.path).$extensions ?? {}), "com.holotekt.keepPx": true };
}

// Composite text styles and translucent colours are written by this script, not by Style Dictionary:
// the styles as six properties each, the colours as rgb(r g b / a) in both the default and mode blocks.
const isAlphaColor = (t) => t.type === "color" && alphaOf(t.resolved) < 1;
const ownDeclarations = new Set(data.list.filter(isAlphaColor).map((t) => t.path));
const notComposite = (token, options) => (options.usesDtcg ? token.$type : token.type) !== "typography" && !ownDeclarations.has(token.path.join("."));
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

// Translucent colours, in the default block.
const alphaColors = data.list.filter(isAlphaColor);
if (alphaColors.length) {
  const decls = alphaColors.map((t) => `  ${t.css}: ${cssValue("color", t.resolved)};${t.description ? ` /** ${t.description} */` : ""}`).join("\n");
  css += `\n/* Colours with alpha. */\n:root {\n${decls}\n}\n`;
}

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
      const value = mv.alias ? `var(${cssName(mv.alias)})` : cssValue(t.type, t.resolvedIn[mode], data.stacks, t.path, { keepPx: t.keepPx });
      return `  ${t.css}: ${value};${t.description ? ` /** ${t.description} */` : ""}`;
    })
    .join("\n");
  if (rule.kind === "scheme") {
    css +=
      `\n/* ${mode} mode: the same tokens, re-aliased. Applied when the system prefers it and the page has set\n   no data-theme, or whenever the page sets data-theme="${mode}". */\n` +
      `@media (prefers-color-scheme: ${mode}) {\n  :root:not([data-theme]) {\n${decls.replace(/^/gm, "  ")}\n  }\n}\n\n:root[data-theme="${mode}"] {\n${decls}\n}\n`;
  } else {
    const media = modeMedia(mode, data.byPath);
    const from = rule.mediaFrom ? ` (${rule.mediaFrom.token})` : "";
    css += `\n/* ${mode}: the same tokens, re-aliased, inside ${media}${from}. */\n@media ${media} {\n  :root {\n${decls.replace(/^/gm, "  ")}\n  }\n}\n`;
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
  fs.writeFileSync(path.join(dist, "text-styles.css"), `/**\n * Do not edit directly, this file was auto-generated.\n * One class per text style; every value comes from tokens.css.\n */\n\n${LAYERS}\n\n@layer components {\n${classes}\n}\n`);
}

// Utilities: ready-made classes built from tokens, so consumers do not rebuild them.
// The dotted grid is the default page background (B-055). Its dot diameter has no token yet; it
// is the one constant here, kept in one place.
const DOT_DIAMETER_PX = 2.5;
const grid = data.byPath.get("color.surface.dot") && data.byPath.get("layout.grid.dot-pitch");
if (grid) {
  const r = DOT_DIAMETER_PX / 2;
  fs.writeFileSync(
    path.join(dist, "utilities.css"),
    `/**\n * Do not edit directly, this file was auto-generated.\n * Ready-made classes built from the tokens.\n */\n\n${LAYERS}\n\n@layer components {\n` +
      `  /* The default page background: surface/page with dots in surface/dot at the grid's dot pitch.\n     Decoration, not elevation; surfaces are plain fills and cover the dots. */\n` +
      `  .ht-page-grid {\n    background-color: var(--ht-color-surface-page);\n    background-image: radial-gradient(circle, var(--ht-color-surface-dot) ${r}px, transparent ${r + 0.25}px);\n` +
      `    background-size: var(--ht-layout-grid-dot-pitch) var(--ht-layout-grid-dot-pitch);\n    background-position: calc(var(--ht-layout-grid-dot-pitch) / 2) calc(var(--ht-layout-grid-dot-pitch) / 2);\n  }\n}\n`,
  );
}

// The grid declarations, shared by .ht-page-grid and the base's html rule.
const gridDecls = grid
  ? `background-color: var(--ht-color-surface-page);\n  background-image: radial-gradient(circle, var(--ht-color-surface-dot) ${DOT_DIAMETER_PX / 2}px, transparent ${DOT_DIAMETER_PX / 2 + 0.25}px);\n  background-size: var(--ht-layout-grid-dot-pitch) var(--ht-layout-grid-dot-pitch);\n  background-position: calc(var(--ht-layout-grid-dot-pitch) / 2) calc(var(--ht-layout-grid-dot-pitch) / 2);`
  : `background-color: var(--ht-color-surface-page);`;

// base.css: optional page defaults in the base layer, every value a token. Opt-in; nothing in the
// package depends on it; a consumer's own rules win without a specificity fight.
const style = (name) => `font-family: var(--ht-${name}-font-family);\n  font-size: var(--ht-${name}-font-size);\n  font-weight: var(--ht-${name}-font-weight);\n  line-height: var(--ht-${name}-line-height);\n  letter-spacing: var(--ht-${name}-letter-spacing);\n  text-transform: var(--ht-${name}-text-transform);`;
const has = (p) => data.byPath.has(p);
const base = [];
base.push(`/**\n * Do not edit directly, this file was auto-generated.\n * Optional page defaults, in the base layer: the grid on html, text on body, links, focus, selection, hr,\n * and .ht-prose for ordinary article markup. Nothing else in the package depends on this file, and any\n * rule a site writes outside a layer overrides it.\n */\n\n${LAYERS}\n\n@layer base {`);
base.push(`  :root {\n    color-scheme: light dark;\n  }`);
base.push(`  html {\n    ${gridDecls.replace(/\n  /g, "\n    ")}\n    min-height: 100%;\n  }`);
if (has("ui.body")) base.push(`  body {\n    margin: 0;\n    color: var(--ht-color-text-primary);\n    ${style("ui-body").replace(/\n  /g, "\n    ")}\n  }`);
if (has("color.text.link")) base.push(`  a {\n    color: var(--ht-color-text-link);\n    text-decoration: underline;\n  }\n  a:hover {\n    color: var(--ht-color-text-link-hover, var(--ht-color-text-link));\n  }`);
if (has("color.border.focus")) base.push(`  :focus-visible {\n    outline: var(--ht-border-width-thick) solid var(--ht-color-border-focus);\n    outline-offset: var(--ht-space-50);\n  }`);
if (has("color.accent.subtle")) base.push(`  ::selection {\n    background: var(--ht-color-accent-subtle);\n    color: var(--ht-color-text-primary);\n  }`);
if (has("color.border.divider")) base.push(`  hr {\n    border: 0;\n    border-top: var(--ht-border-width-thin) solid var(--ht-color-border-divider);\n    margin: var(--ht-space-600) 0;\n  }`);
if (has("heading.1") && has("reading.body")) {
  base.push(`  /* Ordinary article markup. Outside .ht-prose, headings and paragraphs are not touched. */`);
  base.push(`  .ht-prose {\n    max-width: var(--ht-layout-width-reading);\n    color: var(--ht-color-text-primary);\n  }`);
  for (const n of [1, 2, 3, 4]) if (has(`heading.${n}`)) base.push(`  .ht-prose h${n} {\n    ${style(`heading-${n}`).replace(/\n  /g, "\n    ")}\n    margin: var(--ht-space-600) 0 var(--ht-space-300);\n  }`);
  base.push(`  .ht-prose :is(h1, h2, h3, h4):first-child {\n    margin-top: 0;\n  }`);
  base.push(`  .ht-prose :is(p, ul, ol, blockquote) {\n    ${style("reading-body").replace(/\n  /g, "\n    ")}\n    margin: 0 0 var(--ht-space-400);\n  }`);
  base.push(`  .ht-prose :is(ul, ol) {\n    padding-left: var(--ht-space-500);\n  }\n  .ht-prose li + li {\n    margin-top: var(--ht-space-100);\n  }`);
  base.push(`  .ht-prose blockquote {\n    color: var(--ht-color-text-secondary);\n    border-left: var(--ht-border-width-thick) solid var(--ht-color-border-divider);\n    padding-left: var(--ht-space-400);\n  }`);
  base.push(`  .ht-prose :is(h1, h2, h3, h4, p, ul, ol, blockquote):last-child {\n    margin-bottom: 0;\n  }`);
}
base.push("}");
fs.writeFileSync(path.join(dist, "base.css"), base.join("\n") + "\n");

// all.css: the four stylesheets in one import. A shortcut only; base.css and fonts.css stay opt-in.
fs.writeFileSync(path.join(dist, "all.css"), `/**\n * Do not edit directly, this file was auto-generated.\n * Tokens, text styles, utilities and components in one import. base.css and fonts.css are separate, by choice.\n */\n\n${LAYERS}\n\n@import "./tokens.css";\n@import "./text-styles.css";\n@import "./utilities.css";\n@import "./components.css";\n`);

const { version } = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
fs.writeFileSync(path.join(dist, "tokens.json"), JSON.stringify(resolvedJson(data, checked, { version }), null, 2) + "\n");

const modesNote = data.modeNames.length ? `, modes: ${DEFAULT_MODE} + ${data.modeNames.join(", ")}` : "";
console.log(`✓ built dist/tokens.css${styles.length ? ", text-styles.css" : ""}${grid ? ", utilities.css" : ""}, base.css, all.css, tokens.js, tokens.d.ts, tokens.json (${data.list.length} tokens${modesNote}, v${version})`);
