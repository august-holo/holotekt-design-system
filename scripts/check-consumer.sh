#!/bin/bash
# Proves the package works for a consumer: a plain Next.js 16 app (fixtures/consumer) installs this
# repo from git by ref, which runs `prepare` (tokens and components build), imports the components
# and their CSS, and builds a static export. No consumer build configuration is involved.
# Usage: scripts/check-consumer.sh [ref]   (default: HEAD of this clone; a tag such as v0.6.0 after a release)
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
REF=${1:-$(git -C "$ROOT" rev-parse HEAD)}
FIX="$ROOT/fixtures/consumer"
cd "$FIX"
rm -rf node_modules .next out package-lock.json
npm install --no-audit --no-fund --loglevel=error
npm install --no-audit --no-fund --loglevel=error --no-save "git+file://$ROOT#$REF"
test -f node_modules/holotekt-design-system/dist/components/index.js
test -f node_modules/holotekt-design-system/dist/components.css
npm run -s build
grep -q "ht-card ht-card--offset" out/index.html
grep -q "ht-thumbnail-row__title" out/index.html
grep -Eq '<a[^>]*class="ht-thumbnail-row"[^>]*href="/one"' out/index.html
grep -Eq '<a[^>]*class="ht-thumbnail"[^>]*href="/three"' out/index.html
grep -q '<button class="ht-button ht-button--primary" type="button"' out/index.html
grep -Eq '<a[^>]*class="ht-button ht-button--secondary"[^>]*href="/two"' out/index.html
grep -rq --include="*.css" -- "--ht-decoration-card-offset" out/_next
echo "✓ consumer fixture: installed holotekt-design-system@$REF by git, built a Next.js 16 static export with Button (as a button and as a Next Link), Card, Divider, ThumbnailList and ThumbnailRow and Thumbnail through Next Link with onClick, components.css bundled"
