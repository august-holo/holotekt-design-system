#!/usr/bin/env node
// node scripts/figma-to-dtcg.mjs <export.json> [--map "Primitives=primitives,Semantic=semantic"] [--dry-run]
//
// Turns the JSON returned by scripts/figma/read-variables.js into the DTCG files in tokens/:
// primitives.json, semantic.json, typography.json, breakpoint.json, and <base>.<mode>.json for every
// mode after a collection's default. Text styles become composite "typography" tokens in
// typography.json. Aliases stay aliases ({color.neutral.900}), descriptions are carried over, and
// Figma's slash names become dot paths. It refuses, with a list, when something cannot be mapped
// faithfully, rather than guessing or flattening.
import fs from "node:fs";
import path from "node:path";
import { ROOT, MODE_FILE } from "./lib/tokens.mjs";

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--"));
const dryRun = args.includes("--dry-run");
const mapArg = args[args.indexOf("--map") + 1];
if (!file) {
  console.error('usage: node scripts/figma-to-dtcg.mjs <export.json> [--map "Primitives=primitives,Semantic=semantic"] [--dry-run]');
  process.exit(2);
}

// Collection name → tokens file (base). Matching is case-insensitive.
const DEFAULT_MAP = { primitives: "primitives", primitive: "primitives", semantic: "semantic", semantics: "semantic", typography: "typography", type: "typography", breakpoint: "breakpoint", breakpoints: "breakpoint" };
const collectionMap = { ...DEFAULT_MAP };
if (args.includes("--map") && mapArg) {
  for (const pair of mapArg.split(",")) {
    const [from, to] = pair.split("=").map((s) => s.trim());
    if (from && to) collectionMap[from.toLowerCase()] = to;
  }
}

let data;
try {
  data = JSON.parse(fs.readFileSync(file, "utf8"));
} catch (e) {
  console.error(`✗ could not read ${file} as JSON (${e.message}). Save the exact JSON returned by scripts/figma/read-variables.js.`);
  process.exit(1);
}
if (!Array.isArray(data.collections) || !Array.isArray(data.variables)) {
  console.error(`✗ ${file} does not look like the output of scripts/figma/read-variables.js (needs "collections" and "variables" arrays).`);
  process.exit(1);
}
const problems = [];
const notes = [];

if (!data.collections.length) {
  console.log("The Figma file has no local variable collections. Nothing to publish.");
  process.exit(0);
}

const byId = new Map(data.variables.map((v) => [v.id, v]));
const toPath = (name) => name.split("/").map((s) => s.trim()).filter(Boolean).join(".");
const slug = (name) => name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const round = (n, places) => Number(n.toFixed(places));

const toHex = ({ r, g, b, a = 1 }) => {
  const h = (x) => Math.round(Math.min(1, Math.max(0, x)) * 255).toString(16).padStart(2, "0").toUpperCase();
  return `#${h(r)}${h(g)}${h(b)}${a < 1 ? h(a) : ""}`;
};

/** Figma FLOAT/STRING variables carry no token type; the scopes say what the number is for. */
function dtcgType(v) {
  const scopes = new Set(v.scopes ?? []);
  switch (v.resolvedType) {
    case "COLOR":
      return "color";
    case "FLOAT":
      if (scopes.has("FONT_WEIGHT")) return "fontWeight";
      if (scopes.has("OPACITY")) return "number";
      if ([...scopes].some((s) => ["FONT_SIZE", "LINE_HEIGHT", "LETTER_SPACING", "PARAGRAPH_SPACING", "PARAGRAPH_INDENT", "GAP", "WIDTH_HEIGHT", "CORNER_RADIUS", "STROKE_FLOAT", "EFFECT_FLOAT"].includes(s))) return "dimension";
      return "number";
    case "STRING":
      if (scopes.has("FONT_FAMILY")) return "fontFamily";
      return null;
    default:
      return null;
  }
}

