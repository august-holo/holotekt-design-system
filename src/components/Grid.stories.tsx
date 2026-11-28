import type { Meta, StoryObj } from "@storybook/react-vite";
import { Grid } from "./Grid";
import { Box } from "./stories/box";

const meta = {
  title: "Layout/Grid", // group/title from levels.json; the component build checks it
  component: Grid,
  subcomponents: { "Grid.Item": Grid.Item },
  parameters: { docs: { description: { component: "The system's columns with the grid gutter between them. Children are Grid.Item and say how many columns they span; on phones every item takes the full width. No look of its own. Usage guidance: https://designsystem.holotekt.com/components/layout" } } },
} satisfies Meta<typeof Grid>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Nine and three. */
export const NineAndThree: Story = {
  render: () => (
    <Grid>
      <Grid.Item span={9}><Box tall>span 9</Box></Grid.Item>
      <Grid.Item span={3}><Box tall>span 3</Box></Grid.Item>
    </Grid>
  ),
};
/** Three fours. */
export const Thirds: Story = {
  render: () => (
    <Grid>
      <Grid.Item span={4}><Box tall>span 4</Box></Grid.Item>
      <Grid.Item span={4}><Box tall>span 4</Box></Grid.Item>
      <Grid.Item span={4}><Box tall>span 4</Box></Grid.Item>
    </Grid>
  ),
};
/** Collapsing at lg (1024) instead of md: every item is full width through the tablet range too. */
export const CollapseLg: Story = {
  render: () => (
    <Grid collapse="lg">
      <Grid.Item span={9}><Box tall>span 9, collapse lg</Box></Grid.Item>
      <Grid.Item span={3}><Box tall>span 3, collapse lg</Box></Grid.Item>
    </Grid>
  ),
};
/** At phone width every item takes the full width. */
export const Phone: Story = { ...Thirds, globals: { viewport: { value: "phone", isRotated: false } } };
