# holotekt design system: release loop spec

**For:** Claude Code, running on August's machine in this folder.
**Written:** 23 Nov 2026, from a planning conversation in Claude chat.
**Owner:** Augustine von Trapp (GitHub: `august-holo`).

Read this whole file before doing anything. Then build Phase 1 only, and stop at each checkpoint marked **STOP**.

---

## 1. What we are building

A public design system for two existing sites:

- Portfolio: augustinevontrapp.com, code at `~/Desktop/august_portfolio` (Next.js 16, styled-components, static export to S3 + CloudFront).
- Blog: creatingwithsystems.com (same stack; code not on this machine yet).

The system is being filled in over five working sessions this week (color, typography, spacing and layout, shape and elevation, components). **Your job is the plumbing that lets each session end with a real, published release.** You are not designing anything and not choosing any token values.

The requirement that drives everything: when a session closes, publishing it must be one short, repeatable routine. Nothing should need to be "gone back and deployed" afterwards.

## 2. Decisions already made (do not reopen)

| Decision | Detail |
|---|---|
| Public | Public GitHub repo and a public docs site. It will be shown to hiring managers. |
| Source of truth | Figma variables are the source of truth for tokens. One direction only: Figma → JSON → CSS → sites. No two-way sync. |
| No Figma REST API | Figma's Variables REST API needs an Enterprise plan. Do not write code that calls it. Tokens arrive in this repo as JSON files (section 5), written by an agent reading the variables through the Figma MCP connector (section 6a), or by hand from Figma's own export. |
| Components | For token values, Figma is authoritative. For components (Phase 2), the code is authoritative, because that is what coding agents read; Figma mirrors it through Code Connect. |
| Built for agents | The system must be usable by AI coding agents as well as people: a rules file, machine-readable docs, described tokens, and checks an agent can run (section 7a). |
| Docs site stack | Next.js static export, same as the portfolio. |
| Hosting | AWS S3 + CloudFront via Terraform, mirroring `~/Desktop/august_portfolio/infra`. |
| Deploy | GitHub Actions on push to `main`, OIDC role, no AWS keys in GitHub. Mirror the portfolio's workflow. |
| Who pushes | August pushes. You commit and tag locally; you do not push unless he tells you to in that session. |
| Storybook | Deferred to Phase 2 (the components session). Do not add it in Phase 1. |

## 3. The release loop (what Phase 1 must make possible)

Each session ends with these steps.

1. August builds the variables by hand in Figma (file `holotekt-design-system`, key `9PGHwdHaI5pEgpmTEnsU3A`).
2. August runs **one command in Claude Code** (section 6a). It reads the variables from Figma, writes `tokens/`, runs the checks, drafts the changelog entry from the token diff, and prepares the release.
3. August reads the summary and confirms.
4. The command commits and tags. August pushes (or tells the agent to). GitHub Actions deploys the site.
5. The live site shows the new version, the new tokens and any new decision note.

Nothing publishes by itself when Figma changes. That is intended: experiments in Figma must not leak.

The same loop must also work by hand, without an agent, using the npm scripts in section 6. The one-command version is a wrapper around them, not a replacement.

Target: under ten minutes from "variables are done in Figma" to "live", with no manual file editing beyond an optional decision note.

## 4. Repo layout

```
holotekt-design-system/
├── SPEC.md                     this file
├── README.md                   what it is, how to use it, how to release
├── AGENTS.md                   rules for coding agents working in this repo (section 7a)
├── docs/
│   └── consumer-rules.md       rules snippet for sites that use the system (section 7a)
├── CHANGELOG.md                Keep a Changelog format, with an Unreleased section
├── CONTRIBUTING.md             short: how changes are proposed and released
├── LICENSE                     see open questions
├── package.json                name: holotekt-design-system
├── tokens/                     source token JSON (section 5)
│   ├── primitives.json
│   ├── semantic.json
│   └── contrast-pairs.json
├── content/
│   └── decisions/              public "why" notes, markdown with frontmatter
├── scripts/
│   ├── build-tokens.mjs        Style Dictionary build
│   ├── check-tokens.mjs        validation + contrast
│   ├── diff-tokens.mjs         compares tokens with the last release tag
│   ├── release.mjs             version, changelog, commit, tag
│   ├── deploy.sh               mirror of the portfolio's
│   └── bootstrap-state.sh      only if a new state bucket is needed
├── dist/                       build output, gitignored
│   ├── tokens.css
│   ├── tokens.js / tokens.d.ts
│   └── tokens.json             resolved values, read by the site
├── site/                       Next.js docs site (section 7)
├── infra/                      Terraform (section 8)
└── .github/
    ├── deploy.env              written by Terraform, committed (as in the portfolio)
    └── workflows/
        ├── ci.yml              on pull request and push: npm ci, npm run check
        └── deploy.yml          on push to main: check, build, deploy
```

