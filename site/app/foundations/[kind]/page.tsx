import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Render } from "../../render";
import { FOUNDATIONS, foundationPage, type Foundation } from "@/lib/pages";

type Props = { params: Promise<{ kind: string }> };

export const dynamicParams = false;
export const generateStaticParams = () => FOUNDATIONS.map((kind) => ({ kind }));

const isFoundation = (k: string): k is Foundation => (FOUNDATIONS as readonly string[]).includes(k);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { kind } = await params;
  if (!isFoundation(kind)) return {};
  const page = foundationPage(kind);
  return { title: page.title, description: page.description };
}

export default async function FoundationPage({ params }: Props) {
  const { kind } = await params;
  if (!isFoundation(kind)) notFound();
  return <Render page={foundationPage(kind)} />;
}
