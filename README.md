# holotekt design system

Design tokens and documentation for holotekt's sites: augustinevontrapp.com and
creatingwithsystems.com. Public, and built to be used by people and by coding agents.

https://designsystem.holotekt.com

Token values are decided in Figma and flow one way: Figma → JSON in `tokens/` → CSS, JS and JSON in
`dist/` → the sites. Nothing publishes by itself; every release is a tagged commit.

## Using the tokens

```sh
npm i github:august-holo/holotekt-design-system#v0.0.1
```

```css
@import "holotekt-design-system/tokens.css";        /* every token as a CSS variable, light and dark, desktop and mobile */
@import "holotekt-design-system/text-styles.css";   /* optional: one class per text style, .ht-heading-1 … */
.page { background: var(--ht-color-surface-page); color: var(--ht-color-text-primary); }
h1 { font: var(--ht-heading-display-font-weight) var(--ht-heading-display-font-size) / var(--ht-heading-display-line-height) var(--ht-heading-display-font-family); }
```

Fonts are not in the package. Load the families yourself (self-hosted woff2 is what this site does); the
typography page lists the files each family needs.

Use semantic tokens only, chosen by their description. `docs/consumer-rules.md` is the block to paste
into a consuming site's `AGENTS.md`. For agents, the site serves `/llms.txt`, a Markdown twin of every
page at the page's address plus `.md`, and `/tokens.json`.

## Layout

| Path | What |
|---|---|
| `tokens/` | `primitives.json`, `semantic.json`, `typography.json`, `breakpoint.json`, `spacing.json` and their `<base>.<mode>.json` files (DTCG format); `contrast-pairs.json` and `font-stacks.json` by hand |
| `scripts/` | build, check, diff, release, deploy; `scripts/figma/` holds the read-only Figma script |
| `dist/` | build output, gitignored: `tokens.css`, `text-styles.css`, `tokens.js`, `tokens.d.ts`, `tokens.json`, plus `tokens.<mode>.js` per mode |
| `site/` | the docs site, Next.js static export, generated from `dist/tokens.json` |
| `content/decisions/` | public decision notes, one markdown file each |
| `.claude/skills/publish-tokens/` | the one-command publish from Figma, for Claude Code |
| `infra/` | Terraform for S3, CloudFront, the domain and the deploy role |

## Run

```sh
npm install
npm run dev            # http://localhost:3000; tokens rebuild when tokens/ changes
npm run check          # what CI runs: tokens check + build, lint, typecheck, site build
```

## Releasing

Every release is a tagged commit on `main`, cut locally and pushed. Pushing deploys the site. Both
paths below were followed as written for v0.0.1.

### One command, from Figma

In Claude Code, in this repo, after changing variables in Figma:

```
/publish-tokens
```

It reads the variables through the Figma MCP connector (read-only), writes `tokens/`, runs the diff
and the checks, shows a summary (changes, contrast table, uncovered colours, proposed bump, drafted
changelog lines), and on your confirmation commits, runs the release and prints the push command. It
stops without changing anything if a check fails; the fix is in Figma. See
`.claude/skills/publish-tokens/SKILL.md` for the exact steps, `scripts/figma/read-variables.js` for
the only code it runs in Figma, and `scripts/figma-to-dtcg.mjs` for the conversion.

### By hand

1. Get the tokens into `tokens/`: either run the Figma read script and the converter yourself, or
   edit the JSON from Figma's own export. `tokens/contrast-pairs.json` is always edited by hand.
2. `npm run tokens:diff` shows what changed since the last tag and suggests a bump.
   `npm run tokens:diff -- --changelog` drafts the changelog lines.
3. Put the changelog lines under `## [Unreleased]` in `CHANGELOG.md` and commit everything
   (the release script refuses a dirty tree).
4. `npm run release -- <patch|minor|major>`. It runs `npm run check`, bumps `package.json`, dates
   the Unreleased entries under a new heading, commits `release: vX.Y.Z` and tags `vX.Y.Z`.
   It refuses off `main` or with nothing under Unreleased.
5. `git push origin main --follow-tags`. GitHub Actions runs the check again and deploys. The site
   shows the new version in the footer, `/llms.txt` and `/tokens.json` within a minute or two.

Version plan: `0.0.1` loop dry run · `0.1.0` color · `0.2.0` typography · `0.3.0` spacing and layout ·
`0.4.0` shape and elevation · `0.5.0` components · `1.0.0` once both sites consume it.

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
