import type { ElementType, ReactNode } from "react";

export type GridProps = {
  /** The element to render. Default "div"; "ul" for a list of items. */
  as?: ElementType;
  /** Extra class names, added after the component's own. */
  className?: string;
  /** Grid.Item children, each saying how many columns it spans. */
  children?: ReactNode;
};

export type GridItemProps = {
  /** How many of the 12 columns this item spans on desktop. Default 12. On phones every item takes the full width. */
  span?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
  /** The element to render. Default "div"; "li" inside a list grid. */
  as?: ElementType;
  /** Extra class names, added after the component's own. */
  className?: string;
  /** The item's content. */
  children?: ReactNode;
};

/** One cell of a Grid, spanning a number of its columns. */
export function GridItem({ span = 12, as: Tag = "div", className, children }: GridItemProps) {
  return (
    <Tag className={["ht-grid__item", className ?? ""].filter(Boolean).join(" ")} data-span={span}>
      {children}
    </Tag>
  );
}

/**
 * The system's columns (layout/grid/columns, 12 on desktop) with the grid gutter between them. Children
 * are Grid.Item and say how many columns they span. On phones every item takes the full width. No look of
 * its own.
 */
export function Grid({ as: Tag = "div", className, children }: GridProps) {
  return <Tag className={["ht-grid", className ?? ""].filter(Boolean).join(" ")}>{children}</Tag>;
}
Grid.Item = GridItem;
