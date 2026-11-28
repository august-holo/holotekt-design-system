// One model for every docs page. The HTML page and its Markdown twin are both rendered from a
// Page, so they cannot drift. Foundation pages are built from dist/tokens.json alone: adding a
// token updates the page with no page edits.
import fs from "node:fs";
import path from "node:path";
import {
  changelog,
  componentData,
  consumerRules,
  decisions,
  REPO_URL,
  ROOT,
  luminance,
  modeLabel,
  showSize,
  showValue,
  SITE_URL,
  tokenData,
  version,
  type ComponentInfo,
  type Level,
  type Token,
  type TokenData,
} from "./data";

export type Part = { text: string; href?: string } | { token: string; label?: string };
export type Cell =
  | string
  | { text: string; swatch?: string; code?: boolean; className?: string; style?: Record<string, string>; muted?: boolean }
  | { parts: Part[] }
  | { bar: string; label?: string };

export type Block =
  | { kind: "p"; text: string; muted?: boolean }
  | { kind: "eyebrow"; text: string }
  | { kind: "h2"; text: string; id?: string }
  | { kind: "h3"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "links"; items: { text: string; href: string; note?: string }[]; big?: boolean }
  | { kind: "table"; columns: string[]; rows: Cell[][]; headless?: boolean; widths?: string[]; strongRule?: boolean; reference?: boolean }
  /** Rows of cells that wrap on narrow screens: each cell has a flex basis (a token expression) and a grow factor. */
  | { kind: "rows"; columns: string[]; cells: { basis: string; grow: number }[]; rows: Cell[][]; headless?: boolean; strongRule?: boolean }
  | { kind: "ramp"; name: string; steps: { step: string; path: string; css: string; value: string }[] }
  | { kind: "specimen"; text: string; className?: string; style?: Record<string, string>; label?: string }
  | { kind: "sample"; label?: string; style: Record<string, string>; text?: string; className?: string; inner?: { style?: Record<string, string>; text?: string; className?: string }[] }
  | { kind: "row"; items: Block[] }
  | { kind: "tiles"; items: string[] }
  | { kind: "index"; rows: { title: string; line: string; href: string }[] }
  | { kind: "details"; id: string; summary: string; blocks: Block[] }
  | { kind: "pager"; prev?: { text: string; href: string }; next?: { text: string; href: string } }
  /** A real component rendered by app/live.tsx; the code is what a consumer writes for it. */
  | { kind: "live"; example: LiveId; label: string; code: string }
  | { kind: "md"; markdown: string };

export const LIVE_IDS = ["button-states", "button-link", "card-offset-on", "card-offset-off", "thumbnail-list", "thumbnail-list-hover", "thumbnail-states", "thumbnail-row", "thumbnail-row-hover", "thumbnail-row-focus", "divider-hairline", "divider-strong"] as const;
export type LiveId = (typeof LIVE_IDS)[number];

export interface Page {
  route: string;
  title: string;
  description: string;
  blocks: Block[];
  /** "foundation": eyebrow above the title, no lede. "component": eyebrow and lede. "bare": title only. Default: title and lede. */
  template?: "foundation" | "component" | "bare" | "plain";
  /** For component pages: the atomic level, shown in the eyebrow and in llms.txt. */
  level?: Level;
}

// --- foundations --------------------------------------------------------------------------------

export const FOUNDATIONS = ["color", "typography", "spacing", "shape"] as const;
export type Foundation = (typeof FOUNDATIONS)[number];

const FOUNDATION_INFO: Record<Foundation, { title: string; description: string; session: string }> = {
  color: { title: "Color", description: "Colour primitives, the semantic colour roles that alias them, and the contrast pairs the system allows.", session: "color" },
  typography: { title: "Typography", description: "Five font families with one job each, a nine-step size scale, the sizes that step down on small screens, and fourteen text styles as live specimens.", session: "typography" },
  spacing: { title: "Spacing and layout", description: "An eleven-step space scale, the inset and gap roles that alias it, two content widths, two breakpoints, the values that change on phones, and the dotted grid.", session: "spacing and layout" },
  shape: { title: "Shape and elevation", description: "Four corner radii, two border widths, the five border recipes, and tonal elevation: depth is a surface colour with a border on what overlaps. No shadows.", session: "shape and elevation" },
};
export const foundationTitle = (kind: Foundation) => FOUNDATION_INFO[kind].title;

const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty"];
const word = (n: number, cap = false) => {
  const w = n <= 20 ? WORDS[n] : String(n);
  return cap ? w[0].toUpperCase() + w.slice(1) : w;
};

/** The facts the Foundations index states, counted from the token data so they cannot go stale. */
export function foundationFacts(data: TokenData) {
  const t = data.tokens;
  const colours = t.filter((x) => x.type === "color");
  const ramps = new Set(colours.filter((x) => x.tier === "primitive").map((x) => x.path.split(".").slice(0, 2).join("."))).size;
  const roles = colours.filter((x) => x.tier === "semantic").length;
  const pairs = data.contrastPairs.length;
  const families = t.filter((x) => x.type === "fontFamily").length;
  const sizes = t.filter((x) => x.path.startsWith("font.size.")).length;
  const styles = t.filter((x) => x.type === "typography").length;
  const breakpoints = t.filter((x) => x.path.startsWith("layout.breakpoint.")).length;
  const widths = t.filter((x) => x.path.startsWith("layout.width.")).length;
  const radii = t.filter((x) => x.path.startsWith("radius.")).length;
  const weights = t.filter((x) => x.path.startsWith("border.width.")).length;
  return {
    color: `${word(ramps, true)} ramps and ${roles} roles, in light and dark, with ${pairs} checked contrast pairs.`,
    typography: `${word(families, true)} families with one job each, ${word(sizes)} sizes, ${word(styles)} text styles.`,
    spacing: `One scale on a base of 4, ${word(breakpoints)} breakpoints, ${word(widths)} content widths.`,
    shape: `Tonal surfaces with a border on what overlaps. ${word(radii, true)} radii, ${word(weights)} border weights.`,
  } satisfies Record<Foundation, string>;
}

// --- scenarios ------------------------------------------------------------------------------------

type ScenarioRow = { when: string; use: Part[] };
const scenarios = (): Record<Foundation, ScenarioRow[]> => JSON.parse(fs.readFileSync(path.join(ROOT, "content", "scenarios.json"), "utf8"));

const READING = "var(--ht-layout-width-reading)";
const LABEL = "calc(var(--ht-space-900) + var(--ht-space-800))"; // 160px, the mock's label column

function scenarioTable(kind: Foundation): Block {
  return {
    kind: "rows",
    columns: ["When you are…", "Use"],
    strongRule: true,
    cells: [{ basis: `calc(${READING} * 0.4)`, grow: 28 }, { basis: READING, grow: 72 }],
    rows: scenarios()[kind].map((r) => [{ text: r.when }, { parts: r.use }]),
  };
}

// --- shared cells ---------------------------------------------------------------------------------

const code = (text: string): Cell => ({ text, code: true });
const valueCell = (t: Token): Cell => {
  const text = showValue(t.value);
  return t.type === "color" ? { text, swatch: text, code: true } : { text, code: true };
};
const px = (v: unknown) => (v && typeof v === "object" && "value" in (v as object) ? `${(v as { value: number }).value}px` : showValue(v));

