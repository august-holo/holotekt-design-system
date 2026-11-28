import type { Meta, StoryObj } from "@storybook/react-vite";
import { Card } from "./Card";

const meta = {
  title: "Atoms/Card", // level/title from levels.json; the component build checks it,
  component: Card,
  parameters: {
    docs: {
      description: {
        component:
          "A static raised surface for a note, aside or summary. The orange offset is a decoration, not elevation: it does not mean the card is on top. Depth comes from the surface tone. Usage guidance: https://designsystem.holotekt.com/components/card",
      },
    },
  },
  args: {
    children: (
      <>
        <span className="ht-ui-label" style={{ color: "var(--ht-color-text-muted)" }}>
          Label
        </span>
        <span className="ht-voice-human">A note in a person’s own words sits here.</span>
      </>
    ),
    style: { maxWidth: "calc(var(--ht-layout-width-reading) / 2)" },
  },
} satisfies Meta<typeof Card>;
export default meta;
type Story = StoryObj<typeof meta>;

/** The default: border/strong and the hard orange offset. */
export const OffsetOn: Story = { args: { offset: true } };
/** A plain raised surface: no border, no offset. Depth by tone alone. */
export const OffsetOff: Story = { args: { offset: false } };
/** Two cards in a column with one gap: the gap under a card measures the same with the offset on and off, because the card reserves its offset. */
export const ReservesItsOffset: Story = {
  render: (args) => (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--ht-space-600)", maxWidth: "calc(var(--ht-layout-width-reading) / 2)" }}>
      <Card {...args} offset />
      <Card {...args} offset={false} />
      <Card {...args} offset />
    </div>
  ),
};
/** Rendered as an aside, for content set apart from the main text. */
export const AsAside: Story = { args: { as: "aside", offset: true } };
