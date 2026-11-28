import type { ElementType, ReactNode } from "react";

export type ClusterProps = {
  /** The gap between items, in both directions: "sm", "md" (default) or "lg". */
  gap?: "sm" | "md" | "lg";
  /** How items sit along the row: "start" (default), "centre", "end" or "between" (space between them). */
  align?: "start" | "centre" | "end" | "between";
  /** The element to render. Default "div"; "ul" for a list of links, "nav" for navigation. */
  as?: ElementType;
  /** Extra class names, added after the component's own. */
  className?: string;
  /** The items: navigation links, a row of buttons. */
  children?: ReactNode;
};

/** Things in a row that wrap onto new lines when they run out of room. No look of its own. */
export function Cluster({ gap = "md", align = "start", as: Tag = "div", className, children }: ClusterProps) {
  return (
    <Tag className={["ht-cluster", className ?? ""].filter(Boolean).join(" ")} data-gap={gap} data-align={align}>
      {children}
    </Tag>
  );
}
