# holotekt design system — notes for coding agents

Design tokens, React components and a docs site for holotekt's sites. Public repo, public site at
https://designsystem.holotekt.com. `SPEC.md` is the full brief; this file is the short version.

## What is where

- `tokens/primitives.json`, `tokens/semantic.json`, `tokens/typography.json`, `tokens/breakpoint.json`, `tokens/spacing.json`, `tokens/shape.json`: the
  tokens, DTCG format (`$value`, `$type`, `$description`). `<base>.<mode>.json` restates a base file for a
  mode (`semantic.dark.json`, `breakpoint.mobile.json`); `scripts/lib/modes.mjs` says how a mode reaches CSS,
  and the mobile media query takes its width from `layout.breakpoint.md` there.
- `tokens/contrast-pairs.json` (allowed text-on-background pairs), `tokens/contrast-exempt.json` (semantic colours
  that are never behind or in text, with reasons) and `tokens/font-stacks.json` (fallback stacks, packages, files
  and licences per font family) are maintained by hand.
- `src/components/`: the React components (`Card`, `Thumbnail`, `ThumbnailRow`, `ThumbnailList`, `Divider`), one
  source for three views: the package compiles them to `dist/components/` with `dist/components.css`; Storybook
  (`.storybook/`, stories beside the components) shows and tests their states; the docs site explains when to
  use them. `scripts/build-components.mjs` also writes `dist/components.json` (descriptions, props from the types
  and JSDoc, tokens each component's CSS uses) and fails if a `var(--ht-…)` is not a published token.
- `src/components/package.json` is not a package: Storybook's components manifest names each component's import
  after the nearest `package.json`, so this marker gives `holotekt-design-system/components` instead of the
  root. Nothing resolves modules through it; leave it alone.
- `scripts/`: build, check, diff and release. `scripts/lib/tokens.mjs` holds the shared logic. Timestamps and
  changelog dates use the machine's local time with its UTC offset, not UTC.
- `dist/`: build output (gitignored). The site and consumers read `dist/tokens.json` and `dist/components.json`.
- `site/`: the Next.js docs site, a static export. Pages are built from `dist/tokens.json` and
  `dist/components.json`. Storybook is built into `site/public/storybook/` and served at `/storybook/`.
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
- `npm run components:build` compiles the components and writes `dist/components.json`.
- `npm run storybook` serves Storybook at http://localhost:6006 (with the MCP endpoint at `/mcp`);
  `npm run storybook:build` builds it into `site/public/storybook/`; `npm run storybook:test` runs every story as a
  Vitest browser test, in both themes at desktop and phone width, with accessibility checks.
- `npm run check` runs everything CI runs: token check and build, component build, lint, typecheck, Storybook
  build and tests, site build.
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
- `dist/all.css` imports tokens, text styles, utilities and components; `dist/base.css` is the optional page
  defaults in the `base` layer (grid on `html`, body text, links, focus, selection, `hr`, `.ht-prose`), generated
  by `scripts/build-tokens.mjs` from tokens only; `dist/fonts.css` and `dist/fonts/` come from
  `scripts/build-fonts.mjs` and the @fontsource dependencies. Opt-in: `all.css` includes neither. Nothing in the
  package may depend on the base: Storybook renders the components without it on purpose. Every package
  stylesheet opens with `@layer tokens, base, components;` so the order holds whichever is imported first.
- `dist/utilities.css` holds ready-made classes built from tokens by `scripts/build-tokens.mjs`. Today that is
  `.ht-page-grid`: `surface/page` with dots in `surface/dot` at `layout/grid/dot-pitch`, the default page
  background. It is decoration, not elevation; surfaces are plain fills and cover the dots. Dot colour and
  density have one value each (no options).

## Styling the docs site and the components

- Three cascade layers, declared in `site/app/globals.css`: `tokens` (the generated variables),
  `base` (element defaults bound to tokens), `components`. New styles go in a layer; never fight
  specificity.
- Site styles are **CSS Modules**: one `name.module.css` next to the file, rules wrapped in
  `@layer components { … }`, classes applied via the imported `styles` object.
- Package components are styled in `src/components/components.css`: plain classes prefixed `ht-` (`.ht-card`,
  `.ht-thumbnail-row__title`), rules in `@layer components`, every value a token. Plain classes rather than
  CSS Modules because the compiled JS must work in a consumer's app with no build configuration.
- Every colour, space, radius and type value is a `var(--ht-…)`. No raw values, no theme object, no
  runtime CSS-in-JS. The one exception is a colour or font set inline because it is the data being shown.
- **The orange offset is a decoration, not elevation.** On a card it is a flourish; on a thumbnail it is a hover
  animation. It is the one named exception to "no shadows": a hard `box-shadow` with no blur, sized by
  `decoration/card-offset` in `accent/default`. Depth is still shown by surface tone only (raised, sunken, hover).
  The hover duration (150ms) is written once, in `components.css`, until there is a motion foundation.
- Props are typed with a one-line doc comment each; the docs site and Storybook read them from the types.
  New components need stories for every state and a page under `/components`.
- **Atomic levels.** Every component has a level in `src/components/levels.json`, the one place the build, the
  stories (`Atoms/Card`) and the site read it from. Atom: uses no other component, built from tokens only.
  Molecule: a few atoms working as one unit. Organism: a self-contained section of a page, built from molecules
  and atoms. Templates and pages belong to each product, not here. A component may import only siblings from a
  lower level, and only the ones `levels.json` lists under `madeOf`; the component build fails otherwise. Build
  from below: if the part you need does not exist, add the atom first.
- The site runs on the package's `all.css`, `base.css` and `fonts.css`, plus `site/app/site.css` for what is its
  own (the article heading scale, table text, code) and CSS Modules for the rest: colour, type, spacing, radius
  and borders, all tokens. Rows wrap on narrow screens through flex bases taken from the
  width tokens, not media queries. No shadows. Fonts load through `dist/fonts.css`;
  `scripts/copy-fonts.mjs` copies `dist/fonts/` into `site/public/fonts/` so the licence links resolve.

## Rules

- Do not choose, adjust or add token values beyond what Figma published.
- Do not add components beyond the spec's current phase. No analytics, CMS or search unless the spec says so.
- Do not call the Figma REST API or write to the Figma file. Reading is through the Figma MCP connector.
- Do not push, run `terraform apply`, or create cloud resources without an explicit yes in the session.
- Do not commit secrets, `.env` files, `deploy.env`, `backend.hcl` or Terraform state.
- Do not edit `~/Desktop/august_portfolio` or `~/Desktop/design-system-field-notes`.
- Components use only existing tokens. If a component needs a value that is not a token, the token comes first.
