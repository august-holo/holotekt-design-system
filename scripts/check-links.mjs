#!/usr/bin/env node
// After the site is built and the twins are placed: every internal link in the HTML resolves to a
// file in site/out, every page has its Markdown twin, every link in llms.txt resolves, and
// tokens.json and components.json are valid JSON. Fails the build otherwise.
import fs from "node:fs";
import path from "node:path";
import { ROOT } from "./lib/tokens.mjs";

const out = path.join(ROOT, "site", "out");
// Links to the site itself are checked; links to other hosts are not ours to verify.
const SITE_URL = (process.env.SITE_URL ?? "https://designsystem.holotekt.com").replace(/\/$/, "");
if (!fs.existsSync(out)) {
  console.error("✗ site/out does not exist; run `npm run build:site` first.");
  process.exit(1);
}
const problems = [];
const exists = (rel) => fs.existsSync(path.join(out, rel));

/** A site path ("/foundations/color", "/llms.txt", "/") → the exported file that serves it. */
const fileFor = (p) => {
  const clean = decodeURI(p.split(/[?#]/)[0]);
  if (clean === "/" || clean === "") return "index.html";
  const rel = clean.replace(/^\//, "");
  if (rel.endsWith("/")) return `${rel}index.html`;
  return rel.split("/").pop().includes(".") ? rel : `${rel}.html`;
};

const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));
// Storybook's own pages under storybook/ are a separate app: linked to, not checked for twins or links.
const htmlPages = walk(out)
  .filter((f) => f.endsWith(".html") && !f.includes(`${path.sep}_next${path.sep}`) && !path.relative(out, f).startsWith(`storybook${path.sep}`))
  .map((f) => path.relative(out, f))
  .filter((f) => !["404.html", "_not-found.html"].includes(f));

let links = 0;
for (const page of htmlPages) {
  const html = fs.readFileSync(path.join(out, page), "utf8");
  for (const m of html.matchAll(/\bhref="([^"]*)"/g)) {
    const href = m[1];
    if (!href.startsWith("/") || href.startsWith("//")) continue; // external, mailto, fragments
    if (href.startsWith("/_next/")) continue; // hashed assets, present by construction
    links++;
    if (!exists(fileFor(href))) problems.push(`${page}: link to ${href} has no file (${fileFor(href)})`);
  }
  const twin = page === "index.html" ? "index.md" : page.replace(/\.html$/, ".md");
  if (!exists(twin)) problems.push(`${page}: no Markdown twin at ${twin}`);
}

if (!exists("llms.txt")) problems.push("llms.txt is missing");
else {
  for (const m of fs.readFileSync(path.join(out, "llms.txt"), "utf8").matchAll(/\]\(([^)]+)\)/g)) {
    const url = m[1];
    const sitePath = url.startsWith(SITE_URL + "/") ? url.slice(SITE_URL.length) : url.startsWith("/") ? url : null;
    if (sitePath === null) continue; // another host
    links++;
    if (!exists(fileFor(sitePath))) problems.push(`llms.txt: ${sitePath} has no file (${fileFor(sitePath)})`);
  }
}

if (!exists("tokens.json")) problems.push("tokens.json is missing");
else {
  try {
    const t = JSON.parse(fs.readFileSync(path.join(out, "tokens.json"), "utf8"));
    if (!Array.isArray(t.tokens) || !t.tokens.length) problems.push("tokens.json has no tokens");
  } catch (e) {
    problems.push(`tokens.json is not valid JSON: ${e.message}`);
  }
}
if (!exists("components.json")) problems.push("components.json is missing");
else {
  try {
    const c = JSON.parse(fs.readFileSync(path.join(out, "components.json"), "utf8"));
    if (!Array.isArray(c.components) || !c.components.length) problems.push("components.json has no components");
  } catch (e) {
    problems.push(`components.json is not valid JSON: ${e.message}`);
  }
}
if (!exists("storybook/index.html")) problems.push("storybook/index.html is missing; run `npm run storybook:build` before the site build");
if (!exists("storybook/manifests/components.json")) problems.push("storybook/manifests/components.json is missing (the componentsManifest feature)");

if (problems.length) {
  console.error(`✗ ${problems.length} link problem${problems.length === 1 ? "" : "s"}:`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log(`✓ links: ${links} internal links across ${htmlPages.length} pages resolve; every page has a Markdown twin; llms.txt, tokens.json, components.json and Storybook are good`);
