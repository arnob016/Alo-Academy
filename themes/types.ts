import type { Locale } from "@/i18n/routing";

export type ThemeRoute = "home" | "courses" | "teachers" | "admission" | "success" | "contact" | "notFound";

/** What every theme receives. Content itself comes from /content, /config and /messages. */
export type ThemeProps = {
  locale: Locale;
  route: ThemeRoute;
  /** Path without the locale prefix, e.g. "/courses". */
  path: string;
  searchParams: URLSearchParams;
};

/**
 * What a theme's frame receives on a tool page (routine, results, office…):
 * the page itself stays the classic markup and the frame dresses it.
 */
export type FrameProps = {
  locale: Locale;
  path: string;
  searchParams: URLSearchParams;
};
