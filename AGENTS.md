# holotekt design system — notes for coding agents

Design tokens and a docs site for holotekt's sites. Public repo, public site at
https://designsystem.holotekt.com. `SPEC.md` is the full brief; this file is the short version.

## What is where

- `tokens/primitives.json`, `tokens/semantic.json`, `tokens/typography.json`, `tokens/breakpoint.json`, `tokens/spacing.json`, `tokens/shape.json`: the
  tokens, DTCG format (`$value`, `$type`, `$description`). `<base>.<mode>.json` restates a base file for a
  mode (`semantic.dark.json`, `breakpoint.mobile.json`); `scripts/lib/modes.mjs` says how a mode reaches CSS,
  and the mobile media query takes its width from `layout.breakpoint.md` there.
- `tokens/contrast-pairs.json` (allowed text-on-background pairs), `tokens/contrast-exempt.json` (semantic colours
  that are never behind or in text, with reasons) and `tokens/font-stacks.json` (fallback stacks, packages, files
  and licences per font family) are maintained by hand.
- `scripts/`: build, check, diff and release. `scripts/lib/tokens.mjs` holds the shared logic.
- `dist/`: build output (gitignored). The site and consumers read `dist/tokens.json`.
- `site/`: the Next.js docs site, a static export. Pages are built from `dist/tokens.json`.
- `content/decisions/`: public "why" notes. `content/scenarios.json`: the "Scenarios and roles" tables on the foundation
  pages; `scripts/check-scenarios.mjs` fails the build if a named token does not exist. `docs/consumer-rules.md`: rules
  for sites using the system.
- `infra/`: Terraform, applied by hand from a laptop. `.github/workflows/`: CI and deploy.

## The task queue

`BACKLOG.md`, when present, is the queue of work for the code session. It stays on August's machine
and is not committed. Read it at the start of a session and follow its instructions.

## Commands

- `npm run tokens:check` validates the tokens and prints the contrast table.
- `npm run tokens:build` writes `dist/` (Style Dictionary plus `tokens.json`).
- `npm run tokens:diff` compares `tokens/` with the last release tag and suggests a version bump.
- `npm run check` runs everything CI runs: check, build, lint, typecheck, site build.
- `npm run dev` builds tokens and serves the site at http://localhost:3000, rebuilding on token changes.
- `npm run release -- <patch|minor|major>` cuts a release locally. It never pushes.
- `/publish-tokens` (a project skill) does the whole Figma → tokens → release loop; see the README.

**Run `npm run check` before you finish.**

## The token contract

- Two tiers. Primitives hold raw values. Semantic tokens alias primitives with `{color.neutral.900}`
  and never hold a raw value, except the translucent `color.surface.scrim` (named in `RAW_SEMANTIC_ALLOWED`).
  Every semantic token has a `$description` saying when to use it.
- Names are lowercase and dot-separated, general to specific. CSS: `--ht-` plus the path in kebab case.
- Figma is the source of truth for values. Tokens arrive here as JSON; do not hand-edit a value to make
  a check pass. If a contrast pair fails, the fix is in Figma.
- Colours are hex strings or DTCG colour objects; alpha is kept as `rgb(r g b / a)`. Dimensions are
  `{ "value": 16, "unit": "px" }`; px becomes rem in the CSS, except radii and border widths (`tokens/shape.json`),
  which stay px. There are no shadow tokens: elevation is tonal. A text style is a composite `typography` token named after the Figma style (`heading.1`,
  `ui.label`): `fontFamily` and `fontSize` are aliases, `fontWeight`, `lineHeight`, `letterSpacing` and
  `textTransform` are plain values. It becomes six variables (`--ht-heading-1-font-size` …) and one class
  (`.ht-heading-1`) in `dist/text-styles.css`.
- `dist/utilities.css` holds ready-made classes built from tokens by `scripts/build-tokens.mjs`. Today that is
  `.ht-page-grid`: `surface/page` with dots in `surface/dot` at `layout/grid/dot-pitch`, the default page
  background. It is decoration, not elevation; surfaces are plain fills and cover the dots. Dot colour and
  density have one value each (no options).

## Styling the docs site and, later, the components

- Three cascade layers, declared in `site/app/globals.css`: `tokens` (the generated variables),
  `base` (element defaults bound to tokens), `components`. New styles go in a layer; never fight
  specificity.
- Component styles are **CSS Modules**: one `name.module.css` next to the component, rules wrapped
  in `@layer components { … }`, classes applied via the imported `styles` object.
- Every colour, space, radius, shadow and type value is a `var(--ht-…)`. No raw values, no theme object, no
  runtime CSS-in-JS. The one exception is a colour or font set inline because it is the data being shown.
- The site is set entirely in its own tokens (`site/app/bindings.css` for element defaults, CSS Modules for the
  rest): colour, type, spacing, radius and borders. Rows wrap on narrow screens through flex bases taken from the
  width tokens, not media queries. No shadows. Fonts are self-hosted from `@fontsource` packages, copied into
  `site/public/fonts/` by `scripts/copy-fonts.mjs`; the token package ships names and stacks, not files.

## Rules

- Do not choose, adjust or add token values beyond what Figma published.
- Do not add components, Storybook, dark mode, analytics, a CMS or search unless the spec's current phase says so.
- Do not call the Figma REST API or write to the Figma file. Reading is through the Figma MCP connector.
- Do not push, run `terraform apply`, or create cloud resources without an explicit yes in the session.
- Do not commit secrets, `.env` files, `deploy.env`, `backend.hcl` or Terraform state.
- Do not edit `~/Desktop/august_portfolio` or `~/Desktop/design-system-field-notes`.
- The docs site stays unstyled until the maintainer says otherwise.
