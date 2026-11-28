import type { CSSProperties } from "react";

export type ThumbnailProps = {
  /** The image. Omit it to show the empty sunken surface. */
  src?: string;
  /** Alt text. Leave it out when the image is decorative, as inside a ThumbnailRow, whose title names the piece. Required when href is set. */
  alt?: string;
  /** Side length, a CSS length. Default 144px, built from the space scale (space/900 + space/700). */
  size?: string;
  /** Image loading. Default "lazy". */
  loading?: "lazy" | "eager";
  /** Make the thumbnail a link on its own. Inside a ThumbnailRow leave it out: the row is the link. */
  href?: string;
  /** Force a state, for docs and stories. The real states come from hover and keyboard focus. */
  state?: "hover" | "focus";
  /** Extra class names, added after the component's own. */
  className?: string;
};

/**
 * The image itself, which reacts on hover: the ink border and the orange offset arrive together,
 * as a short animation. At rest it has no border. The offset is decoration and motion, not elevation.
 */
export function Thumbnail({ src, alt, size, loading = "lazy", href, state, className }: ThumbnailProps) {
  const cls = ["ht-thumbnail", className ?? ""].filter(Boolean).join(" ");
  const style = size ? ({ "--ht-thumbnail-size": size } as CSSProperties) : undefined;
  const img = src ? <img className="ht-thumbnail__img" src={src} alt={alt ?? ""} loading={loading} decoding="async" /> : null;
  return href ? (
    <a className={cls} href={href} style={style} data-ht-state={state} aria-label={!src && alt ? alt : undefined}>
      {img}
    </a>
  ) : (
    <span className={cls} style={style} data-ht-state={state} role={!src && alt ? "img" : undefined} aria-label={!src && alt ? alt : undefined}>
      {img}
    </span>
  );
}
