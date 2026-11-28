import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  // The Next.js app lives in site/, not at the repo root.
  { settings: { next: { rootDir: "site/" } } },
  // The package components cannot use next/image: they ship to any React app.
  { files: ["src/components/**"], rules: { "@next/next/no-img-element": "off" } },
  globalIgnores(["site/.next/**", "site/out/**", "site/public/storybook/**", "dist/**", "node_modules/**", "next-env.d.ts", "site/next-env.d.ts", "fixtures/consumer/.next/**", "fixtures/consumer/out/**", "fixtures/consumer/next-env.d.ts"]),
]);
