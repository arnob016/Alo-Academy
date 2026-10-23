import { useFormatter, useLocale, useTranslations } from "next-intl";
import { Link } from "@/components/locale-link";
import { site } from "@/config/site";
import { courses } from "@/content/courses";
import { teachers } from "@/content/teachers";
import { testimonials } from "@/content/testimonials";
import { faqs } from "@/content/faq";
import { pageMetadata } from "@/lib/seo";
import { CourseCard } from "@/components/course-card";
import { TeacherCard } from "@/components/teacher-card";
import { TestimonialList } from "@/components/testimonial-list";
import { FaqList } from "@/components/faq-list";
import { JsonLd } from "@/components/json-ld";
import { SectionHeading } from "@/components/page-header";
import { TryDemoStrip } from "@/components/demo/demo-blocks";
import { HeroScene } from "@/components/hero-scene";
import { btnPrimary, btnSecondary, container } from "@/components/ui";

export const generateMetadata = () => pageMetadata("home");

export default function HomePage() {
  const locale = useLocale();
  const t = useTranslations("home");
  const tCommon = useTranslations("common");
  const format = useFormatter();

  const points = ["batch", "report", "tests", "bkash"] as const;
  const stats = [
    { key: "years", value: `${format.number(site.stats.years)}+` },
    { key: "students", value: `${format.number(site.stats.students)}+` },
    { key: "gpa5", value: `${format.number(site.stats.gpa5)}+` },
    { key: "batch", value: format.number(site.stats.batchMax) },
  ] as const;

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "EducationalOrganization",
          name: site.name[locale],
          alternateName: site.name[locale === "bn" ? "en" : "bn"],
          url: `${site.url}/${locale}`,
          telephone: site.contact.phone,
          email: site.contact.email,
          address: { "@type": "PostalAddress", ...site.contact.postal },
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqs.map((faq) => ({
            "@type": "Question",
            name: faq.question[locale],
            acceptedAnswer: { "@type": "Answer", text: faq.answer[locale] },
          })),
        }}
      />

      {/* Hero */}
      <section className="bg-gradient-to-br from-accent/25 via-surface to-surface">
        <div className={`${container} grid items-center gap-10 py-14 sm:py-20 lg:grid-cols-[1.2fr_1fr]`}>
          <div>
            <p className="inline-block rounded-full bg-brand/10 px-3 py-1 text-sm font-semibold text-brand">
              {t("eyebrow")}
            </p>
            <h1 className="mt-5 text-4xl font-semibold leading-tight text-brand sm:text-5xl">{t("title")}</h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink/80">{t("subtitle")}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/admission" className={btnPrimary}>
                {tCommon("admitNow")}
              </Link>
              <Link href="/courses" className={btnSecondary}>
                {tCommon("viewCourses")}
              </Link>
            </div>
          </div>

          <div>
            <HeroScene className="mx-auto block h-auto w-full max-w-md" />
            <div className="relative mt-3 rounded-2xl bg-brand p-7 text-white shadow-lg">
              <h2 className="text-xl font-semibold">{t("cardTitle")}</h2>
              <ul className="mt-5 space-y-4">
                {points.map((point) => (
                  <li key={point} className="flex gap-3">
                    <svg aria-hidden="true" viewBox="0 0 24 24" className="mt-0.5 size-6 shrink-0 text-accent" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12.5l4.5 4.5L19 7.5" />
                    </svg>
                    <span className="text-white/90">{t(`cardPoints.${point}`)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Highlights */}
      <section aria-label={t("highlights.label")} className="border-y border-brand/10 bg-white">
        <dl className={`${container} grid grid-cols-2 gap-6 py-8 md:grid-cols-4`}>
          {stats.map((stat) => (
            <div key={stat.key} className="flex flex-col text-center">
              <dt className="text-sm text-muted">{t(`highlights.${stat.key}`)}</dt>
              <dd className="order-first text-3xl font-semibold text-brand">{stat.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {site.demo.enabled && (
        <div className={`${container} pt-10`}>
          <TryDemoStrip />
        </div>
      )}

      {/* Featured courses */}
      <section aria-labelledby="featured-courses" className={`${container} py-16`}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionHeading id="featured-courses" title={t("featuredTitle")} subtitle={t("featuredSubtitle")} />
          <Link href="/courses" className="font-semibold text-brand underline-offset-4 hover:underline">
            {t("allCourses")} →
          </Link>
        </div>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {courses
            .filter((c) => c.featured)
            .map((course) => (
              <CourseCard key={course.id} course={course} compact />
            ))}
        </div>
      </section>

      {/* Teachers */}
      <section aria-labelledby="teachers-preview" className="bg-brand/5 py-16">
        <div className={container}>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <SectionHeading id="teachers-preview" title={t("teachersTitle")} subtitle={t("teachersSubtitle")} />
            <Link href="/teachers" className="font-semibold text-brand underline-offset-4 hover:underline">
              {t("allTeachers")} →
            </Link>
          </div>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {teachers
              .filter((teacher) => teacher.featured)
              .map((teacher) => (
                <TeacherCard key={teacher.id} teacher={teacher} compact />
              ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section aria-labelledby="testimonials" className={`${container} py-16`}>
        <SectionHeading id="testimonials" title={t("testimonialsTitle")} />
        <div className="mt-8">
          <TestimonialList testimonials={testimonials} />
        </div>
      </section>

      {/* FAQ */}
      <section aria-labelledby="faq" className={`${container} pb-16`}>
        <SectionHeading id="faq" title={t("faqTitle")} />
        <div className="mt-8 max-w-3xl">
          <FaqList faqs={faqs} />
        </div>
      </section>

      {/* Final CTA */}
      <section className={container}>
        <div className="rounded-2xl bg-brand px-6 py-10 text-center text-white sm:px-12">
          <h2 className="text-2xl font-semibold sm:text-3xl">{t("ctaTitle")}</h2>
          <p className="mx-auto mt-3 max-w-xl text-white/85">{t("ctaText")}</p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link href="/admission" className={btnPrimary}>
              {tCommon("admitNow")}
            </Link>
            <a
              href={`tel:${site.contact.phone}`}
              className="inline-flex items-center rounded-md border border-white/40 px-5 py-3 font-semibold text-white hover:bg-white/10"
            >
              {t("ctaCall", { phone: site.contact.phone })}
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
