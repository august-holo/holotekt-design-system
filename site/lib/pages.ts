// One model for every docs page. The HTML page and its Markdown twin are both rendered from a
// Page, so they cannot drift. Foundation pages are built from dist/tokens.json alone: adding a
// token updates the page with no page edits.
import {
  changelog,
  consumerRules,
  decisions,
  FIGMA_URL,
  luminance,
  modeLabel,
  REPO_URL,
  showSize,
  showValue,
  SITE_URL,
  tokenData,
  version,
  type Token,
} from "./data";

export type Cell = string | { text: string; swatch?: string; code?: boolean };

export type Block =
  | { kind: "p"; text: string }
  | { kind: "h2"; text: string }
  | { kind: "h3"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "links"; items: { text: string; href: string; note?: string }[] }
  | { kind: "table"; columns: string[]; rows: Cell[][] }
  | { kind: "ramp"; name: string; steps: { step: string; path: string; css: string; value: string }[] }
  | { kind: "specimen"; text: string; className?: string; style?: Record<string, string>; label?: string }
  | { kind: "sample"; label: string; style: Record<string, string>; text?: string; inner?: { style: Record<string, string>; text?: string; className?: string }[] }
  | { kind: "md"; markdown: string };

export interface Page {
  route: string; // "/" or "/foundations/color"
  title: string;
  description: string;
  blocks: Block[];
}

// --- foundations --------------------------------------------------------------------------------

export const FOUNDATIONS = ["color", "typography", "spacing", "shape"] as const;
export type Foundation = (typeof FOUNDATIONS)[number];

const root = (t: Token) => t.path.split(".")[0];
const rootIn = (names: string[]) => (t: Token) => names.includes(root(t));

const FOUNDATION_INFO: Record<Foundation, { title: string; description: string; session: string; match: (t: Token) => boolean }> = {
  color: {
    title: "Color",
    description: "Colour primitives, the semantic colour roles that alias them, and the contrast pairs the system allows.",
    session: "color",
    match: (t) => t.type === "color",
  },
  typography: {
    title: "Typography",
    description: "Five font families with one job each, a nine-step size scale, the sizes that step down on small screens, and fourteen text styles as live specimens.",
    session: "typography",
    match: (t) => ["fontFamily", "fontWeight", "typography"].includes(t.type) || rootIn(["font", "typography", "text", "lineHeight", "letterSpacing"])(t),
  },
  spacing: {
    title: "Spacing and layout",
    description: "An eleven-step space scale, the inset and gap roles that alias it, two content widths, two breakpoints, the values that change on phones, and the dotted grid.",
    session: "spacing and layout",
    match: rootIn(["space", "spacing", "size", "sizing", "layout", "grid", "breakpoint", "container"]),
  },
  shape: {
    title: "Shape and elevation",
    description: "Four corner radii, two border widths, the five border recipes, and tonal elevation: depth is a surface colour with a border on what overlaps. No shadows.",
    session: "shape and elevation",
    match: (t) => ["shadow", "border", "strokeStyle"].includes(t.type) || rootIn(["radius", "border", "shadow", "elevation", "stroke"])(t),
  },
};

export const foundationTitle = (kind: Foundation) => FOUNDATION_INFO[kind].title;

const valueCell = (t: Token): Cell => {
  const text = showValue(t.value);
  return t.type === "color" ? { text, swatch: text, code: true } : { text, code: true };
};

function primitiveTable(tokens: Token[]): Block {
  return {
    kind: "table",
    columns: ["Token", "CSS variable", "Value", "Description"],
    rows: tokens.map((t) => [{ text: t.path, code: true }, { text: t.css, code: true }, valueCell(t), t.description ?? ""]),
  };
}

function semanticTable(tokens: Token[], modes: string[]): Block {
  const suffix = (m: string) => {
    const label = modeLabel(m, modes);
    return label ? ` (${label})` : "";
  };
  const modeCell = (t: Token, m: string): Cell[] => {
    const v = m === "default" ? { value: t.value, alias: t.alias } : t.modes?.[m];
    if (!v) return ["", ""];
    const text = showValue(v.value);
    return [{ text: v.alias ?? "", code: true }, t.type === "color" ? { text, swatch: text, code: true } : { text, code: true }];
  };
  return {
    kind: "table",
    columns: ["Token", "CSS variable", ...modes.flatMap((m) => [`Aliases${suffix(m)}`, `Value${suffix(m)}`]), "When to use"],
    rows: tokens.map((t) => [{ text: t.path, code: true }, { text: t.css, code: true }, ...modes.flatMap((m) => modeCell(t, m)), t.description ?? ""]),
  };
}

