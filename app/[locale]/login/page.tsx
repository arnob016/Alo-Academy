import { Suspense } from "react";
import type { Metadata } from "next";
import { locale as rootLocale } from "next/root-params";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import { site } from "@/config/site";
import type { Locale } from "@/i18n/routing";
import { demoAccounts } from "@/lib/demo-accounts";
import { pickMessages } from "@/lib/messages";
import { availableProviders } from "@/lib/oauth";
import { LoginPanel, LoginPanelFromUrl } from "@/components/auth/login-panel";
import { container } from "@/components/ui";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: t("title"), robots: { index: false } };
}

export default async function LoginPage() {
  const locale = (await rootLocale()) as Locale;
  const t = await getTranslations("auth");
  const messages = await pickMessages(["auth", "errors", "form"] as const);
  const props = {
    locale,
    providers: availableProviders(),
    demoAccounts: site.demo.enabled
      ? {
          parent: { login: demoAccounts.parent.login, password: demoAccounts.parent.password },
          staff: { login: demoAccounts.staff.login, password: demoAccounts.staff.password },
        }
      : null,
    turnstileSiteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "",
  };

  return (
    <div className={`${container} max-w-md py-12`}>
      <h1 className="text-3xl font-semibold text-brand">{t("title")}</h1>
      <p className="mt-3 text-muted">{t("intro")}</p>
      <div className="mt-8">
        <NextIntlClientProvider messages={messages}>
          {/* Same panel as the fallback, so nothing shifts once ?next= / ?error= are read. */}
          <Suspense fallback={<LoginPanel {...props} />}>
            <LoginPanelFromUrl {...props} />
          </Suspense>
        </NextIntlClientProvider>
      </div>
    </div>
  );
}
