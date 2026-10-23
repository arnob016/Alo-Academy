import { useLocale, useTranslations } from "next-intl";
import { site } from "@/config/site";
import { courses, levels } from "@/content/courses";
import { pageMetadata } from "@/lib/seo";
import { CourseCard } from "@/components/course-card";
import { JsonLd } from "@/components/json-ld";
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
      </div>
    </>
  );
}
