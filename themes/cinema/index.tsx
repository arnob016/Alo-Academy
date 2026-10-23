"use client";

import "@fontsource/bebas-neue/latin-400.css";
import "@fontsource/cormorant-garamond/latin-400.css";
import "@fontsource/cormorant-garamond/latin-400-italic.css";
import "@fontsource/cormorant-garamond/latin-600.css";
import "@fontsource/jetbrains-mono/latin-400.css";
import "@fontsource-variable/noto-serif-bengali/wght.css";
import "./cinema.css";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { animate, cubicBezier, stagger } from "animejs";
import type { Locale } from "@/i18n/routing";
import { site } from "@/config/site";
import { courses, levels, type Course } from "@/content/courses";
import { teachers } from "@/content/teachers";
import { testimonials } from "@/content/testimonials";
import { faqs } from "@/content/faq";
import { REF_PATTERN } from "@/lib/ref";
import { MapFacade } from "@/components/map-facade";
import { prepareMessages, ThemeIntl } from "../theme-intl";
import { prefersReducedMotion } from "../store";
import { ThemedAdmissionForm, ThemedContactForm, type FormClasses } from "../shared/forms";
import { useInView, useOncePerSession, useThemeKit } from "../shared/kit";
import type { ThemeProps, ThemeRoute } from "../types";
import { cinemaCopy, type CinemaCopy } from "./copy";

export function prepare(locale: string) {
  return prepareMessages(locale as Locale);
}

export default function CinemaTheme(props: ThemeProps) {
  return (
    <ThemeIntl locale={props.locale}>
      <CinemaApp {...props} />
    </ThemeIntl>
  );
}

const EASE = cubicBezier(0.7, 0, 0.3, 1);

type Ctx = {
  locale: Locale;
  c: CinemaCopy;
  href: (path: string) => string;
  nf: (n: number) => string;
  searchParams: URLSearchParams;
};

const navItems = [
  ["/", "home"],
  ["/courses", "courses"],
  ["/teachers", "teachers"],
  ["/admission", "admission"],
  ["/contact", "contact"],
] as const;

function CinemaApp({ locale, route, path, searchParams }: ThemeProps) {
  const c = cinemaCopy(locale);
  const { href, nf, other, otherHref } = useThemeKit(locale, path, searchParams);
  const rootRef = useRef<HTMLDivElement>(null);
  const [leader, finishLeader] = useOncePerSession("alo-cinema-leader");
  const [menuOpenOn, setMenuOpenOn] = useState<string | null>(null);
  const menuOpen = menuOpenOn === path;

  useLetterboxOnScenes(rootRef, path);

  const ctx: Ctx = { locale, c, href, nf, searchParams };
  const pages: Record<ThemeRoute, ReactNode> = {
    home: <Home {...ctx} />,
    courses: <Programme {...ctx} />,
    teachers: <Cast {...ctx} />,
    admission: <BoxOffice {...ctx} />,
    success: <Ticket {...ctx} />,
    contact: <Theatre {...ctx} />,
    notFound: <Missing {...ctx} />,
  };

  return (
    <div ref={rootRef} className="cn-root">
      <div className="cn-bar cn-bar--top">
        <header className="cn-nav">
          <Link href={href("/")} className="cn-logo cn-title cn-h3">
            {site.name[locale]}
          </Link>
          <button type="button" className="cn-chip cn-mono cn-menu" aria-expanded={menuOpen} aria-controls="cn-menu" onClick={() => setMenuOpenOn(menuOpen ? null : path)}>
            {c.menu}
          </button>
          <ul id="cn-menu" className="cn-mono" data-open={menuOpen}>
            {navItems.map(([to, key]) => (
              <li key={to}>
                <Link href={href(to)} aria-current={path === to ? "page" : undefined}>
                  {c.nav[key]}
                </Link>
              </li>
            ))}
          </ul>
          <Link href={otherHref} className="cn-chip cn-mono" lang={other} hrefLang={other}>
            {other === "en" ? "EN" : "বাং"}
          </Link>
        </header>
      </div>

      <main id="cn-main" key={path}>
        {pages[route]}
      </main>

      <Credits {...ctx} />

      <div className="cn-bar cn-bar--bottom" aria-hidden="true">
        <div className="cn-timecode cn-mono">
          <span>{c.nowPlaying}</span>
          <Timecode label={c.timecode} />
        </div>
      </div>
      <Grain />
      <div className="cn-vignette" aria-hidden="true" />
      {/* A hard cut to black on every route change. */}
      <div key={`cut-${path}`} className="cn-cut" aria-hidden="true" />
      {leader && <Leader skip={c.skipIntro} onDone={finishLeader} />}
    </div>
  );
}

