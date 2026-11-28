import type { Metadata } from "next";
import { Render } from "../../render";
import { layoutPage } from "@/lib/pages";

const page = layoutPage();
export const metadata: Metadata = { title: page.title, description: page.description };
export default function LayoutHelpers() {
  return <Render page={layoutPage()} />;
}