/** Steps of a colour ramp ordered light to dark: by numeric step when every step is a number, else by luminance. */
function rampSteps(tokens: Token[]) {
  const steps = tokens.map((t) => ({ step: t.path.split(".").pop()!, path: t.path, css: t.css, value: showValue(t.value) }));
  const numeric = steps.every((s) => /^\d+$/.test(s.step));
  return steps.sort((a, b) => (numeric ? Number(a.step) - Number(b.step) : luminance(b.value) - luminance(a.value)));
}

const SPECIMEN = "The quick brown fox jumps over the lazy dog. 0123456789";

/** The typography page: families, the size scale, the breakpoint steps, and every text style as a live specimen. */
function typographyPage(data: ReturnType<typeof tokenData>, info: (typeof FOUNDATION_INFO)[Foundation]): Page {
  const page: Page = { route: "/foundations/typography", title: info.title, description: info.description, blocks: [] };
  const families = data.tokens.filter((t) => t.type === "fontFamily");
  const sizes = data.tokens.filter((t) => t.type === "dimension" && t.path.startsWith("font.size."));
  const steps = data.tokens.filter((t) => t.type === "dimension" && t.tier === "semantic");
  const styles = data.tokens.filter((t) => t.type === "typography");
  if (!families.length && !styles.length) {
    page.blocks.push({ kind: "p", text: `Not published yet. Tokens for typography arrive with the ${info.session} session.` });
    return page;
  }
  const byPath = new Map(data.tokens.map((t) => [t.path, t]));
  const mediaModes = data.modes.filter((m) => data.modeCss[m]?.kind === "media");
  // In a size table the default column is the desktop value, whatever colour modes exist.
  const sizeLabel = (m: string) => (m === "default" ? "Desktop" : m[0].toUpperCase() + m.slice(1));

  page.blocks.push({ kind: "h2", text: "Families" });
  page.blocks.push({ kind: "p", text: "Five faces, each with one job. The token holds the family name; the CSS variable carries the fallback stack." });
  for (const t of families) {
    page.blocks.push({ kind: "specimen", text: `${showValue(t.value)}: ${SPECIMEN}`, style: { fontFamily: `var(${t.css})`, fontSize: "1.5rem" }, label: t.path });
  }
  page.blocks.push({
    kind: "table",
    columns: ["Token", "CSS variable", "Family", "Fallback stack", "Job"],
    rows: families.map((t) => [{ text: t.path, code: true }, { text: t.css, code: true }, showValue(t.value), { text: (data.fonts[t.path]?.stack ?? []).slice(1).join(", "), code: true }, t.description ?? ""]),
  });

  if (sizes.length) {
    page.blocks.push({ kind: "h2", text: "Size scale" });
    page.blocks.push({ kind: "p", text: "Nine steps. Figma holds pixels; the CSS is in rem so text follows the reader's browser setting." });
    for (const t of sizes) page.blocks.push({ kind: "specimen", text: `${t.path.split(".").pop()} · ${showSize(t.value)}`, style: { fontSize: `var(${t.css})`, fontFamily: "var(--ht-font-family-sans)" } });
    page.blocks.push({
      kind: "table",
      columns: ["Token", "CSS variable", "Size", "Description"],
      rows: sizes.map((t) => [{ text: t.path, code: true }, { text: t.css, code: true }, showSize(t.value), t.description ?? ""]),
    });
  }

  if (steps.length) {
    page.blocks.push({ kind: "h2", text: "Sizes that change with the viewport" });
    const media = mediaModes.map((m) => (data.modeCss[m] as { media: string }).media).join(", ");
    page.blocks.push({ kind: "p", text: `The largest styles step down one size on small screens. The ${mediaModes.join(" and ")} values apply inside ${media}; that width is provisional until the spacing and layout session.` });
    page.blocks.push({
      kind: "table",
      columns: ["Token", "CSS variable", ...["default", ...mediaModes].flatMap((m) => [`Aliases (${sizeLabel(m)})`, `Size (${sizeLabel(m)})`]), "Description"],
      rows: steps.map((t) => [
        { text: t.path, code: true },
        { text: t.css, code: true },
        ...["default", ...mediaModes].flatMap((m) => {
          const v = m === "default" ? { value: t.value, alias: t.alias } : (t.modes?.[m] ?? { value: t.value, alias: t.alias });
          return [{ text: v.alias ?? "", code: true } as Cell, showSize(v.value)];
        }),
        t.description ?? "",
      ]),
    });
  }

  if (styles.length) {
    page.blocks.push({ kind: "h2", text: "Text styles" });
    page.blocks.push({ kind: "p", text: `${styles.length} styles. Each has six CSS variables and one utility class; the specimen below each heading is set with its class, in the real font.` });
    const sizeOf = (t: Token, mode: string) => {
      const v = mode === "default" ? t.value : (t.modes?.[mode]?.value ?? t.value);
      return showSize((v as { fontSize?: unknown })?.fontSize);
    };
    for (const t of styles) {
      const raw = (t.raw ?? {}) as Record<string, unknown>;
      const sizeAlias = typeof raw.fontSize === "string" ? raw.fontSize.replace(/[{}]/g, "") : "";
      const familyAlias = typeof raw.fontFamily === "string" ? raw.fontFamily.replace(/[{}]/g, "") : "";
      const steppy = sizeAlias && byPath.get(sizeAlias)?.tier === "semantic";
      page.blocks.push({ kind: "h3", text: t.path });
      page.blocks.push({ kind: "specimen", text: t.description ? `${t.description} ${SPECIMEN}` : SPECIMEN, className: t.className });
      const sizeCells: Cell[] = steppy ? ["default", ...mediaModes].map((m) => `${sizeLabel(m)}: ${sizeOf(t, m)}`) : [sizeOf(t, "default")];
      page.blocks.push({
        kind: "table",
        columns: ["Property", "Value"],
        rows: [
          ["Use", t.description ?? ""],
          ["Family", { text: `${familyAlias} (${showValue((t.value as { fontFamily?: unknown }).fontFamily)})`, code: true }],
          ["Size", { text: `${sizeAlias}: ${sizeCells.join("; ")}`, code: true }],
          ["Weight", String(raw.fontWeight ?? "")],
          ["Line height", String(raw.lineHeight ?? "")],
          ["Letter spacing", showValue(raw.letterSpacing ?? 0)],
          ["Case", String(raw.textTransform ?? "none")],
          ["CSS variables", { text: ["font-family", "font-size", "font-weight", "line-height", "letter-spacing", "text-transform"].map((p) => `${t.css}-${p}`).join(" "), code: true }],
          ["Class", { text: `.${t.className}`, code: true }],
        ],
      });
    }
  }

  page.blocks.push({ kind: "h2", text: "Loading the fonts" });
  page.blocks.push({ kind: "p", text: "The token package ships family names and fallback stacks, not font files. A site that uses the system loads these files itself, self-hosted as woff2 with font-display: swap. This site loads the Latin subset from the @fontsource packages." });
  page.blocks.push({
    kind: "table",
    columns: ["Family", "Files to load", "Package", "Licence", "Source"],
    rows: families.map((t) => {
      const f = data.fonts[t.path];
      return [showValue(t.value), f?.files.join(", ") ?? "", { text: f?.package ?? "", code: true }, f?.license ?? "", f?.source ?? ""];
    }),
  });
  page.blocks.push({
    kind: "links",
    items: families.map((t) => {
      const f = data.fonts[t.path];
      return { text: `${showValue(t.value)} licence`, href: `/fonts/${(f?.package ?? "").split("/").pop()}/LICENSE.txt`, note: f?.license };
    }),
  });
  return page;
}

