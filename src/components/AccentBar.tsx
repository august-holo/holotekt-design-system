export type AccentBarProps = {
  /** Extra class names, added after the component's own. */
  className?: string;
};

/**
 * A short orange bar that opens a major section. It sits above the section heading, gap/md away,
 * left-aligned with it. Decoration: not a divider (it never spans the width or separates things) and
 * not elevation. Hidden from assistive technology. One size, no variants. A few per page at most.
 */
export function AccentBar({ className }: AccentBarProps) {
  return <span className={["ht-accent-bar", className ?? ""].filter(Boolean).join(" ")} aria-hidden="true" />;
}
