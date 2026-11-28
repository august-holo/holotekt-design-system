import "holotekt-design-system/tokens.css";
import "holotekt-design-system/utilities.css";
import "holotekt-design-system/components.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="ht-page-grid">
      <body style={{ margin: 0, padding: "var(--ht-inset-lg)", color: "var(--ht-color-text-primary)" }}>{children}</body>
    </html>
  );
}
