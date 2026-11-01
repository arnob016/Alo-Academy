"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { toolItems } from "@/config/site";
import type { Locale } from "@/i18n/routing";
import { useWho } from "@/lib/use-who";
import { prefersReducedMotion } from "../store";

/** Locale-aware helpers every theme needs. */
export function useThemeKit(locale: Locale, path: string, searchParams: URLSearchParams) {
  const href = useCallback((to: string) => `/${locale}${to === "/" ? "" : to}`, [locale]);
  const nf = useMemo(() => {
    const format = new Intl.NumberFormat(locale === "bn" ? "bn-BD" : "en-US");
    return (n: number) => format.format(n);
  }, [locale]);
  const other: Locale = locale === "bn" ? "en" : "bn";
  const query = searchParams.toString();
  const otherHref = `/${other}${path === "/" ? "" : path}${query ? `?${query}` : ""}`;
  return { href, nf, other, otherHref };
}

/**
 * Links every theme shows besides its own menu: the tool pages (routine,
 * results, trial, tracker, office) and the account — "Sign in", or the
 * signed-in person's first name. Labels come from the shared "nav" messages.
 */
export function useToolLinks(href: (path: string) => string) {
  const t = useTranslations("nav");
  const tFooter = useTranslations("footer");
  const who = useWho();
  const tools = toolItems.map((item) => ({ path: item.href, href: href(item.href), label: t(item.key) }));
  const first = who ? (who.name.trim().split(/\s+/)[0] ?? who.name) : "";
  const account = who
    ? { path: "/account", href: href("/account"), label: first, title: `${t("account")}: ${who.name}` }
    : { path: "/login", href: href("/login"), label: t("signIn"), title: t("signIn") };
  return { tools, account, toolsLabel: tFooter("tools") };
}

/** True once the element has scrolled into view (fires once). */
export function useInView<T extends Element>(rootMargin = "0px 0px -10% 0px") {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin]);
  return [ref, inView] as const;
}

/** Plays an intro once per browser session (countdown leader, boot sequence…). */
export function useOncePerSession(key: string) {
  const [show, setShow] = useState(() => {
    if (prefersReducedMotion()) return false;
    try {
      return sessionStorage.getItem(key) !== "1";
    } catch {
      return false;
    }
  });
  const done = useCallback(() => {
    try {
      sessionStorage.setItem(key, "1");
    } catch {
      // ignore
    }
    setShow(false);
  }, [key]);
  return [show, done] as const;
}

/** Splits text into user-perceived characters (keeps Bangla conjuncts whole). */
export function graphemes(text: string, locale: string) {
  return Array.from(new Intl.Segmenter(locale, { granularity: "grapheme" }).segment(text), (s) => s.segment);
}
