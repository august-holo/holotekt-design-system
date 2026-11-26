#!/usr/bin/env node
// npm run dev — builds the tokens, rebuilds them whenever tokens/ changes, and runs the site.
import { spawn, spawnSync } from "node:child_process";
import { ROOT } from "./lib/tokens.mjs";

for (const script of ["scripts/build-tokens.mjs", "scripts/copy-fonts.mjs"]) {
  const run = spawnSync(process.execPath, [script], { cwd: ROOT, stdio: "inherit" });
  if (run.status !== 0) process.exit(run.status);
}

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
