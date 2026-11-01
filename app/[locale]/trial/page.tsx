import { Suspense } from "react";
import { locale as rootLocale } from "next/root-params";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import { site } from "@/config/site";
import { courses, levels } from "@/content/courses";
import type { Locale } from "@/i18n/routing";
import { pickMessages } from "@/lib/messages";
import { pageMetadata } from "@/lib/seo";
import { PageHeader } from "@/components/page-header";
import { TrialForm, TrialFormFromUrl, type TrialCourse } from "@/components/trial/trial-form";
import { container } from "@/components/ui";

export const generateMetadata = () => pageMetadata("trial");

export default async function TrialPage() {
  const locale = (await rootLocale()) as Locale;
  const t = await getTranslations("trial");
  const messages = await pickMessages(["trial", "form", "errors", "levels", "demo"] as const);

  const trialCourses: TrialCourse[] = courses.map((course) => ({
    id: course.id,
    level: course.level,
    name: course.name[locale],
    batches: course.batches.map((b) => ({ id: b.id, label: b.label[locale], slot: b.slot })),
  }));
  const formProps = {
    courses: trialCourses,
    levels,
    turnstileSiteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "",
    demo: site.demo.enabled,
    location: `${site.name[locale]}, ${site.contact.address[locale]}`,
  };

  return (
    <>
      <PageHeader title={t("title")} intro={t("intro")} />
      <div className={`${container} max-w-3xl py-10`}>
        <NextIntlClientProvider messages={messages}>
          {/* Same form as the fallback, so there's no layout shift once ?course= is read. */}
          <Suspense fallback={<TrialForm {...formProps} />}>
            <TrialFormFromUrl {...formProps} />
          </Suspense>
        </NextIntlClientProvider>
      </div>
    </>
  );
}