/* ---------- Effects ---------- */

/** Letterbox bars close in briefly each time a new scene scrolls into view. */
function useLetterboxOnScenes(rootRef: React.RefObject<HTMLDivElement | null>, path: string) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root || prefersReducedMotion()) return;
    let timer = 0;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        root.classList.add("cn-closing");
        window.clearTimeout(timer);
        timer = window.setTimeout(() => root.classList.remove("cn-closing"), 900);
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    root.querySelectorAll(".cn-scene").forEach((scene) => observer.observe(scene));
    return () => {
      observer.disconnect();
      window.clearTimeout(timer);
    };
  }, [rootRef, path]);
}

/** Film grain: one noise tile drawn to a canvas, then jittered in 6 frames by CSS. */
function Grain() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 160;
    const ctx = canvas.getContext("2d");
    if (!ctx || !ref.current) return;
    const image = ctx.createImageData(160, 160);
    for (let i = 0; i < image.data.length; i += 4) {
      const v = Math.random() * 255;
      image.data[i] = image.data[i + 1] = image.data[i + 2] = v;
      image.data[i + 3] = 255;
    }
    ctx.putImageData(image, 0, 0);
    ref.current.style.backgroundImage = `url(${canvas.toDataURL()})`;
  }, []);
  return <div ref={ref} className="cn-grain" aria-hidden="true" />;
}

/** Running SMPTE-style timecode (24 fps), written straight to the DOM. */
function Timecode({ label }: { label: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const start = performance.now();
    let frame = 0;
    const pad = (n: number) => String(n).padStart(2, "0");
    const tick = () => {
      const t = (performance.now() - start) / 1000;
      if (ref.current) {
        ref.current.textContent = `${label} 00:${pad(Math.floor(t / 60) % 60)}:${pad(Math.floor(t) % 60)}:${pad(Math.floor((t % 1) * 24))}`;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [label]);
  return <span ref={ref} />;
}

/** The 3… 2… 1 countdown leader. Once per session, skippable, off for reduced motion. */
function Leader({ skip, onDone }: { skip: string; onDone: () => void }) {
  const [n, setN] = useState(3);
  useEffect(() => {
    if (n === 0) {
      onDone();
      return;
    }
    const id = window.setTimeout(() => setN((v) => v - 1), 1000);
    return () => window.clearTimeout(id);
  }, [n, onDone]);
  return (
    <div className="cn-leader" role="presentation">
      <div className="cn-leader-dial">
        <span className="cn-leader-num" aria-hidden="true">
          {Math.max(n, 1)}
        </span>
      </div>
      <button type="button" className="cn-btn cn-btn--ghost cn-leader-skip" onClick={onDone} autoFocus style={{ color: "#111", borderColor: "#111" }}>
        {skip} ▸
      </button>
    </div>
  );
}

/** Trailer-style headline: words rise in one by one with a slow, weighted ease. */
function Words({ text, as: Tag = "h2", className }: { text: string; as?: "h1" | "h2"; className: string }) {
  const [ref, inView] = useInView<HTMLHeadingElement>();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!inView || !el) return;
    if (prefersReducedMotion()) return;
    const animation = animate(el.querySelectorAll(".cn-word > span"), {
      opacity: [0, 1],
      translateY: ["100%", "0%"],
      duration: 1100,
      ease: EASE,
      delay: stagger(110),
      onBegin: () => setReady(true),
    });
    return () => {
      animation.pause();
    };
  }, [inView, ref]);
  return (
    <Tag ref={ref} className={`cn-words ${className}`} data-ready={ready || prefersReducedMotion() ? "true" : "false"} aria-label={text}>
      {text.split(" ").map((word, i) => (
        <span key={i} className="cn-word" aria-hidden="true">
          <span>{word}</span>
          {" "}
        </span>
      ))}
    </Tag>
  );
}

