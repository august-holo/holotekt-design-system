import { Children, type ReactNode } from "react";
import { Divider } from "./Divider";

export type ThumbnailListProps = {
  /** The rows, usually ThumbnailRow elements. Each becomes a list item followed by a hairline divider. */
  children: ReactNode;
  /** Number the list semantically (an ol). No numbers are shown. Default false (a ul). */
  ordered?: boolean;
  /** A name for the list, read by assistive technology. */
  "aria-label"?: string;
  /** Extra class names, added after the component's own. */
  className?: string;
};

/** A semantic list of ThumbnailRows separated by hairline dividers. Rows sit on the page, not in cards. */
export function ThumbnailList({ children, ordered = false, className, ...rest }: ThumbnailListProps) {
  const Tag = ordered ? "ol" : "ul";
  return (
    <Tag className={["ht-thumbnail-list", className ?? ""].filter(Boolean).join(" ")} {...rest}>
      {Children.map(children, (child) =>
        child == null || child === false ? null : (
          <li className="ht-thumbnail-list__item">
            {child}
            <Divider decorative />
          </li>
        ),
      )}
    </Tag>
  );
}
