# Changelog

All notable changes to the holotekt design system are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and versions follow
[Semantic Versioning](https://semver.org/). Token changes are written by `npm run tokens:diff --changelog`
and edited by hand; everything else is written by hand.

## [Unreleased]

### Added
- `Button`, an atom: primary (`accent/default` fill, `text/on-accent` label) and secondary (`border/strong`
  outline, `text/primary` label), in default, hover, pressed, focus and disabled states. States change tone
  only: no offset, no shadow. Renders a `button`, or a link that looks like a button when given `href`;
  pass your router's link as `linkComponent` for client-side navigation. A disabled link keeps its role
  but loses its href and tab stop. `/components/button`, stories under `Atoms/Button`, and the consumer
  fixture renders it as a button and as a Next.js Link. Every label-on-fill pair was already in the
  contrast list; `text/disabled` on `surface/disabled` is exempt by the role's description.

## [0.6.1] - 2026-11-28

### Changed
- Components are organised by atomic level everywhere, matching Figma: atoms (`Card`, `Divider`, `Thumbnail`),
  molecules (`ThumbnailRow`), organisms (`ThumbnailList`). The level and parts of each component live once in
  `src/components/levels.json`; `components.json` carries `level`, `madeOf` and the level definitions; the
  component build fails if a component imports a sibling at its own level or above. Story titles are
  `Atoms/Card`, `Molecules/Thumbnail row`, `Organisms/Thumbnail list`. The site's `/components` index is
  grouped by level with each level's rule, every component now has its own page (`/components/thumbnail` and
  `/components/thumbnail-row` are new; `/components/thumbnail-list` stays), each page opens with its level,
  what it is made of and what is built from it, and `llms.txt` names the level in each entry. No component
  behaviour changed; import paths are unchanged.

## [0.6.0] - 2026-11-28

### Added
- The first components, starting Phase 2: `Card` (offset on or off), `Thumbnail`, `ThumbnailRow`,
  `ThumbnailList` and `Divider` (hairline or strong), exported from `holotekt-design-system/components`
  with their styles in `holotekt-design-system/components.css`. Every value is a token; the build fails
  on a variable that is not. React is an optional peer dependency.
- The orange offset as a decoration, not elevation: on a card a flourish, on a thumbnail a hover
  animation of 150ms (none under reduced motion). A hard `box-shadow` sized by `decoration/card-offset`
  in `accent/default`, the one named exception to "no shadows". Depth is still shown by surface tone.
- `components.json` (also at `/components.json`): each component's description, props from the types
  and doc comments, and the tokens its CSS uses.
- Storybook under `/storybook/`: stories for every state, both themes from the toolbar, accessibility
  checks on every story, the components manifest at `/storybook/manifests/components.json`, and
  `npm run storybook:test`, which runs every story as a browser test in both themes at desktop and phone
  width. `@storybook/addon-mcp` serves an MCP endpoint from the dev server.
- A Components section on the site: `/components` and a page per component with when to use it, live
  examples on the dotted grid, props, the tokens it uses and a link to its stories; Markdown twins and
  `llms.txt` entries included.
- `docs/consumer-rules.md`: check `/components` before writing a new component.
- `fixtures/consumer` and `scripts/check-consumer.sh`: a Next.js 16 app that installs the package by git
  ref and builds with the components, with no consumer build configuration.

## [0.5.0] - 2026-11-28

### Added
- `color/surface/dot`, the dots of the dotted grid (`orange/200` in light, `orange/800` in dark, provisional),
  exempt from contrast pairs because it is never behind text on its own; and `decoration/card-offset` (6px),
  the size of the hard orange offset on cards, which is decoration, not elevation.
- `utilities.css` in the package with `.ht-page-grid`: `surface/page` with dots in `surface/dot` at
  `layout/grid/dot-pitch`, the default page background. No options for dot colour or density.

### Changed
- The docs site sits on the dotted grid in both themes. The Color page has a "Default page background"
  section with a live sample, the three tokens and the rules, and a scenario row for it.

## [0.4.1] - 2026-11-27

### Changed
- The docs site is set entirely in its own tokens and restructured to three page types: a short
  home, a Foundations index with facts counted from the token data, and a foundation page template
  with a "Scenarios and roles" table, the live samples, and the full reference inside a closed
  details section. Both themes, phone width, no shadows. Other pages keep their addresses, Markdown
  twins and `llms.txt` entries.
