# holotekt design system

Design tokens and documentation for holotekt's sites: augustinevontrapp.com and
creatingwithsystems.com. Public, and built to be used by people and by coding agents.

https://designsystem.holotekt.com

Token values are decided in Figma and flow one way: Figma → JSON in `tokens/` → CSS, JS and JSON in
`dist/` → the sites. Nothing publishes by itself; every release is a tagged commit.

## Using the tokens

```sh
npm i github:august-holo/holotekt-design-system#v0.1.0
```

```css
@import "holotekt-design-system/tokens.css";
.page { background: var(--ht-color-surface-page); color: var(--ht-color-text-primary); }
```

Use semantic tokens only, chosen by their description. `docs/consumer-rules.md` is the block to paste
into a consuming site's `AGENTS.md`. For agents, the site serves `/llms.txt`, a Markdown twin of every
page at the page's address plus `.md`, and `/tokens.json`.

## Layout

| Path | What |
|---|---|
| `tokens/` | `primitives.json`, `semantic.json` (DTCG format) and `contrast-pairs.json` |
| `scripts/` | build, check, diff, release, deploy |
| `dist/` | build output, gitignored: `tokens.css`, `tokens.js`, `tokens.d.ts`, `tokens.json` |
| `site/` | the docs site, Next.js static export, generated from `dist/tokens.json` |
| `content/decisions/` | public decision notes, one markdown file each |
| `infra/` | Terraform for S3, CloudFront, the domain and the deploy role |

## Run

```sh
npm install
npm run dev            # http://localhost:3000; tokens rebuild when tokens/ changes
npm run check          # what CI runs: tokens check + build, lint, typecheck, site build
```

## Releasing

Written properly once the loop has been run end to end. See `SPEC.md` section 6 for the intended
steps.

## Deploying

Pushing to `main` deploys through GitHub Actions, which assumes an IAM role via OIDC; there are no
AWS credentials in GitHub. Terraform is applied locally, never from CI; its state is in S3.

```sh
scripts/bootstrap-state.sh                   # once: the S3 bucket for Terraform state
cd infra && terraform init -backend-config=backend.hcl && terraform apply
scripts/deploy.sh                            # a manual deploy from a laptop
```

Terraform writes `.github/deploy.env` for this machine; it is not committed. CI reads the same names
from the repository's Actions variables: `AWS_REGION`, `DEPLOY_ROLE_ARN`, `SITE_BUCKET`,
`DISTRIBUTION_ID`, `SITE_URL`.

## License

MIT.