Use one `package.json` at the root unless the Next.js app truly needs its own; prefer the simpler layout.

## 5. Token contract

Tokens are JSON in the Design Tokens Community Group (DTCG) format: `$value`, `$type`, optional `$description`.

**Two tiers, two files:**

- `tokens/primitives.json` — raw values. Example path: `color.orange.500`, `color.neutral.900`.
- `tokens/semantic.json` — purpose names that **alias** primitives with the `{color.orange.500}` reference syntax. Example path: `color.text.primary`. A semantic token must never hold a raw value; fail the check if one does.

**Naming:** lowercase, dot-separated in JSON, general to specific. Figma names use slashes (`color/text/primary`); they map one to one.

**CSS output:** one custom property per token, prefixed `--ht-` (see open questions), kebab-cased: `color.text.primary` → `--ht-color-text-primary`. Semantic properties must reference the primitive property (`var(--ht-color-neutral-900)`), not repeat the value, so the alias survives into CSS.

**Modes:** there is one mode today. Structure the build so a second mode (dark) could be added later as `semantic.dark.json` without renaming anything. Do not build dark mode now.

**Contrast pairs:** `tokens/contrast-pairs.json` lists the text-on-background pairs the system allows:

```json
[
  { "text": "color.text.primary", "background": "color.surface.page", "min": 4.5 },
  { "text": "color.text.on-accent", "background": "color.accent.default", "min": 4.5 }
]
```

`check-tokens` computes the WCAG 2 contrast ratio for each pair from resolved values and **fails the build** if any is under its `min`. Print a table of every pair and its ratio either way. `tokens.json` in `dist/` should include the computed ratios so the site can show them.

**Descriptions:** every semantic token must have a `$description` that says **when to use it**, in one plain sentence ("Body text and headings on any surface."). This is what tells an agent, or a new engineer, which token to pick. Fail the check if a semantic token has none. Carry the description into `dist/tokens.json`, into a comment beside each property in `dist/tokens.css`, and onto the docs page. In Figma these are the variable descriptions; the export must preserve them.

**Other checks:** valid JSON; every `$type` present and known; every alias resolves; no circular aliases; no duplicate CSS names; no semantic token with a raw value.

**Format version:** follow the stable DTCG specification, 2025.10.

**Types to support now:** `color`, `dimension`, `fontFamily`, `fontWeight`, `number`, `shadow`. Typography, spacing and shape tokens arrive later this week; the build must not need rework when they do.

**Seed data:** create a small placeholder set so the loop can be tested before real tokens exist, with every value clearly marked as a placeholder in `$description`. Use these, which are the values already in the portfolio's code:

- primitives: `color.orange.500 = #FF6600`, `color.orange.600 = #E55A00`, `color.neutral.900 = #1A1A1A`, `color.neutral.100 = #F0EFE8`, `color.neutral.0 = #FFFFFF`
- semantic: `color.text.primary → neutral.900`, `color.surface.page → neutral.100`, `color.surface.raised → neutral.0`, `color.accent.default → orange.500`, `color.accent.hover → orange.600`
- contrast pairs: text.primary on surface.page, text.primary on surface.raised

These will be replaced wholesale after the color session. Do not add more.

## 6. Scripts

