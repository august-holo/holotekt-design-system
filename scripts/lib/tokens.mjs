// Shared token logic for the scripts: reading the DTCG files, resolving aliases (per mode), naming
// CSS variables, computing WCAG contrast, and the checks. The site never imports this; it reads
// dist/tokens.json, which build-tokens.mjs writes from here.
//
// Files in tokens/:
//   primitives.json   raw values (colour ramps)                       tier "primitive"
//   semantic.json     purpose-named aliases of primitives             tier "semantic"
//   typography.json   font families and sizes (raw) and one composite tier "primitive" / "style"
//                     "typography" token per text style
//   breakpoint.json   values that change with the viewport            tier "semantic" / "primitive"
//   spacing.json      the space scale, widths, breakpoints (raw) and  tier "primitive" / "semantic"
//                     the inset, gap and grid roles that alias them
//   shape.json        radii and border widths, kept in px               tier "primitive"
//   <base>.<mode>.json restates a base file's tokens for a mode (semantic.dark.json,
//                     breakpoint.mobile.json). Every token of the base needs a value; none may be added.
//   contrast-pairs.json and font-stacks.json are maintained by hand.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MODE_CSS } from "./modes.mjs";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const REF = /^\{([^{}]+)\}$/;
export const isRef = (v) => typeof v === "string" && REF.test(v);
export const refTarget = (v) => REF.exec(v)[1].trim();
export const PREFIX = "ht";
export const DEFAULT_MODE = "default";
export const MIN_FONT_PX = 12;

export const BASES = [
  { base: "primitives", file: "tokens/primitives.json", tier: () => "primitive", required: true },
  { base: "semantic", file: "tokens/semantic.json", tier: () => "semantic", required: true },
  { base: "typography", file: "tokens/typography.json", tier: (t) => (t.type === "typography" ? "style" : "primitive"), required: false },
  // Breakpoint is mostly aliases that change with the viewport, plus raw counts such as grid columns.
  { base: "breakpoint", file: "tokens/breakpoint.json", tier: (t) => (isRef(t.value) ? "semantic" : "primitive"), required: false },
  // Spacing mixes the scale (raw) with roles that alias it (inset, gap, layout/grid); the tier follows the value.
  { base: "spacing", file: "tokens/spacing.json", tier: (t) => (isRef(t.value) ? "semantic" : "primitive"), required: false },
  // Radii and border widths stay in px: they should not grow with the reader's text size.
  { base: "shape", file: "tokens/shape.json", tier: () => "primitive", required: false, keepPx: true },
];
/** Semantic tokens allowed to hold a raw value, by name, with the reason. */
export const RAW_SEMANTIC_ALLOWED = new Map([
  // A translucent colour cannot alias an opaque primitive; Figma holds the scrim as a raw colour with alpha.
  ["color.surface.scrim", "translucent; no primitive to alias"],
]);
export const FILES = {
  primitives: "tokens/primitives.json",
  semantic: "tokens/semantic.json",
  typography: "tokens/typography.json",
  breakpoint: "tokens/breakpoint.json",
  spacing: "tokens/spacing.json",
  shape: "tokens/shape.json",
  pairs: "tokens/contrast-pairs.json",
  exempt: "tokens/contrast-exempt.json",
  stacks: "tokens/font-stacks.json",
};
export const MODE_FILE = /^(primitives|semantic|typography|breakpoint|spacing|shape)\.([a-z0-9-]+)\.json$/;
export const modeFile = (base, mode) => `tokens/${base}.${mode}.json`;

export const KNOWN_TYPES = new Set([
  "color", "dimension", "fontFamily", "fontWeight", "number", "shadow", "duration", "cubicBezier",
  "strokeStyle", "border", "transition", "gradient", "typography",
]);
/** The composite typography token's properties. textTransform is ours; DTCG has no case property. */
export const TYPOGRAPHY_PROPS = ["fontFamily", "fontSize", "fontWeight", "lineHeight", "letterSpacing", "textTransform"];

export function parseJson(text, label) {
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error(`${label}: not valid JSON (${e.message}). Fix the JSON before anything else.`);
  }
}

