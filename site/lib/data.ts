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
  tier: "primitive" | "semantic";
  type: string;
  value: unknown;
  alias: string | null;
  description: string | null;
}

export interface ContrastPair {
  text: string;
  background: string;
  textValue: string;
  backgroundValue: string;
  ratio: number;
  min: number;
  passes: boolean;
}

export interface TokenData {
  name: string;
  version: string;
  generatedAt: string;
  prefix: string;
  tokens: Token[];
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
