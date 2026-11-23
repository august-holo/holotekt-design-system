#!/bin/bash
# Check, build, sync the docs site to S3, and invalidate CloudFront.
# Used by CI and for manual deploys. Requires Node and AWS credentials.
set -euo pipefail

ROOT=$(cd "$(dirname "$0")/.." && pwd)
# Written by Terraform on a laptop; CI has the same names as environment variables.
if [ -f "$ROOT/.github/deploy.env" ]; then
  set -a && source "$ROOT/.github/deploy.env" && set +a
fi
for v in AWS_REGION SITE_BUCKET DISTRIBUTION_ID; do : "${!v:?$v is not set}"; done
export AWS_REGION

cd "$ROOT"
npm ci
npm run check

OUT="$ROOT/site/out"
# Hashed assets never change; everything else is revalidated on each request to CloudFront.
aws s3 sync "$OUT/_next" "s3://$SITE_BUCKET/_next" \
  --cache-control "public, max-age=31536000, immutable" --only-show-errors
aws s3 sync "$OUT" "s3://$SITE_BUCKET" --delete \
  --exclude "_next/*" --cache-control "public, max-age=0, must-revalidate" --only-show-errors
# The Markdown twins and llms.txt are read by agents; make sure they are served as text.
aws s3 cp "s3://$SITE_BUCKET" "s3://$SITE_BUCKET" --recursive --exclude "*" --include "*.md" \
  --content-type "text/markdown; charset=utf-8" --metadata-directive REPLACE \
  --cache-control "public, max-age=0, must-revalidate" --only-show-errors

aws cloudfront create-invalidation --distribution-id "$DISTRIBUTION_ID" --paths "/*" \
  --query Invalidation.Id --output text
echo "deployed: ${SITE_URL:-$SITE_BUCKET}"