/** The mode files present in tokens/: [{ base: "semantic", mode: "dark", file }]. */
export function listModeFiles(root = ROOT) {
  return fs
    .readdirSync(path.join(root, "tokens"))
    .filter((f) => MODE_FILE.test(f))
    .sort()
    .map((f) => {
      const [, base, mode] = MODE_FILE.exec(f);
      return { base, mode, file: `tokens/${f}` };
    });
}

/** Walk a DTCG tree. A token is any object with `$value`; `$type` is inherited from groups. */
export function flatten(tree, source) {
  const out = [];
  const walk = (node, segs, inheritedType) => {
    if (node === null || typeof node !== "object" || Array.isArray(node)) return;
    if ("$value" in node) {
      out.push({
        path: segs.join("."),
        source,
        type: node.$type ?? inheritedType,
        value: node.$value,
        description: typeof node.$description === "string" ? node.$description.trim() : undefined,
      });
      return;
    }
    const type = node.$type ?? inheritedType;
    for (const [key, child] of Object.entries(node)) {
      if (key.startsWith("$")) continue;
      walk(child, [...segs, key], type);
    }
  };
  walk(tree, [], undefined);
  return out;
}

const kebab = (s) => s.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
/** `color.text.primary` → `--ht-color-text-primary`; `heading.1` → `--ht-heading-1`. */
export const cssName = (tokenPath) => `--${PREFIX}-${tokenPath.split(".").map(kebab).join("-")}`;
/** `heading.1` → `ht-heading-1`: the utility class of a text style. */
export const className = (tokenPath) => `${PREFIX}-${tokenPath.split(".").map(kebab).join("-")}`;

/**
 * Build the token set. `files` maps base name → file content (string or object) for the base files
 * present; `modes` is a list of { base, mode, content }.
 */
export function parseTokenSet({ files, modes = [] }) {
  const parse = (src, label) => (typeof src === "string" ? parseJson(src, label) : src);
  const list = [];
  const errors = [];
  for (const b of BASES) {
    if (files[b.base] === undefined) {
      if (b.required) errors.push(`${b.file} is missing.`);
      continue;
    }
    for (const t of flatten(parse(files[b.base], b.file) ?? {}, b.file)) {
      t.base = b.base;
      t.tier = b.tier(t);
      if (b.keepPx) t.keepPx = true;
      list.push(t);
    }
  }
  const byPath = new Map();
  for (const t of list) {
    if (byPath.has(t.path)) errors.push(`${t.path} is defined twice (${byPath.get(t.path).source} and ${t.source}). Keep one.`);
    byPath.set(t.path, t);
  }
  // A token may not also be a group (text.heading-1 and text.heading-1.size cannot both exist).
  for (const t of list) {
    const parent = t.path.split(".").slice(0, -1).join(".");
    if (parent && byPath.has(parent)) errors.push(`${t.path}: its parent ${parent} is itself a token. A token cannot contain tokens; rename one.`);
  }

  const modeNames = [...new Set(modes.map((m) => m.mode))].sort();
  for (const { base, mode, content } of modes) {
    const source = modeFile(base, mode);
    if (!MODE_CSS[mode]) errors.push(`${source}: no CSS rule is defined for mode "${mode}". Add it to scripts/lib/modes.mjs.`);
    const seen = new Set();
    for (const mt of flatten(parse(content, source) ?? {}, source)) {
      const t = byPath.get(mt.path);
      if (!t || t.base !== base) {
        errors.push(`${source}: ${mt.path} is not a token in tokens/${base}.json. A mode can only restate tokens that exist there.`);
        continue;
      }
      if (mt.type && t.type && mt.type !== t.type) errors.push(`${source}: ${mt.path} is a ${mt.type} here but a ${t.type} in tokens/${base}.json.`);
      t.modes ??= {};
      t.modes[mode] = { value: mt.value, alias: isRef(mt.value) ? refTarget(mt.value) : null, source };
      seen.add(mt.path);
    }
    for (const t of list) {
      if (t.base === base && !seen.has(t.path)) errors.push(`${source}: ${t.path} has no ${mode} value. Every token of tokens/${base}.json needs a value in every one of its modes.`);
    }
  }
  return { list, byPath, errors, modeNames };
}

