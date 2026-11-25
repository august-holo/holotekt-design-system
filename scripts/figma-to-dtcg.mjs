#!/usr/bin/env node
// node scripts/figma-to-dtcg.mjs <export.json> [--map "Primitives=primitives,Semantic=semantic"] [--dry-run]
//
// Turns the JSON returned by scripts/figma/read-variables.js into tokens/primitives.json and
// tokens/semantic.json in DTCG format. Aliases stay aliases ({color.neutral.900}), descriptions are
// carried over, and Figma's slash names become dot paths. It refuses, with a list, when something
// cannot be mapped faithfully, rather than guessing or flattening.
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

// Collection name → tokens file. Matching is case-insensitive.
const DEFAULT_MAP = { primitives: "primitives", primitive: "primitives", semantic: "semantic", semantics: "semantic" };
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

if (!data.collections?.length) {
  console.log("The Figma file has no local variable collections. Nothing to publish.");
  process.exit(0);
}

const byId = new Map(data.variables.map((v) => [v.id, v]));
const toPath = (name) => name.split("/").map((s) => s.trim()).filter(Boolean).join(".");

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

function convertValue(v, raw, type) {
  if (raw && typeof raw === "object" && raw.type === "VARIABLE_ALIAS") {
    const target = byId.get(raw.id);
    if (!target) {
      problems.push(`${v.name}: aliases a variable that is not local to this file (${raw.id}). Library variables cannot be exported.`);
      return undefined;
    }
    return `{${toPath(target.name)}}`;
  }
  switch (type) {
    case "color":
      return toHex(raw);
    case "dimension":
      return { value: raw, unit: "px" };
    case "fontWeight":
    case "number":
      return raw;
    case "fontFamily":
      return raw;
    default:
      return undefined;
  }
}

const files = {};
for (const c of data.collections) {
  const target = collectionMap[c.name.toLowerCase()];
  if (!target) {
    problems.push(`collection "${c.name}" has no target file. Pass --map "${c.name}=primitives" or "${c.name}=semantic".`);
    continue;
  }
  if (c.modes.length > 1 && target !== "semantic") {
    problems.push(`collection "${c.name}" has ${c.modes.length} modes (${c.modes.map((m) => m.name).join(", ")}). Only the Semantic collection may have modes; primitives hold one value.`);
    continue;
  }
  // The default mode is the file itself; every other mode becomes semantic.<mode>.json.
  const slug = (name) => name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const modeTargets = c.modes.map((m) => ({ modeId: m.id, target: m.id === c.defaultModeId ? target : `${target}.${slug(m.name)}`, isDefault: m.id === c.defaultModeId, name: m.name }));
  for (const mt of modeTargets) {
    if (!mt.isDefault && !MODE_FILE.test(`${mt.target}.json`)) problems.push(`collection "${c.name}": mode "${mt.name}" cannot be named as a file (${mt.target}.json).`);
    if (!mt.isDefault) notes.push(`collection "${c.name}": mode "${mt.name}" → tokens/${mt.target}.json`);
  }
  const trees = Object.fromEntries(modeTargets.map((mt) => [mt.modeId, (files[mt.target] ??= {})]));
  for (const id of c.variableIds) {
    const v = byId.get(id);
    if (!v) continue;
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
      const segs = toPath(v.name).split(".");
      let node = trees[mt.modeId];
      let clash = false;
      for (const s of segs.slice(0, -1)) {
        if (node[s] && "$value" in node[s]) {
          problems.push(`${v.name}: its group "${s}" is also a token. Rename one in Figma.`);
          clash = true;
          break;
        }
        node = node[s] ??= {};
      }
      if (clash) continue;
      const leaf = segs[segs.length - 1];
      if (node[leaf]) problems.push(`${v.name}: defined twice.`);
      const token = { $type: type, $value: value };
      // Descriptions live with the default mode; a mode file only restates values.
      if (mt.isDefault && v.description?.trim()) token.$description = v.description.trim();
      node[leaf] = token;
    }
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
for (const target of ["primitives", "semantic"]) {
  if (!files[target]) console.log(`! no collection mapped to tokens/${target}.json; the existing file was left alone.`);
}
// A mode that no longer exists in Figma must not linger as a file.
for (const f of fs.readdirSync(path.join(ROOT, "tokens"))) {
  if (MODE_FILE.test(f) && !files[f.replace(/\.json$/, "")] && files.semantic) {
    if (dryRun) console.log(`(dry run) would delete tokens/${f}: that mode is no longer in Figma`);
    else {
      fs.unlinkSync(path.join(ROOT, "tokens", f));
      console.log(`✓ deleted tokens/${f}: that mode is no longer in Figma`);
    }
  }
}
