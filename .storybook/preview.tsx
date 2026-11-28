import type { Decorator, Preview } from "@storybook/react-vite";
import "../dist/tokens.css";
import "../dist/text-styles.css";
import "../dist/utilities.css";
import "../site/app/fonts.css";
import "../src/components/components.css";
import "./preview.css";

// The theme is a toolbar global and a story global; both themes are tested by the Vitest projects.
const withTheme: Decorator = (Story, context) => {
  const theme = context.globals.theme === "dark" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", theme);
  document.documentElement.classList.add("ht-page-grid");
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
    options: { storySort: { order: ["Card", "Thumbnail", "ThumbnailRow", "ThumbnailList", "Divider"] } },
  },
  tags: ["autodocs"],
};
export default preview;
