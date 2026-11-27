# Changelog

All notable changes to the holotekt design system are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and versions follow
[Semantic Versioning](https://semver.org/). Token changes are written by `npm run tokens:diff --changelog`
and edited by hand; everything else is written by hand.

## [Unreleased]

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

