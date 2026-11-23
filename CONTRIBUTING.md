# Contributing

This is a small system with one maintainer. Changes still follow one path so that every release is
repeatable.

## Proposing a change

- **Token values** are decided in Figma, in the `holotekt-design-system` file. They reach this repo as
  JSON in `tokens/`, written by the `publish-tokens` command or by hand from Figma's export. Do not
  edit a token value here to make a check pass; fix it in Figma.
- **Contrast pairs** (`tokens/contrast-pairs.json`) are maintained by hand here. Add a pair whenever a
  new text or surface token appears.
- **Decision notes** (`content/decisions/`) record what was chosen, what was rejected and why. One per
  decision, newest first on the site.
- **Code** (scripts, site, infrastructure) goes through a pull request. CI runs `npm run check`.

## Releasing

See the "Releasing" section of the README. In short: changelog lines under **Unreleased**, then
`npm run release -- <patch|minor|major>`, then push. The release script refuses to run on a dirty
tree, off `main`, or with nothing under Unreleased.
