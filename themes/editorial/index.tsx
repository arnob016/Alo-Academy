"use client";

import "@fontsource-variable/fraunces/full.css";
import "@fontsource-variable/inter-tight/wght.css";
import "@fontsource-variable/noto-serif-bengali/wght.css";
import "lenis/dist/lenis.css";
import "./editorial.css";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import Lenis from "lenis";
import type { Locale } from "@/i18n/routing";
import { site } from "@/config/site";
import { courses, type Course } from "@/content/courses";
import { teachers } from "@/content/teachers";
import { testimonials } from "@/content/testimonials";
import { faqs } from "@/content/faq";
import { REF_PATTERN } from "@/lib/ref";
import { MapFacade } from "@/components/map-facade";
import { prepareMessages, ThemeIntl } from "../theme-intl";
import { prefersReducedMotion } from "../store";
import { ThemedAdmissionForm, ThemedContactForm, type FormClasses } from "../shared/forms";
import { graphemes, useInView, useThemeKit } from "../shared/kit";
import type { ThemeProps, ThemeRoute } from "../types";
import { editorialCopy, type EditorialCopy } from "./copy";

export function prepare(locale: string) {
  return prepareMessages(locale as Locale);
}

export default function EditorialTheme(props: ThemeProps) {
  return (
    <ThemeIntl locale={props.locale}>
      <EditorialApp {...props} />
    </ThemeIntl>
  );
}

type Ctx = { locale: Locale; c: EditorialCopy; href: (p: string) => string; nf: (n: number) => string; searchParams: URLSearchParams };

const navItems = [
  ["/", "home", 1],
  ["/courses", "courses", 12],
  ["/teachers", "teachers", 34],
  ["/admission", "admission", 48],
  ["/contact", "contact", 56],
] as const;
const pageNumbers: Record<ThemeRoute, number | null> = { home: 1, courses: 12, teachers: 34, admission: 48, success: 49, contact: 56, notFound: null };
const tones = ["paper", "ink", "accent"] as const;

function EditorialApp({ locale, route, path, searchParams }: ThemeProps) {
  const c = editorialCopy(locale);
  const { href, nf, other, otherHref } = useThemeKit(locale, path, searchParams);
  const [grid, setGrid] = useState(false);
  const tFooter = useTranslations("footer");
  const ctx: Ctx = { locale, c, href, nf, searchParams };
  const pad = (n: number | null) => (n === null ? "—" : nf(n).padStart(2, nf(0)));

  // Smooth, inertial scrolling for this theme only.
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const lenis = new Lenis({ autoRaf: true, lerp: 0.09 });
    return () => lenis.destroy();
  }, []);

  // "G" toggles the 12-column grid overlay.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (e.key.toLowerCase() === "g" && !e.metaKey && !e.ctrlKey && !target.closest("input, textarea, select")) setGrid((g) => !g);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const pages: Record<ThemeRoute, ReactNode> = {
    home: <Cover {...ctx} />,
    courses: <Courses {...ctx} />,
    teachers: <Contributors {...ctx} />,
    admission: <Enrolment {...ctx} />,
    success: <Thanks {...ctx} />,
    contact: <Letters {...ctx} />,
    notFound: <Erratum {...ctx} />,
  };

  return (
    <div className="ed-root">
      <header className="ed-page">
        <div className="ed-mast ed-kicker">
          <span>
            {c.vol(nf(site.stats.years))} — {c.issue}
          </span>
          <Link href={href("/")} className="ed-mast-name">
            {site.name[locale]}
          </Link>
          <span>
            <button type="button" className="ed-btn-text" aria-pressed={grid} onClick={() => setGrid((g) => !g)}>
              {c.grid}
            </button>
            <Link href={otherHref} lang={other} hrefLang={other}>
              {other === "en" ? "EN" : "বাং"}
            </Link>
            <span>
              {c.page} {pad(pageNumbers[route])}
            </span>
          </span>
        </div>
        <nav className="ed-contents ed-kicker" aria-label={c.contents}>
          {navItems.map(([to, key, page]) => (
            <Link key={to} href={href(to)} aria-current={path === to || (to === "/admission" && route === "success") ? "page" : undefined}>
              <span>{pad(page)}</span>
              {c.nav[key]}
            </Link>
          ))}
        </nav>
      </header>

      <main className="ed-page" key={path}>
        {pages[route]}
      </main>

      <footer className="ed-page">
        <div className="ed-footer ed-grid12">
          <p className="ed-serif ed-h3" style={{ gridColumn: "1 / span 4" }}>
            {site.name[locale]}
          </p>
          <p style={{ gridColumn: "5 / span 4" }}>
            {site.contact.address[locale]}
            <br />
            {tFooter("hours")}
          </p>
          <p style={{ gridColumn: "9 / span 4" }}>
            <a href={`tel:${site.contact.phone}`}>{site.contact.phone}</a>
            <br />
            <a href={`mailto:${site.contact.email}`}>{site.contact.email}</a>
            <br />
            <span className="ed-mute">
              © {site.name[locale]} · {tFooter("rights")}
            </span>
          </p>
        </div>
      </footer>

      {grid && (
        <div className="ed-gridlines" aria-hidden="true">
          <div className="ed-grid12">
            {Array.from({ length: 12 }, (_, i) => (
              <i key={i} />
            ))}
          </div>
        </div>
      )}
      <div key={`wipe-${path}`} className="ed-wipe" aria-hidden="true" />
    </div>
  );
}

