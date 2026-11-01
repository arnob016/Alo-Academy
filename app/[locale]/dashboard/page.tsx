import type { Metadata } from "next";
import { locale as rootLocale } from "next/root-params";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import { site } from "@/config/site";
import { courseNames, courses } from "@/content/courses";
import type { Locale } from "@/i18n/routing";
import { pickMessages } from "@/lib/messages";
import { OfficeDashboard } from "@/components/dashboard/office-dashboard";
import { PageHeader } from "@/components/page-header";
import { container } from "@/components/ui";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("dashboard");
  return { title: t("title"), robots: { index: false } };
}

export default async function DashboardPage() {
  const locale = (await rootLocale()) as Locale;
  const t = await getTranslations("dashboard");
  const messages = await pickMessages(["dashboard"] as const);
  const slots = Object.fromEntries(
    courses.flatMap((course) => course.batches.map((b) => [`${course.id}:${b.id}`, b.slot])),
  );

  return (
    <>
      <PageHeader title={t("title")} intro={t("intro")} />
      <div className={`${container} py-10`}>
        <NextIntlClientProvider messages={messages}>
          <OfficeDashboard
            courses={courseNames(locale)}
            slots={slots}
            center={{ name: site.name[locale], phone: site.contact.phone }}
          />
        </NextIntlClientProvider>
      </div>
    </>
  );
}
