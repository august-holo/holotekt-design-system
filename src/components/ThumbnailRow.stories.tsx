import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { RouterLink } from "./stories/router-link";
import { ThumbnailRow } from "./ThumbnailRow";
import { SAMPLE_ROWS } from "./stories/samples";

const meta = {
  title: "Molecules/Thumbnail row", // level/title from levels.json; the component build checks it,
  component: ThumbnailRow,
  parameters: {
    docs: {
      description: {
        component:
          "One item in a list of work: thumbnail, title (heading/3) and summary (ui/body, text/secondary), all one link. No border or fill at rest. Usage guidance: https://designsystem.holotekt.com/components/thumbnail-row",
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
/** With a router's link component and a click handler for tracking: the row is still one link. Click it and see the Actions panel. */
export const WithRouterLink: Story = { args: { linkComponent: RouterLink, onClick: fn() } };
/** Without an image: the sunken surface stands in. */
export const NoImage: Story = { args: { image: undefined } };
