import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "./Button";

const meta = {
  title: "Atoms/Button", // level/title from levels.json; the component build checks it
  component: Button,
  parameters: {
    docs: {
      description: {
        component:
          "The main way to act. Primary for the one most important action in a view, secondary for any other. States change tone only: no offset, no shadow. A button that goes to another page is a link that looks like a button. Usage guidance: https://designsystem.holotekt.com/components/button",
      },
    },
  },
  args: { children: "Open the map" },
} satisfies Meta<typeof Button>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Primary at rest: accent/default fill, text/on-accent label. */
export const Primary: Story = {};
/** Primary hovered: accent/hover. */
export const PrimaryHover: Story = { parameters: { pseudo: { hover: true } } };
/** Primary pressed: accent/pressed. */
export const PrimaryPressed: Story = { args: { state: "pressed" } };
/** Primary with keyboard focus: the focus ring outside the button; the button itself unchanged. */
export const PrimaryFocus: Story = { args: { state: "focus" } };
/** Primary disabled: surface/disabled with text/disabled. */
export const PrimaryDisabled: Story = { args: { disabled: true } };
/** Secondary at rest: no fill, border/strong at border/width/thick, text/primary. */
export const Secondary: Story = { args: { kind: "secondary" } };
/** Secondary hovered: surface/hover. */
export const SecondaryHover: Story = { args: { kind: "secondary" }, parameters: { pseudo: { hover: true } } };
/** Secondary pressed: surface/pressed. */
export const SecondaryPressed: Story = { args: { kind: "secondary", state: "pressed" } };
/** Secondary with keyboard focus. */
export const SecondaryFocus: Story = { args: { kind: "secondary", state: "focus" } };
/** Secondary disabled: border/disabled with text/disabled. */
export const SecondaryDisabled: Story = { args: { kind: "secondary", disabled: true } };
/** A link that looks like a button: the same look, an anchor underneath. */
export const AsLink: Story = { args: { href: "#map", children: "Open the map →" } };
/** A disabled link: announced as a link, not focusable, not followable. */
export const DisabledLink: Story = { args: { href: "#map", disabled: true, kind: "secondary" } };
