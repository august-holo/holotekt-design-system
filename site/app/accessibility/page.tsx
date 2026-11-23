import type { Metadata } from "next";
import { Render } from "../render";
import { accessibilityPage } from "@/lib/pages";

export const metadata: Metadata = { title: "Accessibility" };
export default function Accessibility() {
  return <Render page={accessibilityPage()} />;
}
