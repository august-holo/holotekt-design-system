import type { ReactNode } from "react";

/** A visible placeholder for the layout stories: a sunken surface with a label. The helpers themselves have no look. */
export function Box({ children, tall = false }: { children: ReactNode; tall?: boolean }) {
  return (
    <div className="ht-ui-small" style={{ background: "var(--ht-color-surface-sunken)", color: "var(--ht-color-text-secondary)", padding: "var(--ht-inset-md)", minBlockSize: tall ? "var(--ht-space-900)" : undefined, borderRadius: "var(--ht-radius-sm)" }}>
      {children}
    </div>
  );
}
