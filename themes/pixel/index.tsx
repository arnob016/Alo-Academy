"use client";

import "@fontsource/press-start-2p/latin-400.css";
import "@fontsource/vt323/latin-400.css";
import "../shared/app-skin.css";
import "./pixel.css";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import { site } from "@/config/site";
import { prepareMessages, ThemeIntl } from "../theme-intl";
import { AppFrame } from "../shared/frame";
import { useThemeKit, useToolLinks } from "../shared/kit";
import type { FrameProps, ThemeProps, ThemeRoute } from "../types";
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

/**
 * The game layer every pixel page shares: a coin per click, a blip per hover,
 * the music toggle and the Konami-code secret.
 */
function usePlay() {
  const [sound, setSoundState] = useState(isSoundOn);
  const [gold, setGold] = useState(0);
  const [secret, setSecret] = useState(false);
  const [toast, setToast] = useState(false);
  const lastBlip = useRef(0);

  // Switching to another theme unmounts this one; stop the music with it.
  useEffect(() => () => setSound(false), []);

  useKonami(() => {
    setSecret(true);
    setToast(true);
    window.setTimeout(() => setToast(false), 6000);
    sfx.fanfare();
    starBurst();
  });

  // Hover blips and coin clicks for every link/button, via delegation.
  const onPointerOver = useCallback((e: { target: EventTarget | null; relatedTarget: EventTarget | null }) => {
    const target = (e.target as HTMLElement).closest?.("a, button");
    const now = performance.now();
    if (target && !target.contains(e.relatedTarget as Node | null) && now - lastBlip.current > 70) {
      lastBlip.current = now;
      sfx.blip();
    }
  }, []);
  const onClick = useCallback((e: { target: EventTarget | null }) => {
    if ((e.target as HTMLElement).closest?.("a, button")) {
      setGold((g) => g + 1);
      sfx.coin();
    }
  }, []);

  const toggleSound = () => {
    const next = !sound;
    setSound(next);
    setSoundState(next);
  };

  return { sound, toggleSound, gold, secret, toast, onPointerOver, onClick };
}

type Play = ReturnType<typeof usePlay>;

/** Tool pages (routine, results, office…): the status bar, world map and walker around the classic page. */
export function Frame(props: FrameProps) {
  return (
    <ThemeIntl locale={props.locale}>
      <PixelFrame {...props} />
    </ThemeIntl>
  );
}

function PixelFrame({ locale, path, searchParams }: FrameProps) {
  const c = pixelCopy(locale);
  const tFooter = useTranslations("footer");
  const play = usePlay();
  const { href, nf } = useThemeKit(locale, path, searchParams);
  const { onPointerOver, onClick } = play;

  // The game's root here is the classic page container, so listen there.
  useEffect(() => {
    const root = document.getElementById("classic-root");
    root?.addEventListener("pointerover", onPointerOver);
    root?.addEventListener("click", onClick);
    return () => {
      root?.removeEventListener("pointerover", onPointerOver);
      root?.removeEventListener("click", onClick);
    };
  }, [onPointerOver, onClick]);

  return (
    <AppFrame
      rootClass={`pq-root skin-dark${play.secret ? " pq-secret" : ""}`}
      header={
        <div className="pq-wrap">
          <StatusBar locale={locale} c={c} href={href} nf={nf} path={path} searchParams={searchParams} play={play} />
          <WorldMap c={c} href={href} path={path} success={false} />
        </div>
      }
      footer={
        <div className="pq-wrap">
          <PixelFooter c={c} locale={locale} href={href} path={path} hours={tFooter("hours")} rights={tFooter("rights")} />
        </div>
      }
      effects={<PlayEffects c={c} path={path} toast={play.toast} />}
    />
  );
}

