// Everything the site reads at build time: dist/tokens.json, package.json, CHANGELOG.md,
// content/decisions and docs/consumer-rules.md. The site holds no token data of its own.
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

export const ROOT = (() => {
  let dir = process.cwd();
  for (let i = 0; i < 4; i++) {
    if (fs.existsSync(path.join(dir, "tokens", "primitives.json"))) return dir;
    dir = path.dirname(dir);
  }
  throw new Error("Could not find the repository root (a directory holding tokens/primitives.json).");
})();

export const SITE_URL = (process.env.SITE_URL ?? "https://designsystem.holotekt.com").replace(/\/$/, "");
export const REPO_URL = "https://github.com/august-holo/holotekt-design-system";
export const FIGMA_URL = "https://www.figma.com/design/9PGHwdHaI5pEgpmTEnsU3A";

export interface Token {
  path: string;
  css: string;
  /** Which tokens/ file the token comes from: primitives, semantic, typography, breakpoint, spacing … */
  base: string;
  tier: "primitive" | "semantic" | "style";
  type: string;
  value: unknown;
  alias: string | null;
  description: string | null;
  /** Text styles only: the utility class and the unresolved value (aliases as written). */
  className?: string;
  raw?: Record<string, unknown>;
  /** Values in the other modes, keyed by mode name ("dark"). Absent on primitives and when there is one mode. */
  modes?: Record<string, { value: unknown; alias: string | null }>;
}

export interface ModeContrast {
  textValue: string;
  backgroundValue: string;
  ratio: number;
  passes: boolean;
}

export interface ContrastPair extends ModeContrast {
  text: string;
  background: string;
  min: number;
  /** Per-mode results; "default" is semantic.json itself. */
  modes: Record<string, ModeContrast>;
}

export interface TokenData {
  name: string;
  version: string;
  generatedAt: string;
  prefix: string;
  /** "default" first, then the other modes in file order. */
  modes: string[];
  /** The modes in which any colour changes; the contrast table has a column for each. */
  colorModes: string[];
  /** How each mode reaches CSS: a colour scheme, or a media query. */
  modeCss: Record<string, { kind: "scheme" } | { kind: "media"; media: string; shrinkOnly?: boolean }>;
  tokens: Token[];
  /** Font families keyed by token path: the fallback stack, the package, the files a site must load, the licence. */
  fonts: Record<string, { stack: string[]; package: string; files: string[]; license: string; source: string }>;
  contrastPairs: ContrastPair[];
  uncovered: string[];
}

const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8");

export function tokenData(): TokenData {
  const file = path.join(ROOT, "dist", "tokens.json");
  if (!fs.existsSync(file)) {
    throw new Error("dist/tokens.json is missing. Run `npm run tokens:build` first (npm run dev and npm run check do this for you).");
  }
  return JSON.parse(fs.readFileSync(file, "utf8")) as TokenData;
}

export function version(): string {
  return (JSON.parse(read("package.json")) as { version: string }).version;
}

export const changelog = () => read("CHANGELOG.md");
export const consumerRules = () => read("docs/consumer-rules.md");

export interface Decision {
  slug: string;
  id: string;
  title: string;
  date: string;
  area: string;
  body: string;
}

export function decisions(): Decision[] {
  const dir = path.join(ROOT, "content", "decisions");
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((file) => {
      const { data, content } = matter(fs.readFileSync(path.join(dir, file), "utf8"));
      const date = data.date instanceof Date ? data.date.toISOString().slice(0, 10) : String(data.date ?? "");
      return {
        slug: file.replace(/\.md$/, ""),
        id: String(data.id ?? ""),
        title: String(data.title ?? file),
        date,
        area: String(data.area ?? ""),
        body: content.trim(),
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
}

/** A token value as a person would write it: 16px, Georgia, serif, #FF6600, or JSON for anything else. */
export function showValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(showValue).join(", ");
  if (typeof value === "object") {
    const v = value as Record<string, unknown>;
    if ("value" in v && "unit" in v) return `${v.value}${v.unit}`;
    if (typeof v.hex === "string") return v.hex;
    return JSON.stringify(value);
  }
  return String(value);
}

/** A readable mode name: the default mode is "Light" once a dark mode exists, otherwise unlabelled. */
export function modeLabel(mode: string, modes: string[]): string {
  if (mode === "default") {
    if (modes.includes("dark")) return "Light";
    if (modes.includes("mobile")) return "Desktop";
    return "";
  }
  return mode[0].toUpperCase() + mode.slice(1);
}

/** A dimension as px and rem text: { value: 18, unit: "px" } → "18px · 1.125rem". */
export function showSize(value: unknown): string {
  if (value && typeof value === "object" && "value" in (value as object)) {
    const v = value as { value: number; unit: string };
    if (v.unit === "px") return `${v.value}px · ${Number((v.value / 16).toFixed(4))}rem`;
    return `${v.value}${v.unit}`;
  }
  return showValue(value);
}

/** WCAG relative luminance of a #rrggbb colour, for ordering ramps light to dark. */
export function luminance(hex: string): number {
  const chan = (i: number) => {
    const c = parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * chan(0) + 0.7152 * chan(1) + 0.0722 * chan(2);
}
