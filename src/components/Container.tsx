import type { ElementType, ReactNode } from "react";

export type ContainerProps = {
  /** "page" (default): the page width (layout/width/page) with the page margin at the sides, which steps down on phones. "reading": the reading width. */
  width?: "page" | "reading";
  /** The element to render. Default "div". */
  as?: ElementType;
  /** Extra class names, added after the component's own. */
  className?: string;
  /** The page's content. */
  children?: ReactNode;
};

/**
 * Holds a page's content at the system's width and keeps it off the screen edge. The margin steps down
 * on phones. No look of its own.
 */
export function Container({ width = "page", as: Tag = "div", className, children }: ContainerProps) {
  return (
    <Tag className={["ht-container", className ?? ""].filter(Boolean).join(" ")} data-width={width}>
      {children}
    </Tag>
  );
}
