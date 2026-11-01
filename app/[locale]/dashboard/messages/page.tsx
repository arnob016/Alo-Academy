import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import { pickMessages } from "@/lib/messages";
import { MessagesOffice } from "@/components/dashboard/messages-office";
import { PageHeader } from "@/components/page-header";
import { container } from "@/components/ui";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("office.messages");
  return { title: t("title"), robots: { index: false } };
}

/** Static shell; the data loads in the browser through staff-only Server Actions. */
export default async function MessagesPage() {
  const t = await getTranslations("office.messages");
  const messages = await pickMessages(["office"] as const);

  return (
    <>
      <PageHeader title={t("title")} intro={t("intro")} />
      <div className={`${container} py-10`}>
        <NextIntlClientProvider messages={messages}>
          <MessagesOffice />
        </NextIntlClientProvider>
      </div>
    </>
  );
}
