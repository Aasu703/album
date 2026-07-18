"use client";

import { MoonIcon, SunIcon } from "@heroicons/react/24/outline";

const THEME_STORAGE_KEY = "album-theme";

/** Applies a theme by toggling the `dark` class on <html> and persisting the choice.
 *  The same class + storage key is read by the inline boot script in layout.tsx. */
function setTheme(mode: "light" | "dark") {
  document.documentElement.classList.toggle("dark", mode === "dark");
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch {
    // Storage can be unavailable (private mode/quota); the class still applies.
  }
}

/** Light/dark theme switch. The icon is driven purely by the `dark:` CSS variant
 *  (sun shown in dark mode to switch to light, moon in light mode to switch to dark),
 *  so it needs no React state and can't cause a server/client hydration mismatch. */
export default function ThemeToggle() {
  function handleToggle() {
    const isDark = document.documentElement.classList.contains("dark");
    setTheme(isDark ? "light" : "dark");
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label="Toggle light and dark theme"
      title="Toggle theme"
      className="inline-flex min-h-10 items-center justify-center rounded-full border border-hairline bg-surface p-2 text-foreground shadow-sm transition-colors duration-300 ease-out hover:border-accent hover:text-accent"
    >
      <SunIcon className="hidden h-5 w-5 dark:block" aria-hidden="true" />
      <MoonIcon className="block h-5 w-5 dark:hidden" aria-hidden="true" />
    </button>
  );
}
