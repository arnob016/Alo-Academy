import { Suspense } from "react";
import { locale as rootLocale } from "next/root-params";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import { site } from "@/config/site";
import { courseNames } from "@/content/courses";
import type { Locale } from "@/i18n/routing";
import { pickMessages } from "@/lib/messages";
import { pageMetadata } from "@/lib/seo";
import { PageHeader } from "@/components/page-header";
import { TrackForm, TrackFormFromUrl } from "@/components/track/track-form";
import { container } from "@/components/ui";

export const generateMetadata = () => pageMetadata("track");

export default async function TrackPage() {
  const locale = (await rootLocale()) as Locale;
  const t = await getTranslations("track");
  const messages = await pickMessages(["track", "errors"] as const);
  const formProps = {
    courses: courseNames(locale),
    demo: site.demo.enabled,
    center: { name: site.name[locale], address: site.contact.address[locale], phone: site.contact.phone },
  };

  return (
    <>
      <PageHeader title={t("title")} intro={t("intro")} />
      <div className={`${container} max-w-3xl py-10`}>
        <NextIntlClientProvider messages={messages}>
          {/* Same form as the fallback, so there's no layout shift once ?ref= is read. */}
          <Suspense fallback={<TrackForm {...formProps} />}>
            <TrackFormFromUrl {...formProps} />
          </Suspense>
        </NextIntlClientProvider>
      </div>
    </>
  );
}
