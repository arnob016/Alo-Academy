import { locale as rootLocale } from "next/root-params";
import { NextIntlClientProvider, useLocale, useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { pickMessages } from "@/lib/messages";
import { FeeCalculator } from "@/components/fee-calculator";
import { site } from "@/config/site";
import { courses, levels } from "@/content/courses";
import { pageMetadata } from "@/lib/seo";
import { CourseCard } from "@/components/course-card";
import { JsonLd } from "@/components/json-ld";
import { Link, localeHref } from "@/components/locale-link";
import { PageHeader, SectionHeading } from "@/components/page-header";
import { container } from "@/components/ui";

export const generateMetadata = () => pageMetadata("courses");

export default function CoursesPage() {
  const locale = useLocale();
  const t = useTranslations("coursesPage");
  const tLevels = useTranslations("levels");

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": courses.map((course) => ({
            "@type": "Course",
            name: course.name[locale],
            description: course.description[locale],
            inLanguage: locale,
            provider: {
              "@type": "EducationalOrganization",
              name: site.name[locale],
              sameAs: `${site.url}/${locale}`,
            },
            offers: {
              "@type": "Offer",
              category: "Paid",
              price: course.monthlyFee,
              priceCurrency: "BDT",
            },
            hasCourseInstance: course.batches.map((batch) => ({
              "@type": "CourseInstance",
              name: batch.label[locale],
              courseMode: "Onsite",
              description: batch.schedule[locale],
            })),
          })),
        }}
      />

      <PageHeader title={t("title")} intro={t("intro")} />

      <div className={`${container} space-y-14 py-12`}>
        <Link
          href="/routine"
          className="inline-flex items-center gap-2 rounded-lg border border-brand/20 bg-white px-4 py-3 font-semibold text-brand hover:border-brand/50"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M3 10h18M8 3v4M16 3v4" />
          </svg>
          {t("routineLink")} →
        </Link>
        {levels.map((level) => (
          <section key={level} aria-labelledby={`level-${level}`}>
            <SectionHeading id={`level-${level}`} title={tLevels(level)} />
            <div className="mt-6 grid gap-6 md:grid-cols-2">
              {courses
                .filter((course) => course.level === level)
                .map((course) => (
                  <CourseCard key={course.id} course={course} showLevel={false} />
                ))}
            </div>
          </section>
        ))}

        <FeeCalculatorSection />
      </div>
    </>
  );
}

async function FeeCalculatorSection() {
  const locale = (await rootLocale()) as Locale;
  const t = await getTranslations("fees");
  const messages = await pickMessages(["fees"] as const);

  return (
    <section aria-labelledby="fee-calculator">
      <SectionHeading id="fee-calculator" title={t("title")} subtitle={t("intro")} />
      <div className="mt-6">
        <NextIntlClientProvider messages={messages}>
          <FeeCalculator
            courses={courses.map((c) => ({
              id: c.id,
              name: c.name[locale],
              monthlyFee: c.monthlyFee,
              admissionFee: c.admissionFee,
              durationMonths: c.durationMonths,
            }))}
            advance={site.discounts.advance}
            siblingPercent={site.discounts.sibling}
            admissionHref={localeHref(locale, "/admission")}
          />
        </NextIntlClientProvider>
      </div>
    </section>
  );
}
