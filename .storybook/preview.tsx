import type { Decorator, Preview } from "@storybook/react-vite";
// Deliberately not all.css and not base.css: the stories prove the components look right with the tokens,
// their own stylesheet and the text-style classes alone. Fonts are assets, not defaults.
import "../dist/tokens.css";
import "../dist/text-styles.css";
import "../src/components/components.css";
import "../dist/fonts.css";
import "./preview.css";

// The theme is a toolbar global and a story global; both themes are tested by the Vitest projects.
const withTheme: Decorator = (Story, context) => {
  const theme = context.globals.theme === "dark" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", theme);
  return <Story />;
};

const preview: Preview = {
  decorators: [withTheme],
  globalTypes: {
    theme: {
      description: "Colour theme",
      toolbar: { title: "Theme", icon: "mirror", items: [{ value: "light", title: "Light" }, { value: "dark", title: "Dark" }], dynamicTitle: true },
    },
  },
  initialGlobals: { theme: "light", viewport: { value: "desktop", isRotated: false } },
  parameters: {
    layout: "padded",
    a11y: { test: "error" },
    viewport: {
      options: {
        desktop: { name: "Desktop", styles: { width: "1280px", height: "800px" }, type: "desktop" },
        phone: { name: "Phone", styles: { width: "390px", height: "844px" }, type: "mobile" },
      },
    },
    docs: { codePanel: true },
    options: { storySort: { order: ["Atoms", "Molecules", "Organisms"] } },
  },
  tags: ["autodocs"],
};
export default preview;
