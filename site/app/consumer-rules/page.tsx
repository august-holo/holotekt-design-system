import type { Metadata } from "next";
import { Render } from "../render";
import { consumerRulesPage } from "@/lib/pages";

export const metadata: Metadata = { title: "Rules for consuming sites" };
export default function ConsumerRules() {
  return <Render page={consumerRulesPage()} />;
}