// --- reference tables (unchanged content, now inside <details>) ---------------------------------

function primitiveTable(tokens: Token[]): Block {
  return { kind: "table", reference: true, columns: ["Token", "CSS variable", "Value", "Description"], rows: tokens.map((t) => [code(t.path), code(t.css), valueCell(t), t.description ?? ""]) };
}

function semanticTable(tokens: Token[], modes: string[], allModes: string[]): Block {
  const suffix = (m: string) => {
    const label = modeLabel(m, allModes);
    return label ? ` (${label})` : "";
  };
  const modeCell = (t: Token, m: string): Cell[] => {
    const v = m === "default" ? { value: t.value, alias: t.alias } : t.modes?.[m];
    if (!v) return ["", ""];
    const text = showValue(v.value);
    return [code(v.alias ?? ""), t.type === "color" ? { text, swatch: text, code: true } : code(text)];
  };
  return {
    kind: "table",
    reference: true,
    columns: ["Token", "CSS variable", ...modes.flatMap((m) => [`Aliases${suffix(m)}`, `Value${suffix(m)}`]), "When to use"],
    rows: tokens.map((t) => [code(t.path), code(t.css), ...modes.flatMap((m) => modeCell(t, m)), t.description ?? ""]),
  };
}

function rampSteps(tokens: Token[]) {
  const steps = tokens.map((t) => ({ step: t.path.split(".").pop()!, path: t.path, css: t.css, value: showValue(t.value) }));
  const numeric = steps.every((s) => /^\d+$/.test(s.step));
  return steps.sort((a, b) => (numeric ? Number(a.step) - Number(b.step) : luminance(b.value) - luminance(a.value)));
}

function colorReference(data: TokenData): Block[] {
  const tokens = data.tokens.filter((t) => t.type === "color");
  const primitives = tokens.filter((t) => t.tier === "primitive");
  const semantic = tokens.filter((t) => t.tier === "semantic");
  const blocks: Block[] = [];
  blocks.push({ kind: "h3", text: "Primitives" });
  const groups = new Map<string, Token[]>();
  for (const t of primitives) {
    const key = t.path.split(".").slice(0, 2).join(".");
    groups.set(key, [...(groups.get(key) ?? []), t]);
  }
  for (const [name, list] of groups) {
    blocks.push({ kind: "p", text: name, muted: true });
    blocks.push(primitiveTable(rampSteps(list).map((s) => primitives.find((t) => t.path === s.path)!)));
  }
  blocks.push({ kind: "h3", text: "Semantic tokens" });
  blocks.push(semanticTable(semantic, data.colorModes, data.modes));
  const ratioCol = (m: string) => {
    const label = modeLabel(m, data.modes);
    return label ? `Ratio (${label})` : "Ratio";
  };
  blocks.push({ kind: "h3", text: "Contrast pairs" });
  blocks.push({
    kind: "table",
    reference: true,
    columns: ["Text", "Background", "Minimum", ...data.colorModes.map(ratioCol), "Result"],
    rows: data.contrastPairs.map((p) => [{ text: p.text, swatch: p.textValue, code: true }, { text: p.background, swatch: p.backgroundValue, code: true }, `${p.min}:1`, ...data.colorModes.map((m) => (p.modes[m] ? `${p.modes[m].ratio.toFixed(2)}:1` : "")), p.passes ? "Pass" : "Fail"]),
  });
  if (data.exempt?.length) {
    blocks.push({ kind: "h3", text: "Exempt from contrast pairs" });
    blocks.push({ kind: "table", reference: true, columns: ["Token", "Reason"], rows: data.exempt.map((e) => [code(e.token), e.reason]) });
  }
  if (data.uncovered.length) {
    blocks.push({ kind: "h3", text: "Not covered by a contrast pair" });
    blocks.push({ kind: "list", items: data.uncovered });
  }
  return blocks;
}

function typographyReference(data: TokenData): Block[] {
  const families = data.tokens.filter((t) => t.type === "fontFamily");
  const sizes = data.tokens.filter((t) => t.type === "dimension" && t.path.startsWith("font.size."));
  const steps = data.tokens.filter((t) => t.base === "breakpoint" && t.path.startsWith("text."));
  const styles = orderedStyles(data);
  const mediaModes = data.modes.filter((m) => data.modeCss[m]?.kind === "media");
  const sizeLabel = (m: string) => (m === "default" ? "Desktop" : m[0].toUpperCase() + m.slice(1));
  const blocks: Block[] = [];
  blocks.push({ kind: "h3", text: "Families" });
  blocks.push({ kind: "table", reference: true, columns: ["Token", "CSS variable", "Family", "Fallback stack", "Job"], rows: families.map((t) => [code(t.path), code(t.css), showValue(t.value), code((data.fonts[t.path]?.stack ?? []).slice(1).join(", ")), t.description ?? ""]) });
  blocks.push({ kind: "h3", text: "Size scale" });
  blocks.push({ kind: "table", reference: true, columns: ["Token", "CSS variable", "Size", "Description"], rows: sizes.map((t) => [code(t.path), code(t.css), showSize(t.value), t.description ?? ""]) });
  if (steps.length) {
    blocks.push({ kind: "h3", text: "Sizes that change with the viewport" });
    blocks.push({
      kind: "table",
      reference: true,
      columns: ["Token", "CSS variable", ...["default", ...mediaModes].flatMap((m) => [`Aliases (${sizeLabel(m)})`, `Size (${sizeLabel(m)})`]), "Description"],
      rows: steps.map((t) => [code(t.path), code(t.css), ...["default", ...mediaModes].flatMap((m) => { const v = m === "default" ? { value: t.value, alias: t.alias } : (t.modes?.[m] ?? { value: t.value, alias: t.alias }); return [code(v.alias ?? "") as Cell, showSize(v.value)]; }), t.description ?? ""]),
    });
  }
  blocks.push({ kind: "h3", text: "Text styles" });
  blocks.push({
    kind: "table",
    reference: true,
    columns: ["Style", "Class", "Family", "Size", "Weight", "Line height", "Letter spacing", "Case", "Use"],
    rows: styles.map((t) => {
      const raw = (t.raw ?? {}) as Record<string, unknown>;
      const sizeAlias = typeof raw.fontSize === "string" ? raw.fontSize.replace(/[{}]/g, "") : "";
      const familyAlias = typeof raw.fontFamily === "string" ? raw.fontFamily.replace(/[{}]/g, "") : "";
      const sizeOf = (m: string) => showSize(((m === "default" ? t.value : (t.modes?.[m]?.value ?? t.value)) as { fontSize?: unknown })?.fontSize);
      const sizes = t.modes ? ["default", ...mediaModes].map((m) => `${sizeLabel(m)} ${sizeOf(m)}`).join("; ") : sizeOf("default");
      return [code(t.path), code(`.${t.className}`), code(familyAlias), { text: `${sizeAlias}: ${sizes}`, code: true }, String(raw.fontWeight ?? ""), String(raw.lineHeight ?? ""), showValue(raw.letterSpacing ?? 0), String(raw.textTransform ?? "none"), t.description ?? ""];
    }),
  });
  blocks.push({ kind: "h3", text: "Loading the fonts" });
  blocks.push({ kind: "p", text: "The token package ships family names and fallback stacks, not font files. A site that uses the system loads these files itself, self-hosted as woff2 with font-display: swap. This site loads the Latin subset from the @fontsource packages." });
  blocks.push({ kind: "table", reference: true, columns: ["Family", "Files to load", "Package", "Licence", "Source"], rows: families.map((t) => { const f = data.fonts[t.path]; return [showValue(t.value), f?.files.join(", ") ?? "", code(f?.package ?? ""), f?.license ?? "", f?.source ?? ""]; }) });
  blocks.push({ kind: "links", items: families.map((t) => { const f = data.fonts[t.path]; return { text: `${showValue(t.value)} licence`, href: `/fonts/${(f?.package ?? "").split("/").pop()}/LICENSE.txt`, note: f?.license }; }) });
  return blocks;
}

