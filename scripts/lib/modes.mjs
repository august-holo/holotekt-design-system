// How each mode reaches CSS. A mode is a tokens/<base>.<mode>.json file that restates a base file's
// tokens with other values; this says when those values apply.
//
// - "scheme": a colour scheme. Applied under @media (prefers-color-scheme: <mode>) when the page has
//   set no data-theme, and whenever the page sets data-theme="<mode>".
// - "media": a viewport condition. Applied inside one media query. `shrinkOnly` adds the check that
//   no dimension grows in that mode.
export const MODE_CSS = {
  dark: { kind: "scheme" },
  // Provisional width until the spacing and layout session sets breakpoints (B-030). Change it here only.
  mobile: { kind: "media", media: "(max-width: 640px)", shrinkOnly: true },
};
