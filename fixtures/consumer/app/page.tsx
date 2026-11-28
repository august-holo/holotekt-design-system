import Link from "next/link";
import { Button, Card, Divider } from "holotekt-design-system/components";
import { Rows } from "./rows";

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
      <Rows />
    </main>
  );
}
