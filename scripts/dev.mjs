#!/usr/bin/env node
// npm run dev — builds the tokens, rebuilds them whenever tokens/ changes, and runs the site.
import { spawn, spawnSync } from "node:child_process";
import { ROOT } from "./lib/tokens.mjs";

const first = spawnSync(process.execPath, ["scripts/build-tokens.mjs"], { cwd: ROOT, stdio: "inherit" });
if (first.status !== 0) process.exit(first.status);

const watcher = spawn(process.execPath, ["--watch-path=tokens", "--watch-preserve-output", "scripts/build-tokens.mjs"], { cwd: ROOT, stdio: "inherit" });
const site = spawn("npx", ["next", "dev", "site", ...process.argv.slice(2)], { cwd: ROOT, stdio: "inherit" });

const stop = () => {
  watcher.kill();
  site.kill();
};
site.on("exit", (code) => {
  watcher.kill();
  process.exit(code ?? 0);
});
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
