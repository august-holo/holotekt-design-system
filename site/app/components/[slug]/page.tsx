import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Render } from "../../render";
import { COMPONENT_PAGES, componentPage, type ComponentSlug } from "@/lib/pages";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;
export const generateStaticParams = () => COMPONENT_PAGES.map((slug) => ({ slug }));

const isComponent = (s: string): s is ComponentSlug => (COMPONENT_PAGES as readonly string[]).includes(s);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (!isComponent(slug)) return {};
  const page = componentPage(slug);
  return { title: page.title, description: page.description };
}

export default async function ComponentPage({ params }: Props) {
  const { slug } = await params;
  if (!isComponent(slug)) notFound();
  return <Render page={componentPage(slug)} />;
}
