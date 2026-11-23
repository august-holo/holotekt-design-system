# Changelog

All notable changes to the holotekt design system are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and versions follow
[Semantic Versioning](https://semver.org/). Token changes are written by `npm run tokens:diff --changelog`
and edited by hand; everything else is written by hand.

## [Unreleased]

### Added
- The release loop: DTCG tokens in `tokens/`, Style Dictionary build to `dist/`, checks for aliases,
  descriptions and contrast, `tokens:diff`, and `release`.
- Placeholder seed tokens: five colour primitives and five semantic roles, to be replaced after the
  color session.
- The docs site at designsystem.holotekt.com, unstyled, generated from the token data, with a Markdown
  twin of every page, `llms.txt` and `tokens.json`.
