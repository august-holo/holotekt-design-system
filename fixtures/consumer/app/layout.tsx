// Import order is the layer order: the layer statement first, then the system (all.css only: tokens,
// text styles, utilities and components; no base, no fonts), then the fixture's reset in its own layer.
// The page defaults below are the fixture's own, which is the point: a site can stop at all.css.
import "./layers.css";
import "holotekt-design-system/all.css";
import "./reset.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="ht-page-grid">
      <body style={{ padding: "var(--ht-inset-lg)", color: "var(--ht-color-text-primary)", fontFamily: "var(--ht-ui-body-font-family)" }}>{children}</body>
    </html>
  );
}
