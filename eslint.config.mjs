import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  // The Next.js app lives in site/, not at the repo root.
  { settings: { next: { rootDir: "site/" } } },
  globalIgnores(["site/.next/**", "site/out/**", "dist/**", "node_modules/**", "next-env.d.ts", "site/next-env.d.ts"]),
]);
