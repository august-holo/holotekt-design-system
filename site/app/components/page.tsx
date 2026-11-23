import type { Metadata } from "next";
import { Render } from "../render";
import { componentsPage } from "@/lib/pages";

export const metadata: Metadata = { title: "Components" };
export default function Components() {
  return <Render page={componentsPage()} />;
}
