#!/usr/bin/env node
// npm run tokens:check — validates tokens/ and prints the contrast table. Exit 1 on any error.
import { loadTokens, checkTokens, formatPairsTable } from "./lib/tokens.mjs";

let data;
try {
  data = loadTokens();
} catch (e) {
  console.error(`✗ ${e.message}`);
  process.exit(1);
}
const result = checkTokens(data);

console.log(`${data.list.length} tokens (${data.list.filter((t) => t.tier === "primitive").length} primitive, ${data.list.filter((t) => t.tier === "semantic").length} semantic)\n`);
console.log("Contrast pairs");
console.log(formatPairsTable(result.pairs));
console.log();
for (const w of result.warnings) console.log(`! ${w}`);
if (result.errors.length) {
  console.error(`\n${result.errors.length} problem${result.errors.length === 1 ? "" : "s"}:`);
  for (const e of result.errors) console.error(`✗ ${e}`);
  process.exit(1);
}
console.log("✓ tokens check passed");
