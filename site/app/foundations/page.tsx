import type { Metadata } from "next";
import { Render } from "../render";
import { foundationsIndexPage } from "@/lib/pages";

export const metadata: Metadata = { title: "Foundations" };
export default function FoundationsIndex() {
  return <Render page={foundationsIndexPage()} />;
}
