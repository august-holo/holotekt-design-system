// Shared token logic for the scripts: reading the DTCG files, resolving aliases, naming CSS
// variables, computing WCAG contrast, and the checks. The site never imports this; it reads
// dist/tokens.json, which build-tokens.mjs writes from here.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const PREFIX = "ht";

export const FILES = {
  primitives: "tokens/primitives.json",
  semantic: "tokens/semantic.json",
  pairs: "tokens/contrast-pairs.json",
};

// Types the system knows today (the spec's six) plus the rest of the DTCG set, so a new kind of
// token arriving later is not rejected for being new, only for being malformed.
export const KNOWN_TYPES = new Set([
  "color",
  "dimension",
  "fontFamily",
  "fontWeight",
  "number",
  "shadow",
  "duration",
  "cubicBezier",
  "strokeStyle",
  "border",
  "transition",
  "gradient",
  "typography",
]);

const REF = /^\{([^{}]+)\}$/;

export const isRef = (v) => typeof v === "string" && REF.test(v);
export const refTarget = (v) => REF.exec(v)[1].trim();

export function parseJson(text, label) {
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error(`${label}: not valid JSON (${e.message}). Fix the JSON before anything else.`);
  }
}

export function readJson(file) {
  return parseJson(fs.readFileSync(path.join(ROOT, file), "utf8"), file);
}

/** Walk a DTCG tree. A token is any object with `$value`; `$type` is inherited from groups. */
export function flatten(tree, tier, source) {
  const out = [];
  const walk = (node, segs, inheritedType) => {
    if (node === null || typeof node !== "object" || Array.isArray(node)) return;
    if ("$value" in node) {
      out.push({
        path: segs.join("."),
        tier,
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

/** `color.text.primary` → `--ht-color-text-primary`. camelCase segments become kebab, as Style Dictionary does. */
export function cssName(tokenPath) {
  const kebab = tokenPath
    .split(".")
    .map((s) => s.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase())
    .join("-");
  return `--${PREFIX}-${kebab}`;
}

/** Build the token set from the two files' contents (strings or parsed objects). */
export function parseTokenSet({ primitives, semantic }) {
  const prim = typeof primitives === "string" ? parseJson(primitives, FILES.primitives) : primitives;
  const sem = typeof semantic === "string" ? parseJson(semantic, FILES.semantic) : semantic;
  const list = [
    ...flatten(prim ?? {}, "primitive", FILES.primitives),
    ...flatten(sem ?? {}, "semantic", FILES.semantic),
  ];
  const byPath = new Map();
  const errors = [];
  for (const t of list) {
    if (byPath.has(t.path)) {
      errors.push(`${t.path} is defined twice (${byPath.get(t.path).source} and ${t.source}). Keep one.`);
    }
    byPath.set(t.path, t);
  }
  return { list, byPath, errors };
}

/** Resolve every alias in a value, deeply. Throws on a missing or circular reference. */
export function resolveValue(value, byPath, seen = []) {
  if (isRef(value)) {
    const target = refTarget(value);
    if (seen.includes(target)) {
      throw new Error(`circular alias: ${[...seen, target].join(" → ")}`);
    }
    const t = byPath.get(target);
    if (!t) throw new Error(`alias {${target}} points at a token that does not exist`);
    return resolveValue(t.value, byPath, [...seen, target]);
  }
  if (Array.isArray(value)) return value.map((v) => resolveValue(v, byPath, seen));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, resolveValue(v, byPath, seen)]));
  }
  return value;
}

/** Adds `resolved`, `alias` (direct target path or null) and `css` to each token; collects errors. */
export function resolveAll(set) {
  const errors = [...set.errors];
  for (const t of set.list) {
    t.css = cssName(t.path);
    t.alias = isRef(t.value) ? refTarget(t.value) : null;
    try {
      t.resolved = resolveValue(t.value, set.byPath);
    } catch (e) {
      errors.push(`${t.path}: ${e.message}.`);
      t.resolved = undefined;
    }
  }
  return errors;
}

// --- colour and contrast -------------------------------------------------------------------

/** Hex string or DTCG colour object → "#rrggbb" (alpha ignored), or null if not a colour we can read. */
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
      return (
        "#" +
        value.components
          .slice(0, 3)
          .map((c) => to255(c).toString(16).padStart(2, "0"))
          .join("")
          .toUpperCase()
      );
    }
  }
  return null;
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
  const set = parseTokenSet({ primitives: read(FILES.primitives), semantic: read(FILES.semantic) });
  const pairs = parseJson(read(FILES.pairs), FILES.pairs);
  return { ...set, pairs };
}

