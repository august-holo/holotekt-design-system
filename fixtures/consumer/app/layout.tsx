// all.css only: tokens, text styles, utilities and components in one import, no base and no fonts.
// The page defaults below are the fixture's own, which is the point: a site can stop here.
import "holotekt-design-system/all.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="ht-page-grid">
      <body style={{ margin: 0, padding: "var(--ht-inset-lg)", color: "var(--ht-color-text-primary)", fontFamily: "var(--ht-ui-body-font-family)" }}>{children}</body>
    </html>
  );
}
