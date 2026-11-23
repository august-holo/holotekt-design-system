import type { Metadata } from "next";
import { Render } from "../render";
import { changelogPage } from "@/lib/pages";

export const metadata: Metadata = { title: "Changelog" };
export default function Changelog() {
  return <Render page={changelogPage()} />;
}