/** The spacing and layout page: the scale as bars, the roles, widths, breakpoints, what steps down on phones, and the dotted grid. */
function spacingPage(data: ReturnType<typeof tokenData>, info: (typeof FOUNDATION_INFO)[Foundation]): Page {
  const page: Page = { route: "/foundations/spacing", title: info.title, description: info.description, blocks: [] };
  const spacing = data.tokens.filter((t) => t.base === "spacing");
  if (!spacing.length) {
    page.blocks.push({ kind: "p", text: `Not published yet. Tokens for spacing and layout arrive with the ${info.session} session.` });
    return page;
  }
  const scale = spacing.filter((t) => t.path.startsWith("space."));
  const roles = spacing.filter((t) => t.path.startsWith("inset.") || t.path.startsWith("gap."));
  const widths = spacing.filter((t) => t.path.startsWith("layout.width."));
  const breakpoints = spacing.filter((t) => t.path.startsWith("layout.breakpoint."));
  const grid = spacing.filter((t) => t.path.startsWith("layout.grid."));
  const stepping = data.tokens.filter((t) => t.base === "breakpoint" && t.path.startsWith("layout."));
  const mediaModes = data.modes.filter((m) => data.modeCss[m]?.kind === "media");
  const sizeLabel = (m: string) => (m === "default" ? "Desktop" : m[0].toUpperCase() + m.slice(1));
  const roleRows = (list: Token[]): Cell[][] => list.map((t) => [{ text: t.path, code: true }, { text: t.css, code: true }, { text: t.alias ?? "", code: true }, showSize(t.value), t.description ?? ""]);

  page.blocks.push({ kind: "h2", text: "The scale" });
  page.blocks.push({ kind: "p", text: "Eleven steps on a 4px base. Figma holds pixels; the CSS is in rem so space grows with the reader's text size." });
  for (const t of scale) page.blocks.push({ kind: "sample", label: `${t.path} · ${showSize(t.value)}`, style: { width: `var(${t.css})`, height: "0.75rem", background: "var(--ht-color-accent-default)" } });
  page.blocks.push({ kind: "table", columns: ["Token", "CSS variable", "Size", "Description"], rows: scale.map((t) => [{ text: t.path, code: true }, { text: t.css, code: true }, showSize(t.value), t.description ?? ""]) });

  page.blocks.push({ kind: "h2", text: "Inset and gap" });
  page.blocks.push({ kind: "p", text: "Inset is padding inside a thing; gap is space between things. Each role aliases a step of the scale, so a change to the scale moves every role with it." });
  page.blocks.push({ kind: "table", columns: ["Token", "CSS variable", "Aliases", "Size", "When to use"], rows: roleRows(roles) });

  page.blocks.push({ kind: "h2", text: "Widths" });
  page.blocks.push({ kind: "p", text: "The two content widths, drawn at quarter scale." });
  for (const t of widths) page.blocks.push({ kind: "sample", label: `${t.path} · ${showSize(t.value)}`, style: { width: `calc(var(${t.css}) / 4)`, maxWidth: "100%", height: "0.75rem", background: "var(--ht-color-accent-default)" } });
  page.blocks.push({ kind: "table", columns: ["Token", "CSS variable", "Width", "Description"], rows: widths.map((t) => [{ text: t.path, code: true }, { text: t.css, code: true }, showSize(t.value), t.description ?? ""]) });

  page.blocks.push({ kind: "h2", text: "Breakpoints" });
  page.blocks.push({ kind: "p", text: `Viewport widths in px, unitless in the token. The mobile mode of every breakpoint token applies inside ${mediaModes.map((m) => (data.modeCss[m] as { media: string }).media).join(", ")}, taken from the md token at build time.` });
  page.blocks.push({ kind: "table", columns: ["Token", "CSS variable", "Value", "Description"], rows: breakpoints.map((t) => [{ text: t.path, code: true }, { text: t.css, code: true }, `${showValue(t.value)}px`, t.description ?? ""]) });

  if (stepping.length) {
    page.blocks.push({ kind: "h2", text: "What changes on phones" });
    page.blocks.push({
      kind: "table",
      columns: ["Token", "CSS variable", ...["default", ...mediaModes].flatMap((m) => [`Aliases (${sizeLabel(m)})`, `Value (${sizeLabel(m)})`]), "Description"],
      rows: stepping.map((t) => [
        { text: t.path, code: true },
        { text: t.css, code: true },
        ...["default", ...mediaModes].flatMap((m) => {
          const v = m === "default" ? { value: t.value, alias: t.alias } : (t.modes?.[m] ?? { value: t.value, alias: t.alias });
          return [{ text: v.alias ?? "", code: true } as Cell, t.type === "number" ? showValue(v.value) : showSize(v.value)];
        }),
        t.description ?? "",
      ]),
    });
  }

  page.blocks.push({ kind: "h2", text: "The grid" });
  page.blocks.push({ kind: "p", text: "The gutter and the dotted background share one pitch, so content lines up with the dots." });
  page.blocks.push({ kind: "table", columns: ["Token", "CSS variable", "Aliases", "Size", "Description"], rows: roleRows(grid) });
  page.blocks.push({
    kind: "sample",
    label: "layout.grid.dot-pitch: the dotted grid at the published pitch",
    style: {
      height: "8rem",
      backgroundImage: "radial-gradient(circle, var(--ht-color-border-subtle) 1px, transparent 1.5px)",
      backgroundSize: "var(--ht-layout-grid-dot-pitch) var(--ht-layout-grid-dot-pitch)",
      backgroundPosition: "calc(var(--ht-layout-grid-dot-pitch) / 2) calc(var(--ht-layout-grid-dot-pitch) / 2)",
      border: "1px solid var(--ht-color-border-subtle)",
    },
  });
  page.blocks.push({ kind: "p", text: "There are no layout templates here. Column spans and reflow rules are decided per product and arrive with the wireframes." });
  return page;
}

