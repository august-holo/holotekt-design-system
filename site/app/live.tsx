// The live examples on the component pages: the real components from src/components, rendered on
// the page's dotted grid with sample content. Ids are listed in lib/pages.ts so the Markdown twin
// can describe each example without rendering it.
import type { ReactNode } from "react";
import type { LiveId } from "@/lib/pages";
import { Button, Card, Divider, Thumbnail, ThumbnailList, ThumbnailRow } from "../../src/components";
import { SAMPLE_IMAGES, SAMPLE_ROWS } from "../../src/components/stories/samples";

const cardWidth = { maxWidth: "calc(var(--ht-layout-width-reading) / 2)" };
const CardBody = () => (
  <>
    <span className="ht-ui-label" style={{ color: "var(--ht-color-text-muted)" }}>
      Label
    </span>
    <span className="ht-voice-human">A note in a person’s own words sits here.</span>
  </>
);
const rows = (state?: "hover" | "focus", at = 1) => SAMPLE_ROWS.map((r, i) => <ThumbnailRow key={r.href} {...r} state={i === at ? state : undefined} />);

const STATES = [undefined, "hover", "pressed", "focus"] as const;
const buttonRow = (kind: "primary" | "secondary") => (
  <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--ht-gap-lg)", alignItems: "center" }}>
    {STATES.map((state) => (
      <Button key={state ?? "default"} kind={kind} state={state}>
        {state ? state[0].toUpperCase() + state.slice(1) : "Default"}
      </Button>
    ))}
    <Button kind={kind} disabled>
      Disabled
    </Button>
  </div>
);

export const LIVE: Record<LiveId, () => ReactNode> = {
  "button-states": () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--ht-gap-lg)" }}>
      {buttonRow("primary")}
      {buttonRow("secondary")}
    </div>
  ),
  "button-link": () => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--ht-gap-lg)", alignItems: "center" }}>
      <Button href="#map">Open the map →</Button>
      <Button href="#map" kind="secondary" disabled>
        Open the map →
      </Button>
    </div>
  ),
  "card-offset-on": () => (
    <Card style={cardWidth}>
      <CardBody />
    </Card>
  ),
  "card-offset-off": () => (
    <Card offset={false} style={cardWidth}>
      <CardBody />
    </Card>
  ),
  "thumbnail-list": () => <ThumbnailList aria-label="Selected work">{rows()}</ThumbnailList>,
  "thumbnail-list-hover": () => <ThumbnailList aria-label="Selected work, one row hovered">{rows("hover")}</ThumbnailList>,
  "thumbnail-row": () => <ThumbnailRow {...SAMPLE_ROWS[0]} />,
  "thumbnail-row-hover": () => <ThumbnailRow {...SAMPLE_ROWS[0]} state="hover" />,
  "thumbnail-row-focus": () => <ThumbnailRow {...SAMPLE_ROWS[0]} state="focus" />,
  "thumbnail-states": () => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--ht-gap-lg)" }}>
      <Thumbnail src={SAMPLE_IMAGES[0]} alt="At rest" />
      <Thumbnail src={SAMPLE_IMAGES[0]} alt="Hovered" state="hover" />
      <Thumbnail src={SAMPLE_IMAGES[0]} alt="Focused, as a link" href="#piece" state="focus" />
      <Thumbnail alt="Empty, before the image loads" />
    </div>
  ),
  "divider-hairline": () => <Divider />,
  "divider-strong": () => <Divider weight="strong" />,
};

export function Live({ id }: { id: LiveId }) {
  return <>{LIVE[id]()}</>;
}
