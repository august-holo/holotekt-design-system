---
name: publish-tokens
description: Publish design tokens from the Figma file to this repo as a release. Reads variables through the Figma MCP connector (read-only), writes tokens/, runs the checks and the diff, drafts the changelog, and cuts a release after August confirms. Never writes to Figma, never pushes without a yes.
---

# /publish-tokens

Run after August has changed variables in the Figma file `holotekt-design-system`
(key `9PGHwdHaI5pEgpmTEnsU3A`). Figma is the source of truth; this command only moves values here.
Read `AGENTS.md` first.

## 0. Preconditions

- Clean working tree on `main` (`git status --porcelain` empty). Otherwise stop and say so.
- Figma MCP connector available. Call `create_session` with the file key and a description that
  says the work is read-only. Pass its `sessionId` on every Figma call.

## 1. Read the variables (read-only)

Load the `figma-use` guidance (resource `skill://figma/figma-use/SKILL.md`), then call `use_figma`
with the exact contents of `scripts/figma/read-variables.js` as the code. Do not alter it, and
never run code that creates, edits or deletes anything in the file.

Save the returned JSON verbatim to a scratch file outside the repo. If the file holds more than
about 150 variables, read one collection at a time (filter `variables` by `collectionId`) and merge.

If the result shows `collections: []`, say "the Figma file has no variable collections; nothing to
publish" and stop.

## 2. Write the token files

```sh
node scripts/figma-to-dtcg.mjs <scratch-file> --dry-run
```

Collections map by name: `Primitives` → `tokens/primitives.json`, `Semantic` → `tokens/semantic.json`,
`Typography` → `tokens/typography.json`, `Breakpoint` → `tokens/breakpoint.json`. A collection's modes
after its default become `<file>.<mode>.json` (`semantic.dark.json`, `breakpoint.mobile.json`), and the
file's text styles become composite `typography` tokens in `typography.json`. If the collections are
named differently, ask August which is which, then pass `--map "Name=primitives,Other=semantic"`.
A new mode name needs a CSS rule in `scripts/lib/modes.mjs` before the check will pass; a new font
family needs its fallback stack in `tokens/font-stacks.json`. Both are hand-maintained; say so and stop. If the converter lists problems (a variable with no DTCG
type, an alias to a library variable, a collection with no target), report them exactly and stop.
The fix is in Figma, not here. When the dry run is clean, run it again without `--dry-run`.

`tokens/contrast-pairs.json` and `tokens/font-stacks.json` are maintained by hand and are not touched.

## 3. Diff and check

```sh
npm run tokens:diff
npm run check
```

If `check` fails, stop. Report exactly what failed; for contrast give the pair, the ratio and the
minimum, and say the fix belongs in Figma. Do not edit any token value to make a check pass.
Restore the tree with `git checkout -- tokens/` so the repo is left as it was.

If the diff reports no changes, say so and stop (restore the tree if the files were rewritten
with only formatting differences).

## 4. Summary and confirmation

Show August, in this order:

1. Tokens added, removed, renamed and changed (from `npm run tokens:diff`).
2. The contrast table (from the check output).
3. Semantic colour tokens "not covered by a contrast pair" (the check's warning), so each gets a decision.
4. The proposed bump (from the diff) and the version it produces.
5. The drafted changelog lines: `npm run tokens:diff -- --changelog`.

Ask him to confirm or adjust the lines and the bump. Wait for the answer.

## 5. Release

On confirmation:

1. Put the changelog lines under `## [Unreleased]` in `CHANGELOG.md` (an `### Added` / `### Changed` /
   `### Removed` grouping is fine).
2. Commit the token files and the changelog: `tokens: publish from Figma` (one short line on what changed).
3. `npm run release -- <bump>`.
4. Print the push command it gives. **Push only if August says to in this session.** Otherwise end
   with the command and say the site updates once it is pushed.

## Never

- Write to the Figma file, or run any Plugin API code other than `scripts/figma/read-variables.js`.
- Change a token value, description or name in the JSON by hand.
- Push, or create anything in AWS or GitHub, without a yes in the session.
