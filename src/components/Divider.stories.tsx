import type { Meta, StoryObj } from "@storybook/react-vite";
import { Divider } from "./Divider";

const meta = {
  title: "Divider",
  component: Divider,
  parameters: {
    docs: {
      description: {
        component: "A rule that separates content. Hairline (border/divider, thin) between rows; strong (border/strong, thick) only at the edges of a page region. Usage guidance: https://designsystem.holotekt.com/components/divider",
      },
    },
  },
  decorators: [(Story) => <div style={{ width: "min(100%, var(--ht-layout-width-reading))" }}><Story /></div>],
} satisfies Meta<typeof Divider>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Hairline: border/divider at border/width/thin. */
export const Hairline: Story = {};
/** Strong: border/strong at border/width/thick. */
export const Strong: Story = { args: { weight: "strong" } };
/** Decorative: hidden from assistive technology. */
export const Decorative: Story = { args: { decorative: true } };