/** Resolve every alias in a value in a given mode, deeply. Throws on a missing or circular reference. */
export function resolveIn(value, byPath, mode = DEFAULT_MODE, seen = []) {
  if (isRef(value)) {
    const target = refTarget(value);
    if (seen.includes(target)) throw new Error(`circular alias: ${[...seen, target].join(" → ")}`);
    const t = byPath.get(target);
    if (!t) throw new Error(`alias {${target}} points at a token that does not exist`);
    const next = mode !== DEFAULT_MODE && t.modes?.[mode] ? t.modes[mode].value : t.value;
    return resolveIn(next, byPath, mode, [...seen, target]);
  }
  if (Array.isArray(value)) return value.map((v) => resolveIn(v, byPath, mode, seen));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, resolveIn(v, byPath, mode, seen)]));
  }
  return value;
}

/** Adds css, alias, resolved (default mode) and resolvedIn[mode] to every token; collects errors. */
export function resolveAll(set) {
  const errors = [...set.errors];
  for (const t of set.list) {
    t.css = cssName(t.path);
    t.alias = isRef(t.value) ? refTarget(t.value) : null;
    t.resolvedIn = {};
    try {
      t.resolved = resolveIn(t.value, set.byPath);
    } catch (e) {
      errors.push(`${t.path}: ${e.message}.`);
    }
    for (const mode of set.modeNames) {
      try {
        t.resolvedIn[mode] = resolveIn(t.modes?.[mode]?.value ?? t.value, set.byPath, mode);
      } catch (e) {
        errors.push(`${t.path} (${mode}): ${e.message}.`);
      }
    }
  }
  return errors;
}

export const valueIn = (t, mode) => (mode === DEFAULT_MODE ? t.resolved : t.resolvedIn?.[mode]);

/** The media query of a "media" mode: a literal, or a template filled from a token's px value. Throws if the token is missing. */
export function modeMedia(mode, byPath) {
  const rule = MODE_CSS[mode];
  if (!rule || rule.kind !== "media") return null;
  if (rule.media) return rule.media;
  const t = byPath.get(rule.mediaFrom.token);
  const px = t ? toPx(t.resolved) : null;
  if (px === null) throw new Error(`mode "${mode}" takes its width from ${rule.mediaFrom.token}, which does not exist or is not a size.`);
  return rule.mediaFrom.template.replace("{px}", String(px));
}
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
/** Whether a token has its own value in a mode, or resolves differently there. */
export const differsIn = (t, mode) => Boolean(t.modes?.[mode]) || !same(valueIn(t, mode), t.resolved);
export const aliasIn = (t, mode) => (mode === DEFAULT_MODE ? t.alias : (t.modes?.[mode]?.alias ?? t.alias));

// --- values -------------------------------------------------------------------------------------

/** Hex string or DTCG colour object → "#RRGGBB" (alpha ignored), or null. */
export function toHex(value) {
  if (typeof value === "string") {
    const m = /^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(value.trim());
    if (!m) return null;
    let h = m[1];
    if (h.length <= 4) h = [...h].map((c) => c + c).join("");
    return `#${h.slice(0, 6).toUpperCase()}`;
  }
  if (value && typeof value === "object") {
    if (typeof value.hex === "string") return toHex(value.hex);
    if (value.colorSpace === "srgb" && Array.isArray(value.components)) {
      const to255 = (c) => Math.round(Math.min(1, Math.max(0, Number(c))) * 255);
      return "#" + value.components.slice(0, 3).map((c) => to255(c).toString(16).padStart(2, "0")).join("").toUpperCase();
    }
  }
  return null;
}

/** A dimension's size in px, or null (em and rem are relative to 16px for the checks). */
export function toPx(value) {
  if (typeof value === "number") return value;
  if (value && typeof value === "object" && typeof value.value === "number") {
    if (value.unit === "px") return value.value;
    if (value.unit === "rem" || value.unit === "em") return value.value * 16;
  }
  return null;
}

