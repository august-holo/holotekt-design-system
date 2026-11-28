import type { Meta, StoryObj } from "@storybook/react-vite";
import { Card } from "./Card";
import { ThumbnailList } from "./ThumbnailList";
import { ThumbnailRow } from "./ThumbnailRow";
import { SAMPLE_ROWS } from "./stories/samples";

const meta = {
  title: "Organisms/Thumbnail list", // level/title from levels.json; the component build checks it,
  component: ThumbnailList,
  subcomponents: { ThumbnailRow },
  parameters: {
    docs: {
      description: {
        component:
          "A semantic list of ThumbnailRows separated by hairline dividers. Rows sit directly on the page, not in cards; hovering anywhere on a row triggers its thumbnail and the row takes surface/hover. Usage guidance: https://designsystem.holotekt.com/components/thumbnail-list",
      },
    },
  },
  args: { "aria-label": "Selected work", children: SAMPLE_ROWS.map((r) => <ThumbnailRow key={r.href} {...r} />) },
} satisfies Meta<typeof ThumbnailList>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Three rows with hairline dividers, an unordered list. */
export const Default: Story = {};
/** The same list as an ol: numbered for assistive technology, no numbers shown. */
export const Ordered: Story = { args: { ordered: true } };
/** The middle row hovered: surface/hover on the row, border and offset on its thumbnail. */
export const RowHover: Story = {
  args: { children: SAMPLE_ROWS.map((r, i) => <ThumbnailRow key={r.href} {...r} state={i === 1 ? "hover" : undefined} />) },
};
/** The middle row with keyboard focus: border/focus, thick, around the row. The offset is not a focus indicator. */
export const RowFocus: Story = {
  args: { children: SAMPLE_ROWS.map((r, i) => <ThumbnailRow key={r.href} {...r} state={i === 1 ? "focus" : undefined} />) },
};
/** At phone width the text drops below the image. */
export const Phone: Story = { globals: { viewport: { value: "phone", isRotated: false } } };

/** Under a heading with a guide line: the card's layout box includes its offset, and the first thumbnail lines up with the heading. */
export const UnderAHeading: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--ht-space-600)", position: "relative" }}>
      <span aria-hidden="true" style={{ position: "absolute", inset: "0 auto 0 0", borderLeft: "var(--ht-border-width-thin) dashed var(--ht-color-border-focus)" }} />
      <h2 className="ht-heading-2" style={{ margin: 0, color: "var(--ht-color-text-primary)" }}>
        A heading on the left edge
      </h2>
      <Card style={{ maxWidth: "calc(var(--ht-layout-width-reading) / 2)" }}>
        <span className="ht-ui-body">The dashed line is the content edge. The orange offset stays inside the card&apos;s own box, so the gap below it is the real gap.</span>
      </Card>
      <ThumbnailList aria-label="Selected work">{SAMPLE_ROWS.map((r) => <ThumbnailRow key={r.href} {...r} />)}</ThumbnailList>
    </div>
  ),
};
