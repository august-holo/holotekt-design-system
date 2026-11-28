import type { Meta, StoryObj } from "@storybook/react-vite";
import { Container } from "./Container";
import { Box } from "./stories/box";

const meta = {
  title: "Layout/Container", // group/title from levels.json; the component build checks it
  component: Container,
  parameters: { layout: "fullscreen", docs: { description: { component: "Holds a page's content at the system's width and keeps it off the screen edge; the margin steps down on phones. No look of its own. Usage guidance: https://designsystem.holotekt.com/components/layout" } } },
  args: { children: <Box tall>Content, up to the page width. The space either side is the page margin.</Box> },
} satisfies Meta<typeof Container>;
export default meta;
type Story = StoryObj<typeof meta>;

/** The page width (1200) with the page margin at the sides. */
export const Page: Story = {};
/** The reading width (680). */
export const Reading: Story = { args: { width: "reading" } };
