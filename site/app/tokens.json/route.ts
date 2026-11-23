// /tokens.json — the resolved token data from dist/tokens.json, at a stable address.
import { tokenData } from "@/lib/data";

export const dynamic = "force-static";

export function GET() {
  return new Response(JSON.stringify(tokenData(), null, 2) + "\n", {
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
