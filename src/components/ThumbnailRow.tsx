import type { ElementType, MouseEventHandler } from "react";
import { Thumbnail } from "./Thumbnail";

export type ThumbnailRowProps = {
  /** Where the row goes. The whole row is one link. */
  href: string;
  /** The element used for the link. Default "a". Pass your router's link (Next.js Link works as is) for client-side navigation. */
  linkComponent?: ElementType;
  /** Called when the row is clicked, for tracking. The navigation still happens unless you prevent it. */
  onClick?: MouseEventHandler<HTMLAnchorElement>;
  /** The title of the piece, set in heading/3. */
  title: string;
  /** One or two lines saying what it is and what came of it, in ui/body and text/secondary. */
  summary?: string;
  /** The thumbnail image. The title names the piece, so the image is decorative. */
  image?: string;
  /** Force a state, for docs and stories. The real states come from hover and keyboard focus. */
  state?: "hover" | "focus";
  /** Extra class names, added after the component's own. */
  className?: string;
};

/**
 * One item in a list of work: thumbnail, title, summary, all one link. It sits directly on the
 * page with no border or fill at rest; on hover it takes surface/hover and the thumbnail animates.
 * On narrow screens the text drops below the image.
 */
export function ThumbnailRow({ href, linkComponent: LinkComponent = "a", onClick, title, summary, image, state, className }: ThumbnailRowProps) {
  return (
    <LinkComponent className={["ht-thumbnail-row", className ?? ""].filter(Boolean).join(" ")} href={href} onClick={onClick} data-ht-state={state}>
      <Thumbnail src={image} />
      <span className="ht-thumbnail-row__body">
        <span className="ht-thumbnail-row__title">{title}</span>
        {summary && <span className="ht-thumbnail-row__summary">{summary}</span>}
      </span>
    </LinkComponent>
  );
}
