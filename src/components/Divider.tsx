export type DividerProps = {
  /** "hairline" (default): border/divider at border/width/thin. "strong": border/strong at border/width/thick. */
  weight?: "hairline" | "strong";
  /** Purely visual, hidden from assistive technology. Default false: a thematic break, an hr. */
  decorative?: boolean;
  /** Extra class names, added after the component's own. */
  className?: string;
};

/** A rule that separates content. Hairline between rows; strong only at the edges of a page region. */
export function Divider({ weight = "hairline", decorative = false, className }: DividerProps) {
  return (
    <hr
      className={["ht-divider", weight === "strong" ? "ht-divider--strong" : "", className ?? ""].filter(Boolean).join(" ")}
      aria-hidden={decorative || undefined}
      role={decorative ? "presentation" : undefined}
    />
  );
}
