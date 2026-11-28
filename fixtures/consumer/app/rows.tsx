"use client";
import Link from "next/link";
import { Thumbnail, ThumbnailList, ThumbnailRow } from "holotekt-design-system/components";

// Client-side navigation through Next's Link and a click handler for tracking, on the row and on a
// thumbnail that is a link on its own.
export function Rows() {
  const track = (what: string) => () => console.log("clicked", what);
  return (
    <>
      <ThumbnailList aria-label="Work">
        <ThumbnailRow href="/one" linkComponent={Link} onClick={track("one")} title="One piece of work" summary="Its summary." />
        <ThumbnailRow href="/two" title="Another" />
      </ThumbnailList>
      <Thumbnail href="/three" linkComponent={Link} onClick={track("three")} alt="A third piece" />
    </>
  );
}
