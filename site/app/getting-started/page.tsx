import type { Metadata } from "next";
import { Render } from "../render";
import { gettingStartedPage } from "@/lib/pages";

const page = gettingStartedPage();
export const metadata: Metadata = { title: page.title, description: page.description };
export default function GettingStarted() {
  return <Render page={gettingStartedPage()} />;
}
