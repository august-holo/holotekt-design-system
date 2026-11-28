import type { Metadata } from "next";
import Link from "next/link";
// globals.css declares the cascade layers and imports the package's all.css, base.css and fonts.css,
// then this site's own additions. It is imported before any CSS Module so the layer order is met first.
import "./globals.css";
import { REPO_URL, SITE_URL, version } from "@/lib/data";
import { ThemeToggle } from "./theme-toggle";
import { Cluster, Container, Stack } from "../../src/components";
import { THEME_KEY } from "@/lib/theme";
import styles from "./shell.module.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "holotekt design system", template: "%s · holotekt design system" },
  description: "A design system for systemic designers.",
};

// Applies the visitor's stored theme before first paint, and opens the reference <details> when
// the page is reached at #reference. Runs once, inline, so there is no flash.
const headScript = `try{var t=localStorage.getItem(${JSON.stringify(THEME_KEY)});if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}
addEventListener("hashchange",function(){var d=location.hash&&document.querySelector(location.hash);if(d&&d.tagName==="DETAILS")d.open=true});
addEventListener("DOMContentLoaded",function(){var d=location.hash&&document.querySelector(location.hash);if(d&&d.tagName==="DETAILS"){d.open=true;d.scrollIntoView()}});`;

const NAV = [
  { text: "Foundations", href: "/foundations" },
  { text: "Components", href: "/components" },
  { text: "Changelog", href: "/changelog" },
  { text: "GitHub", href: REPO_URL },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const v = version();
  const short = v.split(".").slice(0, 2).join(".");
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: headScript }} />
      </head>
      <body>
        <Container className={styles.page}>
          <Stack gap="section" className={styles.column}>
            <Cluster as="header" gap="lg" align="between" className={styles.header}>
              <Link href="/" className={`ht-ui-label ${styles.brand}`}>
                holotekt design system <span className={`ht-ui-meta ${styles.version}`}>v{short}</span>
              </Link>
              <nav aria-label="Site">
                <Cluster as="ul" gap="lg" className={`ht-ui-small ${styles.nav}`}>
                  {NAV.map((n) => (
                    <li key={n.href}>{n.href.startsWith("/") ? <Link href={n.href}>{n.text}</Link> : <a href={n.href}>{n.text}</a>}</li>
                  ))}
                  <li>
                    <ThemeToggle />
                  </li>
                </Cluster>
              </nav>
            </Cluster>
            <main className={styles.main}>{children}</main>
            <Cluster as="footer" gap="lg" className={`ht-ui-meta ${styles.footer}`}>
              <a href={REPO_URL}>GitHub</a>
              <Link href="/changelog">Changelog</Link>
              <a href="https://augustinevontrapp.com">augustinevontrapp.com</a>
            </Cluster>
          </Stack>
        </Container>
      </body>
    </html>
  );
}