function PixelApp({ locale, route, path, searchParams }: ThemeProps) {
  const c = pixelCopy(locale);
  const tFooter = useTranslations("footer");
  const play = usePlay();
  const { href, nf } = useThemeKit(locale, path, searchParams);
  const Page = pages[route];

  return (
    <div className={`pq-root${play.secret ? " pq-secret" : ""}`} onPointerOver={play.onPointerOver} onClick={play.onClick}>
      <a href="#pq-main" className="pq-skip">
        {c.skipHint}
      </a>

      <div className="pq-wrap">
        <StatusBar locale={locale} c={c} href={href} nf={nf} path={path} searchParams={searchParams} play={play} />
        <WorldMap c={c} href={href} path={path} success={route === "success"} />

        <main id="pq-main" tabIndex={-1}>
          <Page locale={locale} c={c} href={href} nf={nf} secret={play.secret} searchParams={searchParams} />
        </main>

        <PixelFooter c={c} locale={locale} href={href} path={path} hours={tFooter("hours")} rights={tFooter("rights")} />
      </div>

      <PlayEffects c={c} path={path} toast={play.toast} />
    </div>
  );
}

function StatusBar({
  locale,
  c,
  href,
  nf,
  path,
  searchParams,
  play,
}: {
  locale: Locale;
  c: PixelCopy;
  href: (to: string) => string;
  nf: (n: number) => string;
  path: string;
  searchParams: URLSearchParams;
  play: Play;
}) {
  const { account } = useToolLinks(href);
  const other = locale === "bn" ? "en" : "bn";
  const query = searchParams.toString();
  const otherHref = `/${other}${path === "/" ? "" : path}${query ? `?${query}` : ""}`;
  return (
    <header className="pq-top">
      <Link href={href("/")} className="pq-title">
        <Lamp className="pq-lamp" />
        <span className="pq-h3">{site.name[locale]}</span>
      </Link>
      <span className="pq-chip" aria-label={`${nf(play.gold)} ${c.gold}`}>
        <span className="pq-coin" aria-hidden="true">
          ●
        </span>
        <span key={play.gold} className={play.gold ? "pq-coin-pop" : undefined}>
          {nf(play.gold).padStart(3, nf(0))}
        </span>
        <span aria-hidden="true">{c.gold}</span>
      </span>
      <button type="button" className="pq-chip" aria-pressed={play.sound} onClick={play.toggleSound} aria-label={c.soundLabel}>
        ♪ {play.sound ? c.soundOn : c.soundOff}
      </button>
      <Link href={account.href} title={account.title} className="pq-chip pq-account" aria-current={path === account.path ? "page" : undefined}>
        {account.label}
      </Link>
      <Link href={otherHref} className="pq-chip" lang={other} hrefLang={other} aria-label={c.langLabel}>
        {c.langSwitch}
      </Link>
    </header>
  );
}

function WorldMap({ c, href, path, success }: { c: PixelCopy; href: (to: string) => string; path: string; success: boolean }) {
  return (
    <nav className="pq-world" aria-label={c.worldMap}>
      <ul>
        {towns.map((town) => {
          const current = path === town.path || (town.path === "/admission" && success);
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
  );
}

/** The screen wipe (re-keyed on every route change, so it replays), the walker and the secret's toast. */
function PlayEffects({ c, path, toast }: { c: PixelCopy; path: string; toast: boolean }) {
  return (
    <>
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
    </>
  );
}

function PixelFooter({
  c,
  locale,
  href,
  path,
  hours,
  rights,
}: {
  c: PixelCopy;
  locale: Locale;
  href: (to: string) => string;
  path: string;
  hours: string;
  rights: string;
}) {
  const { tools, toolsLabel } = useToolLinks(href);
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
      <nav className="pq-tools" aria-label={toolsLabel}>
        <span>{toolsLabel} ▸</span>
        {tools.map((tool) => (
          <Link key={tool.path} href={tool.href} aria-current={path === tool.path || path.startsWith(`${tool.path}/`) ? "page" : undefined}>
            {tool.label}
          </Link>
        ))}
      </nav>
      <p className="pq-label" style={{ marginTop: 14 }}>
        © {site.name[locale]} · {rights} · {c.pressStart} ▶
      </p>
    </footer>
  );
}
