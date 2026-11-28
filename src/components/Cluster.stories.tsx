import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "./Button";
import { Cluster } from "./Cluster";

const meta = {
  title: "Layout/Cluster", // group/title from levels.json; the component build checks it
  component: Cluster,
  parameters: { docs: { description: { component: "Things in a row that wrap onto new lines when they run out of room: navigation links, a row of buttons. No look of its own. Usage guidance: https://designsystem.holotekt.com/components/layout" } } },
  args: { children: [<Button key="1">Open the map</Button>, <Button key="2" kind="secondary">Save a copy</Button>, <Button key="3" kind="secondary">Share</Button>] },
} satisfies Meta<typeof Cluster>;
export default meta;
type Story = StoryObj<typeof meta>;

/** gap/md, items from the start. */
export const Start: Story = {};
/** Centred. */
export const Centre: Story = { args: { align: "centre" } };
/** From the end. */
export const End: Story = { args: { align: "end" } };
/** Space between: a brand on the left and links on the right. */
export const Between: Story = { args: { align: "between", gap: "lg" } };
/** gap/sm. */
export const Sm: Story = { args: { gap: "sm" } };