function aliasOf(raw, owner) {
  const target = byId.get(raw.id);
  if (!target) {
    problems.push(`${owner}: aliases a variable that is not local to this file (${raw.id}). Library variables cannot be exported.`);
    return undefined;
  }
  return `{${toPath(target.name)}}`;
}

function convertValue(v, raw, type) {
  if (raw && typeof raw === "object" && raw.type === "VARIABLE_ALIAS") return aliasOf(raw, v.name);
  switch (type) {
    case "color":
      return toHex(raw);
    case "dimension":
      return { value: raw, unit: "px" };
    case "fontWeight":
    case "number":
    case "fontFamily":
      return raw;
    default:
      return undefined;
  }
}

/** Put a token at a slash path inside a tree, reporting group/token clashes. */
function place(tree, name, token) {
  const segs = toPath(name).split(".");
  let node = tree;
  for (const s of segs.slice(0, -1)) {
    if (node[s] && "$value" in node[s]) {
      problems.push(`${name}: its group "${s}" is also a token. Rename one in Figma.`);
      return;
    }
    node = node[s] ??= {};
  }
  const leaf = segs[segs.length - 1];
  if (node[leaf]) {
    problems.push(`${name}: defined twice.`);
    return;
  }
  node[leaf] = token;
}

const files = {};
const exportedCollections = new Set();
for (const c of data.collections) {
  const target = collectionMap[c.name.toLowerCase()];
  if (!target) {
    problems.push(`collection "${c.name}" has no target file. Pass --map "${c.name}=primitives" (or semantic, typography, breakpoint).`);
    continue;
  }
  const present = c.variableIds.filter((id) => byId.has(id));
  if (c.variableIds.length && !present.length) {
    notes.push(`collection "${c.name}" is not in this export; tokens/${target}.json was left alone.`);
    continue;
  }
  exportedCollections.add(target);
  // The default mode is the file itself; every other mode becomes <target>.<mode>.json.
  const modeTargets = c.modes.map((m) => ({ modeId: m.id, name: m.name, isDefault: m.id === c.defaultModeId, target: m.id === c.defaultModeId ? target : `${target}.${slug(m.name)}` }));
  for (const mt of modeTargets) {
    if (!mt.isDefault && !MODE_FILE.test(`${mt.target}.json`)) problems.push(`collection "${c.name}": mode "${mt.name}" cannot be named as a file (${mt.target}.json).`);
    if (!mt.isDefault) notes.push(`collection "${c.name}": mode "${mt.name}" → tokens/${mt.target}.json`);
  }
  const trees = Object.fromEntries(modeTargets.map((mt) => [mt.modeId, (files[mt.target] ??= {})]));
  for (const id of present) {
    const v = byId.get(id);
    const type = dtcgType(v);
    if (!type) {
      problems.push(`${v.name}: a ${v.resolvedType} variable with scopes [${(v.scopes ?? []).join(", ")}] has no DTCG type. Give it a scope that implies one (FONT_FAMILY, FONT_WEIGHT, a size scope) or leave it out of the system.`);
      continue;
    }
    for (const mt of modeTargets) {
      const raw = v.valuesByMode[mt.modeId];
      if (raw === undefined) {
        problems.push(`${v.name}: has no value in mode "${mt.name}".`);
        continue;
      }
      const value = convertValue(v, raw, type);
      if (value === undefined) continue;
      const token = { $type: type, $value: value };
      // Descriptions live with the default mode; a mode file only restates values.
      if (mt.isDefault && v.description?.trim()) token.$description = v.description.trim();
      place(trees[mt.modeId], v.name, token);
    }
  }
}

