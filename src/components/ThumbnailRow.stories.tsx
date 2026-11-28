import type { Meta, StoryObj } from "@storybook/react-vite";
import { ThumbnailRow } from "./ThumbnailRow";
import { SAMPLE_ROWS } from "./stories/samples";

const meta = {
  title: "ThumbnailRow",
  component: ThumbnailRow,
  parameters: {
    docs: {
      description: {
        component:
          "One item in a list of work: thumbnail, title (heading/3) and summary (ui/body, text/secondary), all one link. No border or fill at rest. Usage guidance: https://designsystem.holotekt.com/components/thumbnail-list",
      },
    },
  },
  args: SAMPLE_ROWS[0],
} satisfies Meta<typeof ThumbnailRow>;
export default meta;
type Story = StoryObj<typeof meta>;

/** At rest, directly on the page. */
export const Default: Story = {};
/** Hovered: the row takes surface/hover; the thumbnail's border and offset animate in. */
export const Hover: Story = { parameters: { pseudo: { hover: true } } };
/** Keyboard focus: border/focus at border/width/thick around the row. */
export const Focus: Story = { args: { state: "focus" } };
/** Without a summary. */
export const TitleOnly: Story = { args: { summary: undefined } };
/** Without an image: the sunken surface stands in. */
export const NoImage: Story = { args: { image: undefined } };