function spacingReference(data: TokenData): Block[] {
  const spacing = data.tokens.filter((t) => t.base === "spacing");
  const scale = spacing.filter((t) => t.path.startsWith("space."));
  const roles = spacing.filter((t) => t.path.startsWith("inset.") || t.path.startsWith("gap.") || t.path.startsWith("layout.grid."));
  const widths = spacing.filter((t) => t.path.startsWith("layout.width."));
  const breakpoints = spacing.filter((t) => t.path.startsWith("layout.breakpoint."));
  const stepping = data.tokens.filter((t) => t.base === "breakpoint" && t.path.startsWith("layout."));
  const mediaModes = data.modes.filter((m) => data.modeCss[m]?.kind === "media");
  const sizeLabel = (m: string) => (m === "default" ? "Desktop" : m[0].toUpperCase() + m.slice(1));
  const blocks: Block[] = [];
  blocks.push({ kind: "h3", text: "The scale" });
  blocks.push({ kind: "table", reference: true, columns: ["Token", "CSS variable", "Size", "Description"], rows: scale.map((t) => [code(t.path), code(t.css), showSize(t.value), t.description ?? ""]) });
  blocks.push({ kind: "h3", text: "Inset, gap and grid" });
  blocks.push({ kind: "table", reference: true, columns: ["Token", "CSS variable", "Aliases", "Size", "When to use"], rows: roles.map((t) => [code(t.path), code(t.css), code(t.alias ?? ""), showSize(t.value), t.description ?? ""]) });
  blocks.push({ kind: "h3", text: "Widths and breakpoints" });
  blocks.push({ kind: "table", reference: true, columns: ["Token", "CSS variable", "Value", "Description"], rows: [...widths.map((t) => [code(t.path), code(t.css), showSize(t.value), t.description ?? ""] as Cell[]), ...breakpoints.map((t) => [code(t.path), code(t.css), `${showValue(t.value)}px`, t.description ?? ""] as Cell[])] });
  if (stepping.length) {
    blocks.push({ kind: "h3", text: "What changes on phones" });
    blocks.push({
      kind: "table",
      reference: true,
      columns: ["Token", "CSS variable", ...["default", ...mediaModes].flatMap((m) => [`Aliases (${sizeLabel(m)})`, `Value (${sizeLabel(m)})`]), "Description"],
      rows: stepping.map((t) => [code(t.path), code(t.css), ...["default", ...mediaModes].flatMap((m) => { const v = m === "default" ? { value: t.value, alias: t.alias } : (t.modes?.[m] ?? { value: t.value, alias: t.alias }); return [code(v.alias ?? "") as Cell, t.type === "number" ? showValue(v.value) : showSize(v.value)]; }), t.description ?? ""]),
    });
  }
  return blocks;
}

function shapeReference(data: TokenData): Block[] {
  const shape = data.tokens.filter((t) => t.base === "shape");
  const surfaces = data.tokens.filter((t) => t.path.startsWith("color.surface."));
  const blocks: Block[] = [];
  blocks.push({ kind: "h3", text: "Radius and border widths" });
  blocks.push({ kind: "table", reference: true, columns: ["Token", "CSS variable", "Value", "Use"], rows: shape.map((t) => [code(t.path), code(t.css), px(t.value), t.description ?? ""]) });
  blocks.push({ kind: "h3", text: "Surfaces" });
  blocks.push(semanticTable(surfaces, data.colorModes, data.modes));
  return blocks;
}

// --- live samples per foundation --------------------------------------------------------------

const SPECIMEN = "the quick brown fox maps a port";
const roleCard = (inner: { style?: Record<string, string>; text?: string; className?: string }[]): Block => ({
  kind: "sample",
  className: "card",
  style: { background: "var(--ht-color-surface-raised)", borderRadius: "var(--ht-radius-sm)", padding: "var(--ht-inset-lg)", display: "flex", flexDirection: "column", gap: "var(--ht-gap-sm)", alignItems: "flex-start", flex: "1 1 0" },
  inner,
});

function colorSamples(data: TokenData): Block[] {
  const primitives = data.tokens.filter((t) => t.type === "color" && t.tier === "primitive");
  const groups = new Map<string, Token[]>();
  for (const t of primitives) {
    const key = t.path.split(".").slice(0, 2).join(".");
    groups.set(key, [...(groups.get(key) ?? []), t]);
  }
  const textRoles = ["primary", "secondary", "muted", "link"];
  const statuses = ["working", "done", "caution", "failed"];
  const accents = ["default", "hover", "pressed"];
  return [
    { kind: "h2", text: "Roles in use" },
    {
      kind: "row",
      items: [
        roleCard(textRoles.map((r) => ({ text: `text/${r}`, className: "ht-ui-body", style: { color: `var(--ht-color-text-${r})` } }))),
        roleCard(statuses.map((s) => ({ text: `status/${s}`, className: "ht-ui-label chip", style: { background: `var(--ht-color-status-${s}-subtle)`, color: `var(--ht-color-status-${s}-text)` } }))),
        roleCard(accents.map((a) => ({ text: `accent/${a}`, className: "ht-ui-button button", style: { background: `var(--ht-color-accent-${a})`, color: "var(--ht-color-text-on-accent)" } }))),
      ],
    },
    { kind: "h2", text: "Raw values" },
    ...[...groups].map(([name, list]) => ({ kind: "ramp", name: name.split(".").pop()!, steps: rampSteps(list) }) as Block),
    ...pageBackgroundSection(data),
  ];
}

