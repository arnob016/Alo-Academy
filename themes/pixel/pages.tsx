"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import { site } from "@/config/site";
import { courses, levels, type Course } from "@/content/courses";
import { teachers, type Teacher } from "@/content/teachers";
import { testimonials } from "@/content/testimonials";
import { faqs } from "@/content/faq";
import { REF_PATTERN } from "@/lib/ref";
import { MapFacade } from "@/components/map-facade";
import type { PixelCopy } from "./copy";
import { PixelAdmissionForm, PixelContactForm } from "./forms";
import { Hero, Portrait } from "./sprites";
import { Dialogue, StatBar, useInView, useStaggerIn } from "./ui";

export type PageProps = {
  locale: Locale;
  c: PixelCopy;
  href: (path: string) => string;
  nf: (n: number) => string;
  secret: boolean;
  searchParams: URLSearchParams;
};

/* ---------- Shared pieces ---------- */

function QuestCard({ course, full = false, ...p }: PageProps & { course: Course; full?: boolean }) {
  const t = useTranslations("course");
  const { locale, c } = p;
  const rarity = p.secret ? "legendary" : c.rarityByLevel[course.level];
  const taken = course.seatsTotal - course.seatsLeft;

  return (
    <article className="pq-panel pq-quest" data-rarity={rarity}>
      <span className="pq-rarity pq-label">★ {c.rarity[rarity]}</span>
      <h3 className="pq-h3" style={{ marginTop: 12 }}>
        {course.name[locale]}
      </h3>
      <p className="pq-muted" style={{ marginTop: 6 }}>
        {course.description[locale]}
      </p>
      <dl className="pq-kv">
        <dt>{c.upkeep}</dt>
        <dd>{t("fee", { amount: course.monthlyFee })}</dd>
        <dt>{c.entry}</dt>
        <dd>{t("fee", { amount: course.admissionFee })}</dd>
        {full && (
          <>
            <dt>{c.questLength}</dt>
            <dd>{course.duration[locale]}</dd>
          </>
        )}
      </dl>
      {full && (
        <>
          <p className="pq-label">{c.skills}</p>
          <ul className="pq-tags">
            {course.subjects[locale].map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
          <p className="pq-label" style={{ marginTop: 14 }}>
            {c.parties}
          </p>
          <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
            {course.batches.map((b) => (
              <li key={b.id}>
                {b.label[locale]} — <span className="pq-muted">{b.schedule[locale]}</span>
              </li>
            ))}
          </ul>
        </>
      )}
      <p style={{ marginTop: 14 }}>{c.slotsLeft(p.nf(course.seatsLeft))}</p>
      <div className="pq-slots" aria-hidden="true">
        {Array.from({ length: course.seatsTotal }, (_, i) => (
          <i key={i} className={i < taken ? "pq-taken" : undefined} />
        ))}
      </div>
      <div style={{ marginTop: "auto", paddingTop: 16 }}>
        <Link className="pq-btn pq-btn--green" href={p.href(`/admission?course=${course.id}`)}>
          ▶ {c.accept}
        </Link>
      </div>
    </article>
  );
}

function PartyCard({ teacher, full = false, headingLevel = 3, ...p }: PageProps & { teacher: Teacher; full?: boolean; headingLevel?: 2 | 3 }) {
  const { locale, c } = p;
  const Heading = `h${headingLevel}` as const;
  return (
    <article className="pq-panel pq-party">
      <Portrait seed={teacher.id} />
      <Heading className="pq-h3">{teacher.name[locale]}</Heading>
      <p style={{ color: "var(--pq-red)" }}>{teacher.subject[locale]}</p>
      <p className="pq-muted">{teacher.qualification[locale]}</p>
      <StatBar
        label={`${c.level} ${p.nf(teacher.experienceYears)}`}
        value={Math.min(100, teacher.experienceYears * 7)}
        valueText={`${p.nf(teacher.experienceYears)} XP`}
        variant="xp"
      />
      {full && <p style={{ marginTop: 12, textAlign: "left" }}>“{teacher.bio[locale]}”</p>}
    </article>
  );
}

function Staggered({ className, selector, children }: { className: string; selector: string; children: React.ReactNode }) {
  const [ref, inView] = useInView<HTMLDivElement>();
  useStaggerIn(ref, selector, inView);
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

function SectionHead({ id, title, link }: { id: string; title: string; link?: React.ReactNode }) {
  return (
    <div className="pq-section-head">
      <h2 id={id} className="pq-h2">
        {title}
      </h2>
      {link}
    </div>
  );
}

function PageTitle({ title, intro }: { title: string; intro?: string }) {
  return (
    <header style={{ marginTop: 12 }}>
      <h1 className="pq-h1">{title}</h1>
      {intro && (
        <p className="pq-muted" style={{ marginTop: 14, maxWidth: 720 }}>
          {intro}
        </p>
      )}
    </header>
  );
}

function DemoNote() {
  const t = useTranslations("demo");
  if (!site.demo.enabled) return null;
  return (
    <div className="pq-demo" role="note">
      <strong>⚠ {t("bannerTitle")}</strong>
      <p style={{ marginTop: 6 }}>{t("bannerText")}</p>
    </div>
  );
}

/* ---------- Pages ---------- */

export function HomePage(p: PageProps) {
  const { locale, c } = p;
  const t = useTranslations("home");
  const tDemo = useTranslations("demo");
  const points = ["batch", "report", "tests", "bkash"] as const;
  const [openFaq, setOpenFaq] = useState<string | null>(faqs[0].id);

  return (
    <>
      <section className="pq-hero" aria-labelledby="pq-home-title">
        <div>
          <span className="pq-eyebrow pq-label">{t("eyebrow")}</span>
          <h1 id="pq-home-title" className="pq-h1" style={{ marginTop: 18 }}>
            {t("title")}
          </h1>
        </div>
        <Dialogue speaker={c.elder} text={`${t("subtitle")}\n${c.heroHint}`} locale={locale} skipHint={c.skipHint} />
        <div>
          <Link className="pq-btn" href={p.href("/courses")}>
            <span className="pq-cursor">▶</span>
            {c.startQuest}
          </Link>
          <Link className="pq-btn pq-btn--alt" href={p.href("/admission")}>
            {c.enroll}
          </Link>
        </div>
      </section>

      <section className="pq-section" aria-labelledby="pq-stats">
        <SectionHead id="pq-stats" title={c.statsTitle} />
        <div className="pq-frame pq-stats">
          <div className="pq-portrait">
            <Hero />
          </div>
          <div>
            <p className="pq-h3" style={{ color: "var(--pq-yellow)" }}>
              {c.level} {p.nf(site.stats.years)} · {c.guildClass}
            </p>
            <dl style={{ margin: "10px 0 0" }}>
              {[
                [c.exp, `${p.nf(site.stats.students)}+`],
                [c.trophies, `${p.nf(site.stats.gpa5)}+`],
                [c.partyMax, p.nf(site.stats.batchMax)],
              ].map(([label, value]) => (
                <div key={label} className="pq-statline">
                  <dt>{label}</dt>
                  <dd style={{ margin: 0, color: "var(--pq-yellow)" }}>{value}</dd>
                </div>
              ))}
            </dl>
            {points.map((point, i) => (
              <StatBar key={point} label={t(`cardPoints.${point}`)} value={c.statBars[point]} variant={i % 2 ? "mp" : "hp"} />
            ))}
          </div>
        </div>
      </section>

      {site.demo.enabled && (
        <div className="pq-section pq-demo">
          <p>{tDemo("stripText")}</p>
          <Link className="pq-btn" href={p.href("/admission")} style={{ marginTop: 12 }}>
            ▶ {tDemo("stripCta")}
          </Link>
        </div>
      )}

      <section className="pq-section" aria-labelledby="pq-featured">
        <SectionHead
          id="pq-featured"
          title={c.questBoard}
          link={
            <Link className="pq-link" href={p.href("/courses")}>
              {c.allQuests} →
            </Link>
          }
        />
        <Staggered className="pq-grid pq-grid-3" selector=".pq-quest">
          {courses
            .filter((course) => course.featured)
            .map((course) => (
              <QuestCard key={course.id} course={course} {...p} />
            ))}
        </Staggered>
      </section>

      <section className="pq-section" aria-labelledby="pq-guild">
        <SectionHead
          id="pq-guild"
          title={c.guild}
          link={
            <Link className="pq-link" href={p.href("/teachers")}>
              {c.allTeachers} →
            </Link>
          }
        />
        <Staggered className="pq-grid pq-grid-4" selector=".pq-party">
          {teachers
            .filter((teacher) => teacher.featured)
            .map((teacher) => (
              <PartyCard key={teacher.id} teacher={teacher} {...p} />
            ))}
        </Staggered>
      </section>

      <section className="pq-section" aria-labelledby="pq-villagers">
        <SectionHead id="pq-villagers" title={c.villagers} />
        <div className="pq-grid pq-grid-3" style={{ marginTop: 28 }}>
          {testimonials.map((item) => (
            <Dialogue key={item.id} speaker={item.name[locale]} text={item.quote[locale]} locale={locale} skipHint={c.skipHint}>
              <p className="pq-muted" style={{ marginTop: 8 }}>
                — {item.role[locale]}
              </p>
            </Dialogue>
          ))}
        </div>
      </section>

      <section className="pq-section" aria-labelledby="pq-faq">
        <SectionHead id="pq-faq" title={c.elderFaq} />
        <div className="pq-frame" style={{ marginTop: 28 }}>
          <span className="pq-speaker pq-label">{c.elder}</span>
          <ul className="pq-menu">
            {faqs.map((faq) => {
              const open = openFaq === faq.id;
              return (
                <li key={faq.id}>
                  <button type="button" aria-expanded={open} aria-controls={`pq-faq-${faq.id}`} onClick={() => setOpenFaq(open ? null : faq.id)}>
                    <span className="pq-cursor">▶</span>
                    {faq.question[locale]}
                  </button>
                  <p id={`pq-faq-${faq.id}`} className="pq-answer" hidden={!open}>
                    {faq.answer[locale]}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section className="pq-section pq-frame" style={{ textAlign: "center" }} aria-labelledby="pq-final">
        <h2 id="pq-final" className="pq-h2">
          {c.finalTitle}
        </h2>
        <p style={{ marginTop: 10 }}>{t("ctaText")}</p>
        <div style={{ marginTop: 14 }}>
          <Link className="pq-btn" href={p.href("/admission")}>
            <span className="pq-cursor">▶</span>
            {c.enroll}
          </Link>
          <a className="pq-btn pq-btn--ghost" href={`tel:${site.contact.phone}`}>
            {t("ctaCall", { phone: site.contact.phone })}
          </a>
        </div>
      </section>
    </>
  );
}

export function CoursesPage(p: PageProps) {
  const t = useTranslations("coursesPage");
  const tLevels = useTranslations("levels");
  const { c } = p;
  return (
    <>
      <PageTitle title={c.questBoard} intro={t("intro")} />
      <p style={{ marginTop: 16, display: "flex", flexWrap: "wrap", gap: 8 }}>
        {(["common", "rare", "legendary"] as const).map((r) => (
          <span key={r} className="pq-panel pq-quest pq-label" data-rarity={r} style={{ height: "auto", padding: "6px 10px" }}>
            ★ {c.rarity[r]}
          </span>
        ))}
      </p>
      {levels.map((level) => (
        <section key={level} className="pq-section" aria-labelledby={`pq-level-${level}`}>
          <SectionHead id={`pq-level-${level}`} title={tLevels(level)} />
          <Staggered className="pq-grid pq-grid-2" selector=".pq-quest">
            {courses
              .filter((course) => course.level === level)
              .map((course) => (
                <QuestCard key={course.id} course={course} full {...p} />
              ))}
          </Staggered>
        </section>
      ))}
    </>
  );
}

export function TeachersPage(p: PageProps) {
  const { c } = p;
  return (
    <>
      <PageTitle title={c.guild} intro={c.guildIntro} />
      <Staggered className="pq-grid pq-grid-3 pq-section" selector=".pq-party">
        {teachers.map((teacher) => (
          <PartyCard key={teacher.id} teacher={teacher} full headingLevel={2} {...p} />
        ))}
      </Staggered>
    </>
  );
}

export function AdmissionPage(p: PageProps) {
  const { locale, c } = p;
  const t = useTranslations("admissionPage");
  const tCourse = useTranslations("course");
  const accountType = site.payments.bkashAccountType;
  const steps = ["open", "send", "copy", "fill"] as const;
  const initialCourseId = p.searchParams.get("course") ?? undefined;

  return (
    <>
      <PageTitle title={c.character} intro={t("intro")} />
      <div className="pq-adm pq-section">
        <aside className="pq-adm-aside">
          <DemoNote />
          <div className="pq-frame" style={{ marginTop: 26 }}>
            <span className="pq-speaker pq-label">{c.questLog}</span>
            <h2 className="pq-sr">{t("howToPay")}</h2>
            <ol style={{ margin: "8px 0 0", paddingLeft: 22 }}>
              {steps.map((step) => (
                <li key={step} style={{ marginTop: 6 }}>
                  {step === "open"
                    ? t("steps.open", { action: accountType === "merchant" ? t("payment") : t("sendMoney") })
                    : t(`steps.${step}`)}
                </li>
              ))}
            </ol>
            <div className="pq-panel" style={{ marginTop: 16, background: "#ffd9e8" }}>
              <p className="pq-label">{t("payTo")}</p>
              <p className="pq-h2" style={{ color: "#a10d4f", marginTop: 6 }}>
                {site.payments.bkashNumber}
              </p>
              <p className="pq-muted">{t("accountType", { type: accountType })}</p>
            </div>
          </div>
        </aside>

        <section className="pq-adm-form pq-frame" aria-labelledby="pq-form-title">
          <h2 id="pq-form-title" className="pq-h2" style={{ marginBottom: 16 }}>
            {t("formTitle")}
          </h2>
          <PixelAdmissionForm locale={locale} c={c} initialCourseId={initialCourseId} />
        </section>

        <section className="pq-adm-shop pq-panel" aria-labelledby="pq-shop">
          <h2 id="pq-shop" className="pq-h3">
            {c.shop}
          </h2>
          <table className="pq-table" style={{ marginTop: 10 }}>
            <tbody>
              {courses.map((course) => (
                <tr key={course.id}>
                  <th scope="row">{course.name[locale]}</th>
                  <td>{tCourse("fee", { amount: course.admissionFee })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </>
  );
}

export function SuccessPage(p: PageProps) {
  const { c } = p;
  const t = useTranslations("success");
  const tDemo = useTranslations("demo");
  const ref = p.searchParams.get("ref");
  const validRef = ref && REF_PATTERN.test(ref) ? ref : null;
  const next = ["verify", "call", "start"] as const;
  const extras = ["admin", "cms", "login", "gateway", "sms"] as const;

  return (
    <>
      <PageTitle title={c.questAccepted} intro={t("intro")} />
      <div className="pq-frame pq-section" style={{ textAlign: "center" }}>
        {validRef ? (
          <>
            <p className="pq-label">{c.saveFile}</p>
            <p className="pq-h1" style={{ marginTop: 10, fontFamily: "var(--pq-head)", fontSize: "clamp(18px, 4vw, 30px)" }}>
              {validRef}
            </p>
            <p className="pq-muted" style={{ marginTop: 10 }}>
              {t("refHint")}
            </p>
          </>
        ) : (
          <p>{t("noRef")}</p>
        )}
      </div>

      <section className="pq-section" aria-labelledby="pq-next">
        <SectionHead id="pq-next" title={t("nextTitle")} />
        <ol style={{ paddingLeft: 24 }}>
          {next.map((key) => (
            <li key={key} style={{ marginTop: 6 }}>
              {t(`next.${key}`)}
            </li>
          ))}
        </ol>
      </section>

      {site.demo.enabled && (
        <section className="pq-section pq-demo" aria-labelledby="pq-hire">
          {site.demo.publicSheetUrl && (
            <p style={{ marginBottom: 14 }}>
              <a href={site.demo.publicSheetUrl} target="_blank" rel="noopener" style={{ color: "#fafafa" }}>
                {tDemo("seeRow")} ↗
              </a>{" "}
              <span style={{ opacity: 0.75 }}>{tDemo("seeRowHint")}</span>
            </p>
          )}
          <h2 id="pq-hire">
            <strong>{c.hire}</strong>
          </h2>
          <p style={{ marginTop: 8 }}>{tDemo("pitchText")}</p>
          <p style={{ marginTop: 12 }}>{tDemo("alsoTitle")}:</p>
          <ul style={{ paddingLeft: 22 }}>
            {extras.map((key) => (
              <li key={key}>{tDemo(`also.${key}`)}</li>
            ))}
          </ul>
          {site.demo.hireUrl && (
            <a className="pq-btn" href={site.demo.hireUrl} target="_blank" rel="noopener" style={{ marginTop: 14 }}>
              ▶ {tDemo("cta")}
            </a>
          )}
        </section>
      )}

      <p className="pq-section">
        <Link className="pq-btn pq-btn--ghost" href={p.href("/")}>
          ◀ {c.towns.home}
        </Link>
      </p>
    </>
  );
}

export function ContactPage(p: PageProps) {
  const { locale, c } = p;
  const t = useTranslations("contactPage");
  const tFooter = useTranslations("footer");
  const tForm = useTranslations("contactForm");
  const details = [
    { label: t("address"), value: site.contact.address[locale] },
    { label: t("phone"), value: site.contact.phone, href: `tel:${site.contact.phone}` },
    { label: t("email"), value: site.contact.email, href: `mailto:${site.contact.email}` },
    { label: t("hours"), value: tFooter("hours") },
  ];

  return (
    <>
      <PageTitle title={c.inn} />
      <div className="pq-section">
        <Dialogue speaker={c.innkeeper} text={t("intro")} locale={locale} skipHint={c.skipHint} />
      </div>
      <div className="pq-grid pq-grid-2 pq-section">
        <div>
          <dl className="pq-panel">
            {details.map((item) => (
              <div key={item.label} style={{ marginTop: 8 }}>
                <dt className="pq-label pq-muted">{item.label}</dt>
                <dd style={{ margin: 0 }}>{item.href ? <a href={item.href}>{item.value}</a> : item.value}</dd>
              </div>
            ))}
          </dl>
          <div className="pq-panel" style={{ marginTop: 22, padding: 8 }}>
            <MapFacade query={site.contact.mapQuery} title={t("mapTitle")} label={t("loadMap")} note={t("mapNote")} />
          </div>
        </div>
        <section className="pq-frame" aria-labelledby="pq-contact-title">
          <h2 id="pq-contact-title" className="pq-h2" style={{ marginBottom: 16 }}>
            {tForm("title")}
          </h2>
          <PixelContactForm locale={locale} c={c} />
        </section>
      </div>
    </>
  );
}

export function NotFoundPage(p: PageProps) {
  const { c } = p;
  return (
    <div className="pq-frame pq-section" style={{ textAlign: "center", padding: "48px 20px" }}>
      <h1 className="pq-h1" style={{ color: "var(--pq-red)", textShadow: "4px 4px 0 var(--pq-navy)" }}>
        {c.gameOver}
      </h1>
      <p style={{ marginTop: 16 }}>{c.gameOverText}</p>
      <Link className="pq-btn" href={p.href("/")} style={{ marginTop: 18 }}>
        <span className="pq-cursor">▶</span>
        {c.continue}
      </Link>
    </div>
  );
}
