#!/usr/bin/env node
// npm run tokens:diff [--changelog] [--json] — compares tokens/ with the last release tag.
// Suggests a version bump: removed or renamed = major (minor while under 1.0), added = minor,
// value-only = patch. With no tag yet, everything counts as added.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { ROOT, BASES, MODE_FILE, parseTokenSet, resolveAll, listModeFiles } from "./lib/tokens.mjs";

const args = new Set(process.argv.slice(2));
const git = (...a) => execFileSync("git", a, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();

let tag = null;
try {
  tag = git("describe", "--tags", "--abbrev=0", "--match", "v*");
} catch {
  /* no release tag yet */
}
const atTag = (file) => {
  try {
    return git("show", `${tag}:${file}`);
  } catch {
    return "{}";
  }
};
const now = (file) => fs.readFileSync(path.join(ROOT, file), "utf8");

const taggedFiles = tag ? git("ls-tree", "--name-only", tag, "tokens/").split("\n").filter(Boolean) : [];
const filesAtTag = Object.fromEntries(BASES.filter((b) => taggedFiles.includes(b.file)).map((b) => [b.base, atTag(b.file)]));
const modesAtTag = taggedFiles
  .map((f) => ({ f, m: MODE_FILE.exec(path.basename(f)) }))
  .filter(({ m }) => m)
  .map(({ f, m }) => ({ base: m[1], mode: m[2], content: atTag(f) }));
const filesNow = Object.fromEntries(BASES.filter((b) => fs.existsSync(path.join(ROOT, b.file))).map((b) => [b.base, now(b.file)]));
const modesNow = listModeFiles().map((m) => ({ ...m, content: now(m.file) }));
const before = parseTokenSet({ files: filesAtTag, modes: modesAtTag });
const after = parseTokenSet({ files: filesNow, modes: modesNow });
resolveAll(before);
resolveAll(after);

const show = (v) => (typeof v === "string" ? v : JSON.stringify(v));
const key = (t) => `${t.type}:${show(t.resolved)}`;
// A token's modes as one comparable string: "dark=#F7F7F1→color.neutral.50".
const modesKey = (t) => Object.entries(t.modes ?? {}).map(([m, v]) => `${m}=${show(v.resolved)}→${v.alias}`).sort().join("|");

const added = [];
const removed = [];
const changed = [];
const described = [];
for (const t of after.list) {
  const old = before.byPath.get(t.path);
  if (!old) added.push(t);
  else if (show(old.resolved) !== show(t.resolved) || old.alias !== t.alias || old.type !== t.type || modesKey(old) !== modesKey(t)) changed.push({ old, t });
  else if ((old.description ?? "") !== (t.description ?? "")) described.push({ old, t });
}
for (const t of before.list) if (!after.byPath.has(t.path)) removed.push(t);

// A removed token whose value reappears under a new name looks like a rename.
const renamed = [];
for (const r of [...removed]) {
  const match = added.find((a) => key(a) === key(r) && a.tier === r.tier);
  if (match) {
    renamed.push({ from: r, to: match });
    removed.splice(removed.indexOf(r), 1);
    added.splice(added.indexOf(match), 1);
  }
}

const version = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8")).version;
const under1 = version.startsWith("0.");
let bump = null;
if (removed.length || renamed.length) bump = under1 ? "minor" : "major";
else if (added.length) bump = "minor";
else if (changed.length || described.length) bump = "patch";

const describeChange = ({ old, t }) => {
  const parts = [];
  if (old.alias !== t.alias && t.alias) parts.push(`now aliases ${t.alias}${old.alias ? ` (was ${old.alias})` : ""}; ${show(old.resolved)} → ${show(t.resolved)}`);
  else if (show(old.resolved) !== show(t.resolved)) parts.push(`${show(old.resolved)} → ${show(t.resolved)}`);
  for (const [m, v] of Object.entries(t.modes ?? {})) {
    const o = old.modes?.[m];
    if (!o) parts.push(`${m} mode added (${show(v.resolved)}${v.alias ? `, aliases ${v.alias}` : ""})`);
    else if (show(o.resolved) !== show(v.resolved) || o.alias !== v.alias) parts.push(`${m}: ${show(o.resolved)} → ${show(v.resolved)}${v.alias ? ` (aliases ${v.alias})` : ""}`);
  }
  for (const m of Object.keys(old.modes ?? {})) if (!t.modes?.[m]) parts.push(`${m} mode removed`);
  return parts.join("; ");
};

if (args.has("--json")) {
  console.log(
    JSON.stringify(
      {
        since: tag,
        bump,
        added: added.map((t) => ({ path: t.path, value: t.resolved, alias: t.alias })),
        removed: removed.map((t) => ({ path: t.path, value: t.resolved })),
        renamed: renamed.map((r) => ({ from: r.from.path, to: r.to.path, value: r.to.resolved })),
        changed: changed.map(({ old, t }) => ({ path: t.path, from: old.resolved, to: t.resolved, alias: t.alias, wasAlias: old.alias, detail: describeChange({ old, t }) })),
        descriptionOnly: described.map(({ t }) => t.path),
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

const total = added.length + removed.length + renamed.length + changed.length + described.length;
if (args.has("--changelog")) {
  if (!total) process.exit(0);
  for (const t of added) console.log(`- Added \`${t.path}\` (${show(t.resolved)}${t.alias ? `, aliases \`${t.alias}\`` : ""}).`);
  for (const c of changed) console.log(`- Changed \`${c.t.path}\`: ${describeChange(c)}.`);
  for (const r of renamed) console.log(`- Renamed \`${r.from.path}\` to \`${r.to.path}\`.`);
  for (const t of removed) console.log(`- Removed \`${t.path}\` (was ${show(t.resolved)}).`);
  for (const d of described) console.log(`- Reworded the description of \`${d.t.path}\`.`);
  process.exit(0);
}

console.log(tag ? `Token changes since ${tag}:` : "No release tag yet; every token counts as added:");
if (!total) {
  console.log("  none");
  process.exit(0);
}
const section = (title, items, fmt) => {
  if (!items.length) return;
  console.log(`\n${title} (${items.length})`);
  for (const i of items) console.log(`  ${fmt(i)}`);
};
section("Added", added, (t) => `${t.path} = ${show(t.resolved)}${t.alias ? `  → ${t.alias}` : ""}`);
section("Removed", removed, (t) => `${t.path} (was ${show(t.resolved)})`);
section("Renamed-looking", renamed, (r) => `${r.from.path} → ${r.to.path}`);
section("Changed", changed, (c) => `${c.t.path}: ${describeChange(c)}`);
section("Description only", described, (d) => d.t.path);
console.log(`\nSuggested bump: ${bump}${bump === "minor" && (removed.length || renamed.length) ? " (would be major after 1.0)" : ""}`);