/** The dotted grid as the default page background (B-055), mirroring the Figma section. */
function pageBackgroundSection(data: TokenData): Block[] {
  const dot = data.tokens.find((t) => t.path === "color.surface.dot");
  const pitch = data.tokens.find((t) => t.path === "layout.grid.dot-pitch");
  const pageTok = data.tokens.find((t) => t.path === "color.surface.page");
  if (!dot || !pitch || !pageTok) return [];
  const aliasIn = (t: Token, m: string) => (m === "default" ? t.alias : (t.modes?.[m]?.alias ?? t.alias)) ?? "";
  const short = (p: string) => p.replace("color.", "").replace(".", "/");
  const modes = data.colorModes;
  const label = (m: string) => (modeLabel(m, data.modes) || "default").toLowerCase();
  const perMode = (t: Token) => modes.map((m) => `${short(aliasIn(t, m))} in ${label(m)}`).join(", ");
  return [
    { kind: "h2", text: "Default page background" },
    { kind: "p", text: "Every page in the system sits on the dotted grid by default. It is surface/page with dots in surface/dot, spaced at layout/grid/dot-pitch. It is part of the look, not a layer of depth. The package ships it as the .ht-page-grid class." },
    { kind: "sample", label: ".ht-page-grid: surface/page with dots in surface/dot at the dot pitch, with a raised surface and text on it", className: "ht-page-grid pageGridSample", style: { padding: "var(--ht-inset-lg)", display: "flex", gap: "var(--ht-gap-lg)", alignItems: "flex-start", border: "var(--ht-border-width-thin) solid var(--ht-color-border-divider)" }, inner: [
      { className: "ht-ui-body", style: { flex: "1 1 0" }, text: "Text may sit directly on the grid; contrast is measured against surface/page." },
      { style: { flex: "1 1 0", background: "var(--ht-color-surface-raised)", borderRadius: "var(--ht-radius-sm)", padding: "var(--ht-inset-lg)" }, className: "ht-ui-body", text: "A raised surface is a plain fill and covers the dots." },
    ] },
    { kind: "rows", headless: true, columns: ["What", "Token", "Value"], cells: [{ basis: LABEL, grow: 0 }, { basis: `calc(${READING} * 0.35)`, grow: 0 }, { basis: READING, grow: 1 }], rows: [
      [{ text: "Background" }, code(pageTok.path), { text: perMode(pageTok), muted: true }],
      [{ text: "Dot colour" }, code(dot.path), { text: `${perMode(dot)}. Provisional.`, muted: true }],
      [{ text: "Dot spacing" }, code(pitch.path), { text: `${showSize(pitch.value)}, the same as the grid gutter`, muted: true }],
    ] },
    { kind: "list", items: [
      "Default: a page uses the dotted grid unless there is a reason not to.",
      "Decoration, not elevation. The dots do not mean a surface is higher or lower.",
      "Contrast is measured against surface/page. The dots are faint enough that text can sit on them directly.",
      "Surfaces (raised, sunken, overlay) are plain fills and cover the dots.",
      "To be decided: whether dot colour and density can vary, and by how much. Today each has one value.",
    ] },
  ];
}

const STYLE_ORDER = ["heading.display", "heading.1", "heading.2", "heading.3", "heading.4", "reading.lede", "reading.body", "ui.body", "ui.small", "ui.label", "ui.meta", "ui.button", "voice.machine", "voice.human"];
const styleRank = (p: string) => { const i = STYLE_ORDER.indexOf(p); return i === -1 ? STYLE_ORDER.length : i; };
/** Text styles largest first, as the session listed them; JSON would put heading.1 before heading.display. */
const orderedStyles = (data: TokenData) => data.tokens.filter((t) => t.type === "typography").sort((a, b) => styleRank(a.path) - styleRank(b.path) || a.path.localeCompare(b.path));

function typographySamples(data: TokenData): Block[] {
  const families = data.tokens.filter((t) => t.type === "fontFamily");
  const styles = orderedStyles(data);
  const familyStyle: Record<string, string> = { heading: "ht-heading-2", sans: "ht-ui-body", reading: "ht-reading-lede", machine: "ht-voice-machine", human: "ht-voice-human" };
  const styleText: Record<string, string> = {
    "heading.display": "Mapping a port", "heading.1": "What the map shows", "heading.2": "Who sets the pace", "heading.3": "Card or subsection title", "heading.4": "Small heading",
    "reading.lede": "A port looks like one organisation from the outside.", "reading.body": "Reading left to right, the map follows a container from ship to gate.",
    "ui.body": "Card content and descriptions", "ui.small": "Tables and dense interface text", "ui.label": "Eyebrow label", "ui.meta": "25 Nov 2026 · 8 min read", "ui.button": "Open the map",
    "voice.machine": "Agent: three actors changed since last run.", "voice.human": "A note from me: this part surprised me.",
  };
  return [
    { kind: "h2", text: "Families" },
    { kind: "rows", headless: true, columns: ["Family", "Specimen"], cells: [{ basis: LABEL, grow: 0 }, { basis: READING, grow: 1 }], rows: families.map((t) => { const role = t.path.split(".").pop()!; return [{ text: role, className: "ht-ui-label", muted: true }, { text: `${showValue(t.value)} — ${SPECIMEN}`, className: familyStyle[role] ?? "ht-ui-body" }]; }) },
    { kind: "h2", text: "Text styles" },
    { kind: "rows", headless: true, columns: ["Style", "Specimen"], cells: [{ basis: LABEL, grow: 0 }, { basis: READING, grow: 1 }], rows: styles.map((t) => [{ text: t.path.replace(".", "/"), className: "ht-ui-meta", muted: true }, { text: styleText[t.path] ?? (t.description ?? t.path), className: t.className }]) },
  ];
}

function spacingSamples(data: TokenData): Block[] {
  const get = (p: string) => data.tokens.find((t) => t.path === p);
  const num = (p: string) => { const t = get(p); const v = t?.value as { value?: number } | number | undefined; return typeof v === "number" ? v : (v?.value ?? ""); };
  const mobile = (p: string) => { const t = get(p); const v = t?.modes?.mobile?.value as { value?: number } | number | undefined; return typeof v === "number" ? v : (v?.value ?? ""); };
  const scale = data.tokens.filter((t) => t.path.startsWith("space."));
  return [
    { kind: "h2", text: "Layout" },
    {
      kind: "rows",
      headless: true,
      columns: ["Measure", "Value", "Note"],
      cells: [{ basis: LABEL, grow: 0 }, { basis: "calc(var(--ht-space-900) + var(--ht-space-500))", grow: 0 }, { basis: READING, grow: 1 }],
      rows: [
        [{ text: "Reading width" }, { text: String(num("layout.width.reading")), muted: true }, { text: "About 66 characters a line", muted: true }],
        [{ text: "Page width" }, { text: String(num("layout.width.page")), muted: true }, { text: "Content stops growing here", muted: true }],
        [{ text: "Breakpoints" }, { text: `${num("layout.breakpoint.md")} · ${num("layout.breakpoint.lg")}`, muted: true }, { text: `Below ${num("layout.breakpoint.md")}, page margin, section gap and large type step down`, muted: true }],
        [{ text: "Grid" }, { text: `${num("layout.grid.columns")} · ${mobile("layout.grid.columns")}`, muted: true }, { text: `Columns on desktop and on phones, ${num("layout.grid.gutter")} gutter`, muted: true }],
        [{ text: "Dot pitch" }, { text: String(num("layout.grid.dot-pitch")), muted: true }, { text: "The dotted background, aligned to the gutter", muted: true }],
      ],
    },
    { kind: "h2", text: "Raw values" },
    { kind: "rows", headless: true, columns: ["Token", "px", "Bar"], cells: [{ basis: LABEL, grow: 0 }, { basis: "var(--ht-space-800)", grow: 0 }, { basis: "var(--ht-space-900)", grow: 1 }], rows: scale.map((t) => [{ text: t.path.replace(".", "/") }, { text: `${num(t.path)} px`, muted: true }, { bar: t.css }]) },
  ];
}

