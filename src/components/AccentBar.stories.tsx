import type { Meta, StoryObj } from "@storybook/react-vite";
import { AccentBar } from "./AccentBar";

const meta = {
  title: "Atoms/Accent bar", // level/title from levels.json; the component build checks it
  component: AccentBar,
  parameters: {
    docs: {
      description: {
        component:
          "A short orange bar that opens a major section: above the heading, gap/md away, left-aligned with it. Decoration, not a divider and not elevation; hidden from assistive technology. Usage guidance: https://designsystem.holotekt.com/components/accent-bar",
      },
    },
  },
} satisfies Meta<typeof AccentBar>;
export default meta;
type Story = StoryObj<typeof meta>;

/** On its own: accent/default, space/700 wide, space/100 tall, square corners. */
export const Default: Story = {};
/** Where it lives: above a section heading, gap/md away, left-aligned with it. */
export const AboveAHeading: Story = {
  render: (args) => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "var(--ht-gap-md)" }}>
      <AccentBar {...args} />
      <h2 className="ht-heading-2" style={{ margin: 0, color: "var(--ht-color-text-primary)" }}>
        See my work
      </h2>
    </div>
  ),
};
