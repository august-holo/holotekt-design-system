import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import { playwright } from "@vitest/browser-playwright";
import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";

const dirname = path.dirname(fileURLToPath(import.meta.url));

// Every story is a test, four times over: both themes at desktop and at phone width. The
// accessibility addon fails a story with a violation (a11y.test = "error" in .storybook/preview).
const project = (name: string, initialGlobals: Record<string, unknown>) => ({
  extends: true as const,
  plugins: [storybookTest({ configDir: path.join(dirname, ".storybook"), storybookScript: "npm run storybook -- --no-open", initialGlobals })],
  test: {
    name,
    browser: { enabled: true, provider: playwright({}), headless: true, instances: [{ browser: "chromium" }] },
    setupFiles: [path.join(dirname, ".storybook", "vitest.setup.ts")],
  },
});

export default defineConfig({
  test: {
    projects: [
      project("light", { theme: "light", viewport: { value: "desktop", isRotated: false } }),
      project("dark", { theme: "dark", viewport: { value: "desktop", isRotated: false } }),
      project("light-phone", { theme: "light", viewport: { value: "phone", isRotated: false } }),
      project("dark-phone", { theme: "dark", viewport: { value: "phone", isRotated: false } }),
    ],
  },
});