function shapeSamples(data: TokenData): Block[] {
  const ladder = [
    { p: "color.surface.sunken", use: "Wells and thumbnails" },
    { p: "color.surface.page", use: "The page" },
    { p: "color.surface.raised", use: "Cards and panels" },
    { p: "color.surface.overlay", use: "Menus and dialogs, with a border" },
  ];
  const recipes = [
    { name: "Hairline", width: "thin", color: "subtle" },
    { name: "Divider", width: "thin", color: "divider" },
    { name: "Overlay border", width: "thin", color: "strong" },
    { name: "Strong outline", width: "thick", color: "strong" },
    { name: "Focus ring", width: "thick", color: "focus" },
  ];
  const radii = data.tokens.filter((t) => t.path.startsWith("radius."));
  const box = (style: Record<string, string>) => ({ ...style, background: "var(--ht-color-surface-raised)" });
  return [
    { kind: "h2", text: "Surfaces" },
    {
      kind: "row",
      items: [
        {
          kind: "rows",
          headless: true,
          columns: ["Swatch", "Surface", "Use"],
          cells: [{ basis: "var(--ht-space-700)", grow: 0 }, { basis: LABEL, grow: 0 }, { basis: `calc(${READING} / 3)`, grow: 1 }],
          rows: ladder.map((l) => [{ text: "", swatch: `var(--ht-${l.p.replace(/\./g, "-")})`, style: { border: `var(--ht-border-width-thin) solid var(--ht-color-border-${l.p.endsWith("overlay") ? "strong" : "subtle"})` } }, { text: l.p.replace("color.", "").replace(".", "/") }, { text: l.use, muted: true }]),
        },
        {
          kind: "sample",
          className: "demo",
          style: { background: "var(--ht-color-surface-sunken)", position: "relative", minHeight: "calc(var(--ht-space-900) * 2.75)", padding: "var(--ht-inset-lg)", flex: "1 1 0" },
          inner: [
            { className: "demoCard", style: { position: "absolute", left: "var(--ht-inset-lg)", top: "var(--ht-inset-lg)", width: "45%", background: "var(--ht-color-surface-raised)", borderRadius: "var(--ht-radius-sm)", padding: "var(--ht-inset-lg)", display: "flex", flexDirection: "column", gap: "var(--ht-gap-sm)" }, text: "Raised card|Sits on the page by tone alone. No border, no shadow." },
            { className: "demoMenu", style: { position: "absolute", left: "40%", top: "45%", width: "33%", background: "var(--ht-color-surface-overlay)", border: "var(--ht-border-width-thin) solid var(--ht-color-border-strong)", borderRadius: "var(--ht-radius-sm)", paddingBlock: "var(--ht-space-200)" }, text: "Overlay menu|Hovered row|Another row" },
          ],
        },
      ],
    },
    { kind: "h2", text: "Borders" },
    { kind: "row", items: recipes.map((r) => ({ kind: "sample", label: `${r.name}|${r.width} · border/${r.color}`, style: box({ width: "var(--ht-space-900)", height: "var(--ht-space-800)", borderRadius: "var(--ht-radius-sm)", border: `var(--ht-border-width-${r.width}) solid var(--ht-color-border-${r.color})` }) }) as Block) },
    { kind: "h2", text: "Radius" },
    { kind: "row", items: radii.map((t) => ({ kind: "sample", label: `${t.path.replace(".", "/")}|${t.path.endsWith("full") ? "full" : px(t.value).replace("px", "")}${t.path.endsWith("sm") ? " · default" : ""}`, style: box({ width: "var(--ht-space-900)", height: "var(--ht-space-900)", borderRadius: `var(${t.css})`, border: "var(--ht-border-width-thin) solid var(--ht-color-border-strong)" }) }) as Block) },
  ];
}

// --- pages ----------------------------------------------------------------------------------------

export function foundationPage(kind: Foundation): Page {
  const info = FOUNDATION_INFO[kind];
  const data = tokenData();
  const published = { color: data.tokens.some((t) => t.type === "color"), typography: data.tokens.some((t) => t.type === "typography"), spacing: data.tokens.some((t) => t.base === "spacing"), shape: data.tokens.some((t) => t.base === "shape") }[kind];
  const page: Page = { route: `/foundations/${kind}`, title: info.title, description: info.description, template: "foundation", blocks: [] };
  if (!published) {
    page.blocks.push({ kind: "p", text: `Not published yet. Tokens for ${info.title.toLowerCase()} arrive with the ${info.session} session.` });
    return page;
  }
  const samples = { color: colorSamples, typography: typographySamples, spacing: spacingSamples, shape: shapeSamples }[kind](data);
  const reference = { color: colorReference, typography: typographyReference, spacing: spacingReference, shape: shapeReference }[kind](data);
  const i = FOUNDATIONS.indexOf(kind);
  const prev = i > 0 ? FOUNDATIONS[i - 1] : undefined;
  const next = i < FOUNDATIONS.length - 1 ? FOUNDATIONS[i + 1] : undefined;
  page.blocks.push({ kind: "h2", text: "Scenarios and roles" }, scenarioTable(kind), ...samples);
  page.blocks.push({ kind: "details", id: "reference", summary: "Every token, with its value", blocks: reference });
  page.blocks.push({ kind: "pager", prev: prev && { text: `← ${foundationTitle(prev)}`, href: `/foundations/${prev}` }, next: next && { text: `${foundationTitle(next)} →`, href: `/foundations/${next}` } });
  return page;
}

export function foundationsIndexPage(): Page {
  const facts = foundationFacts(tokenData());
  return {
    route: "/foundations",
    title: "Foundations",
    description: "The four foundations of the system: color, typography, spacing and layout, shape and elevation.",
    template: "bare",
    blocks: [{ kind: "index", rows: FOUNDATIONS.map((k) => ({ title: foundationTitle(k), line: facts[k], href: `/foundations/${k}` })) }],
  };
}

export function homePage(): Page {
  return {
    route: "/",
    title: "Holotekt Design System",
    description: "A design system for systemic designers.",
    blocks: [
      { kind: "links", big: true, items: [{ text: "Foundations →", href: "/foundations" }, { text: "Components →", href: "/components" }, { text: "Set up from the README →", href: `${REPO_URL}#readme` }] },
      { kind: "h3", text: "See it in the wild" },
      { kind: "tiles", items: ["Coming soon", "Coming soon"] },
    ],
  };
}

// --- components -----------------------------------------------------------------------------------
// Levels, parts and summaries come from src/components/levels.json through dist/components.json;
// the when-to-use rows, rules and examples mirror each component's Figma sheet.

export const COMPONENT_PAGES = ["button", "card", "divider", "thumbnail", "thumbnail-row", "thumbnail-list"] as const;
export type ComponentSlug = (typeof COMPONENT_PAGES)[number];

