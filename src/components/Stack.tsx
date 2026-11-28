import type { ElementType, ReactNode } from "react";

export type StackProps = {
  /** The one gap between children: "sm" (gap/sm), "md" (gap/md, default), "lg" (gap/lg) or "section" (layout/section/gap, smaller on phones). */
  gap?: "sm" | "md" | "lg" | "section";
  /** The element to render. Default "div"; "ul" or "ol" for a list, "article", "section", "nav". */
  as?: ElementType;
  /** Extra class names, added after the component's own. */
  className?: string;
  /** The things to stack. They carry no margins of their own. */
  children?: ReactNode;
};

/** Things in a column with one gap between them. The parent sets the space; children carry no margins. No look of its own. */
export function Stack({ gap = "md", as: Tag = "div", className, children }: StackProps) {
  return (
    <Tag className={["ht-stack", className ?? ""].filter(Boolean).join(" ")} data-gap={gap}>
      {children}
    </Tag>
  );
}
