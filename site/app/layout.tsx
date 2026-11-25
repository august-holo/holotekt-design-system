import type { Metadata } from "next";
import Link from "next/link";
import { REPO_URL, SITE_URL, version } from "@/lib/data";
import { FOUNDATIONS, foundationTitle } from "@/lib/pages";
import { ThemeToggle } from "./theme-toggle";
import { THEME_KEY } from "@/lib/theme";
// The system's own variables, so the site picks tokens up as they are published, and the one
// binding that lets the theme toggle be seen: page and text colours from the semantic tokens.
import "../../dist/tokens.css";
import "./bindings.css";

// Applies the visitor's stored theme before first paint. Runs once, inline, so there is no flash.
const themeScript = `try{var t=localStorage.getItem(${JSON.stringify(THEME_KEY)});if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "holotekt design system", template: "%s · holotekt design system" },
  description: "Design tokens and documentation for the holotekt design system.",
};

const NAV: { text: string; href: string }[] = [
  { text: "Home", href: "/" },
  ...FOUNDATIONS.map((k) => ({ text: foundationTitle(k), href: `/foundations/${k}` })),
  { text: "Components", href: "/components" },
  { text: "Decisions", href: "/decisions" },
  { text: "Changelog", href: "/changelog" },
  { text: "Consumer rules", href: "/consumer-rules" },
  { text: "Accessibility", href: "/accessibility" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const v = version();
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <header>
          <ThemeToggle />
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