type WhenRow = { when: string; use: Part[] };
type ComponentDoc = { when: WhenRow[]; rules: string[]; examples: Extract<Block, { kind: "live" }>[] };
const ref = (name: string): Part => ({ token: name });
const COMPONENT_DOCS: Record<ComponentSlug, ComponentDoc> = {
  button: {
    when: [
      { when: "Offering the one most important action in a view", use: [ref("Button"), { text: ", primary" }] },
      { when: "Offering any other action", use: [ref("Button"), { text: ", secondary" }] },
      { when: "Linking to another page inside a sentence", use: [{ text: "A text link, not a button" }] },
    ],
    rules: [
      "One primary button per view. Everything else is secondary.",
      "States change tone only: hover lighter, pressed darker, following the color roles. No offset and no shadow on buttons.",
      "Primary takes dark text on the accent fill, never white.",
      "Secondary has the thick ink outline and no fill at rest.",
      "Focus shows the focus ring: an outline 2px outside the button, so the button itself does not change.",
      "Disabled buttons cannot be the only way to learn why something is unavailable. Say why nearby.",
      "The label is a verb or a short verb phrase. One size for now.",
      "A button that goes to another page is a link that looks like a button; one that does something is a button. Both look the same.",
    ],
    examples: [
      { kind: "live", example: "button-states", label: "Primary and secondary, at rest, hovered, pressed, focused and disabled", code: `<Button>Open the map</Button>\n<Button kind="secondary">Save a copy</Button>\n<Button disabled>Open the map</Button>` },
      { kind: "live", example: "button-link", label: "A link that looks like a button, with your router's link component", code: `import Link from "next/link";\n\n<Button href="/map" linkComponent={Link}>Open the map →</Button>` },
    ],
  },
  card: {
    when: [
      { when: "Setting a note, aside or summary apart from the page", use: [ref("Card"), { text: ", offset on" }] },
      { when: "Grouping content on a plain raised surface", use: [ref("Card"), { text: ", offset off" }] },
    ],
    rules: [
      "The orange offset is decoration, not elevation. It does not mean the card is on top.",
      "Depth still comes from the surface tone: a card is surface/raised.",
      "No paper texture.",
      "A card is not a link. For something clickable, use a Thumbnail row or a button.",
      "Use the offset sparingly: a few per page.",
    ],
    examples: [
      { kind: "live", example: "card-offset-on", label: "Offset on, the default: border/strong and the hard orange offset", code: `<Card>\n  <span className="ht-ui-label">Label</span>\n  <span className="ht-voice-human">A note in a person’s own words sits here.</span>\n</Card>` },
      { kind: "live", example: "card-offset-off", label: "Offset off: a plain raised surface with border/subtle", code: `<Card offset={false}>…</Card>` },
    ],
  },
  divider: {
    when: [
      { when: "Separating rows inside a surface or list", use: [ref("Divider"), { text: ", hairline" }] },
      { when: "Closing a header or opening a footer", use: [ref("Divider"), { text: ", strong" }] },
    ],
    rules: ["A divider separates; it does not decorate. If spacing alone does the job, use spacing.", "Hairline between rows. Strong only at the edges of a page region."],
    examples: [
      { kind: "live", example: "divider-hairline", label: "Hairline: border/divider at border/width/thin", code: `<Divider />` },
      { kind: "live", example: "divider-strong", label: "Strong: border/strong at border/width/thick", code: `<Divider weight="strong" />` },
    ],
  },
  thumbnail: {
    when: [
      { when: "Showing one image that links somewhere", use: [ref("Thumbnail"), { text: " with an href" }] },
      { when: "Listing several pieces of work", use: [{ text: "Thumbnail list", href: "/components/thumbnail-list" }, { text: ", which is built from this" }] },
    ],
    rules: [
      "The thumbnail is the image itself.",
      "At rest: no border. The image sits on surface/sunken.",
      "On hover: the ink border (border/strong, thick) and the orange offset arrive together, as a short animation of about 150ms.",
      "The offset is decoration and motion. The tones are the elevation system. Neither replaces the other.",
      "Reduced motion: the hover state appears without animating.",
    ],
    examples: [{ kind: "live", example: "thumbnail-states", label: "At rest, hovered, focused as a link, and empty before the image loads", code: `<Thumbnail src="/images/evidence.png" alt="An orange disc" href="/work/evidence" />` }],
  },
  "thumbnail-row": {
    when: [
      { when: "Linking to one piece of work with a picture and a line of text", use: [ref("ThumbnailRow")] },
      { when: "Listing several", use: [{ text: "Thumbnail list", href: "/components/thumbnail-list" }, { text: ", which is built from this" }] },
    ],
    rules: [
      "Sits directly on the page. Not a card.",
      "The whole row is the link. Hovering anywhere on it animates its thumbnail.",
      "On hover the row takes surface/hover. That tone is the elevation system; the thumbnail’s offset is decoration.",
      "Keyboard focus: a thick border/focus ring around the row. The offset is not a focus indicator.",
      "On narrow screens the text drops below the image.",
      "No tags, pills or index numbers.",
    ],
    examples: [
      { kind: "live", example: "thumbnail-row", label: "At rest, directly on the page", code: `<ThumbnailRow href="/work/evidence" title="Building an evidence-based design foundation" summary="Define the personas, map the journey…" image="/images/evidence.png" />` },
      { kind: "live", example: "thumbnail-row-hover", label: "Hovered: surface/hover on the row, border and offset on its thumbnail", code: `<ThumbnailRow … state="hover" />  // docs only; the real state comes from :hover` },
      { kind: "live", example: "thumbnail-row-focus", label: "Keyboard focus: border/focus, thick, around the row", code: `<ThumbnailRow … state="focus" />  // docs only; the real state comes from :focus-visible` },
    ],
  },
  "thumbnail-list": {
    when: [{ when: "Listing a few pieces of work to open", use: [ref("ThumbnailList"), { text: " of " }, { text: "Thumbnail rows", href: "/components/thumbnail-row" }] }],
    rules: ["Rows separated by hairline dividers.", "Sits directly on the page. Not a set of cards.", "For a short list, not a feed."],
    examples: [
      { kind: "live", example: "thumbnail-list", label: "Three rows with hairline dividers; hover a row to see it react", code: `<ThumbnailList aria-label="Selected work">\n  <ThumbnailRow href="/work/evidence" title="Building an evidence-based design foundation" summary="…" image="/images/evidence.png" />\n  <ThumbnailRow href="/work/tactical" title="Solving tactical UI/UX problems" summary="…" image="/images/tactical.png" />\n</ThumbnailList>` },
      { kind: "live", example: "thumbnail-list-hover", label: "The middle row hovered", code: `<ThumbnailRow … state="hover" />  // docs only` },
    ],
  },
};

const componentBySlug = (slug: ComponentSlug): ComponentInfo => {
  const c = componentData().components.find((x) => x.slug === slug);
  if (!c) throw new Error(`dist/components.json has no component with slug ${slug}; run npm run components:build`);
  return c;
};
const componentByName = (name: string): ComponentInfo => {
  const c = componentData().components.find((x) => x.name === name);
  if (!c) throw new Error(`dist/components.json has no component ${name}; run npm run components:build`);
  return c;
};
const levelOf = (c: ComponentInfo): Level => {
  const l = componentData().levels.find((x) => x.id === c.level);
  if (!l) throw new Error(`levels.json has no level ${c.level}`);
  return l;
};
export const componentTitle = (slug: ComponentSlug) => componentBySlug(slug).title;
const usedBy = (name: string) => componentData().components.filter((c) => c.madeOf.includes(name));
const storyDocsId = (c: ComponentInfo) => `${levelOf(c).plural.toLowerCase()}-${c.title.toLowerCase().replace(/\s+/g, "-")}--docs`;
const partLink = (c: ComponentInfo): Part => ({ text: c.title, href: `/components/${c.slug}` });
const joinParts = (items: Part[], last = " and "): Part[] => items.flatMap((p, i) => (i === 0 ? [p] : [{ text: i === items.length - 1 ? last : ", " }, p]));

