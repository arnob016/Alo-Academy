import type { ComponentProps } from "react";
import NextLink from "next/link";
import { useLocale } from "next-intl";

/** Prefixes the current locale, e.g. "/courses" → "/bn/courses". */
export function localeHref(locale: string, href: string) {
  return `/${locale}${href === "/" ? "" : href}`;
}

/**
 * Server-side locale-aware link. Unlike next-intl's Link it needs no client
 * provider, which keeps the translation runtime out of most pages' JS.
 */
export function Link({ href, ...props }: Omit<ComponentProps<typeof NextLink>, "href"> & { href: string }) {
  const locale = useLocale();
  return <NextLink href={localeHref(locale, href)} {...props} />;
}