const trim = (n) => String(Number(n.toFixed(4)));
/** A resolved value as CSS text. Font sizes and other px dimensions become rem. */
export function cssValue(type, value, stacks = {}, tokenPath, { keepPx = false } = {}) {
  if (value === null || value === undefined) return "";
  switch (type) {
    case "color":
      return toCssColor(value);
    case "dimension":
      if (value && typeof value === "object") return value.unit === "px" && !keepPx ? `${trim(value.value / 16)}rem` : `${trim(value.value)}${value.unit}`;
      return String(value);
    case "fontFamily": {
      const names = stacks[tokenPath]?.stack ?? (Array.isArray(value) ? value : [value]);
      return names.map((n) => (/^[a-z-]+$/i.test(n) && /^(serif|sans-serif|monospace|cursive|fantasy|system-ui|ui-serif|ui-sans-serif|ui-monospace|ui-rounded|emoji|math|fangsong|-apple-system)$/.test(n) ? n : `"${n}"`)).join(", ");
    }
    case "fontWeight":
    case "number":
      return String(value);
    default:
      return typeof value === "string" ? value : JSON.stringify(value);
  }
}

/** The CSS declarations of a composite typography token: six properties. */
export function typographyProps(t, stacks, mode = DEFAULT_MODE) {
  const raw = mode === DEFAULT_MODE ? t.value : (t.modes?.[mode]?.value ?? t.value);
  const resolved = valueIn(t, mode) ?? {};
  const prop = (key, type) => {
    const v = raw?.[key];
    if (v === undefined) return undefined;
    if (isRef(v)) return `var(${cssName(refTarget(v))})`;
    return cssValue(type, resolved[key], stacks, undefined, { keepPx: t.keepPx });
  };
  return {
    "font-family": prop("fontFamily", "fontFamily"),
    "font-size": prop("fontSize", "dimension"),
    "font-weight": prop("fontWeight", "fontWeight"),
    "line-height": prop("lineHeight", "number"),
    "letter-spacing": prop("letterSpacing", "dimension"),
    "text-transform": prop("textTransform", "string") ?? "none",
  };
}

/** Alpha of a hex string or DTCG colour object, 0..1 (1 when opaque). */
export function alphaOf(value) {
  if (typeof value === "string") {
    const m = /^#([0-9a-f]{4}|[0-9a-f]{8})$/i.exec(value.trim());
    if (!m) return 1;
    const h = m[1].length === 4 ? m[1][3] + m[1][3] : m[1].slice(6, 8);
    return parseInt(h, 16) / 255;
  }
  if (value && typeof value === "object" && typeof value.alpha === "number") return value.alpha;
  return 1;
}

/** A colour as CSS: lowercase hex, or rgb(r g b / a) when it has alpha. */
export function toCssColor(value) {
  const hex = toHex(value);
  if (!hex) return String(value);
  const a = alphaOf(value);
  if (a >= 1) return hex.toLowerCase();
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return `rgb(${r} ${g} ${b} / ${Number(a.toFixed(2))})`;
}