/** The shape and elevation page: radii and borders on samples, and the tonal surface ladder in both themes. */
function shapePage(data: ReturnType<typeof tokenData>, info: (typeof FOUNDATION_INFO)[Foundation]): Page {
  const page: Page = { route: "/foundations/shape", title: info.title, description: info.description, blocks: [] };
  const shape = data.tokens.filter((t) => t.base === "shape");
  if (!shape.length) {
    page.blocks.push({ kind: "p", text: `Not published yet. Tokens for shape and elevation arrive with the ${info.session} session.` });
    return page;
  }
  const radii = shape.filter((t) => t.path.startsWith("radius."));
  const widths = shape.filter((t) => t.path.startsWith("border.width."));
  const byPath = new Map(data.tokens.map((t) => [t.path, t]));
  const px = (v: unknown) => (v && typeof v === "object" && "value" in (v as object) ? `${(v as { value: number }).value}px` : showValue(v));
  const colorOf = (path: string, mode: string) => {
    const t = byPath.get(path);
    if (!t) return "";
    const v = mode === "default" ? t.value : (t.modes?.[mode]?.value ?? t.value);
    return showValue(v);
  };
  const colorModes = data.colorModes;
  const modeName = (m: string) => modeLabel(m, data.modes) || "Default";

  page.blocks.push({ kind: "p", text: "There are no shadow tokens in this version. Elevation is tonal: depth is a surface colour, and whatever overlaps content carries a border. The hard offset shadow of the old sites is retired for now and will be looked at again with components." });

  page.blocks.push({ kind: "h2", text: "Radius" });
  page.blocks.push({ kind: "p", text: "Four steps, in px so corners do not grow with the reader's text size." });
  for (const t of radii) {
    page.blocks.push({ kind: "sample", label: `${t.path} · ${px(t.value)} · ${t.description ?? ""}`, style: { width: "6rem", height: "3rem", borderRadius: `var(${t.css})`, background: "var(--ht-color-surface-raised)", border: "var(--ht-border-width-thin) solid var(--ht-color-border-strong)" } });
  }
  page.blocks.push({ kind: "table", columns: ["Token", "CSS variable", "Value", "Use"], rows: radii.map((t) => [{ text: t.path, code: true }, { text: t.css, code: true }, px(t.value), t.description ?? ""]) });

  page.blocks.push({ kind: "h2", text: "Borders" });
  page.blocks.push({ kind: "p", text: "Two widths, in px. The five recipes below are documented combinations of a width and a border colour, not tokens." });
  page.blocks.push({ kind: "table", columns: ["Token", "CSS variable", "Value", "Use"], rows: widths.map((t) => [{ text: t.path, code: true }, { text: t.css, code: true }, px(t.value), t.description ?? ""]) });
  const recipes = [
    { name: "Hairline", width: "border.width.thin", color: "color.border.subtle", use: "Quiet outlines." },
    { name: "Divider", width: "border.width.thin", color: "color.border.divider", use: "Rules between rows." },
    { name: "Overlay border", width: "border.width.thin", color: "color.border.strong", use: "Marks what sits on top." },
    { name: "Strong outline", width: "border.width.thick", color: "color.border.strong", use: "Outlined buttons, heavy rules." },
    { name: "Focus ring", width: "border.width.thick", color: "color.border.focus", use: "Keyboard focus." },
  ];
  for (const r of recipes) {
    const w = byPath.get(r.width);
    const c = byPath.get(r.color);
    if (!w || !c) continue;
    page.blocks.push({ kind: "sample", label: `${r.name}: ${r.width} + ${r.color}. ${r.use}`, style: { width: "12rem", height: "3rem", borderRadius: "var(--ht-radius-sm)", background: "var(--ht-color-surface-raised)", border: `var(${w.css}) solid var(${c.css})` } });
  }
  page.blocks.push({ kind: "table", columns: ["Recipe", "Width", "Colour", "Use"], rows: recipes.map((r) => [r.name, { text: r.width, code: true }, { text: r.color, code: true }, r.use]) });

  page.blocks.push({ kind: "h2", text: "Elevation" });
  page.blocks.push({ kind: "p", text: "The surface ladder, darkest to lightest by depth in dark mode: sunken, page, raised, overlay. Each column is drawn with that theme's resolved values, so both are visible whatever the page's own theme." });
  const ladder = ["color.surface.sunken", "color.surface.page", "color.surface.raised", "color.surface.overlay"];
  for (const mode of colorModes) {
    page.blocks.push({
      kind: "sample",
      label: `${modeName(mode)}: ${ladder.map((p) => `${p.split(".").pop()} ${colorOf(p, mode)}`).join(" · ")}`,
      style: { display: "flex", gap: "var(--ht-gap-md)", padding: "var(--ht-inset-lg)", background: colorOf("color.surface.page", mode), border: "var(--ht-border-width-thin) solid " + colorOf("color.border.subtle", mode) },
      inner: ladder.map((p) => ({ style: { flex: "1", height: "4rem", borderRadius: "var(--ht-radius-sm)", background: colorOf(p, mode), border: p.endsWith("overlay") ? `var(--ht-border-width-thin) solid ${colorOf("color.border.strong", mode)}` : "none", color: colorOf("color.text.primary", mode), padding: "var(--ht-inset-sm)", fontSize: "var(--ht-font-size-100)" }, text: p.split(".").pop() })),
    });
  }
  page.blocks.push({
    kind: "table",
    columns: ["Token", "CSS variable", ...colorModes.map((m) => `Value (${modeName(m)})`), "When to use"],
    rows: ladder.map((p) => {
      const t = byPath.get(p)!;
      return [{ text: p, code: true }, { text: t.css, code: true }, ...colorModes.map((m) => ({ text: colorOf(p, m), swatch: colorOf(p, m), code: true }) as Cell), t.description ?? ""];
    }),
  });
  page.blocks.push({ kind: "h3", text: "A menu over a card" });
  page.blocks.push({
    kind: "sample",
    label: "surface/overlay with the overlay border, sitting on a card on the page. Stacking is a surface and a border, not a shadow.",
    style: { position: "relative", height: "9rem", padding: "var(--ht-inset-lg)", background: "var(--ht-color-surface-page)" },
    inner: [
      { style: { position: "absolute", left: "var(--ht-inset-lg)", top: "var(--ht-inset-lg)", width: "16rem", height: "6rem", borderRadius: "var(--ht-radius-sm)", background: "var(--ht-color-surface-raised)", padding: "var(--ht-inset-md)" }, text: "Card: surface/raised" },
      { style: { position: "absolute", left: "10rem", top: "3rem", width: "12rem", borderRadius: "var(--ht-radius-sm)", background: "var(--ht-color-surface-overlay)", border: "var(--ht-border-width-thin) solid var(--ht-color-border-strong)", padding: "var(--ht-inset-md)" }, text: "Menu: surface/overlay + overlay border" },
    ],
  });
  page.blocks.push({ kind: "h3", text: "A dialog on the scrim" });
  page.blocks.push({
    kind: "sample",
    label: "surface/scrim dims everything behind a dialog; the dialog is surface/overlay with the overlay border and radius/md.",
    style: { position: "relative", height: "10rem", background: "var(--ht-color-surface-page)", padding: "var(--ht-inset-lg)" },
    inner: [
      { style: { position: "absolute", inset: "0", background: "var(--ht-color-surface-scrim)" } },
      { style: { position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)", width: "16rem", borderRadius: "var(--ht-radius-md)", background: "var(--ht-color-surface-overlay)", border: "var(--ht-border-width-thin) solid var(--ht-color-border-strong)", padding: "var(--ht-inset-lg)" }, text: "Dialog: surface/overlay on surface/scrim" },
    ],
  });
  page.blocks.push({ kind: "h3", text: "The rules" });
  page.blocks.push({
    kind: "list",
    items: [
      "Stacking: anything that overlaps content (menu, popover, dialog) uses surface/overlay plus a thin border/strong.",
      "Resting: cards and panels use surface/raised; wells use surface/sunken. Tone only, no border required.",
      "Attention: dialogs sit on surface/scrim, which dims everything behind them.",
      "State feedback: hover and pressed use surface/hover and surface/pressed. Elevation is a property; pressed is a state.",
      "Contrast rule: in dark mode nothing lighter than surface/overlay sits behind text.",
    ],
  });
  return page;
}

export function foundationPage(kind: Foundation): Page {
  const info = FOUNDATION_INFO[kind];
  const data = tokenData();
  if (kind === "typography") return typographyPage(data, info);
  if (kind === "spacing") return spacingPage(data, info);
  if (kind === "shape") return shapePage(data, info);
  const tokens = data.tokens.filter(info.match);
  const page: Page = { route: `/foundations/${kind}`, title: info.title, description: info.description, blocks: [] };

  if (tokens.length === 0) {
    page.blocks.push({ kind: "p", text: `Not published yet. Tokens for ${info.title.toLowerCase()} arrive with the ${info.session} session.` });
    return page;
  }

  const primitives = tokens.filter((t) => t.tier === "primitive");
  const semantic = tokens.filter((t) => t.tier === "semantic");

  if (primitives.length) {
    page.blocks.push({ kind: "h2", text: "Primitives" });
    page.blocks.push({ kind: "p", text: "Raw values. Sites do not use these directly; they use the semantic tokens below, which alias them." });
    // Group by the first two path segments (a ramp such as color.orange), in file order.
    const groups = new Map<string, Token[]>();
    for (const t of primitives) {
      const key = t.path.split(".").slice(0, 2).join(".");
      groups.set(key, [...(groups.get(key) ?? []), t]);
    }
    for (const [name, list] of groups) {
      if (groups.size > 1) page.blocks.push({ kind: "h3", text: name });
      if (kind === "color" && list.length >= 3) page.blocks.push({ kind: "ramp", name, steps: rampSteps(list) });
      page.blocks.push(primitiveTable(list));
    }
  }

  if (semantic.length) {
    page.blocks.push({ kind: "h2", text: "Semantic tokens" });
    const modeNote =
      data.colorModes.length > 1
        ? ` The ${data.colorModes
            .slice(1)
            .map((m) => modeLabel(m, data.modes).toLowerCase())
            .join(" and ")} values apply when the system prefers that scheme, or when the page sets data-theme.`
        : "";
    page.blocks.push({ kind: "p", text: `Purpose-named tokens. Pick one by its description. In CSS each one references its primitive, so the alias is visible in the browser's inspector.${modeNote}` });
    page.blocks.push(semanticTable(semantic, data.colorModes));
  }

  if (kind === "color") {
    page.blocks.push({ kind: "h2", text: "Contrast pairs" });
    page.blocks.push({
      kind: "p",
      text: "The text-on-background combinations the system allows, with their WCAG 2 contrast ratio. The build fails if any pair is below its minimum, so every pair listed here passes.",
    });
    const ratioCol = (m: string) => {
      const label = modeLabel(m, data.modes);
      return label ? `Ratio (${label})` : "Ratio";
    };
    page.blocks.push({
      kind: "table",
      columns: ["Text", "Background", "Minimum", ...data.colorModes.map(ratioCol), "Result"],
      rows: data.contrastPairs.map((p) => [
        { text: p.text, swatch: p.textValue, code: true },
        { text: p.background, swatch: p.backgroundValue, code: true },
        `${p.min}:1`,
        ...data.colorModes.map((m) => (p.modes[m] ? `${p.modes[m].ratio.toFixed(2)}:1` : "")),
        p.passes ? "Pass" : "Fail",
      ]),
    });
    if (data.exempt?.length) {
      page.blocks.push({ kind: "h3", text: "Exempt from contrast pairs" });
      page.blocks.push({ kind: "p", text: "Semantic colours that are never a text colour or a text background, with the reason." });
      page.blocks.push({ kind: "table", columns: ["Token", "Reason"], rows: data.exempt.map((e) => [{ text: e.token, code: true }, e.reason]) });
    }
    if (data.uncovered.length) {
      page.blocks.push({ kind: "h3", text: "Not covered by a contrast pair" });
      page.blocks.push({ kind: "p", text: "Semantic colours that no pair mentions and no exemption explains. Do not set text on or in these until one or the other exists." });
      page.blocks.push({ kind: "list", items: data.uncovered });
    }
  }

  return page;
}

// --- the other pages ----------------------------------------------------------------------------

export function homePage(): Page {
  const v = version();
  return {
    route: "/",
    title: "holotekt design system",
    description: `Design tokens and documentation for holotekt's sites. Current version ${v}.`,
    blocks: [
      {
        kind: "p",
        text: "A small public design system for augustinevontrapp.com and creatingwithsystems.com, built in the open. Token values are decided in Figma and flow one way: Figma to JSON to CSS to the sites. Components come later and will be documented here.",
      },
      {
        kind: "p",
        text: "The site is deliberately unstyled while the foundations are being decided. It will adopt the system's own tokens as they are published.",
      },
      { kind: "h2", text: "Foundations" },
      {
        kind: "links",
        items: FOUNDATIONS.map((k) => ({ text: FOUNDATION_INFO[k].title, href: `/foundations/${k}`, note: FOUNDATION_INFO[k].description })),
      },
      { kind: "h2", text: "Elsewhere" },
      {
        kind: "links",
        items: [
          { text: "Components", href: "/components", note: "Not published yet." },
          { text: "Decisions", href: "/decisions", note: "Why things are the way they are." },
          { text: "Changelog", href: "/changelog", note: `What changed in each version. Now at ${v}.` },
          { text: "Rules for consuming sites", href: "/consumer-rules", note: "A block for a site's AGENTS.md." },
          { text: "Accessibility", href: "/accessibility", note: "What the system commits to, and how to report a problem." },
          { text: "Repository on GitHub", href: REPO_URL },
          { text: "Figma file", href: FIGMA_URL },
        ],
      },
      { kind: "h2", text: "For agents" },
      {
        kind: "links",
        items: [
          { text: "llms.txt", href: "/llms.txt", note: "An index of every page with its Markdown version." },
          { text: "tokens.json", href: "/tokens.json", note: "Every token resolved, with CSS variable, alias target, description and contrast ratios." },
        ],
      },
    ],
  };
}

export const componentsPage = (): Page => ({
  route: "/components",
  title: "Components",
  description: "React components built on the tokens.",
  blocks: [{ kind: "p", text: "Not published yet. Components arrive with the components session, documented in Storybook under this site." }],
});

export function decisionsPage(): Page {
  const list = decisions();
  return {
    route: "/decisions",
    title: "Decisions",
    description: "Short notes on what was chosen, what was rejected and why. Newest first.",
    blocks: list.length
      ? [{ kind: "links", items: list.map((d) => ({ text: `${d.id}: ${d.title}`, href: `/decisions/${d.slug}`, note: `${d.date} · ${d.area}` })) }]
      : [{ kind: "p", text: "No decisions recorded yet." }],
  };
}

export function decisionPage(slug: string): Page | undefined {
  const d = decisions().find((x) => x.slug === slug);
  if (!d) return undefined;
  return {
    route: `/decisions/${d.slug}`,
    title: `${d.id}: ${d.title}`,
    description: `Decided ${d.date}. Area: ${d.area}.`,
    blocks: [{ kind: "md", markdown: d.body }],
  };
}

export const changelogPage = (): Page => ({
  route: "/changelog",
  title: "Changelog",
  description: `Every released version. The current version is ${version()}.`,
  // Drop the file's own H1; the page supplies the title.
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
    {
      kind: "p",
      text: "The intent: the system meets WCAG 2.2 AA. Every allowed text-on-background pair is checked for a 4.5:1 contrast ratio at build time, and a pair below that fails the build. This site uses semantic HTML, keeps the browser's visible focus styles and has no motion.",
    },
    { kind: "p", text: `If something here is hard to use, open an issue at ${REPO_URL}/issues.` },
  ],
});