/* ---------- Type effects ---------- */

/**
 * Variable-font headline: every letter's weight follows the cursor (heavier
 * as it gets closer) on top of a base weight that grows as you scroll.
 */
function LiveHeadline({ text, locale, as: Tag = "h1", className }: { text: string; locale: string; as?: "h1" | "h2"; className: string }) {
  const ref = useRef<HTMLHeadingElement>(null);
  const parts = graphemes(text, locale);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const letters = Array.from(el.querySelectorAll<HTMLSpanElement>("[data-l]"));
    if (prefersReducedMotion()) {
      letters.forEach((l) => l.style.setProperty("--w", "420"));
      return;
    }
    let mx = -9999;
    let my = -9999;
    let frame = 0;
    const update = () => {
      frame = 0;
      const base = 260 + Math.min(340, window.scrollY * 0.5);
      for (const letter of letters) {
        const r = letter.getBoundingClientRect();
        const d = Math.hypot(r.left + r.width / 2 - mx, r.top + r.height / 2 - my);
        const near = Math.max(0, 1 - d / 280);
        letter.style.setProperty("--w", String(Math.round(base + near * (900 - base))));
        letter.style.setProperty("--soft", String(Math.round(near * 100)));
      }
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const onMove = (e: PointerEvent) => {
      mx = e.clientX;
      my = e.clientY;
      schedule();
    };
    update();
    window.addEventListener("pointermove", onMove);
    window.addEventListener("scroll", schedule, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", schedule);
      cancelAnimationFrame(frame);
    };
  }, [text]);

  return (
    <Tag ref={ref} className={`ed-live ${className}`} aria-label={text}>
      {parts.map((ch, i) => (
        <span key={i} data-l="" aria-hidden="true">
          {ch === " " ? " " : ch}
        </span>
      ))}
    </Tag>
  );
}

/** Words rise from behind masks, one after another, when the block enters view. */
function Reveal({ text, as: Tag = "h2", className }: { text: string; as?: "h1" | "h2" | "h3" | "p"; className?: string }) {
  const [ref, inView] = useInView<HTMLHeadingElement>();
  return (
    <Tag ref={ref} className={`${className ?? ""}${inView ? " ed-revealed" : ""}`} aria-label={text}>
      {text.split(" ").map((word, i) => (
        <span key={i} className="ed-mask" aria-hidden="true" style={{ "--i": i } as React.CSSProperties}>
          <span>{word}</span>
          {" "}
        </span>
      ))}
    </Tag>
  );
}

/** Colour plate that unmasks with a clip-path wipe (stands in for photography). */
function Plate({ label, tone, caption, figure }: { label: string; tone: (typeof tones)[number]; caption: string; figure: string }) {
  const [ref, inView] = useInView<HTMLDivElement>();
  return (
    <figure style={{ margin: 0 }}>
      <div ref={ref} className={`ed-plate${inView ? " ed-in" : ""}`} data-tone={tone} aria-hidden="true">
        <span>{label}</span>
      </div>
      <figcaption className="ed-figcap">
        <span>{figure}</span>
        <span>{caption}</span>
      </figcaption>
    </figure>
  );
}