export function relativeLuminance(hex) {
  const chan = (i) => {
    const c = parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * chan(0) + 0.7152 * chan(1) + 0.0722 * chan(2);
}
export function contrastRatio(hexA, hexB) {
  const a = relativeLuminance(hexA);
  const b = relativeLuminance(hexB);
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

// --- loading and checking ---------------------------------------------------------------------

export function loadTokens(root = ROOT) {
  const read = (f) => fs.readFileSync(path.join(root, f), "utf8");
  const has = (f) => fs.existsSync(path.join(root, f));
  const files = Object.fromEntries(BASES.filter((b) => has(b.file)).map((b) => [b.base, read(b.file)]));
  const modes = listModeFiles(root).map((m) => ({ ...m, content: read(m.file) }));
  const set = parseTokenSet({ files, modes });
  const pairs = parseJson(read(FILES.pairs), FILES.pairs);
  const stacks = has(FILES.stacks) ? parseJson(read(FILES.stacks), FILES.stacks) : {};
  const exempt = has(FILES.exempt) ? parseJson(read(FILES.exempt), FILES.exempt) : [];
  return { ...set, pairs, stacks, exempt };
}

/**
 * Every check. Returns errors (fail the build), warnings (report only), the contrast pairs with
 * their ratios in every colour-changing mode, uncovered semantic colours, and the mode lists.
 */
export function checkTokens(data) {
  const errors = resolveAll(data);
  const warnings = [];
  const allModes = [DEFAULT_MODE, ...data.modeNames];
  const stacks = data.stacks ?? {};
  const err = (m) => errors.push(m);
  const at = (t, mode) => `${t.path}${mode === DEFAULT_MODE ? "" : ` (${mode})`}`;

  const cssSeen = new Map();
  for (const t of data.list) {
    if (!t.type) err(`${t.path}: has no $type. Add "$type" on the token or its group.`);
    else if (!KNOWN_TYPES.has(t.type)) err(`${t.path}: unknown $type "${t.type}". Known: ${[...KNOWN_TYPES].join(", ")}.`);
    if (cssSeen.has(t.css)) err(`${t.path} and ${cssSeen.get(t.css)} both become ${t.css}. Rename one.`);
    cssSeen.set(t.css, t.path);

    if (t.tier === "semantic") {
      if (!RAW_SEMANTIC_ALLOWED.has(t.path)) {
        if (!isRef(t.value)) err(`${t.path}: a token in ${t.source} must alias another token, like "{color.neutral.900}", not hold a raw value (${JSON.stringify(t.value)}).`);
        for (const [mode, mv] of Object.entries(t.modes ?? {})) if (!isRef(mv.value)) err(`${at(t, mode)}: must alias another token, not hold a raw value (${JSON.stringify(mv.value)}).`);
      }
      if (!t.description) err(`${t.path}: needs a $description that says when to use it, in one plain sentence.`);
    }

    if (t.type === "color") {
      for (const mode of allModes) {
        const v = valueIn(t, mode);
        if (v !== undefined && toHex(v) === null) err(`${at(t, mode)}: colour value ${JSON.stringify(v)} is not a hex string or an sRGB colour object.`);
      }
    }

    if (t.type === "fontFamily") {
      const s = stacks[t.path];
      if (!s || !Array.isArray(s.stack) || !s.stack.length) err(`${t.path}: has no fallback stack. Add it to ${FILES.stacks} under "${t.path}".`);
      else if (s.stack[0] !== t.resolved) err(`${t.path}: the stack in ${FILES.stacks} starts with "${s.stack[0]}" but the token is "${t.resolved}". The first entry must be the token's own family.`);
    }

    if (t.tier === "style") {
      if (!t.description) err(`${t.path}: a text style needs a $description that says when to use it.`);
      const v = t.value;
      if (!v || typeof v !== "object" || Array.isArray(v)) {
        err(`${t.path}: a typography token's $value must be an object with ${TYPOGRAPHY_PROPS.join(", ")}.`);
        continue;
      }
      for (const key of ["fontFamily", "fontSize"]) {
        const want = key === "fontFamily" ? "fontFamily" : "dimension";
        if (!isRef(v[key])) err(`${t.path}: ${key} must alias a ${want} token, not hold a raw value (${JSON.stringify(v[key])}). Bind it to a variable in Figma.`);
        else {
          const target = data.byPath.get(refTarget(v[key]));
          if (!target) err(`${t.path}: ${key} aliases {${refTarget(v[key])}}, which does not exist.`);
          else if (target.type !== want) err(`${t.path}: ${key} aliases ${target.path}, a ${target.type} token; it must be a ${want}.`);
        }
      }
      if (typeof v.fontWeight !== "number") err(`${t.path}: fontWeight must be a number (400, 700).`);
      if (typeof v.lineHeight !== "number") err(`${t.path}: lineHeight must be a unitless number (1.5).`);
      if (v.letterSpacing !== undefined && toPx(v.letterSpacing) === null && typeof v.letterSpacing !== "number") err(`${t.path}: letterSpacing must be a dimension ({ "value": 0.08, "unit": "em" }).`);
      if (v.textTransform !== undefined && !["none", "uppercase", "lowercase", "capitalize"].includes(v.textTransform)) err(`${t.path}: textTransform must be none, uppercase, lowercase or capitalize.`);
      for (const key of Object.keys(v)) if (!TYPOGRAPHY_PROPS.includes(key)) err(`${t.path}: unknown typography property "${key}".`);
      for (const mode of allModes) {
        const px = toPx(valueIn(t, mode)?.fontSize);
        if (px !== null && px < MIN_FONT_PX) err(`${at(t, mode)}: resolves to ${px}px, below the ${MIN_FONT_PX}px minimum for any text style.`);
      }
    }
  }

  // Spacing roles end at a step of the scale: inset, gap and layout aliases resolve to space.*, in every mode.
  const endsAtSpace = (start, mode) => {
    let cur = start;
    let alias = aliasIn(cur, mode);
    const seen = new Set();
    while (alias && !seen.has(alias)) {
      seen.add(alias);
      cur = data.byPath.get(alias);
      if (!cur) return false;
      alias = aliasIn(cur, mode);
    }
    return cur.path.startsWith("space.");
  };
  for (const t of data.list) {
    const isSpacingRole = (t.base === "spacing" && t.alias) || (t.base === "breakpoint" && t.path.startsWith("layout.") && t.alias);
    if (!isSpacingRole) continue;
    for (const mode of allModes) {
      if (mode !== DEFAULT_MODE && !t.modes?.[mode]) continue;
      if (!endsAtSpace(t, mode)) err(`${at(t, mode)}: must resolve to a step of the space scale (space.*), not to ${aliasIn(t, mode)}.`);
    }
  }

  // A mode that takes its media query from a token needs that token.
  for (const mode of data.modeNames) {
    try {
      modeMedia(mode, data.byPath);
    } catch (e) {
      err(e.message);
    }
  }

  // A viewport mode may only shrink: no dimension or count grows there.
  for (const mode of data.modeNames) {
    if (!MODE_CSS[mode]?.shrinkOnly) continue;
    for (const t of data.list) {
      if (!["dimension", "number"].includes(t.type) || !t.modes?.[mode]) continue;
      const a = toPx(valueIn(t, mode));
      const b = toPx(t.resolved);
      if (a !== null && b !== null && a > b) err(`${t.path}: ${mode} size ${a}px is larger than the default ${b}px. A ${mode} value may step down, never up.`);
    }
  }

  // Which modes change any colour: only those get a contrast column.
  const colorModes = [DEFAULT_MODE, ...data.modeNames.filter((m) => data.list.some((t) => t.type === "color" && differsIn(t, m)))];
  if (!Array.isArray(data.pairs)) err(`${FILES.pairs}: must be an array of { text, background, min }.`);
  const pairs = [];
  const covered = new Set();
  for (const p of Array.isArray(data.pairs) ? data.pairs : []) {
    const text = data.byPath.get(p.text);
    const bg = data.byPath.get(p.background);
    const min = Number(p.min);
    if (!text || !bg || !Number.isFinite(min)) {
      err(`${FILES.pairs}: pair ${JSON.stringify(p)} names a token that does not exist or has no numeric min.`);
      continue;
    }
    const perMode = {};
    let allPass = true;
    for (const mode of colorModes) {
      const textHex = toHex(valueIn(text, mode));
      const bgHex = toHex(valueIn(bg, mode));
      if (!textHex || !bgHex) continue;
      const ratio = contrastRatio(textHex, bgHex);
      const passes = ratio >= min;
      perMode[mode] = { textValue: textHex, backgroundValue: bgHex, ratio: Number(ratio.toFixed(2)), passes };
      if (!passes) {
        allPass = false;
        err(`contrast${mode === DEFAULT_MODE ? "" : ` (${mode})`}: ${p.text} (${textHex}) on ${p.background} (${bgHex}) is ${ratio.toFixed(2)}:1, below the ${min}:1 minimum. The fix belongs in Figma: adjust the colour there and publish again.`);
      }
    }
    if (!perMode[DEFAULT_MODE]) continue;
    pairs.push({ text: p.text, background: p.background, min, ...perMode[DEFAULT_MODE], passes: allPass, modes: perMode });
    covered.add(p.text).add(p.background);
  }
  // Exemptions: semantic colours that are never a text colour or a text background, each with a reason.
  const exempt = [];
  for (const e of Array.isArray(data.exempt) ? data.exempt : []) {
    const t = data.byPath.get(e?.token);
    if (!t || t.tier !== "semantic" || t.type !== "color") err(`${FILES.exempt}: "${e?.token}" is not a semantic colour token.`);
    else if (!e.reason || typeof e.reason !== "string") err(`${FILES.exempt}: ${e.token} needs a one-line reason.`);
    else if (covered.has(t.path)) err(`${FILES.exempt}: ${e.token} is in a contrast pair; it cannot also be exempt.`);
    else exempt.push({ token: t.path, reason: e.reason.trim() });
  }
  const exemptPaths = new Set(exempt.map((e) => e.token));
  const uncovered = data.list.filter((t) => t.tier === "semantic" && t.type === "color" && !covered.has(t.path) && !exemptPaths.has(t.path)).map((t) => t.path);
  if (uncovered.length) warnings.push(`not covered by a contrast pair: ${uncovered.join(", ")}. Add pairs to ${FILES.pairs} if text is ever set on or in these colours, or exempt them in ${FILES.exempt} with a reason.`);

  return { errors, warnings, pairs, uncovered, exempt, modes: allModes, colorModes };
}

export function formatPairsTable(pairs, modes = [DEFAULT_MODE]) {
  if (!pairs.length) return "(no contrast pairs)";
  const ratioCols = modes.map((m) => (modes.length === 1 ? "ratio" : `ratio (${m})`));
  const head = ["text", "background", "min", ...ratioCols, "result"];
  const rows = pairs.map((p) => [p.text, p.background, `${p.min}:1`, ...modes.map((m) => (p.modes[m] ? `${p.modes[m].ratio.toFixed(2)}:1` : "-")), p.passes ? "pass" : "FAIL"]);
  const widths = head.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i].length)));
  const line = (r) => r.map((c, i) => c.padEnd(widths[i])).join("  ");
  return [line(head), widths.map((w) => "-".repeat(w)).join("  "), ...rows.map(line)].join("\n");
}