// --- the whole site -----------------------------------------------------------------------------

export function allPages(): Page[] {
  return [
    homePage(),
    ...FOUNDATIONS.map(foundationPage),
    componentsPage(),
    decisionsPage(),
    ...decisions().map((d) => decisionPage(d.slug)!),
    changelogPage(),
    consumerRulesPage(),
    accessibilityPage(),
  ];
}

/** "/foundations/color" → ["foundations", "color.md"]; "/" → ["index.md"]. */
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

const cellText = (c: Cell) => {
  const t = typeof c === "string" ? c : c.code ? `\`${c.text}\`` : c.text;
  return t.replace(/\|/g, "\\|").replace(/\n/g, " ");
};

export function toMarkdown(page: Page): string {
  const out: string[] = [`# ${page.title}`, "", page.description, ""];
  for (const b of page.blocks) {
    switch (b.kind) {
      case "p":
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
        out.push(...b.items.map((l) => `- [${l.text}](${l.href.startsWith("/") ? SITE_URL + l.href : l.href})${l.note ? `: ${l.note}` : ""}`), "");
        break;
      case "table":
        out.push(`| ${b.columns.join(" | ")} |`, `| ${b.columns.map(() => "---").join(" | ")} |`);
        for (const r of b.rows) out.push(`| ${r.map(cellText).join(" | ")} |`);
        out.push("");
        break;
      case "ramp":
        // The table that follows carries the same data; Markdown has no strip.
        break;
      case "specimen":
        if (b.label) out.push(`*Specimen (${b.label}):* ${b.text}`, "");
        break;
      case "sample":
        out.push(`*Sample:* ${b.label}`, "");
        break;
      case "md":
        out.push(b.markdown, "");
        break;
    }
  }
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
    ...pages.filter((p) => p.route.startsWith("/foundations/")).map(line),
    "",
    "## Docs",
    ...pages.filter((p) => !p.route.startsWith("/foundations/") && !p.route.startsWith("/decisions/")).map(line),
    "",
    "## Decisions",
    ...pages.filter((p) => p.route.startsWith("/decisions/")).map(line),
    "",
    "## Data",
    `- [tokens.json](${SITE_URL}/tokens.json): every token resolved, with CSS variable name, alias target, description, and the contrast ratio of each allowed pair.`,
    `- [Repository](${REPO_URL}): source, changelog and the token JSON files.`,
    "",
  ].join("\n");
}
