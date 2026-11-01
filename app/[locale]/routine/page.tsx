import { locale as rootLocale } from "next/root-params";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import { site } from "@/config/site";
import { courses } from "@/content/courses";
import type { Locale } from "@/i18n/routing";
import { pickMessages } from "@/lib/messages";
import { pageMetadata } from "@/lib/seo";
import { PageHeader } from "@/components/page-header";
import { RoutineBoard, type RoutineBatch } from "@/components/routine/routine-board";
import { container } from "@/components/ui";

export const generateMetadata = () => pageMetadata("routine");

export default async function RoutinePage() {
  const locale = (await rootLocale()) as Locale;
  const t = await getTranslations("routine");
  const messages = await pickMessages(["routine"] as const);

  const batches: RoutineBatch[] = courses.flatMap((course) =>
    course.batches.map((batch) => ({
      key: `${course.id}:${batch.id}`,
      courseId: course.id,
      courseName: course.name[locale],
      level: course.level,
      batchLabel: batch.label[locale],
      slot: batch.slot,
      subjects: course.subjects[locale],
    })),
  );

  return (
    <>
      <PageHeader title={t("title")} intro={t("intro")} />
      <div className={`${container} py-10`}>
        <NextIntlClientProvider messages={messages}>
          <RoutineBoard batches={batches} location={`${site.name[locale]}, ${site.contact.address[locale]}`} />
        </NextIntlClientProvider>
      </div>
    </>
  );
}
