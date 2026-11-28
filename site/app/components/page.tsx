import type { Metadata } from "next";
import { Render } from "../render";
import { componentsIndexPage } from "@/lib/pages";

export const metadata: Metadata = { title: "Components" };
export default function Components() {
  return <Render page={componentsIndexPage()} />;
}
