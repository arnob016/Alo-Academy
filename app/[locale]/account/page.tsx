import { Suspense } from "react";
import type { Metadata } from "next";
import { locale as rootLocale } from "next/root-params";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import { site } from "@/config/site";
import { courseNames } from "@/content/courses";
import type { Locale } from "@/i18n/routing";
import { pickMessages } from "@/lib/messages";
import { availableProviders } from "@/lib/oauth";
import { AccountView, AccountViewFromUrl } from "@/components/auth/account-view";
import { PageHeader } from "@/components/page-header";
import { container } from "@/components/ui";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("account");
  return { title: t("title"), robots: { index: false } };
}

/** Static shell; the account itself loads in the browser (proxy.ts sends signed-out visitors to /login). */
export default async function AccountPage() {
  const locale = (await rootLocale()) as Locale;
  const t = await getTranslations("account");
  const messages = await pickMessages(["account", "auth", "track", "errors"] as const);
  const props = {
    locale,
    courses: courseNames(locale),
    center: { name: site.name[locale], address: site.contact.address[locale], phone: site.contact.phone },
    providers: availableProviders(),
  };

  return (
    <>
      <PageHeader title={t("title")} intro={t("intro")} />
      <div className={`${container} py-10`}>
        <NextIntlClientProvider messages={messages}>
          <Suspense fallback={<AccountView {...props} />}>
            <AccountViewFromUrl {...props} />
          </Suspense>
        </NextIntlClientProvider>
      </div>
    </>
  );
}
