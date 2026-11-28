import type { Meta, StoryObj } from "@storybook/react-vite";
import { Stack } from "./Stack";
import { Box } from "./stories/box";

const meta = {
  title: "Layout/Stack", // group/title from levels.json; the component build checks it
  component: Stack,
  parameters: { docs: { description: { component: "Things in a column with one gap between them. The parent sets the space; children carry no margins. No look of its own. Usage guidance: https://designsystem.holotekt.com/components/layout" } } },
  args: { children: [<Box key="1">One</Box>, <Box key="2">Two</Box>, <Box key="3">Three</Box>] },
} satisfies Meta<typeof Stack>;
export default meta;
type Story = StoryObj<typeof meta>;

/** gap/md, the default. */
export const Md: Story = {};
/** gap/sm. */
export const Sm: Story = { args: { gap: "sm" } };
/** gap/lg. */
export const Lg: Story = { args: { gap: "lg" } };
/** The section gap: layout/section/gap, smaller on phones. */
export const SectionGap: Story = { args: { gap: "section" } };
/** As a list: no bullets, no indent, still a list to assistive technology. */
export const AsList: Story = { args: { as: "ul", children: [<li key="1"><Box>One</Box></li>, <li key="2"><Box>Two</Box></li>] } };
