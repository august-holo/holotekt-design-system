# Changelog

All notable changes to the holotekt design system are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and versions follow
[Semantic Versioning](https://semver.org/). Token changes are written by `npm run tokens:diff --changelog`
and edited by hand; everything else is written by hand.

## [Unreleased]

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

