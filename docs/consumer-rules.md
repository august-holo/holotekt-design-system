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
- To **check your work**, search the diff for hex colours and for `--ht-color-` names that are not
  semantic (`text`, `surface`, `accent`, ...); each one is a mistake or a question for the maintainer.