/**
 * Every check from the spec. Returns errors (fail the build), warnings (report only), the contrast
 * pairs with their ratios, and semantic colour tokens that no pair covers.
 */
export function checkTokens(data) {
  const errors = resolveAll(data);
  const warnings = [];

  const cssSeen = new Map();
  for (const t of data.list) {
    if (!t.type) {
      errors.push(`${t.path}: has no $type. Add "$type" on the token or its group.`);
    } else if (!KNOWN_TYPES.has(t.type)) {
      errors.push(`${t.path}: unknown $type "${t.type}". Known: ${[...KNOWN_TYPES].join(", ")}.`);
    }
    if (cssSeen.has(t.css)) {
      errors.push(`${t.path} and ${cssSeen.get(t.css)} both become ${t.css}. Rename one.`);
    }
    cssSeen.set(t.css, t.path);

    if (t.tier === "semantic") {
      if (!isRef(t.value)) {
        errors.push(
          `${t.path}: a semantic token must alias a primitive, like "{color.neutral.900}", not hold a raw value (${JSON.stringify(t.value)}). Add the primitive to primitives.json and alias it.`,
        );
      }
      if (!t.description) {
        errors.push(`${t.path}: needs a $description that says when to use it, in one plain sentence.`);
      }
    }
    if (t.type === "color" && t.resolved !== undefined && toHex(t.resolved) === null) {
      errors.push(`${t.path}: colour value ${JSON.stringify(t.resolved)} is not a hex string or an sRGB colour object.`);
    }
  }

  if (!Array.isArray(data.pairs)) {
    errors.push(`${FILES.pairs}: must be an array of { text, background, min }.`);
  }
  const pairs = [];
  const covered = new Set();
  for (const p of Array.isArray(data.pairs) ? data.pairs : []) {
    const text = data.byPath.get(p.text);
    const bg = data.byPath.get(p.background);
    const min = Number(p.min);
    if (!text || !bg || !Number.isFinite(min)) {
      errors.push(`${FILES.pairs}: pair ${JSON.stringify(p)} names a token that does not exist or has no numeric min.`);
      continue;
    }
    const textHex = toHex(text.resolved);
    const bgHex = toHex(bg.resolved);
    if (!textHex || !bgHex) continue; // already reported above
    const ratio = contrastRatio(textHex, bgHex);
    const passes = ratio >= min;
    pairs.push({ text: p.text, background: p.background, textValue: textHex, backgroundValue: bgHex, ratio: Number(ratio.toFixed(2)), min, passes });
    covered.add(p.text).add(p.background);
    if (!passes) {
      errors.push(
        `contrast: ${p.text} (${textHex}) on ${p.background} (${bgHex}) is ${ratio.toFixed(2)}:1, below the ${min}:1 minimum. The fix belongs in Figma: adjust the colour there and publish again.`,
      );
    }
  }
  const uncovered = data.list
    .filter((t) => t.tier === "semantic" && t.type === "color" && !covered.has(t.path))
    .map((t) => t.path);
  if (uncovered.length) {
    warnings.push(`not covered by a contrast pair: ${uncovered.join(", ")}. Add pairs to ${FILES.pairs} if text is ever set on or in these colours.`);
  }

  return { errors, warnings, pairs, uncovered };
}

export function formatPairsTable(pairs) {
  if (!pairs.length) return "(no contrast pairs)";
  const rows = pairs.map((p) => [p.text, p.background, `${p.ratio.toFixed(2)}:1`, `${p.min}:1`, p.passes ? "pass" : "FAIL"]);
  const head = ["text", "background", "ratio", "min", "result"];
  const widths = head.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i].length)));
  const line = (r) => r.map((c, i) => c.padEnd(widths[i])).join("  ");
  return [line(head), widths.map((w) => "-".repeat(w)).join("  "), ...rows.map(line)].join("\n");
}

/** The resolved data the site and consumers read: dist/tokens.json. */
export function resolvedJson(data, checked, { version }) {
  return {
    name: "holotekt-design-system",
    version,
    generatedAt: new Date().toISOString(),
    prefix: PREFIX,
    tokens: data.list.map((t) => ({
      path: t.path,
      css: t.css,
      tier: t.tier,
      type: t.type,
      value: t.resolved,
      alias: t.alias,
      description: t.description ?? null,
    })),
    contrastPairs: checked.pairs,
    uncovered: checked.uncovered,
  };
}
