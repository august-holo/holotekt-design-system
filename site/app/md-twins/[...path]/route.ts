// The Markdown twin of every page, built from the same Page object as the HTML so the two cannot
// disagree. Public address: the page's address plus ".md" (/foundations/color.md, /index.md …).
//
// The handler lives under /md-twins because a twin's address would otherwise be claimed by the page's
// own dynamic segment (/foundations/[kind] would swallow /foundations/color.md). In development a
// rewrite in next.config.ts maps *.md here; in the export, scripts/place-twins.mjs moves the files
// from out/md-twins/ to their public paths.
import { allPages, markdownSegments, pageForMarkdownSegments, toMarkdown } from "@/lib/pages";

export const dynamic = "force-static";
export const dynamicParams = false;

export const generateStaticParams = () => allPages().map((p) => ({ path: markdownSegments(p.route) }));

export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const page = pageForMarkdownSegments((await params).path);
  if (!page) return new Response("Not found", { status: 404 });
  return new Response(toMarkdown(page), { headers: { "content-type": "text/markdown; charset=utf-8" } });
}
