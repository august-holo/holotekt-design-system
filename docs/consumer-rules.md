# Rules for sites that use the holotekt design system

Paste this block into the consuming site's `AGENTS.md` (or `CLAUDE.md`).

---

## Design system rules

This site uses the holotekt design system. Its tokens are CSS custom properties prefixed `--ht-`,
imported from `holotekt-design-system/tokens.css`.

- Use **semantic tokens only**: `--ht-color-text-primary`, `--ht-color-surface-page` and so on.
  Never use a primitive (`--ht-color-neutral-900`) and never write a raw value (`#1A1A1A`, `16px`)
  where a token exists.
- Pick a token by its **description**, which says when to use it. The descriptions are in
  `node_modules/holotekt-design-system/dist/tokens.json` and on the docs site.
- If **no token fits**, stop and ask. Do not invent a value and do not reach for a primitive.
- Docs for agents: https://designsystem.holotekt.com/llms.txt lists every page with a Markdown
  version. Resolved token data: https://designsystem.holotekt.com/tokens.json.
- Before writing a **new component**, check https://designsystem.holotekt.com/components (or `llms.txt`).
  If one fits, import it from `holotekt-design-system/components` and its styles from
  `holotekt-design-system/components.css`. Do not restyle a system component from outside; if it does
  not fit, say so instead of forking it.
- Import as much of the package as fits: `tokens.css` alone, `all.css` for tokens, text styles, utilities and
  components, and the **optional** `base.css` (page defaults: grid, body text, links, focus, selection, `hr`,
  `.ht-prose`) and `fonts.css`. Nothing in the package depends on the base. The package's stylesheets establish
  `@layer tokens, base, components;`. Put this site's **reset** in a layer of its own declared ahead of those
  (a stylesheet holding only `@layer reset, tokens, base, components;`, imported in the root layout before any
  system stylesheet; a statement above `@import` lines in one file does not survive Next's bundler), so the system's spacing survives it.
  Put **overrides** outside any layer; they win. Never write into a layer the system owns.
- The system's components are organised by **atomic level**. Atom: uses no other component, tokens only.
  Molecule: a few atoms working as one unit. Organism: a self-contained section, built from molecules
  and atoms. Templates and pages are this site's own. **Build from below:** if the part you need does not
  exist, add the atom first (in the system, not here).
- To **check your work**, search the diff for hex colours and for `--ht-color-` names that are not
  semantic (`text`, `surface`, `accent`, ...); each one is a mistake or a question for the maintainer.