/** The resolved data the site and consumers read: dist/tokens.json. */
/** Now, as ISO 8601 in the machine's local time with its UTC offset (the maintainer's clock, not UTC). */
export function localIso(d = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  const off = -d.getTimezoneOffset();
  const sign = off >= 0 ? "+" : "-";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}${sign}${pad(Math.floor(Math.abs(off) / 60))}:${pad(Math.abs(off) % 60)}`;
}

export function resolvedJson(data, checked, { version }) {
  return {
    name: "holotekt-design-system",
    version,
    generatedAt: localIso(),
    prefix: PREFIX,
    modes: checked.modes,
    colorModes: checked.colorModes,
    modeCss: Object.fromEntries(
      data.modeNames.map((m) => [m, MODE_CSS[m].kind === "media" ? { ...MODE_CSS[m], media: modeMedia(m, data.byPath), mediaFrom: MODE_CSS[m].mediaFrom } : MODE_CSS[m]]),
    ),
    tokens: data.list.map((t) => {
      const modes = Object.fromEntries(data.modeNames.filter((m) => differsIn(t, m)).map((m) => [m, { value: valueIn(t, m), alias: aliasIn(t, m) }]));
      return {
        path: t.path,
        css: t.css,
        base: t.base,
        tier: t.tier,
        type: t.type,
        value: t.resolved,
        alias: t.alias,
        description: t.description ?? null,
        ...(t.type === "typography" ? { className: className(t.path), raw: t.value } : {}),
        ...(Object.keys(modes).length ? { modes } : {}),
      };
    }),
    fonts: data.stacks ?? {},
    contrastPairs: checked.pairs,
    uncovered: checked.uncovered,
    exempt: checked.exempt,
  };
}
