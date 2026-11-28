#!/usr/bin/env node
// Builds the components: compiles src/components to dist/components (JS + .d.ts), copies the
// stylesheet to dist/components.css, and writes dist/components.json, which the docs site reads:
// each component's description and props (from the TypeScript types and JSDoc), its atomic level
// and parts (src/components/levels.json) and the tokens its CSS uses. A var(--ht-…) that is not a
// published token fails the build, and so does a component importing a sibling at its own level or
// above, or one that levels.json does not list under "madeOf".
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import ts from "typescript";
import { ROOT } from "./lib/tokens.mjs";

const SRC = path.join(ROOT, "src", "components");
const DIST = path.join(ROOT, "dist");
const tokensFile = path.join(DIST, "tokens.json");
if (!fs.existsSync(tokensFile)) {
  console.error("✗ dist/tokens.json does not exist; run `npm run tokens:build` first.");
  process.exit(1);
}
const tokenData = JSON.parse(fs.readFileSync(tokensFile, "utf8"));
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));

// 1. Compile.
execFileSync(path.join(ROOT, "node_modules", ".bin", "tsc"), ["-p", path.join(ROOT, "tsconfig.json")], { stdio: "inherit" });

// 2. The stylesheet.
const css = fs.readFileSync(path.join(SRC, "components.css"), "utf8");
fs.writeFileSync(path.join(DIST, "components.css"), css);

