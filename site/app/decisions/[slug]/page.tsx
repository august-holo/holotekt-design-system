import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Render } from "../../render";
import { decisions } from "@/lib/data";
import { decisionPage } from "@/lib/pages";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;
export const generateStaticParams = () => decisions().map((d) => ({ slug: d.slug }));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = decisionPage((await params).slug);
  return page ? { title: page.title, description: page.description } : {};
}

export default async function DecisionPage({ params }: Props) {
  const page = decisionPage((await params).slug);
  if (!page) notFound();
  return <Render page={page} />;
}
