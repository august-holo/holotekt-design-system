import type { Metadata } from "next";
import { Render } from "../render";
import { decisionsPage } from "@/lib/pages";

export const metadata: Metadata = { title: "Decisions" };
export default function Decisions() {
  return <Render page={decisionsPage()} />;
}
