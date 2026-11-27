// How each mode reaches CSS. A mode is a tokens/<base>.<mode>.json file that restates a base file's
// tokens with other values; this says when those values apply.
//
// - "scheme": a colour scheme. Applied under @media (prefers-color-scheme: <mode>) when the page has
//   set no data-theme, and whenever the page sets data-theme="<mode>".
// - "media": a viewport condition. Applied inside one media query, given as `media` (a literal) or
//   `mediaFrom` (a token whose px value fills `{px}` in the template). `shrinkOnly` adds the check
//   that no dimension or count grows in that mode.
export const MODE_CSS = {
  dark: { kind: "scheme" },
  // The width comes from the layout/breakpoint/md token at build time (B-030); this is the only place that says so.
  mobile: { kind: "media", mediaFrom: { token: "layout.breakpoint.md", template: "(max-width: {px}px)" }, shrinkOnly: true },
};