function Marquee({ words }: { words: readonly string[] }) {
  const items = [...words, ...words];
  return (
    <div className="ed-marquee" aria-hidden="true">
      <div>
        {items.map((w, i) => (
          <span key={i}>{w}</span>
        ))}
      </div>
    </div>
  );
}

function Spread({ course, index, ctx }: { course: Course; index: number; ctx: Ctx }) {
  const t = useTranslations("course");
  const tLevels = useTranslations("levels");
  const { locale, c, nf } = ctx;
  const quote = testimonials[index % testimonials.length];
  const label = course.level === "admission" ? (locale === "bn" ? "ভর্তি" : "Adm.") : course.level.toUpperCase();
  return (
    <article className={`ed-section ed-grid12 ed-spread${index % 2 ? " ed-spread--flip" : ""}`} aria-labelledby={`ed-${course.id}`}>
      <div className="ed-plate-col">
        <Plate label={label} tone={tones[index % tones.length]} figure={`${c.fig} ${nf(index + 1)}`} caption={tLevels(course.level)} />
      </div>
      <div className="ed-text-col">
        <p className="ed-kicker ed-accent">
          {c.feature} · {tLevels(course.level)}
        </p>
        <Reveal as="h3" text={course.name[locale]} className="ed-h2" />
        <p className="ed-kicker ed-mute" style={{ marginTop: 14 }}>
          {c.byline}
        </p>
        <div className="ed-cols" style={{ marginTop: 22 }}>
          <p className="ed-dropcap">
            {course.description[locale]} {c.subjectsSentence(course.subjects[locale].join(", "))}
          </p>
          <p style={{ marginTop: 12 }}>
            <strong>{c.batches}.</strong>{" "}
            {course.batches.map((b) => `${b.label[locale]} (${b.schedule[locale]})`).join("; ")}.
          </p>
        </div>
        <blockquote className="ed-pull">“{quote.quote[locale]}”</blockquote>
        <dl className="ed-facts">
          <div>
            <dt className="ed-kicker ed-mute">{c.monthly}</dt>
            <dd>{t("fee", { amount: course.monthlyFee })}</dd>
          </div>
          <div>
            <dt className="ed-kicker ed-mute">{c.admission}</dt>
            <dd>{t("fee", { amount: course.admissionFee })}</dd>
          </div>
          <div>
            <dt className="ed-kicker ed-mute">{c.seats}</dt>
            <dd className={course.seatsLeft <= 5 ? "ed-accent" : undefined}>{nf(course.seatsLeft)}</dd>
          </div>
        </dl>
        <p className="ed-mute" style={{ marginTop: 10 }}>
          {c.duration}: {course.duration[locale]}
        </p>
        <Link href={ctx.href(`/admission?course=${course.id}`)} className="ed-link">
          {c.enrol} <span aria-hidden="true">→</span>
        </Link>
      </div>
    </article>
  );
}

function DemoNote() {
  const t = useTranslations("demo");
  if (!site.demo.enabled) return null;
  return (
    <div className="ed-demo" role="note">
      <strong>{t("bannerTitle")}</strong>
      {t("bannerText")}
    </div>
  );
}

const formClasses: FormClasses = {
  field: "ed-field",
  label: "ed-label",
  input: "ed-input",
  hint: "ed-hint",
  error: "ed-error",
  alert: "ed-alert",
  ok: "ed-ok",
  legend: "ed-label",
  radio: "ed-radio",
  submit: "ed-submit",
  demo: "ed-demo-btn ed-kicker",
};

/* ---------- Pages ---------- */