function Slate({ n, label, c }: { n: number; label: string; c: CinemaCopy }) {
  return (
    <p className="cn-slate cn-mono">
      {c.scene} {String(n).padStart(2, "0")} — {label}
    </p>
  );
}

/* ---------- Pieces ---------- */

function Poster({ course, ctx }: { course: Course; ctx: Ctx }) {
  const tLevels = useTranslations("levels");
  const { locale, c } = ctx;
  return (
    <Link href={ctx.href(`/admission?course=${course.id}`)} className="cn-poster" data-level={course.level}>
      <span className="cn-poster-art" aria-hidden="true" />
      <span className="cn-preview cn-mono" aria-hidden="true">
        ▶ {c.preview}
      </span>
      <span className="cn-poster-inner">
        <span className="cn-mono cn-gold">{c.presents}</span>
        <span className="cn-poster-title">
          <span className="cn-mono">{tLevels(course.level)}</span>
          <span className="cn-title cn-h3" style={{ display: "block", marginTop: 6 }}>
            {course.name[locale]}
          </span>
          <span className="cn-italic" style={{ display: "block", marginTop: 8, fontSize: "0.85em" }}>
            {course.description[locale]}
          </span>
        </span>
        <span className="cn-billing">
          {course.subjects[locale].join(" · ")}
          <br />
          {c.seatsLeft(ctx.nf(course.seatsLeft))}
        </span>
      </span>
    </Link>
  );
}

function TicketStub({ course, ctx }: { course: Course; ctx: Ctx }) {
  const t = useTranslations("course");
  return (
    <div className="cn-ticket">
      <span className="cn-mono">{ctx.c.admitOne}</span>
      <span className="cn-mono">{ctx.c.monthly}</span>
      <strong>{t("fee", { amount: course.admissionFee })}</strong>
      <strong>{t("fee", { amount: course.monthlyFee })}</strong>
    </div>
  );
}

function DemoNote() {
  const t = useTranslations("demo");
  if (!site.demo.enabled) return null;
  return (
    <div className="cn-demo" role="note">
      <strong>{t("bannerTitle")}</strong>
      {t("bannerText")}
    </div>
  );
}

const formClasses: FormClasses = {
  field: "cn-field",
  label: "cn-label",
  input: "cn-input",
  hint: "cn-hint",
  error: "cn-error",
  alert: "cn-alert",
  ok: "cn-ok",
  legend: "cn-label",
  radio: "cn-radio",
  submit: "cn-btn cn-submit",
  demo: "cn-btn cn-btn--ghost cn-demo-btn",
};

/* ---------- Pages ---------- */