| Command | Does |
|---|---|
| `npm run tokens:check` | Section 5 checks, prints the contrast table. |
| `npm run tokens:build` | Style Dictionary → `dist/`. |
| `npm run tokens:diff` | Compares `tokens/` with the last release tag. Prints added, removed, renamed-looking and changed tokens (old → new value), and suggests a bump: removed or renamed = major (minor while under 1.0), added = minor, value-only = patch. `--changelog` prints the same as changelog lines. |
| `npm run check` | `tokens:check`, `tokens:build`, lint, typecheck, site build. This is what CI runs. |
| `npm run dev` | Builds tokens, then runs the site locally. Rebuild tokens when `tokens/` changes. |
| `npm run release -- <bump>` | See below. |
| `npm run deploy` | Build and upload from a machine with AWS credentials (mirror of the portfolio's). |

**`release`** must: refuse to run on a dirty tree or off `main`; refuse if **Unreleased** in the changelog is empty; run `npm run check`; bump `package.json`; move the Unreleased entries under a new `## [x.y.z] - YYYY-MM-DD` heading; commit as `release: vx.y.z`; create tag `vx.y.z`; print the exact push command. It must not push.

## 6a. One-command publish from Figma

Provide a project-level Claude Code command (a slash command or skill, whichever is the current convention; name it `publish-tokens`) that August runs in this repo after changing variables in Figma. It must:

1. Read all local variables from the Figma file (key `9PGHwdHaI5pEgpmTEnsU3A`) through the Figma MCP connector: collections, modes, names, values, aliases, descriptions. Confirm at build time that the connector can return all of these; if it cannot return aliases or descriptions, stop and tell August rather than flattening them.
2. Map collections to files (`Primitives` → `primitives.json`, `Semantic` → `semantic.json`; ask if the collection names differ) and write DTCG JSON per section 5. Aliases stay aliases.
3. Run `npm run tokens:diff` and `npm run check`.
4. If a check fails, stop. Report exactly what failed (for contrast: the pair, the ratio, the minimum) and say that the fix belongs in Figma. Do not edit token values to make a check pass.
5. If nothing changed, say so and stop.
6. Show a summary: tokens added, removed and changed; the contrast table; the proposed version bump; the drafted changelog lines. Ask August to confirm or adjust.
7. On confirmation, write the changelog lines under **Unreleased**, run `npm run release -- <bump>`, and print the push command. Push only if August says to in that session.

Never write to the Figma file from this command. It is read-only on the Figma side.

`contrast-pairs.json` is maintained by hand in the repo, not exported from Figma. If a new text or surface token appears that is in no pair, list it in the summary as "not covered by a contrast pair" so it gets a decision.

**Later, not now:** a small Figma plugin with a "Publish tokens" button that does step 1 from inside Figma and hands off to GitHub Actions. Design the scripts so that could be added without rework; do not build it.

**Version plan:** `0.0.1` loop dry run · `0.1.0` color · `0.2.0` typography · `0.3.0` spacing and layout · `0.4.0` shape and elevation · `0.5.0` components · `1.0.0` once both sites consume it.

## 7. Docs site

Plain, fast, readable. It is documentation, not a showcase. Next.js static export, TypeScript, same major versions as `~/Desktop/august_portfolio/package.json`.

**Pages**

| Route | Content |
|---|---|
| `/` | What this is, current version, links to foundations, the repo and the changelog. |
| `/foundations/color` | Generated from `dist/tokens.json`: each primitive ramp as swatches with name and value; the semantic tokens as a table (name, CSS variable, what it aliases, swatch); the contrast pairs with their ratios and pass/fail. |
| `/foundations/typography`, `/spacing`, `/shape` | Same idea, generated from tokens. Until tokens of that type exist, show "Not published yet". |
| `/components` | "Not published yet" in Phase 1. |
| `/decisions` and `/decisions/[slug]` | The "why" notes from `content/decisions/*.md`, newest first. |
| `/changelog` | Rendered from `CHANGELOG.md`. |
| `/accessibility` | A short accessibility statement (placeholder text, clearly marked as draft). |

**Rules**

- Foundation pages are **generated from the token files**. Adding tokens must update the page with no page edits.
- The site styles itself with the system's own CSS variables wherever a token exists, with a small neutral fallback stylesheet for everything else. As tokens land, the site should pick them up.
- Show the version from `package.json` in the header or footer.
- Meet WCAG AA itself: visible focus styles, semantic headings, 4.5:1 text contrast, respects `prefers-reduced-motion`.
- No analytics, no tracking, no cookies.
- Do not copy the portfolio's visual design. Neutral and legible is correct for now.

**Decision note format** (`content/decisions/0003-figma-is-the-source-of-truth.md`):

```markdown
---
id: D-0003
title: Figma is the source of truth for tokens
date: 2026-11-17
area: foundations
---
## We chose
## We rejected
## Because
## We would revisit this if
```

Seed it with one placeholder note so the page can be tested. August writes the real ones.

## 7a. The agent-readable layer

The system will be applied to the portfolio and blog by coding agents as well as by hand, and it should be a credible example of a design system built for AI-enabled engineering teams. Keep this layer small; do not build an MCP server.

**In this repo**

- `AGENTS.md` at the root, under about 60 lines: what the repo is, the commands, the token contract in brief, the rules in section 12, and "run `npm run check` before you finish". If Claude Code needs a `CLAUDE.md`, make it a one-line pointer to `AGENTS.md` so there is one source.
- `docs/consumer-rules.md`: a short block that a consuming site pastes into its own `AGENTS.md`. It should say: use semantic tokens only, never primitives and never raw values; pick a token by its description; if no token fits, stop and ask rather than inventing a value; where to read the docs (`/llms.txt`); how to check the work. Show this file on the docs site too.

**On the docs site**

- `/llms.txt` at the site root, following the llms.txt convention: a short Markdown index of every docs page with a one-line description and a link to its Markdown version. Generated at build time.
- A Markdown twin of every docs page at the same URL plus `.md` (for example `/foundations/color.md`), generated from the same data as the HTML page. Token tables in the twin must include name, CSS variable, value, alias target and the "when to use" description.
- `/tokens.json` served at a stable URL: the resolved token data from `dist/tokens.json`.
- Confirm CloudFront serves `.txt`, `.md` and `.json` with sensible content types.

**In the checks**

- The checks are part of this layer: an agent that breaks a rule should be told by a failing command, with a message that says what to do instead.

**Phase 2 and 3 (not now):** Storybook's components manifest and MCP addon, typed and documented component props, Code Connect mappings, and a lint rule in the consuming sites that rejects raw color values.

## 8. Infrastructure

Mirror `~/Desktop/august_portfolio/infra` and `.github/workflows/deploy.yml`. Read those files first; they are the reference and they work. Keep their conventions: private S3 bucket readable only by CloudFront, OIDC deploy role scoped to one repo and branch, `deploy.env` written by Terraform and committed, GitHub Actions pinned by commit SHA.

Differences from the portfolio:

- Resource name prefix: `holotekt-ds`.
- `github_repo`: `august-holo/holotekt-design-system`.
- Start with `domain_attached = false` so the site comes up on its `cloudfront.net` hostname. The custom domain is an open question.
- No legacy redirects, so the CloudFront function only needs directory-index handling for the static export (and whatever else the portfolio's function does that a static export requires).
- The GitHub OIDC provider already exists in the account (created by another project); reference it with a data source as the portfolio does. Do not create a second one.
- Check whether the existing Terraform state bucket can be reused with a new key before creating another.

**Do not modify anything in `~/Desktop/august_portfolio`.** Read only.

**This repo is public.** Before the first commit, check that nothing committed is a secret. `deploy.env` holds resource IDs and a role ARN, which the portfolio already treats as committable; flag it to August once so he can confirm he is comfortable with the AWS account ID being public.

## 9. Phases and checkpoints

### Phase 1 — the loop (today)

1. Read this spec and the portfolio's `infra/`, `scripts/`, `.github/`, `package.json`, `next.config.js`.
2. **STOP.** Tell August your plan in a few lines and list anything in this spec that conflicts with what you found. Ask the open questions in section 11 that block you.
3. Scaffold the repo, token build, checks, seed tokens, scripts and site. `npm run check` passes. `npm run dev` shows the site locally.
4. `git init`, first commit on `main`. Do not push.
5. **STOP.** Show August the local site and the contrast table. He creates the public GitHub repo `august-holo/holotekt-design-system` and adds the remote.
6. Write the Terraform. Run `terraform plan`.
7. **STOP.** Show the plan summary. Run `terraform apply` only after August says yes.
8. Commit `deploy.env`. August pushes. Confirm the Actions run succeeds and the `cloudfront.net` URL serves the site.
9. Dry-run the loop by hand: add a changelog line, `npm run release -- patch` → `v0.0.1`, August pushes, confirm the live site shows `0.0.1`.
10. Build the `publish-tokens` command (section 6a). Test it against the real Figma file. The file may hold no variables yet; if so, test the read path on whatever exists, confirm the "nothing to publish" and failure paths, and tell August what could not be tested.
11. Write `README.md` with a "Releasing" section that matches what actually worked, covering both the one-command path and the by-hand path.

### Phase 2 — components (Wednesday)

Storybook for React components, built with the same tokens, deployed under `/storybook` on the same site. Components exported from the package. Details will be added to this spec before then.

### Phase 3 — integration (Thursday and Friday)

The portfolio and blog consume the system: install by git tag (`npm i github:august-holo/holotekt-design-system#vX.Y.Z`, with a `prepare` script that builds `dist/`), import `tokens.css`, and replace hard-coded values and local constants with the CSS variables. Details later. Do not start this in Phase 1, but do not make choices that block it.

## 10. Acceptance for Phase 1

- [ ] `npm ci && npm run check` passes on a clean clone.
- [ ] Changing a value in `tokens/primitives.json` changes `dist/tokens.css` and the color page with no other edits.
- [ ] A semantic token holding a raw value fails the check with a clear message.
- [ ] A contrast pair under its minimum fails the check with a clear message.
- [ ] `npm run release` refuses on a dirty tree and with an empty Unreleased section.
- [ ] A push to `main` deploys with no manual step, using OIDC.
- [ ] The live site shows version `0.0.1`, the seed tokens, the contrast table, one decision note and the changelog.
- [ ] CI runs `npm run check` on pull requests.
- [ ] The README's release instructions were followed exactly as written at least once.
- [ ] A semantic token with no `$description` fails the check.
- [ ] `npm run tokens:diff` reports an added, a removed and a changed token correctly against the last tag.
- [ ] `/llms.txt`, `/foundations/color.md` and `/tokens.json` load on the live site and match the HTML page.
- [ ] `AGENTS.md` and `docs/consumer-rules.md` exist and are accurate.
- [ ] The `publish-tokens` command reads from Figma, stops on a failing check without editing values, and never pushes without a yes.

## 11. Open questions for August

Ask these at the first STOP. Recommendations are given so you can proceed if he says "your call".

1. **License.** Recommendation: MIT.
2. **CSS variable prefix.** Recommendation: `--ht-`.
3. **Domain.** Recommendation: launch on the `cloudfront.net` hostname today; choose a domain (for example a subdomain of one he owns) once the loop works.
4. **AWS account ID visible in a public repo** via `deploy.env`. Recommendation: acceptable, since it is not a credential, but his call.
5. **Terraform state.** Reuse the portfolio's state bucket with a new key, or create a new one?

## 12. Things not to do

- Do not choose, adjust or add token values beyond the seed set.
- Do not add components, Storybook, dark mode, analytics, a CMS or a search feature.
- Do not call the Figma REST API. Reading through the Figma MCP connector is the intended route. Never write to the Figma file.
- Do not build an MCP server, a Figma plugin or a vector index for the system.
- Do not push, and do not run `terraform apply`, without an explicit yes in that session.
- Do not edit `~/Desktop/august_portfolio` or anything in `~/Desktop/design-system-field-notes` (that is August's notes vault).
- Do not commit secrets, `.env.local` files or Terraform state.

## 13. Context you may want

- Figma system file: https://www.figma.com/design/9PGHwdHaI5pEgpmTEnsU3A
- Audit of the existing sites (the "before"): https://www.figma.com/design/jCd8cmXoZwDPukN1Q31SkW
- The audit found 63 hex colors and 44 font sizes in the portfolio, seven color tokens defined and none used, and small text failing contrast (about 2.5:1). The contrast gate in section 5 exists because of that finding.
