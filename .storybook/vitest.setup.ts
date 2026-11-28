import { setProjectAnnotations } from "@storybook/react-vite";
import * as a11yAnnotations from "@storybook/addon-a11y/preview";
import * as projectAnnotations from "./preview";

// Every story runs as a test with the same decorators, globals and accessibility rules as the UI.
setProjectAnnotations([a11yAnnotations, projectAnnotations]);
