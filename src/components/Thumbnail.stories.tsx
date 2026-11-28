import type { Meta, StoryObj } from "@storybook/react-vite";
import { Thumbnail } from "./Thumbnail";
import { SAMPLE_IMAGES } from "./stories/samples";

const meta = {
  title: "Thumbnail",
  component: Thumbnail,
  parameters: {
    docs: {
      description: {
        component:
          "The image itself. At rest it has no border; on hover the ink border and the orange offset arrive together over 150ms (without animating under prefers-reduced-motion). The offset is decoration and motion, not elevation. Usage guidance: https://designsystem.holotekt.com/components/thumbnail-list",
      },
    },
  },
  args: { src: SAMPLE_IMAGES[0], alt: "An orange disc on a warm grey field" },
} satisfies Meta<typeof Thumbnail>;
export default meta;
type Story = StoryObj<typeof meta>;

/** At rest: the image on surface/sunken, radius/sm, no border. */
export const Default: Story = {};
/** Hover: border/strong at border/width/thick inside, plus the offset in accent/default. */
export const Hover: Story = { parameters: { pseudo: { hover: true } } };
/** Hover, forced through the state prop (what the docs site uses). */
export const HoverForced: Story = { args: { state: "hover" } };
/** As a link on its own: keyboard focus shows border/focus on the thumbnail. */
export const LinkFocus: Story = { args: { href: "#piece", state: "focus" } };
/** No image yet: the sunken surface shows until one loads. */
export const Empty: Story = { args: { src: undefined, alt: undefined } };
/** A larger size, any CSS length. */
export const Larger: Story = { args: { size: "calc(var(--ht-space-900) * 2)" } };
