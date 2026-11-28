import Link from "next/link";
import { AccentBar, Button, Card, Cluster, Container, Divider, Grid, Section, Stack } from "holotekt-design-system/components";
import { Rows } from "./rows";

export default function Page() {
  return (
    <Container as="main" className="fixture-main">
      <Stack gap="section">
        <Stack gap="lg" className="fixture-stack">
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
          <Cluster gap="md">
            <Button>Do the thing</Button>
            <Button kind="secondary" href="/two" linkComponent={Link}>
              Go to two →
            </Button>
          </Cluster>
          <Rows />
        </Stack>
        <Grid className="fixture-grid">
          <Grid.Item span={8}>
            <div>Eight columns</div>
          </Grid.Item>
          <Grid.Item span={4}>
            <div>Four columns</div>
          </Grid.Item>
        </Grid>
        <Grid collapse="lg" className="fixture-grid-lg">
          <Grid.Item span={9}>
            <div>Nine, collapsing at lg</div>
          </Grid.Item>
          <Grid.Item span={3}>
            <div>Three, collapsing at lg</div>
          </Grid.Item>
        </Grid>
        <Container width="reading" className="fixture-reading">
          <p>A reading Container nested in the page Container.</p>
        </Container>
        <Stack gap="section" className="fixture-sections">
          <Section heading="A section" level={3} id="fixture-section">
            <p>Content in the section.</p>
          </Section>
          <Section heading="Another section" level={3}>
            <p>Content in the next section.</p>
          </Section>
        </Stack>
      </Stack>
    </Container>
  );
}
