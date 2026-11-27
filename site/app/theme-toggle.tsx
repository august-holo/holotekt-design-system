"use client";
// B-007: light / dark / system, stored per visitor, applied as data-theme on <html>. The inline
// script in layout.tsx applies the stored choice before first paint so there is no flash.
// Shown as the "Theme" item in the header (B-050): one click cycles system → light → dark.
import { useSyncExternalStore } from "react";
import { THEME_KEY } from "@/lib/theme";

export type Theme = "system" | "light" | "dark";
const ORDER: Theme[] = ["system", "light", "dark"];
const CHANGE_EVENT = "ht-theme-change";

function read(): Theme {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    return stored === "light" || stored === "dark" ? stored : "system";
  } catch {
    return "system";
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

function choose(next: Theme) {
  const root = document.documentElement;
  if (next === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", next);
  try {
    if (next === "system") localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, next);
  } catch {
    /* storage unavailable: applies for this page only */
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function ThemeToggle({ className }: { className?: string }) {
  const theme = useSyncExternalStore(subscribe, read, () => "system" as Theme);
  const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length];
  return (
    <button type="button" className={className} onClick={() => choose(next)} aria-label={`Theme: ${theme}. Switch to ${next}.`} title={`Theme: ${theme}`}>
      Theme
    </button>
  );
}
