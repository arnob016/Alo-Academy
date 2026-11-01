"use client";

import { Component, createElement, Suspense, use, useEffect, useLayoutEffect, type ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { getLoadedTheme, loadTheme } from "./loaders";
import { restoreSavedTheme, setTheme, useTheme } from "./store";
import { isAppPath, type ThemeId } from "./registry";
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
 * Renders the active non-classic theme. On most pages the theme draws the
 * whole page and the classic markup stays in the DOM (hidden by CSS) for
 * search engines and as the no-JS fallback. On the tool pages the classic
 * markup stays visible and the theme's Frame dresses it.
 *
 * Keep this file light: it ships on every page. Translation runtime, fonts and
 * animation libraries belong inside each theme's own chunk.
 */
export function ThemeRoot() {
  const theme = useTheme();
  useEffect(restoreSavedTheme, []);
  if (theme === "classic") return null;

  return (
    <ThemeErrorBoundary>
      <Suspense fallback={<div className="theme-loading" aria-busy="true" />}>
        <ThemeHost id={theme} />
      </Suspense>
    </ThemeErrorBoundary>
  );
}

/**
 * A theme's chunk can fail to load (flaky network, a deploy replaced it). Fall
 * back to the classic look instead of leaving the page hidden or crashed;
 * picking the theme again retries the download (see loaders.ts).
 */
class ThemeErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error("[theme] failed to load", error);
    setTheme("classic");
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function ThemeHost({ id }: { id: ThemeId }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [, segment = routing.defaultLocale, ...rest] = pathname.split("/");
  const locale = (routing.locales as readonly string[]).includes(segment) ? (segment as Locale) : routing.defaultLocale;
  const path = `/${rest.join("/")}`.replace(/\/$/, "") || "/";
  const appPage = isAppPath(path);

  // Tool pages keep the classic markup, dressed by the theme's frame (see
  // globals.css). The boot script sets this on full loads; this keeps it right
  // on client navigation.
  useLayoutEffect(() => {
    document.documentElement.toggleAttribute("data-app", appPage);
  }, [appPage]);

  // Theme components come from a module-level cache, so their identity is
  // stable across renders (createElement just makes that explicit).
  const theme = getLoadedTheme(id) ?? use(loadTheme(id));
  if (appPage) return createElement(theme.Frame, { locale, path, searchParams });
  return createElement(theme.Theme, { locale, route: routes[path] ?? "notFound", path, searchParams });
}
