import type { Metadata } from "next";
import { locale as rootLocale } from "next/root-params";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import { site } from "@/config/site";
import { officeCourses } from "@/content/courses";
import type { Locale } from "@/i18n/routing";
import { pickMessages } from "@/lib/messages";
import { FeesOffice } from "@/components/dashboard/fees-office";
import { PageHeader } from "@/components/page-header";
import { container } from "@/components/ui";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("office.fees");
  return { title: t("title"), robots: { index: false } };
}

/** Static shell; the data loads in the browser through staff-only Server Actions. */
export default async function FeesPage() {
  const locale = (await rootLocale()) as Locale;
  const t = await getTranslations("office.fees");
  const messages = await pickMessages(["office"] as const);

  return (
    <>
      <PageHeader title={t("title")} intro={t("intro")} />
      <div className={`${container} py-10`}>
        <NextIntlClientProvider messages={messages}>
          <FeesOffice
            courses={officeCourses(locale)}
            center={{ name: site.name[locale], address: site.contact.address[locale], phone: site.contact.phone }}
          />
        </NextIntlClientProvider>
      </div>
    </>
  );
}
