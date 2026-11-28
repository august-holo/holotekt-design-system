import type { Meta, StoryObj } from "@storybook/react-vite";
import { Section } from "./Section";
import { Stack } from "./Stack";
import { Box } from "./stories/box";

const meta = {
  title: "Layout/Section", // group/title from levels.json; the component build checks it
  component: Section,
  parameters: { docs: { description: { component: "A major part of a page: the accent bar, a heading, then the content, with fixed spacing between them and no margin outside; a page places its sections with Stack gap=\"section\". Made of AccentBar and Stack. The heading is always heading/2; the level changes only the element. Usage guidance: https://designsystem.holotekt.com/components/layout" } } },
  args: { heading: "See my work", children: [<Box key="1" tall>Content</Box>] },
} satisfies Meta<typeof Section>;
export default meta;
type Story = StoryObj<typeof meta>;

/** The default: bar, heading as an h2, content. */
export const Default: Story = {};
/** Without the bar, for a section that should not call attention to itself. */
export const NoBar: Story = { args: { bar: false } };
/** Rendered as an h3 for document structure. The size does not change. */
export const LevelThree: Story = { args: { level: 3 } };
/** Two sections placed by a Stack at the section gap: the space between them comes from the Stack, the sections carry none of their own. */
export const InAStack: Story = {
  render: (args) => (
    <Stack gap="section">
      <Section {...args} heading="See my work" />
      <Section {...args} heading="Read the notes" />
    </Stack>
  ),
};