// Text styles → composite typography tokens, in typography.json.
const WEIGHTS = { thin: 100, hairline: 100, extralight: 200, ultralight: 200, light: 300, regular: 400, normal: 400, book: 400, medium: 500, semibold: 600, demibold: 600, bold: 700, extrabold: 800, ultrabold: 800, black: 900, heavy: 900 };
const CASES = { ORIGINAL: "none", UPPER: "uppercase", LOWER: "lowercase", TITLE: "capitalize" };
if (Array.isArray(data.textStyles) && data.textStyles.length) {
  if (!exportedCollections.has("typography")) {
    problems.push(`${data.textStyles.length} text styles were read, but no collection maps to tokens/typography.json to hold them.`);
  } else {
    const tree = files.typography;
    for (const s of data.textStyles) {
      const name = s.name;
      const value = {};
      const bound = s.boundVariables ?? {};
      if (bound.fontFamily?.id) value.fontFamily = aliasOf(bound.fontFamily, name);
      else problems.push(`text style ${name}: its font family is not bound to a variable. Bind it to a font/family variable in Figma.`);
      if (bound.fontSize?.id) value.fontSize = aliasOf(bound.fontSize, name);
      else problems.push(`text style ${name}: its font size is not bound to a variable. Bind it to a size variable in Figma.`);
      const wght = s.fontName?.variationSettings?.wght ?? WEIGHTS[String(s.fontName?.style ?? "").toLowerCase().replace(/[\s-]/g, "").replace(/italic$/, "")];
      if (typeof wght === "number") value.fontWeight = wght;
      else problems.push(`text style ${name}: cannot read a weight from the font style "${s.fontName?.style}".`);
      if (s.lineHeight?.unit === "PERCENT") value.lineHeight = round(s.lineHeight.value / 100, 2);
      else if (s.lineHeight?.unit === "PIXELS") value.lineHeight = round(s.lineHeight.value / (s.fontSize || 16), 2);
      else problems.push(`text style ${name}: line height is "${s.lineHeight?.unit}"; set it as a percentage in Figma.`);
      if (s.letterSpacing?.unit === "PERCENT") value.letterSpacing = { value: round(s.letterSpacing.value / 100, 3), unit: "em" };
      else if (s.letterSpacing?.unit === "PIXELS") value.letterSpacing = { value: round(s.letterSpacing.value, 2), unit: "px" };
      value.textTransform = CASES[s.textCase] ?? "none";
      const token = { $type: "typography", $value: value };
      if (s.description?.trim()) token.$description = s.description.trim();
      place(tree, name, token);
    }
    notes.push(`${data.textStyles.length} text styles → composite typography tokens in tokens/typography.json`);
  }
}

const counts = Object.fromEntries(Object.entries(files).map(([k, t]) => [k, JSON.stringify(t).split('"$value"').length - 1]));

if (problems.length) {
  console.error(`✗ ${problems.length} problem${problems.length === 1 ? "" : "s"} exporting from Figma. Nothing was written.`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
for (const n of notes) console.log(`! ${n}`);

for (const [target, tree] of Object.entries(files)) {
  const out = path.join(ROOT, "tokens", `${target}.json`);
  const text = JSON.stringify(tree, null, 2) + "\n";
  if (dryRun) console.log(`(dry run) would write ${path.relative(ROOT, out)} with ${counts[target]} tokens`);
  else {
    fs.writeFileSync(out, text);
    console.log(`✓ wrote ${path.relative(ROOT, out)} (${counts[target]} tokens)`);
  }
}
// A mode that no longer exists in Figma must not linger as a file.
for (const f of fs.readdirSync(path.join(ROOT, "tokens"))) {
  const m = MODE_FILE.exec(f);
  if (m && exportedCollections.has(m[1]) && !files[f.replace(/\.json$/, "")]) {
    if (dryRun) console.log(`(dry run) would delete tokens/${f}: that mode is no longer in Figma`);
    else {
      fs.unlinkSync(path.join(ROOT, "tokens", f));
      console.log(`✓ deleted tokens/${f}: that mode is no longer in Figma`);
    }
  }
}
