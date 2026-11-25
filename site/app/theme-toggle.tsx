"use client";
// B-007: light / dark / system, stored per visitor, applied as data-theme on <html>. The inline
// script in layout.tsx applies the stored choice before first paint so there is no flash.
import { useSyncExternalStore } from "react";
import { THEME_KEY } from "@/lib/theme";

export type Theme = "system" | "light" | "dark";
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

export function ThemeToggle() {
  // The server renders "system"; the client reads the stored choice after hydration.
  const theme = useSyncExternalStore(subscribe, read, () => "system" as Theme);
  return (
    <fieldset>
      <legend>Theme</legend>
      {(["system", "light", "dark"] as Theme[]).map((t) => (
        <label key={t}>
          <input type="radio" name="theme" value={t} checked={theme === t} onChange={() => choose(t)} /> {t}
        </label>
      ))}
    </fieldset>
  );
}
