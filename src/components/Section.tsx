import type { ElementType, ReactNode } from "react";
import { AccentBar } from "./AccentBar";
import { Stack } from "./Stack";

export type SectionProps = {
  /** The section's heading text. Always set in heading/2, whatever the level. */
  heading: string;
  /** The heading element, for document structure only: 1 to 4, default 2. It does not change the size; a smaller subsection heading is a heading inside a Stack, not a Section. */
  level?: 1 | 2 | 3 | 4;
  /** The accent bar above the heading, on by default. Off for a section that should not call attention to itself. */
  bar?: boolean;
  /** The element to render. Default "section". */
  as?: ElementType;
  /** An id, so the section can be linked to. */
  id?: string;
  /** Extra class names, added after the component's own. */
  className?: string;
  /** The section's content, stacked at gap/md. */
  children?: ReactNode;
};

/**
 * A major part of a page: the accent bar, a heading, then the content, with fixed spacing (gap/md) between
 * them and nothing outside. A page places its sections with a Stack at the section gap; the Section carries
 * no margin of its own. Made of AccentBar and Stack. No look of its own beyond the bar and the heading style.
 */
export function Section({ heading, level = 2, bar = true, as: Tag = "section", id, className, children }: SectionProps) {
  const Heading = `h${level}` as "h1" | "h2" | "h3" | "h4";
  return (
    <Tag className={["ht-section", className ?? ""].filter(Boolean).join(" ")} id={id}>
      {bar && <AccentBar />}
      <Heading className="ht-section__heading">{heading}</Heading>
      <Stack className="ht-section__body">{children}</Stack>
    </Tag>
  );
}