function propsTable(c: ComponentInfo): Block[] {
  const blocks: Block[] = [
    {
      kind: "rows",
      columns: ["Prop", "Type", "Default", "Description"],
      cells: [{ basis: LABEL, grow: 0 }, { basis: `calc(${READING} * 0.3)`, grow: 0 }, { basis: "var(--ht-space-800)", grow: 0 }, { basis: `calc(${READING} * 0.5)`, grow: 1 }],
      rows: c.props.map((p) => [code(p.name + (p.required ? "" : "?")), code(p.type), p.default ? code(p.default) : { text: p.required ? "required" : "", muted: true }, { text: p.description, muted: true }]),
    },
  ];
  if (c.extra.length) blocks.push({ kind: "p", text: `Also accepts ${c.extra.map((e) => e.replace(/^Omit<ComponentPropsWithoutRef<"(\w+)">.*$/, "the attributes of a $1")).join(", ")}.`, muted: true });
  return blocks;
}

/** The tokens a component's own CSS uses, each checked against the token set like the scenario tables. */
function tokensUsed(data: TokenData, c: ComponentInfo): Block[] {
  if (!c.tokens.length && c.madeOf.length) {
    return [{ kind: "p", text: `Everything comes from ${c.madeOf.map((n) => componentByName(n).title).join(" and ")}; see their pages above.` }];
  }
  const rows: Cell[][] = c.tokens.map((p) => {
    const t = data.tokens.find((x) => x.path === p);
    if (!t) throw new Error(`component token ${p} is not in dist/tokens.json`);
    return [code(t.path), { text: t.description ?? (t.type === "typography" ? "Text style" : ""), muted: true }];
  });
  const blocks: Block[] = [{ kind: "rows", headless: true, columns: ["Token", "Description"], cells: [{ basis: `calc(${READING} * 0.35)`, grow: 0 }, { basis: READING, grow: 1 }], rows }];
  if (c.madeOf.length) blocks.push({ kind: "p", text: `Plus everything ${c.madeOf.map((n) => componentByName(n).title).join(" and ")} uses.`, muted: true });
  return blocks;
}

const importBlock = (names: string[], example: string): Block => ({
  kind: "md",
  markdown: ["```tsx", `import { ${names.join(", ")} } from "holotekt-design-system/components";`, `import "holotekt-design-system/tokens.css";`, `import "holotekt-design-system/components.css";`, "", example, "```"].join("\n"),
});

export function componentPage(slug: ComponentSlug): Page {
  const c = componentBySlug(slug);
  const level = levelOf(c);
  const doc = COMPONENT_DOCS[slug];
  const data = tokenData();
  const page: Page = { route: `/components/${slug}`, title: c.title, description: c.summary, template: "component", level, blocks: [] };
  const i = COMPONENT_PAGES.indexOf(slug);
  const prev = i > 0 ? COMPONENT_PAGES[i - 1] : undefined;
  const next = i < COMPONENT_PAGES.length - 1 ? COMPONENT_PAGES[i + 1] : undefined;
  const parts = c.madeOf.map((n) => componentByName(n));
  const users = usedBy(c.name);
  const facts: Cell[][] = [
    [{ text: "Level" }, { parts: [{ text: level.name, href: `/components#${level.plural.toLowerCase()}` }, { text: `. ${level.rule}` }] }],
    [{ text: "Made of" }, { parts: parts.length ? joinParts(parts.map(partLink)) : [{ text: "Nothing else. Tokens only." }] }],
  ];
  if (users.length) facts.push([{ text: "Used by" }, { parts: joinParts(users.map(partLink)) }]);
  page.blocks.push({ kind: "rows", headless: true, columns: ["What", "Value"], cells: [{ basis: LABEL, grow: 0 }, { basis: READING, grow: 1 }], rows: facts });
  page.blocks.push({ kind: "h2", text: "When to use it" });
  page.blocks.push({ kind: "rows", columns: ["When you are…", "Use"], strongRule: true, cells: [{ basis: `calc(${READING} * 0.4)`, grow: 28 }, { basis: READING, grow: 72 }], rows: doc.when.map((r) => [{ text: r.when }, { parts: r.use }]) });
  page.blocks.push({ kind: "h2", text: "Live examples" }, { kind: "p", text: "The real component, on the default page background, in the site's current theme.", muted: true }, ...doc.examples);
  page.blocks.push({ kind: "h2", text: "Rules" }, { kind: "list", items: doc.rules });
  page.blocks.push({ kind: "h2", text: "Props" }, { kind: "p", text: c.description }, ...propsTable(c));
  page.blocks.push({ kind: "h2", text: "Tokens it uses" }, { kind: "p", text: "Only existing tokens. If a component needs a value that is not a token, the token comes first. The build fails on a variable that is not a published token.", muted: true }, ...tokensUsed(data, c));
  page.blocks.push({ kind: "h2", text: "Import" }, importBlock([c.name, ...c.madeOf.filter((n) => doc.examples[0].code.includes(`<${n}`))], doc.examples[0].code));
  page.blocks.push({ kind: "links", items: [{ text: `${c.title} stories in Storybook →`, href: `/storybook/?path=/docs/${storyDocsId(c)}`, note: "every state, both themes, accessibility checks" }] });
  page.blocks.push({ kind: "pager", prev: prev && { text: `← ${componentTitle(prev)}`, href: `/components/${prev}` }, next: next && { text: `${componentTitle(next)} →`, href: `/components/${next}` } });
  return page;
}

export function componentsIndexPage(): Page {
  const data = componentData();
  const line = (c: ComponentInfo) => `${c.summary} ${c.madeOf.length ? `Made of ${c.madeOf.map((n) => componentByName(n).title).join(" and ")}. ` : ""}${c.props.length} props.`;
  const blocks: Block[] = [{ kind: "p", text: "Atomic design: small parts combine into larger ones, and each level only uses the levels below it. Build from below: if the part you need does not exist, add the atom first." }];
  for (const level of data.levels) {
    const list = data.components.filter((c) => c.level === level.id);
    if (!list.length) continue;
    blocks.push({ kind: "h2", text: level.plural, id: level.plural.toLowerCase() }, { kind: "p", text: level.rule, muted: true });
    blocks.push({ kind: "index", rows: list.map((c) => ({ title: c.title, line: line(c), href: `/components/${c.slug}` })) });
  }
  blocks.push({ kind: "p", text: data.above, muted: true });
  return {
    route: "/components",
    title: "Components",
    description: "React components built on the tokens, organised by atomic level: atoms, molecules and organisms. Import them from holotekt-design-system/components.",
    template: "bare",
    blocks,
  };
}

export function decisionsPage(): Page {
  const list = decisions();
  return {
    route: "/decisions",
    title: "Decisions",
    description: "Short notes on what was chosen, what was rejected and why. Newest first.",
    blocks: list.length ? [{ kind: "links", items: list.map((d) => ({ text: `${d.id}: ${d.title}`, href: `/decisions/${d.slug}`, note: `${d.date} · ${d.area}` })) }] : [{ kind: "p", text: "No decisions recorded yet." }],
  };
}

export function decisionPage(slug: string): Page | undefined {
  const d = decisions().find((x) => x.slug === slug);
  if (!d) return undefined;
  return { route: `/decisions/${d.slug}`, title: `${d.id}: ${d.title}`, description: `Decided ${d.date}. Area: ${d.area}.`, blocks: [{ kind: "md", markdown: d.body }] };
}

