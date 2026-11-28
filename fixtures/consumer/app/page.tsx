import Link from "next/link";
import { AccentBar, Button, Card, Divider } from "holotekt-design-system/components";
import { Rows } from "./rows";

export default function Page() {
  return (
    <main style={{ display: "flex", flexDirection: "column", gap: "var(--ht-space-800)" }}>
      <AccentBar />
      <h2>Work</h2>
      <Card as="aside" id="card-on">
        <span>Installed from the design system by git ref.</span>
      </Card>
      <Divider weight="strong" />
      <Card offset={false} id="card-off">
        <span>The same card without the offset.</span>
      </Card>
      <Divider weight="strong" />
      <Button>Do the thing</Button>
      <Button kind="secondary" href="/two" linkComponent={Link}>
        Go to two →
      </Button>
      <Rows />
    </main>
  );
}
