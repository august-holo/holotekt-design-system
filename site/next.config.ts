import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";

// The docs site: a static export served from S3 behind CloudFront. It lives in site/ inside the
// design system repo, so the bundler root is the repo root (one package.json, one node_modules).
//
// Markdown twins (/foundations/color.md …) are served by app/md-twins/[...path]/route.ts, because a
// twin's own address would be claimed by the page's dynamic segment. In development a rewrite sends
// *.md there; a static export cannot rewrite, so scripts/place-twins.mjs moves the exported files
// from out/md-twins/ to their public paths after `next build`. As in the portfolio, the export is
// turned on only for production builds: the dev server's static-path check rejects rewritten URLs.
const isProduction = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  turbopack: { root: fileURLToPath(new URL("..", import.meta.url)) },
  ...(isProduction
    ? { output: "export" }
    : {
        async rewrites() {
          // Two parameters so the path segments survive the rewrite (one greedy parameter is encoded).
          return [{ source: "/:dir*/:file([^/]+\\.md)", destination: "/md-twins/:dir*/:file" }];
        },
      }),
};

export default nextConfig;
