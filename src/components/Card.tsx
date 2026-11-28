import type { ComponentPropsWithoutRef, ReactNode } from "react";

export type CardProps = {
  /** The hard orange offset with its ink border, on by default. It is decoration, not elevation: it does not mean the card is on top. Off: a plain raised surface, no border. */
  offset?: boolean;
  /** The element to render. Default "div"; use "aside" for an aside, "section" for a titled group. */
  as?: "div" | "aside" | "section" | "article";
  /** Extra class names, added after the component's own, on the outer element. */
  className?: string;
  /** The card's content, rendered inside the surface. Its label, if any, is part of the content. */
  children?: ReactNode;
} & Omit<ComponentPropsWithoutRef<"div">, "className" | "children">;

/**
 * A static raised surface for a note, aside or summary. Depth comes from the tone (surface/raised);
 * the orange offset is a flourish, not a shadow of depth. A card is not a link. The card reserves room
 * for its own offset on the right and bottom, so its layout box and its visual box are the same: never
 * add the offset to a gap. The outer element carries className and the attributes; the content lives
 * in an inner .ht-card__surface, present with the offset on or off.
 */
export function Card({ offset = true, as: Tag = "div", className, children, ...rest }: CardProps) {
  return (
    <Tag className={["ht-card", offset ? "ht-card--offset" : "", className ?? ""].filter(Boolean).join(" ")} {...rest}>
      <div className="ht-card__surface">{children}</div>
    </Tag>
  );
}
