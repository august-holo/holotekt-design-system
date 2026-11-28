// /components.json — the component manifest from dist/components.json, at a stable address.
import { componentData } from "@/lib/data";

export const dynamic = "force-static";

export function GET() {
  return new Response(JSON.stringify(componentData(), null, 2) + "\n", {
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
