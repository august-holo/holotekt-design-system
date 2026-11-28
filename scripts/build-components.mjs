#!/usr/bin/env node
// Builds the components: compiles src/components to dist/components (JS + .d.ts), copies the
// stylesheet to dist/components.css, and writes dist/components.json, which the docs site reads:
// each component's description and props (from the TypeScript types and JSDoc) and the tokens its
// CSS uses. A var(--ht-…) that is not a published token fails the build.
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
  components.push({ name, file: `src/components/${file}`, description, props, extra });
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
// A ThumbnailRow contains a Thumbnail and a ThumbnailList contains Dividers: say so.
const composes = { ThumbnailRow: ["Thumbnail"], ThumbnailList: ["ThumbnailRow", "Divider"] };
if (problems.length) {
  console.error(`✗ components:\n  ${problems.join("\n  ")}`);
  process.exit(1);
}
for (const c of components) {
  c.tokens = [...used.get(c.name)].sort();
  c.classes = [...classes.get(c.name)].sort();
  c.composes = composes[c.name] ?? [];
}
const order = ["Card", "Thumbnail", "ThumbnailRow", "ThumbnailList", "Divider"];
components.sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name));
fs.writeFileSync(path.join(DIST, "components.json"), JSON.stringify({ name: pkg.name, version: pkg.version, generatedAt: new Date().toISOString(), entry: "holotekt-design-system/components", stylesheet: "holotekt-design-system/components.css", components }, null, 2) + "\n");
const tokenCount = new Set(components.flatMap((c) => c.tokens)).size;
console.log(`✓ built dist/components/ (${components.length} components), components.css, components.json (${components.reduce((n, c) => n + c.props.length, 0)} props, ${tokenCount} tokens used, all published)`);
