import Link from "next/link";
import { Button, Card, Divider, ThumbnailList, ThumbnailRow } from "holotekt-design-system/components";

export default function Page() {
  return (
    <main>
      <Card as="aside">
        <span>Installed from the design system by git ref.</span>
      </Card>
      <Button>Do the thing</Button>
      <Button kind="secondary" href="/two" linkComponent={Link}>
        Go to two →
      </Button>
      <Divider weight="strong" />
      <ThumbnailList aria-label="Work">
        <ThumbnailRow href="/one" title="One piece of work" summary="Its summary." />
        <ThumbnailRow href="/two" title="Another" />
      </ThumbnailList>
    </main>
  );
}
