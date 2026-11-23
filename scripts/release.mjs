#!/usr/bin/env node
// npm run release -- <patch|minor|major>
// Refuses on a dirty tree, off main, or with an empty Unreleased section. Runs the full check,
// bumps package.json, dates the Unreleased entries under a new heading, commits and tags.
// It never pushes; it prints the push command.
import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { ROOT } from "./lib/tokens.mjs";

const bump = process.argv[2];
if (!["patch", "minor", "major"].includes(bump)) {
  console.error("usage: npm run release -- <patch|minor|major>");
  process.exit(2);
}
const git = (...a) => execFileSync("git", a, { cwd: ROOT, encoding: "utf8" }).trim();
const fail = (msg) => {
  console.error(`✗ ${msg}`);
  process.exit(1);
};

if (git("status", "--porcelain")) fail("the working tree is not clean. Commit or stash first; a release must be reproducible from a commit.");
if (git("rev-parse", "--abbrev-ref", "HEAD") !== "main") fail("releases are cut from main. Switch branches first.");

const changelogPath = path.join(ROOT, "CHANGELOG.md");
const changelog = fs.readFileSync(changelogPath, "utf8");
const m = /^## \[Unreleased\]\s*\n([\s\S]*?)(?=^## \[|\s*$(?![\s\S]))/m.exec(changelog);
if (!m) fail("CHANGELOG.md has no '## [Unreleased]' section.");
const entries = m[1].replace(/\s+$/, "");
if (!entries.trim()) fail("nothing under Unreleased in CHANGELOG.md. Add what changed (npm run tokens:diff -- --changelog drafts the token lines).");

console.log("Running npm run check…");
const check = spawnSync("npm", ["run", "check"], { cwd: ROOT, stdio: "inherit" });
if (check.status !== 0) fail("npm run check failed. Fix it and run the release again.");

execFileSync("npm", ["version", bump, "--no-git-tag-version"], { cwd: ROOT, stdio: "ignore" });
const { version } = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
const date = new Date().toISOString().slice(0, 10);

const updated = changelog.replace(m[0], `## [Unreleased]\n\n## [${version}] - ${date}\n${entries}\n\n`);
fs.writeFileSync(changelogPath, updated.replace(/\n{3,}/g, "\n\n"));

const files = ["package.json", "CHANGELOG.md"];
if (fs.existsSync(path.join(ROOT, "package-lock.json"))) files.push("package-lock.json");
git("add", ...files);
git("commit", "-q", "-m", `release: v${version}`);
git("tag", "-a", `v${version}`, "-m", `v${version}`);

console.log(`\n✓ released v${version} locally (commit + tag). Nothing was pushed.`);
console.log(`\nTo publish:\n\n  git push origin main --follow-tags\n`);
