import type { Metadata } from "next";
import Link from "next/link";
import { REPO_URL, SITE_URL, version } from "@/lib/data";
import { FOUNDATIONS } from "@/lib/pages";
// The system's own variables, so the site picks tokens up as they are published. No other CSS yet.
import "../../dist/tokens.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "holotekt design system", template: "%s · holotekt design system" },
  description: "Design tokens and documentation for the holotekt design system.",
};

const NAV: { text: string; href: string }[] = [
  { text: "Home", href: "/" },
  ...FOUNDATIONS.map((k) => ({ text: k[0].toUpperCase() + k.slice(1), href: `/foundations/${k}` })),
  { text: "Components", href: "/components" },
  { text: "Decisions", href: "/decisions" },
  { text: "Changelog", href: "/changelog" },
  { text: "Consumer rules", href: "/consumer-rules" },
  { text: "Accessibility", href: "/accessibility" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const v = version();
  return (
    <html lang="en">
      <body>
        <header>
          <nav aria-label="Site">
            <ul>
              {NAV.map((n) => (
                <li key={n.href}>
                  <Link href={n.href}>{n.text}</Link>
                </li>
              ))}
            </ul>
          </nav>
        </header>
        <main>{children}</main>
        <footer>
          <p>
            holotekt design system v{v} · <a href={REPO_URL}>GitHub</a> · <a href="/llms.txt">llms.txt</a> ·{" "}
            <a href="/tokens.json">tokens.json</a>
          </p>
        </footer>
      </body>
    </html>
  );
}