function Cover(ctx: Ctx) {
  const { locale, c } = ctx;
  const t = useTranslations("home");
  const tDemo = useTranslations("demo");
  const subjects = [...new Set(courses.flatMap((course) => course.subjects[locale]))];
  return (
    <>
      <section style={{ paddingTop: "clamp(28px, 6vw, 80px)" }}>
        <p className="ed-kicker ed-accent">{t("eyebrow")}</p>
        <LiveHeadline text={site.name[locale]} locale={locale} className="ed-display ed-bleed" />
        <div className="ed-grid12" style={{ marginTop: 28, rowGap: 24 }}>
          <div style={{ gridColumn: "span 12" }}>
            <Reveal as="h2" text={t("title")} className="ed-h2" />
          </div>
          <p style={{ gridColumn: "span 12", maxWidth: 560 }}>{t("subtitle")}</p>
          <div style={{ gridColumn: "span 12" }}>
            <Link href={ctx.href("/admission")} className="ed-link">
              {c.enrol} <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </section>

      {site.demo.enabled && (
        <div className="ed-demo" style={{ marginTop: 48 }}>
          {tDemo("stripText")}{" "}
          <Link href={ctx.href("/admission")} style={{ textDecoration: "underline" }}>
            {tDemo("stripCta")} →
          </Link>
        </div>
      )}

      <Marquee words={c.marquee} />

      <section className="ed-section ed-grid12" aria-labelledby="ed-toc">
        <h2 id="ed-toc" className="ed-kicker" style={{ gridColumn: "1 / -1" }}>
          {c.inThisIssue}
        </h2>
        {(
          [
            [t("cardPoints.batch"), `${ctx.nf(site.stats.batchMax)}`],
            [t("cardPoints.report"), "12×"],
            [t("highlights.students"), `${ctx.nf(site.stats.students)}+`],
            [t("highlights.gpa5"), `${ctx.nf(site.stats.gpa5)}+`],
          ] as const
        ).map(([label, value]) => (
          <div key={label} style={{ gridColumn: "span 3", borderTop: "1px solid var(--ed-ink)", paddingTop: 10, marginTop: 16, minWidth: 0 }}>
            <p className="ed-serif" style={{ fontSize: "clamp(40px, 6vw, 96px)", lineHeight: 1, fontVariationSettings: '"wght" 250' }}>
              {value}
            </p>
            <p className="ed-mute" style={{ marginTop: 6 }}>
              {label}
            </p>
          </div>
        ))}
      </section>

      {courses
        .filter((course) => course.featured)
        .map((course, i) => (
          <Spread key={course.id} course={course} index={i} ctx={ctx} />
        ))}

      <Marquee words={subjects} />

      <section className="ed-section" aria-labelledby="ed-letters">
        <h2 id="ed-letters" className="ed-kicker">
          {c.letters}
        </h2>
        <Reveal text={t("testimonialsTitle")} className="ed-h1" />
        <div className="ed-letters" style={{ marginTop: 40 }}>
          {testimonials.map((item) => (
            <figure key={item.id} className="ed-letter" style={{ margin: 0 }}>
              <blockquote>{item.quote[locale]}</blockquote>
              <figcaption className="ed-kicker ed-mute" style={{ marginTop: 16 }}>
                {item.name[locale]} — {item.role[locale]}
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="ed-section ed-grid12" aria-labelledby="ed-interview">
        <div style={{ gridColumn: "1 / span 4" }}>
          <h2 id="ed-interview" className="ed-kicker ed-accent">
            {c.interview}
          </h2>
          <Reveal as="p" text={t("faqTitle")} className="ed-h2" />
        </div>
        <dl className="ed-qa" style={{ gridColumn: "6 / span 7", margin: 0 }}>
          {faqs.map((faq) => (
            <div key={faq.id}>
              <dt>
                <b>{c.q}</b>
                {faq.question[locale]}
              </dt>
              <dd>
                <b>{c.a}</b>
                {faq.answer[locale]}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="ed-section">
        <Reveal text={t("ctaTitle")} className="ed-h1" />
        <p style={{ marginTop: 18, maxWidth: 560 }}>{t("ctaText")}</p>
        <Link href={ctx.href("/admission")} className="ed-link">
          {c.enrol} <span aria-hidden="true">→</span>
        </Link>
      </section>
    </>
  );
}

function Courses(ctx: Ctx) {
  const { locale } = ctx;
  const t = useTranslations("coursesPage");
  return (
    <>
      <section style={{ paddingTop: "clamp(28px, 6vw, 80px)" }}>
        <LiveHeadline text={t("title")} locale={locale} className="ed-display ed-bleed" />
        <p style={{ marginTop: 24, maxWidth: 620 }}>{t("intro")}</p>
      </section>
      <Marquee words={ctx.c.marquee} />
      {courses.map((course, i) => (
        <Spread key={course.id} course={course} index={i} ctx={ctx} />
      ))}
    </>
  );
}

function Contributors(ctx: Ctx) {
  const { locale, c, nf } = ctx;
  const t = useTranslations("teachersPage");
  return (
    <>
      <section style={{ paddingTop: "clamp(28px, 6vw, 80px)" }}>
        <LiveHeadline text={c.contributors} locale={locale} className="ed-display ed-bleed" />
        <p style={{ marginTop: 24, maxWidth: 620 }}>{t("intro")}</p>
      </section>
      <div className="ed-section ed-grid12" style={{ rowGap: 0 }}>
        {teachers.map((teacher, i) => (
          <article key={teacher.id} className="ed-contrib" style={{ gridColumn: "span 6", minWidth: 0 }}>
            <p className="ed-kicker ed-mute">
              {nf(i + 1).padStart(2, nf(0))} · {teacher.subject[locale]}
            </p>
            <h2 className="ed-h3" style={{ marginTop: 6 }}>
              {teacher.name[locale]}
            </h2>
            <p className="ed-mute" style={{ marginTop: 6 }}>
              {teacher.qualification[locale]} · {t("experience", { years: teacher.experienceYears })}
            </p>
            <p className="ed-serif" style={{ marginTop: 10, fontStyle: "italic", fontSize: "1.15em" }}>
              “{teacher.bio[locale]}”
            </p>
          </article>
        ))}
      </div>
    </>
  );
}

function Enrolment(ctx: Ctx) {
  const { locale, c } = ctx;
  const t = useTranslations("admissionPage");
  const tCourse = useTranslations("course");
  const accountType = site.payments.bkashAccountType;
  const steps = ["open", "send", "copy", "fill"] as const;
  return (
    <>
      <section style={{ paddingTop: "clamp(28px, 6vw, 80px)" }}>
        <LiveHeadline text={c.nav.admission} locale={locale} className="ed-display ed-bleed" />
        <p style={{ marginTop: 24, maxWidth: 620 }}>{t("intro")}</p>
      </section>
      <div className="ed-section ed-grid12" style={{ rowGap: 48 }}>
        <section style={{ gridColumn: "span 12", minWidth: 0 }} className="ed-form-col" aria-labelledby="ed-form-title">
          <h2 id="ed-form-title" className="ed-h2">
            {t("formTitle")}
          </h2>
          <ThemedAdmissionForm
            locale={locale}
            cls={formClasses}
            idPrefix="ed-"
            initialCourseId={ctx.searchParams.get("course") ?? undefined}
            demoLabel={`↳ ${c.autofill}`}
            submitLabel={`${c.enrol} →`}
          />
        </section>
        <aside style={{ gridColumn: "span 12", minWidth: 0 }} className="ed-aside-col">
          <DemoNote />
          <h2 className="ed-kicker" style={{ marginTop: 24 }}>
            {t("howToPay")}
          </h2>
          <ol className="ed-qa" style={{ paddingLeft: 22 }}>
            {steps.map((step) => (
              <li key={step} style={{ marginTop: 8 }}>
                {step === "open" ? t("steps.open", { action: accountType === "merchant" ? t("payment") : t("sendMoney") }) : t(`steps.${step}`)}
              </li>
            ))}
          </ol>
          <p className="ed-kicker ed-mute" style={{ marginTop: 22 }}>
            {t("payTo")} · {t("accountType", { type: accountType })}
          </p>
          <p className="ed-serif ed-h2 ed-accent">{site.payments.bkashNumber}</p>
          <table style={{ width: "100%", marginTop: 28, borderCollapse: "collapse" }}>
            <caption className="ed-kicker" style={{ textAlign: "left", paddingBottom: 8 }}>
              {t("feesTitle")}
            </caption>
            <tbody>
              {courses.map((course) => (
                <tr key={course.id} style={{ borderTop: "1px solid var(--ed-rule)" }}>
                  <th scope="row" style={{ textAlign: "left", fontWeight: 400, padding: "8px 0" }}>
                    {course.name[locale]}
                  </th>
                  <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{tCourse("fee", { amount: course.admissionFee })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </aside>
      </div>
    </>
  );
}

function Thanks(ctx: Ctx) {
  const { locale, c } = ctx;
  const t = useTranslations("success");
  const tDemo = useTranslations("demo");
  const ref = ctx.searchParams.get("ref");
  const valid = ref && REF_PATTERN.test(ref) ? ref : null;
  const extras = ["admin", "cms", "login", "gateway", "sms"] as const;
  return (
    <>
      <section style={{ paddingTop: "clamp(28px, 6vw, 80px)" }}>
        <LiveHeadline text={c.thanks} locale={locale} className="ed-display ed-bleed" />
        <p style={{ marginTop: 24, maxWidth: 620 }}>{t("intro")}</p>
      </section>
      <section className="ed-section ed-grid12">
        <div style={{ gridColumn: "1 / -1", borderTop: "2px solid var(--ed-ink)", paddingTop: 14 }}>
          <p className="ed-kicker ed-mute">{t("refLabel")}</p>
          <p className="ed-serif ed-h1 ed-accent" style={{ marginTop: 8, wordBreak: "break-all" }}>
            {valid ?? "—"}
          </p>
          <p style={{ marginTop: 10 }}>{valid ? t("refHint") : t("noRef")}</p>
        </div>
        <div style={{ gridColumn: "1 / -1", marginTop: 48 }}>
          <h2 className="ed-kicker">{t("nextTitle")}</h2>
          <ol className="ed-qa" style={{ paddingLeft: 22 }}>
            {(["verify", "call", "start"] as const).map((k) => (
              <li key={k} style={{ marginTop: 8 }}>
                {t(`next.${k}`)}
              </li>
            ))}
          </ol>
        </div>
      </section>
      {site.demo.enabled && (
        <div className="ed-demo ed-section">
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
            <a href={site.demo.hireUrl} target="_blank" rel="noopener" style={{ display: "inline-block", marginTop: 10, padding: "8px 18px", background: "#fafafa", color: "#18181b", fontWeight: 700 }}>
              {tDemo("cta")}
            </a>
          )}
        </div>
      )}
      <Link href={ctx.href("/")} className="ed-link">
        ← {c.back}
      </Link>
    </>
  );
}

function Letters(ctx: Ctx) {
  const { locale, c } = ctx;
  const t = useTranslations("contactPage");
  const tFooter = useTranslations("footer");
  const tForm = useTranslations("contactForm");
  return (
    <>
      <section style={{ paddingTop: "clamp(28px, 6vw, 80px)" }}>
        <LiveHeadline text={c.nav.contact} locale={locale} className="ed-display ed-bleed" />
        <p style={{ marginTop: 24, maxWidth: 620 }}>{t("intro")}</p>
      </section>
      <div className="ed-section ed-grid12" style={{ rowGap: 48 }}>
        <section className="ed-form-col" style={{ gridColumn: "span 12", minWidth: 0 }} aria-labelledby="ed-contact-title">
          <h2 id="ed-contact-title" className="ed-h2">
            {tForm("title")}
          </h2>
          <ThemedContactForm locale={locale} cls={formClasses} idPrefix="ed-contact-" submitLabel={`${tForm("submit")} →`} />
        </section>
        <aside className="ed-aside-col" style={{ gridColumn: "span 12", minWidth: 0 }}>
          <dl className="ed-qa" style={{ margin: 0 }}>
            {[
              [t("address"), site.contact.address[locale]],
              [t("phone"), site.contact.phone],
              [t("email"), site.contact.email],
              [t("hours"), tFooter("hours")],
            ].map(([label, value]) => (
              <div key={label} style={{ borderTop: "1px solid var(--ed-rule)", paddingTop: 10, marginTop: 14 }}>
                <dt className="ed-kicker" style={{ margin: 0, fontFamily: "var(--ed-sans)" }}>
                  {label}
                </dt>
                <dd className="ed-serif" style={{ fontSize: "1.3em" }}>
                  {value}
                </dd>
              </div>
            ))}
          </dl>
          <div style={{ marginTop: 28, filter: "grayscale(1)" }}>
            <MapFacade query={site.contact.mapQuery} title={t("mapTitle")} label={t("loadMap")} note={t("mapNote")} />
          </div>
        </aside>
      </div>
    </>
  );
}

function Erratum(ctx: Ctx) {
  const { locale, c } = ctx;
  return (
    <section style={{ paddingTop: "clamp(28px, 6vw, 80px)", minHeight: "60vh" }}>
      <p className="ed-kicker ed-accent">404</p>
      <LiveHeadline text={c.erratum} locale={locale} className="ed-display ed-bleed" />
      <p style={{ marginTop: 24, maxWidth: 560 }}>{c.erratumText}</p>
      <Link href={ctx.href("/")} className="ed-link">
        ← {c.back}
      </Link>
    </section>
  );
}