- The header is Foundations · Changelog · GitHub · Theme. The site version shows as major.minor.

## [0.4.0] - 2026-11-27

### Added
- Shape from the shape and elevation session: four corner radii (`radius/none|sm|md|full`) and two
  border widths (`border/width/thin|thick`), in px. There are no shadow tokens: elevation is tonal,
  with a border on what overlaps.
- Four neutral primitives for the dark surfaces (`neutral/825`, `875`, `925`, `1000`, provisional) and
  two surface roles: `surface/overlay` for menus, popovers and dialogs, and `surface/scrim`, a
  translucent backdrop and the one semantic token that holds a raw value.
- 11 contrast pairs on `surface/overlay`, 54 in all; `tokens/contrast-exempt.json` for colours that are
  never behind or in text, starting with the scrim.
- The shape and elevation page: radii, border widths and the five border recipes on samples, the
  surface ladder in both themes, a menu over a card, a dialog on the scrim, and the elevation rules.

### Changed
- Dark-mode surfaces, so the ladder runs darkest to lightest by depth: `surface/sunken` now aliases
  `neutral/1000` (was `neutral/800`), `surface/page` aliases `neutral/925` (was `neutral/950`), and
  `surface/raised` aliases `neutral/875` (was `neutral/900`). Light mode is unchanged.

## [0.3.0] - 2026-11-27

### Added
- Spacing and layout from the spacing session: an eleven-step space scale on a 4px base
  (`space/0` … `space/900`), the `inset` and `gap` roles that alias it, two content widths, two
  breakpoints, the grid gutter and dot pitch, and three values that change on phones
  (`layout/section/gap`, `layout/page/margin`, `layout/grid/columns`). Spacing and widths are in rem;
  breakpoints and grid columns are unitless.
- The spacing and layout page: the scale as bars, the roles, widths, breakpoints, what changes on
  phones, and the dotted grid at the published pitch.

### Changed
- The mobile media query takes its width from `layout/breakpoint/md` at build time. The value is
  still 640px; it is no longer provisional.

## [0.2.0] - 2026-11-26

### Added
- Typography from the typography session: five font families with one job each, a nine-step size
  scale, four sizes that step down on small screens (a `mobile` mode, provisionally below 640px), and
  fourteen text styles as composite tokens. Each style is six CSS variables (`--ht-heading-1-font-size`
  …) and one class (`.ht-heading-1`) in `text-styles.css`.
- `publish-tokens` reads the `Typography` and `Breakpoint` collections and the Figma text styles.
- `tokens/font-stacks.json`: the fallback stack, package, files and licence for each family. The
  package ships names and stacks; sites load the fonts themselves.
- The docs site set in its own type, with self-hosted fonts and a typography page of live specimens.

### Changed
- Dimensions in px are emitted in rem (px ÷ 16) in the CSS and JS.

## [0.1.0] - 2026-11-25

### Added
- The colour foundations from the color session: six primitive ramps (orange, blue, yellow, green,
  red, neutral) at steps 50–950 plus neutral 0, and 36 semantic roles for text, surfaces, borders,
  accent and the four statuses, each with a description.
- Dark mode. Every semantic role has a light and a dark alias; the CSS applies dark under
  `prefers-color-scheme: dark` and under `data-theme="dark"`.
- 43 contrast pairs, checked in both modes on every build.
- On the docs site: ramps shown as strips, light and dark values side by side, a theme toggle,
  and a link check in the build.

### Changed
- The five seed tokens are replaced: `text/primary` now aliases neutral 950, `accent/default`
  aliases orange 400 and `accent/hover` orange 300; `orange/500`, `orange/600`, `neutral/100`
  and `neutral/900` have new values.

## [0.0.1] - 2026-11-23
### Added
- The release loop: DTCG tokens in `tokens/`, Style Dictionary build to `dist/`, checks for aliases,
  descriptions and contrast, `tokens:diff`, and `release`.
- Placeholder seed tokens: five colour primitives and five semantic roles, to be replaced after the
  color session.
- The docs site at designsystem.holotekt.com, unstyled, generated from the token data, with a Markdown
  twin of every page, `llms.txt` and `tokens.json`.