// 3. Props and descriptions from the types.
const files = fs.readdirSync(SRC).filter((f) => /^[A-Z]\w*\.tsx$/.test(f) && !f.endsWith(".stories.tsx"));
const program = ts.createProgram(files.map((f) => path.join(SRC, f)), { jsx: ts.JsxEmit.ReactJSX, strict: true, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler });
const checker = program.getTypeChecker();
/** The JSDoc comment on a named declaration (a prop, a function), as one line. */
const doc = (nameNode) => {
  const sym = checker.getSymbolAtLocation(nameNode);
  const text = sym ? ts.displayPartsToString(sym.getDocumentationComment(checker)) : "";
  return text.replace(/\s+/g, " ").trim();
};
const literalMembers = (type) => {
  if (ts.isTypeLiteralNode(type)) return type.members;
  if (ts.isIntersectionTypeNode(type)) return type.types.flatMap(literalMembers);
  return [];
};
const registry = JSON.parse(fs.readFileSync(path.join(SRC, "levels.json"), "utf8"));
const rank = Object.fromEntries(registry.levels.map((l, i) => [l.id, i]));
const levelProblems = [];
for (const name of Object.keys(registry.components)) {
  if (!files.includes(`${name}.tsx`)) levelProblems.push(`levels.json lists ${name}, but src/components/${name}.tsx does not exist`);
}
const components = [];
for (const file of files) {
  const sf = program.getSourceFile(path.join(SRC, file));
  const name = file.replace(/\.tsx$/, "");
  let description = "";
  let propsType;
  const defaults = {};
  ts.forEachChild(sf, (node) => {
    if (ts.isTypeAliasDeclaration(node) && node.name.text === `${name}Props`) propsType = node.type;
    if (ts.isFunctionDeclaration(node) && node.name?.text === name) {
      description = doc(node.name);
      const param = node.parameters[0];
      if (param && ts.isObjectBindingPattern(param.name)) {
        for (const el of param.name.elements) {
          if (el.initializer) defaults[(el.propertyName ?? el.name).getText(sf)] = el.initializer.getText(sf);
        }
      }
    }
  });
  if (!propsType) {
    console.error(`✗ ${file}: no exported type ${name}Props`);
    process.exit(1);
  }
  const props = literalMembers(propsType)
    .filter((m) => ts.isPropertySignature(m) && m.type)
    .map((m) => {
      const propName = ts.isStringLiteral(m.name) ? m.name.text : m.name.getText(sf);
      const description = doc(m.name);
      if (!description) {
        console.error(`✗ ${file}: prop ${propName} has no doc comment`);
        process.exit(1);
      }
      return { name: propName, type: m.type.getText(sf), required: !m.questionToken, default: defaults[propName], description };
    });
  // The rest of an intersection (e.g. the element's own attributes) is noted, not listed.
  const extra = ts.isIntersectionTypeNode(propsType) ? propsType.types.filter((t) => !ts.isTypeLiteralNode(t)).map((t) => t.getText(sf)) : [];
  // Atomic level and import direction: a component may import only siblings from a lower level,
  // and only the ones levels.json says it is made of.
  const reg = registry.components[name];
  const imports = [...sf.text.matchAll(/from\s+["']\.\/([A-Z]\w*)["']/g)].map((m) => m[1]);
  if (!reg) levelProblems.push(`${name} is not in src/components/levels.json`);
  else {
    if (rank[reg.level] === undefined) levelProblems.push(`${name}: unknown level "${reg.level}"`);
    for (const imp of imports) {
      const other = registry.components[imp];
      if (!other) { levelProblems.push(`${name} imports ${imp}, which is not in levels.json`); continue; }
      if (rank[other.level] >= rank[reg.level]) levelProblems.push(`${name} (${reg.level}) imports ${imp} (${other.level}); a component may only use levels below its own`);
      if (!reg.madeOf.includes(imp)) levelProblems.push(`${name} imports ${imp}, but levels.json does not list it under madeOf`);
    }
    for (const part of reg.madeOf) {
      const other = registry.components[part];
      if (!other) levelProblems.push(`${name}: madeOf names ${part}, which is not in levels.json`);
      else if (rank[other.level] >= rank[reg.level]) levelProblems.push(`${name} (${reg.level}) is made of ${part} (${other.level}); parts must be from a lower level`);
    }
  }
  components.push({ name, file: `src/components/${file}`, description, props, extra, level: reg?.level, title: reg?.title, slug: reg?.slug, summary: reg?.summary, madeOf: reg?.madeOf ?? [], imports });
}
// Story titles must be literal for Storybook's indexer, so each stories file states its own
// "Level/Title" and this check keeps it equal to levels.json.
for (const c of components) {
  const storiesFile = path.join(SRC, `${c.name}.stories.tsx`);
  if (!fs.existsSync(storiesFile)) { levelProblems.push(`${c.name} has no stories file (${c.name}.stories.tsx)`); continue; }
  const level = registry.levels.find((l) => l.id === c.level);
  const expected = level ? `${level.plural}/${c.title}` : "";
  const m = fs.readFileSync(storiesFile, "utf8").match(/\btitle:\s*["'`]([^"'`]+)["'`]/);
  if (!m) levelProblems.push(`${c.name}.stories.tsx has no literal title; expected "${expected}"`);
  else if (m[1] !== expected) levelProblems.push(`${c.name}.stories.tsx title is "${m[1]}"; levels.json says "${expected}"`);
}
if (levelProblems.length) {
  console.error(`✗ component levels:\n  ${levelProblems.join("\n  ")}`);
  process.exit(1);
}

// 4. Tokens used, from the CSS, attributed to the component whose class is the selector's subject.
const byClass = [
  ["ht-thumbnail-row", "ThumbnailRow"],
  ["ht-thumbnail-list", "ThumbnailList"],
  ["ht-thumbnail", "Thumbnail"],
  ["ht-card", "Card"],
  ["ht-divider", "Divider"],
];
const componentFor = (selector) => {
  const classes = [...selector.matchAll(/\.(ht-[a-z0-9-]+)/g)].map((m) => m[1]);
  const subject = classes[classes.length - 1] ?? "";
  const hit = byClass.find(([cls]) => subject === cls || subject.startsWith(`${cls}__`) || subject.startsWith(`${cls}--`));
  return hit?.[1];
};
const cssVar = new Map();
for (const t of tokenData.tokens) cssVar.set(t.css, t.path);
const styleTokens = tokenData.tokens.filter((t) => t.type === "typography");
const tokenFor = (v) => {
  if (cssVar.has(v)) return cssVar.get(v);
  const style = styleTokens.find((t) => v.startsWith(`${t.css}-`));
  return style?.path;
};
const internal = new Set([...css.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]));
const used = new Map(components.map((c) => [c.name, new Set()]));
const classes = new Map(components.map((c) => [c.name, new Set()]));
const problems = [];
const walk = (text) => {
  let i = 0;
  while (i < text.length) {
    const open = text.indexOf("{", i);
    if (open === -1) break;
    let depth = 1, j = open + 1;
    while (j < text.length && depth) { if (text[j] === "{") depth++; else if (text[j] === "}") depth--; j++; }
    const selector = text.slice(i, open).replace(/\/\*[\s\S]*?\*\//g, "").trim();
    const body = text.slice(open + 1, j - 1);
    if (selector.startsWith("@")) walk(body);
    else {
      const comp = componentFor(selector);
      if (!comp) problems.push(`no component owns the selector "${selector}"`);
      else {
        for (const m of selector.matchAll(/\.(ht-[a-z0-9_-]+)/g)) classes.get(comp).add(m[1]);
        for (const m of body.matchAll(/var\(\s*(--[\w-]+)/g)) {
          const v = m[1];
          if (internal.has(v)) continue;
          const p = tokenFor(v);
          if (!p) problems.push(`${comp}: ${v} is not a published token`);
          else used.get(comp).add(p);
        }
      }
    }
    i = j;
  }
};
walk(css);
if (problems.length) {
  console.error(`✗ components:\n  ${problems.join("\n  ")}`);
  process.exit(1);
}
for (const c of components) {
  c.tokens = [...used.get(c.name)].sort();
  c.classes = [...classes.get(c.name)].sort();
  c.composes = c.madeOf; // kept for readers of the v0.6.0 shape
}
// Atoms first, then molecules, then organisms; alphabetical within a level.
components.sort((a, b) => rank[a.level] - rank[b.level] || a.name.localeCompare(b.name));
fs.writeFileSync(path.join(DIST, "components.json"), JSON.stringify({ name: pkg.name, version: pkg.version, generatedAt: new Date().toISOString(), entry: "holotekt-design-system/components", stylesheet: "holotekt-design-system/components.css", levels: registry.levels, above: registry.above, components }, null, 2) + "\n");
const tokenCount = new Set(components.flatMap((c) => c.tokens)).size;
console.log(`✓ built dist/components/ (${components.length} components: ${registry.levels.map((l) => `${components.filter((c) => c.level === l.id).length} ${l.plural.toLowerCase()}`).join(", ")}; imports only go downwards), components.css, components.json (${components.reduce((n, c) => n + c.props.length, 0)} props, ${tokenCount} tokens used, all published)`);
