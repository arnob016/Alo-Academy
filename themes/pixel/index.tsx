"use client";

import "@fontsource/press-start-2p/latin-400.css";
import "@fontsource/vt323/latin-400.css";
import "./pixel.css";

import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent, type PointerEvent } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import { site } from "@/config/site";
import { prepareMessages, ThemeIntl } from "../theme-intl";
import type { ThemeProps, ThemeRoute } from "../types";
import { pixelCopy, type PixelCopy } from "./copy";
import { AdmissionPage, ContactPage, CoursesPage, HomePage, NotFoundPage, SuccessPage, TeachersPage, type PageProps } from "./pages";
import { isSoundOn, setSound, sfx } from "./sound";
import { Lamp, Town } from "./sprites";
import { starBurst, useKonami, Walker } from "./ui";

export function prepare(locale: string) {
  return prepareMessages(locale as Locale);
}

export default function PixelTheme(props: ThemeProps) {
  return (
    <ThemeIntl locale={props.locale}>
      <PixelApp {...props} />
    </ThemeIntl>
  );
}

const pages: Record<ThemeRoute, (p: PageProps) => React.ReactNode> = {
  home: HomePage,
  courses: CoursesPage,
  teachers: TeachersPage,
  admission: AdmissionPage,
  success: SuccessPage,
  contact: ContactPage,
  notFound: NotFoundPage,
};

const towns = [
  { path: "/", key: "home", kind: "house", roof: "#b13e53" },
  { path: "/courses", key: "courses", kind: "house", roof: "#3b5dc9" },
  { path: "/teachers", key: "teachers", kind: "house", roof: "#5d275d" },
  { path: "/admission", key: "admission", kind: "castle", roof: "#b13e53" },
  { path: "/contact", key: "contact", kind: "house", roof: "#ef7d57" },
] as const;

function PixelApp({ locale, route, path, searchParams }: ThemeProps) {
  const c = pixelCopy(locale);
  const tFooter = useTranslations("footer");
  const [sound, setSoundState] = useState(isSoundOn);
  const [gold, setGold] = useState(0);
  const [secret, setSecret] = useState(false);
  const [toast, setToast] = useState(false);
  const lastBlip = useRef(0);

  // Switching to another theme unmounts this one; stop the music with it.
  useEffect(() => () => setSound(false), []);

  const href = useCallback((to: string) => `/${locale}${to === "/" ? "" : to}`, [locale]);
  const nf = useMemo(() => {
    const format = new Intl.NumberFormat(locale === "bn" ? "bn-BD" : "en-US");
    return (n: number) => format.format(n);
  }, [locale]);

  useKonami(() => {
    setSecret(true);
    setToast(true);
    window.setTimeout(() => setToast(false), 6000);
    sfx.fanfare();
    starBurst();
  });

  // Hover blips and coin clicks for every link/button, via delegation.
  const onPointerOver = (e: PointerEvent<HTMLDivElement>) => {
    const target = (e.target as HTMLElement).closest("a, button");
    const now = performance.now();
    if (target && !target.contains(e.relatedTarget as Node | null) && now - lastBlip.current > 70) {
      lastBlip.current = now;
      sfx.blip();
    }
  };
  const onClick = (e: MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("a, button")) {
      setGold((g) => g + 1);
      sfx.coin();
    }
  };

  const toggleSound = () => {
    const next = !sound;
    setSound(next);
    setSoundState(next);
  };

  const other = locale === "bn" ? "en" : "bn";
  const query = searchParams.toString();
  const otherHref = `/${other}${path === "/" ? "" : path}${query ? `?${query}` : ""}`;
  const Page = pages[route];

  return (
    <div className={`pq-root${secret ? " pq-secret" : ""}`} onPointerOver={onPointerOver} onClick={onClick}>
      <a href="#pq-main" className="pq-skip">
        {c.skipHint}
      </a>

      <div className="pq-wrap">
        <header className="pq-top">
          <Link href={href("/")} className="pq-title">
            <Lamp className="pq-lamp" />
            <span className="pq-h3">{site.name[locale]}</span>
          </Link>
          <span className="pq-chip" aria-label={`${nf(gold)} ${c.gold}`}>
            <span className="pq-coin" aria-hidden="true">
              ●
            </span>
            <span key={gold} className={gold ? "pq-coin-pop" : undefined}>
              {nf(gold).padStart(3, nf(0))}
            </span>
            <span aria-hidden="true">{c.gold}</span>
          </span>
          <button type="button" className="pq-chip" aria-pressed={sound} onClick={toggleSound} aria-label={c.soundLabel}>
            ♪ {sound ? c.soundOn : c.soundOff}
          </button>
          <Link href={otherHref} className="pq-chip" lang={other} hrefLang={other} aria-label={c.langLabel}>
            {c.langSwitch}
          </Link>
        </header>

        <nav className="pq-world" aria-label={c.worldMap}>
          <ul>
            {towns.map((town) => {
              const current = path === town.path || (town.path === "/admission" && route === "success");
              return (
                <li key={town.path}>
                  <Link href={href(town.path)} className="pq-town" aria-current={current ? "page" : undefined}>
                    {current && (
                      <span className="pq-flag" aria-hidden="true">
                        ▼ {c.youAreHere}
                      </span>
                    )}
                    <Town kind={town.kind} roof={town.roof} />
                    <span className="pq-town-name">{c.towns[town.key]}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <main id="pq-main" tabIndex={-1}>
          <Page locale={locale} c={c} href={href} nf={nf} secret={secret} searchParams={searchParams} />
        </main>

        <PixelFooter c={c} locale={locale} hours={tFooter("hours")} rights={tFooter("rights")} />
      </div>

      {/* Re-keyed on every route change, so the screen wipe replays. */}
      <div key={path} className="pq-wipe" aria-hidden="true" />
      <Walker />
      {toast && (
        <div className="pq-toast pq-frame" role="status">
          <span className="pq-speaker pq-label">★</span>
          <p className="pq-h3" style={{ color: "var(--pq-yellow)" }}>
            {c.cheat}
          </p>
          <p style={{ marginTop: 8 }}>{c.cheatText}</p>
        </div>
      )}
    </div>
  );
}

function PixelFooter({ c, locale, hours, rights }: { c: PixelCopy; locale: Locale; hours: string; rights: string }) {
  return (
    <footer className="pq-footer">
      <p className="pq-h3" style={{ color: "var(--pq-yellow)" }}>
        {site.name[locale]}
      </p>
      <p style={{ marginTop: 8 }}>{site.contact.address[locale]}</p>
      <p>
        <a href={`tel:${site.contact.phone}`}>{site.contact.phone}</a> ·{" "}
        <a href={`mailto:${site.contact.email}`}>{site.contact.email}</a>
      </p>
      <p>{hours}</p>
      <p className="pq-label" style={{ marginTop: 14 }}>
        © {site.name[locale]} · {rights} · {c.pressStart} ▶
      </p>
    </footer>
  );
}
