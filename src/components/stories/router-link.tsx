import type { ComponentPropsWithoutRef } from "react";

/** Stands in for a router's link (Next.js Link, React Router Link) in the stories: an anchor that marks itself. */
export function RouterLink({ children, ...rest }: ComponentPropsWithoutRef<"a">) {
  return (
    <a data-router-link="true" {...rest}>
      {children}
    </a>
  );
}
