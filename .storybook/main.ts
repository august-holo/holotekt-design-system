import path from "node:path";
import { fileURLToPath } from "node:url";
import type { StorybookConfig } from "@storybook/react-vite";

const dirname = path.dirname(fileURLToPath(import.meta.url));

// Storybook is the workbench for the components in src/components: every state in both themes,
// accessibility checks on each story, and a components manifest for agents. It links to the docs
// site for usage guidance and does not carry its own. Built to site/public/storybook, so it ships
// with the site under /storybook/.
const config: StorybookConfig = {
  framework: "@storybook/react-vite",
  stories: ["../src/components/**/*.stories.tsx"],
  addons: ["@storybook/addon-docs", "@storybook/addon-a11y", "@storybook/addon-vitest", "storybook-addon-pseudo-states", "@storybook/addon-mcp"],
  // Writes manifests/components.json into the static build; addon-mcp serves it in dev.
  features: { componentsManifest: true },
  // Props and their doc comments for the docs tab and the manifest, read through the root tsconfig.json.
  typescript: { reactDocgen: "react-docgen-typescript", reactDocgenTypescriptOptions: { tsconfigPath: path.join(dirname, "..", "tsconfig.json"), shouldExtractLiteralValuesFromEnum: true, propFilter: (prop) => !prop.parent || !prop.parent.fileName.includes("node_modules") } },
  // The site's self-hosted fonts, copied by scripts/copy-fonts.mjs before a build.
  staticDirs: [{ from: "../site/public/fonts", to: "/fonts" }],
  core: { disableTelemetry: true },
};
export default config;
