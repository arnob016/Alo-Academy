"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Locale } from "@/i18n/routing";
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
