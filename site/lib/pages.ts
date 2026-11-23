// One model for every docs page. The HTML page and its Markdown twin are both rendered from a
// Page, so they cannot drift. Foundation pages are built from dist/tokens.json alone: adding a
// token updates the page with no page edits.
import {
  changelog,
  consumerRules,
  decisions,
  FIGMA_URL,
  REPO_URL,
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
    description: "Font families, weights, sizes, line heights and letter spacing.",
    session: "typography",
    match: (t) => ["fontFamily", "fontWeight", "typography"].includes(t.type) || rootIn(["font", "typography", "text", "lineHeight", "letterSpacing"])(t),
  },
  spacing: {
    title: "Spacing and layout",
    description: "Spacing steps, sizes, breakpoints and layout measures.",
    session: "spacing and layout",
    match: rootIn(["space", "spacing", "size", "sizing", "layout", "grid", "breakpoint", "container"]),
  },
  shape: {
    title: "Shape and elevation",
    description: "Corner radii, borders, strokes and shadows.",
    session: "shape and elevation",
    match: (t) => ["shadow", "border", "strokeStyle"].includes(t.type) || rootIn(["radius", "border", "shadow", "elevation", "stroke"])(t),
  },
};

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

function semanticTable(tokens: Token[]): Block {
  return {
    kind: "table",
    columns: ["Token", "CSS variable", "Aliases", "Value", "When to use"],
    rows: tokens.map((t) => [
      { text: t.path, code: true },
      { text: t.css, code: true },
      { text: t.alias ?? "", code: true },
      valueCell(t),
      t.description ?? "",
    ]),
  };
}

export function foundationPage(kind: Foundation): Page {
  const info = FOUNDATION_INFO[kind];
  const data = tokenData();
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
      page.blocks.push(primitiveTable(list));
    }
  }

  if (semantic.length) {
    page.blocks.push({ kind: "h2", text: "Semantic tokens" });
    page.blocks.push({ kind: "p", text: "Purpose-named tokens. Pick one by its description. In CSS each one references its primitive, so the alias is visible in the browser's inspector." });
    page.blocks.push(semanticTable(semantic));
  }

  if (kind === "color") {
    page.blocks.push({ kind: "h2", text: "Contrast pairs" });
    page.blocks.push({
      kind: "p",
      text: "The text-on-background combinations the system allows, with their WCAG 2 contrast ratio. The build fails if any pair is below its minimum, so every pair listed here passes.",
    });
    page.blocks.push({
      kind: "table",
      columns: ["Text", "Background", "Ratio", "Minimum", "Result"],
      rows: data.contrastPairs.map((p) => [
        { text: p.text, swatch: p.textValue, code: true },
        { text: p.background, swatch: p.backgroundValue, code: true },
        `${p.ratio.toFixed(2)}:1`,
        `${p.min}:1`,
        p.passes ? "Pass" : "Fail",
      ]),
    });
    if (data.uncovered.length) {
      page.blocks.push({ kind: "h3", text: "Not covered by a contrast pair" });
      page.blocks.push({ kind: "p", text: "Semantic colours that no pair mentions. Do not set text on or in these until a pair exists." });
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
          { text: "Accessibility", href: "/accessibility" },
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
      case "md":
        out.push(b.markdown, "");
        break;
    }
  }
  out.push(`---`, ``, `HTML version: ${SITE_URL}${page.route}`, "");
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