export const changelogPage = (): Page => ({
  route: "/changelog",
  title: "Changelog",
  description: `Every released version. The current version is ${version()}.`,
  blocks: [{ kind: "md", markdown: changelog().replace(/^# .*\n/, "").trim() }],
});

export const consumerRulesPage = (): Page => ({
  route: "/consumer-rules",
  title: "Rules for consuming sites",
  description: "The block a site that uses this system pastes into its own AGENTS.md.",
  blocks: [{ kind: "md", markdown: consumerRules().replace(/^# .*\n/, "").trim() }],
});

export const accessibilityPage = (): Page => ({
  route: "/accessibility",
  title: "Accessibility",
  description: "Accessibility statement for the holotekt design system and this site.",
  blocks: [
    { kind: "p", text: "Draft. This statement is placeholder text until the system's accessibility commitments are written down properly." },
    { kind: "p", text: "The intent: the system meets WCAG 2.2 AA. Every allowed text-on-background pair is checked for a 4.5:1 contrast ratio at build time, and a pair below that fails the build. This site uses semantic HTML, keeps the browser's visible focus styles and has no motion." },
    { kind: "p", text: `If something here is hard to use, open an issue at ${REPO_URL}/issues.` },
  ],
});

export function allPages(): Page[] {
  return [homePage(), foundationsIndexPage(), ...FOUNDATIONS.map(foundationPage), componentsIndexPage(), ...COMPONENT_PAGES.map(componentPage), decisionsPage(), ...decisions().map((d) => decisionPage(d.slug)!), changelogPage(), consumerRulesPage(), accessibilityPage()];
}

export function markdownSegments(route: string): string[] {
  if (route === "/") return ["index.md"];
  const segs = route.slice(1).split("/");
  segs[segs.length - 1] += ".md";
  return segs;
}
export const markdownPath = (route: string) => "/" + markdownSegments(route).join("/");
export function pageForMarkdownSegments(segs: string[]): Page | undefined {
  const joined = "/" + segs.join("/");
  const route = joined === "/index.md" ? "/" : joined.replace(/\.md$/, "");
  return allPages().find((p) => p.route === route);
}

// --- Markdown twin --------------------------------------------------------------------------------

const partsText = (parts: Part[]) => parts.map((p) => ("token" in p ? `\`${p.label ?? p.token}\`` : p.href ? `[${p.text}](${abs(p.href)})` : p.text)).join("");
const cellText = (c: Cell): string => {
  if (typeof c === "string") return c.replace(/\|/g, "\\|");
  if ("parts" in c) return partsText(c.parts).replace(/\|/g, "\\|");
  if ("bar" in c) return c.label ?? "";
  const t = c.code ? `\`${c.text}\`` : c.text;
  return t.replace(/\|/g, "\\|").replace(/\n/g, " ");
};
const abs = (href: string) => (href.startsWith("/") ? SITE_URL + href : href);

function blockMarkdown(b: Block, out: string[]) {
  switch (b.kind) {
    case "p":
    case "eyebrow":
      out.push(b.text, "");
      break;
    case "h2":
      out.push(`## ${b.text}`, "");
      break;
    case "h3":
      out.push(`### ${b.text}`, "");
      break;
    case "list":
      out.push(...b.items.map((i) => `- ${i}`), "");
      break;
    case "links":
      out.push(...b.items.map((l) => `- [${l.text}](${l.href.startsWith("#") ? "" : abs(l.href)}${l.href.startsWith("#") ? l.href : ""})${l.note ? `: ${l.note}` : ""}`), "");
      break;
    case "table":
    case "rows":
      out.push(`| ${b.columns.join(" | ")} |`, `| ${b.columns.map(() => "---").join(" | ")} |`);
      for (const r of b.rows) out.push(`| ${r.map(cellText).join(" | ")} |`);
      out.push("");
      break;
    case "ramp":
      out.push(`*${b.name}:* ${b.steps.map((s) => `${s.step} ${s.value}`).join(" · ")}`, "");
      break;
    case "specimen":
      if (b.label) out.push(`*Specimen (${b.label}):* ${b.text}`, "");
      break;
    case "sample":
      if (b.label || b.text) out.push(`*Sample:* ${(b.label ?? b.text ?? "").replace(/\|/g, " · ")}`, "");
      for (const i of b.inner ?? []) if (i.text) out.push(`- ${i.text.replace(/\|/g, " · ")}`);
      if (b.inner?.some((i) => i.text)) out.push("");
      break;
    case "row":
      for (const item of b.items) blockMarkdown(item, out);
      break;
    case "tiles":
      out.push(...b.items.map((i) => `- ${i}`), "");
      break;
    case "index":
      out.push(...b.rows.map((r) => `- [${r.title}](${abs(r.href)}): ${r.line}`), "");
      break;
    case "details":
      out.push(`## ${b.summary}`, "");
      for (const item of b.blocks) blockMarkdown(item, out);
      break;
    case "pager":
      out.push([b.prev && `[${b.prev.text}](${abs(b.prev.href)})`, b.next && `[${b.next.text}](${abs(b.next.href)})`].filter(Boolean).join(" · "), "");
      break;
    case "live":
      out.push(`*Example: ${b.label}.*`, "", "```tsx", b.code, "```", "");
      break;
    case "md":
      out.push(b.markdown, "");
      break;
  }
}

export function toMarkdown(page: Page): string {
  const out: string[] = [`# ${page.title}`, "", page.description, ""];
  for (const b of page.blocks) blockMarkdown(b, out);
  out.push(`HTML version: ${SITE_URL}${page.route}`, "");
  return out.join("\n");
}

export function llmsTxt(): string {
  const pages = allPages();
  const v = version();
  const line = (p: Page) => `- [${p.title}](${SITE_URL}${markdownPath(p.route)}): ${p.description}`;
  return [
    "# holotekt design system",
    "",
    `> Design tokens and documentation for holotekt's sites, version ${v}. Tokens are CSS custom properties prefixed \`--ht-\`. Consuming sites use semantic tokens only, chosen by their description; never primitives, never raw values.`,
    "",
    "Every page below has a Markdown version at the linked address (the HTML page is the same address without `.md`).",
    "",
    "## Foundations",
    ...pages.filter((p) => p.route.startsWith("/foundations")).map(line),
    "",
    "## Components",
    ...pages.filter((p) => p.route.startsWith("/components")).map((p) => (p.level ? `- [${p.title}](${SITE_URL}${markdownPath(p.route)}): ${p.level.name}. ${p.description}` : line(p))),
    `- [Storybook](${SITE_URL}/storybook/): every component state in both themes, with accessibility checks. Its component manifest is at ${SITE_URL}/storybook/manifests/components.json.`,
    "",
    "## Docs",
    ...pages.filter((p) => !p.route.startsWith("/foundations") && !p.route.startsWith("/components") && !p.route.startsWith("/decisions/")).map(line),
    "",
    "## Decisions",
    ...pages.filter((p) => p.route.startsWith("/decisions/")).map(line),
    "",
    "## Data",
    `- [tokens.json](${SITE_URL}/tokens.json): every token resolved, with CSS variable name, alias target, description, and the contrast ratio of each allowed pair.`,
    `- [components.json](${SITE_URL}/components.json): every component with its description, props (type, default, doc comment) and the tokens its CSS uses.`,
    `- [Repository](${REPO_URL}): source, changelog and the token JSON files.`,
    "",
  ].join("\n");
}