function Home(ctx: Ctx) {
  const { locale, c, nf } = ctx;
  const t = useTranslations("home");
  const tDemo = useTranslations("demo");
  const bgRef = useRef<HTMLDivElement>(null);
  const beamRef = useRef<HTMLDivElement>(null);

  // Parallax depth layers: the giant backdrop word and the projector beam move slower than the page.
  useEffect(() => {
    if (prefersReducedMotion()) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const y = window.scrollY;
      if (bgRef.current) bgRef.current.style.transform = `translateY(${y * 0.35}px)`;
      if (beamRef.current) beamRef.current.style.transform = `translateY(${y * 0.15}px) rotate(${y * 0.01}deg)`;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <>
      <section className="cn-hero cn-scene cn-wrap" aria-labelledby="cn-title">
        <div ref={bgRef} className="cn-hero-bg" aria-hidden="true">
          ALO
        </div>
        <div ref={beamRef} className="cn-hero-beam" aria-hidden="true" />
        <Slate n={1} label={c.scenes.opening} c={c} />
        <p className="cn-mono cn-dim">{c.presents}</p>
        <Words as="h1" text={t("title")} className="cn-title cn-h1" />
        <p className="cn-lede">{t("subtitle")}</p>
        <p className="cn-mono cn-gold" style={{ marginTop: 22 }}>
          {c.kicker(nf(site.stats.years), nf(site.stats.students))}
        </p>
        <div className="cn-actions">
          <Link href={ctx.href("/admission")} className="cn-btn">
            {c.book}
          </Link>
          <Link href={ctx.href("/courses")} className="cn-btn cn-btn--ghost">
            {c.nav.courses}
          </Link>
        </div>
      </section>

      {site.demo.enabled && (
        <div className="cn-wrap">
          <div className="cn-demo">
            {tDemo("stripText")}{" "}
            <Link href={ctx.href("/admission")} style={{ textDecoration: "underline" }}>
              {tDemo("stripCta")} →
            </Link>
          </div>
        </div>
      )}

      <section className="cn-scene cn-wrap" aria-labelledby="cn-showing">
        <Slate n={2} label={c.scenes.showing} c={c} />
        <h2 id="cn-showing" className="cn-title cn-h2" style={{ marginBottom: 28 }}>
          {t("featuredTitle")}
        </h2>
        <div className="cn-reel">
          {courses.map((course) => (
            <Poster key={course.id} course={course} ctx={ctx} />
          ))}
        </div>
        <Link href={ctx.href("/courses")} className="cn-mono cn-gold">
          {c.allShowing} →
        </Link>
      </section>

      <section className="cn-scene cn-wrap" aria-labelledby="cn-starring">
        <Slate n={3} label={c.scenes.starring} c={c} />
        <Words text={t("teachersTitle")} className="cn-title cn-h2" />
        <ul style={{ listStyle: "none", padding: 0, marginTop: 36, columns: "2 280px", columnGap: 48 }}>
          {teachers.map((teacher) => (
            <li key={teacher.id} style={{ breakInside: "avoid", padding: "10px 0", borderBottom: "1px solid rgb(237 230 214 / 0.12)" }}>
              <span className="cn-cast-name">{teacher.name[locale]}</span>
              <span className="cn-italic cn-dim"> — {teacher.subject[locale]}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="cn-scene cn-wrap" aria-labelledby="cn-critics">
        <Slate n={4} label={c.scenes.critics} c={c} />
        <h2 id="cn-critics" className="cn-title cn-h2" style={{ marginBottom: 36 }}>
          {t("testimonialsTitle")}
        </h2>
        <div className="cn-critics">
          {testimonials.map((item) => (
            <figure key={item.id} style={{ margin: 0 }}>
              <p className="cn-stars" role="img" aria-label={c.reviewStars}>
                ★★★★★
              </p>
              <blockquote className="cn-quote">“{item.quote[locale]}”</blockquote>
              <figcaption className="cn-mono cn-dim">
                — {item.name[locale]}, {item.role[locale]}
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="cn-scene cn-wrap cn-faq" aria-labelledby="cn-behind">
        <Slate n={5} label={c.scenes.behind} c={c} />
        <h2 id="cn-behind" className="cn-title cn-h2" style={{ marginBottom: 24 }}>
          {t("faqTitle")}
        </h2>
        {faqs.map((faq, i) => (
          <details key={faq.id} open={i === 0}>
            <summary>{faq.question[locale]}</summary>
            <p>{faq.answer[locale]}</p>
          </details>
        ))}
      </section>

      <section className="cn-scene cn-wrap" style={{ textAlign: "center" }} aria-labelledby="cn-tickets">
        <Slate n={6} label={c.scenes.tickets} c={c} />
        <Words text={t("ctaTitle")} className="cn-title cn-h2" />
        <p className="cn-lede" style={{ marginInline: "auto" }}>
          {t("ctaText")}
        </p>
        <div className="cn-actions" style={{ justifyContent: "center" }}>
          <Link href={ctx.href("/admission")} className="cn-btn">
            {c.book}
          </Link>
          <a href={`tel:${site.contact.phone}`} className="cn-btn cn-btn--ghost">
            {t("ctaCall", { phone: site.contact.phone })}
          </a>
        </div>
      </section>
    </>
  );
}

function Programme(ctx: Ctx) {
  const { locale, c } = ctx;
  const t = useTranslations("coursesPage");
  const tLevels = useTranslations("levels");
  return (
    <div className="cn-wrap">
      <section className="cn-scene" style={{ paddingBottom: 0 }}>
        <Slate n={1} label={c.scenes.showing} c={c} />
        <Words as="h1" text={c.nav.courses} className="cn-title cn-h1" />
        <p className="cn-lede">{t("intro")}</p>
      </section>
      {levels.map((level, i) => (
        <section key={level} className="cn-scene" aria-labelledby={`cn-level-${level}`}>
          <Slate n={i + 2} label={tLevels(level)} c={c} />
          <h2 id={`cn-level-${level}`} className="cn-title cn-h2" style={{ marginBottom: 28 }}>
            {tLevels(level)}
          </h2>
          <div className="cn-posters">
            {courses
              .filter((course) => course.level === level)
              .map((course) => (
                <article key={course.id}>
                  <Poster course={course} ctx={ctx} />
                  <TicketStub course={course} ctx={ctx} />
                  <div className="cn-course-meta">
                    <p>
                      <span className="cn-mono cn-gold">{c.runtime}</span> {course.duration[locale]}
                    </p>
                    <p className="cn-mono cn-gold" style={{ marginTop: 8 }}>
                      {c.showtimes}
                    </p>
                    {course.batches.map((b) => (
                      <p key={b.id}>
                        {b.label[locale]} — {b.schedule[locale]}
                      </p>
                    ))}
                  </div>
                </article>
              ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function Cast(ctx: Ctx) {
  const { locale, c } = ctx;
  const t = useTranslations("teachersPage");
  return (
    <div className="cn-wrap">
      <section className="cn-scene">
        <Slate n={1} label={c.scenes.starring} c={c} />
        <Words as="h1" text={c.nav.teachers} className="cn-title cn-h1" />
        <p className="cn-lede">{t("intro")}</p>
        <div className="cn-cast" style={{ marginTop: 48 }}>
          {teachers.map((teacher) => (
            <article key={teacher.id}>
              <div className="cn-headshot" aria-hidden="true">
                {teacher.initials[locale]}
              </div>
              <h2 className="cn-cast-name">{teacher.name[locale]}</h2>
              <p className="cn-gold cn-italic">{teacher.subject[locale]}</p>
              <p className="cn-dim" style={{ fontSize: "0.9em" }}>
                {teacher.qualification[locale]}
              </p>
              <p className="cn-mono cn-dim" style={{ marginTop: 6 }}>
                {t("experience", { years: teacher.experienceYears })}
              </p>
              <p className="cn-italic" style={{ marginTop: 8 }}>
                “{teacher.bio[locale]}”
              </p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function BoxOffice(ctx: Ctx) {
  const { locale, c } = ctx;
  const t = useTranslations("admissionPage");
  const tCourse = useTranslations("course");
  const accountType = site.payments.bkashAccountType;
  const steps = ["open", "send", "copy", "fill"] as const;
  return (
    <div className="cn-wrap">
      <section className="cn-scene" style={{ paddingBottom: "4vh" }}>
        <Slate n={1} label={c.boxOffice} c={c} />
        <Words as="h1" text={t("title")} className="cn-title cn-h1" />
        <p className="cn-lede">{t("intro")}</p>
      </section>
      <div className="cn-grid-2">
        <aside>
          <DemoNote />
          <h2 className="cn-title cn-h3" style={{ marginTop: 28 }}>
            {c.howToTicket}
          </h2>
          <ol className="cn-steps" style={{ marginTop: 12 }}>
            {steps.map((step) => (
              <li key={step}>
                {step === "open" ? t("steps.open", { action: accountType === "merchant" ? t("payment") : t("sendMoney") }) : t(`steps.${step}`)}
              </li>
            ))}
          </ol>
          <div className="cn-ticket" style={{ marginTop: 22 }}>
            <span className="cn-mono">{t("payTo")}</span>
            <span />
            <strong>{site.payments.bkashNumber}</strong>
            <span className="cn-mono" style={{ alignSelf: "center" }}>
              {t("accountType", { type: accountType })}
            </span>
          </div>
          <h2 className="cn-title cn-h3" style={{ marginTop: 34 }}>
            {c.ticketPrices}
          </h2>
          <ul style={{ listStyle: "none", padding: 0, marginTop: 10 }}>
            {courses.map((course) => (
              <li key={course.id} style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "8px 0", borderBottom: "1px solid rgb(237 230 214 / 0.12)" }}>
                <span>{course.name[locale]}</span>
                <span className="cn-gold">{tCourse("fee", { amount: course.admissionFee })}</span>
              </li>
            ))}
          </ul>
        </aside>
        <section className="cn-form-panel" aria-labelledby="cn-form-title">
          <h2 id="cn-form-title" className="cn-title cn-h3">
            {t("formTitle")}
          </h2>
          <ThemedAdmissionForm
            locale={locale}
            cls={formClasses}
            idPrefix="cn-"
            initialCourseId={ctx.searchParams.get("course") ?? undefined}
            submitLabel={`${c.book} →`}
          />
        </section>
      </div>
    </div>
  );
}

function Ticket(ctx: Ctx) {
  const { c } = ctx;
  const t = useTranslations("success");
  const tDemo = useTranslations("demo");
  const ref = ctx.searchParams.get("ref");
  const valid = ref && REF_PATTERN.test(ref) ? ref : null;
  const extras = ["admin", "cms", "login", "gateway", "sms"] as const;
  return (
    <div className="cn-wrap">
      <section className="cn-scene">
        <Slate n={1} label={c.yourTicket} c={c} />
        <Words as="h1" text={t("title")} className="cn-title cn-h1" />
        <p className="cn-lede">{t("intro")}</p>
        <div className="cn-big-ticket" style={{ marginTop: 40 }}>
          <div>
            <p className="cn-mono" style={{ color: "var(--cn-red)" }}>
              {t("refLabel")}
            </p>
            <p className="cn-title cn-h2" style={{ marginTop: 8 }}>
              {valid ?? "—"}
            </p>
            <p style={{ marginTop: 8 }}>{valid ? t("refHint") : t("noRef")}</p>
            <div className="cn-barcode" aria-hidden="true" />
          </div>
          <div className="cn-stub cn-mono">{c.admitOne}</div>
        </div>
        <h2 className="cn-title cn-h3" style={{ marginTop: 48 }}>
          {t("nextTitle")}
        </h2>
        <ol className="cn-steps" style={{ marginTop: 12, maxWidth: 760 }}>
          {(["verify", "call", "start"] as const).map((k) => (
            <li key={k}>{t(`next.${k}`)}</li>
          ))}
        </ol>
        {site.demo.enabled && (
          <div className="cn-demo" style={{ marginTop: 48 }}>
            {site.demo.publicSheetUrl && (
              <p style={{ marginBottom: 10 }}>
                <a href={site.demo.publicSheetUrl} target="_blank" rel="noopener" style={{ textDecoration: "underline" }}>
                  {tDemo("seeRow")} ↗
                </a>{" "}
                {tDemo("seeRowHint")}
              </p>
            )}
            <strong>{tDemo("pitchTitle")}</strong>
            <p>{tDemo("pitchText")}</p>
            <p style={{ marginTop: 8 }}>{tDemo("alsoTitle")}:</p>
            <ul style={{ paddingLeft: 20 }}>
              {extras.map((k) => (
                <li key={k}>{tDemo(`also.${k}`)}</li>
              ))}
            </ul>
            {site.demo.hireUrl && (
              <a href={site.demo.hireUrl} target="_blank" rel="noopener" className="cn-btn" style={{ marginTop: 14 }}>
                {tDemo("cta")}
              </a>
            )}
          </div>
        )}
        <p style={{ marginTop: 40 }}>
          <Link href={ctx.href("/")} className="cn-btn cn-btn--ghost">
            ← {c.backToOpening}
          </Link>
        </p>
      </section>
    </div>
  );
}

function Theatre(ctx: Ctx) {
  const { locale, c } = ctx;
  const t = useTranslations("contactPage");
  const tFooter = useTranslations("footer");
  const tForm = useTranslations("contactForm");
  const details = [
    [t("address"), site.contact.address[locale]],
    [t("phone"), site.contact.phone],
    [t("email"), site.contact.email],
    [t("hours"), tFooter("hours")],
  ];
  return (
    <div className="cn-wrap">
      <section className="cn-scene" style={{ paddingBottom: "4vh" }}>
        <Slate n={1} label={c.theatre} c={c} />
        <Words as="h1" text={t("title")} className="cn-title cn-h1" />
        <p className="cn-lede">{t("intro")}</p>
      </section>
      <div className="cn-grid-2">
        <div>
          <dl>
            {details.map(([label, value]) => (
              <div key={label} style={{ padding: "12px 0", borderBottom: "1px solid rgb(237 230 214 / 0.12)" }}>
                <dt className="cn-mono cn-gold">{label}</dt>
                <dd style={{ margin: "4px 0 0" }}>{value}</dd>
              </div>
            ))}
          </dl>
          <div style={{ marginTop: 28, filter: "grayscale(1) contrast(1.1)" }}>
            <MapFacade query={site.contact.mapQuery} title={t("mapTitle")} label={t("loadMap")} note={t("mapNote")} />
          </div>
        </div>
        <section className="cn-form-panel" aria-labelledby="cn-contact-title">
          <h2 id="cn-contact-title" className="cn-title cn-h3">
            {tForm("title")}
          </h2>
          <ThemedContactForm locale={locale} cls={formClasses} idPrefix="cn-contact-" />
        </section>
      </div>
    </div>
  );
}

function Missing(ctx: Ctx) {
  const { c } = ctx;
  return (
    <div className="cn-wrap">
      <section className="cn-scene cn-hero" style={{ textAlign: "center" }}>
        <p className="cn-mono" style={{ color: "var(--cn-red)" }}>
          404 · {c.scene} ??
        </p>
        <Words as="h1" text={c.missing} className="cn-title cn-h1" />
        <p className="cn-lede" style={{ marginInline: "auto" }}>
          {c.missingText}
        </p>
        <div className="cn-actions" style={{ justifyContent: "center" }}>
          <Link href={ctx.href("/")} className="cn-btn">
            {c.backToOpening}
          </Link>
        </div>
      </section>
    </div>
  );
}

/** Footer as a rolling end-credits sequence (pauses on hover; static for reduced motion). */
function Credits(ctx: Ctx) {
  const { locale, c } = ctx;
  const tFooter = useTranslations("footer");
  const blocks: [string, string[]][] = [
    [c.credits.directedBy, [site.name[locale]]],
    [c.credits.starring, teachers.map((t) => `${t.name[locale]} — ${t.subject[locale]}`)],
    [c.credits.producedBy, [site.name[locale], site.contact.phone, site.contact.email]],
    [c.credits.location, [site.contact.address[locale], tFooter("hours")]],
    [c.credits.thanks, [c.credits.thanksText, c.credits.coffee]],
  ];
  return (
    <footer className="cn-wrap" aria-labelledby="cn-credits-title">
      <div className="cn-credits">
        <div className="cn-credits-roll">
          <h2 id="cn-credits-title" className="cn-title cn-h3 cn-gold">
            {c.credits.title}
          </h2>
          <dl>
            {blocks.map(([role, names]) => (
              <div key={role}>
                <dt className="cn-mono cn-dim">{role}</dt>
                {names.map((name) => (
                  <dd key={name}>{name}</dd>
                ))}
              </div>
            ))}
          </dl>
          <p className="cn-mono cn-dim" style={{ marginTop: 40 }}>
            © {site.name[locale]} · {tFooter("rights")}
          </p>
        </div>
      </div>
    </footer>
  );
}
