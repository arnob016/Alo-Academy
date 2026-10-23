"use client";

import { createElement, Suspense, use, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { getLoadedTheme, loadTheme } from "./loaders";
import { restoreSavedTheme, useTheme } from "./store";
import type { ThemeId } from "./registry";
import type { ThemeRoute } from "./types";

const routes: Record<string, ThemeRoute> = {
  "/": "home",
  "/courses": "courses",
  "/teachers": "teachers",
  "/admission": "admission",
  "/admission/success": "success",
  "/contact": "contact",
};

/**
 * Renders the active non-classic theme. The classic markup stays in the DOM
 * (hidden by CSS) for search engines and as the no-JS fallback.
 *
 * Keep this file light: it ships on every page. Translation runtime, fonts and
 * animation libraries belong inside each theme's own chunk.
 */
export function ThemeRoot() {
  const theme = useTheme();
  useEffect(restoreSavedTheme, []);
  if (theme === "classic") return null;

  return (
    <Suspense fallback={<div className="theme-loading" aria-busy="true" />}>
      <ThemeHost id={theme} />
    </Suspense>
  );
}

function ThemeHost({ id }: { id: ThemeId }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [, segment = routing.defaultLocale, ...rest] = pathname.split("/");
  const locale = (routing.locales as readonly string[]).includes(segment) ? (segment as Locale) : routing.defaultLocale;
  const path = `/${rest.join("/")}`.replace(/\/$/, "") || "/";

  // Theme components come from a module-level cache, so their identity is
  // stable across renders (createElement just makes that explicit).
  const theme = getLoadedTheme(id) ?? use(loadTheme(id));
  return createElement(theme, { locale, route: routes[path] ?? "notFound", path, searchParams });
}
