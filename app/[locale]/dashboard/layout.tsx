import { locale as rootLocale } from "next/root-params";
import { getTranslations } from "next-intl/server";
import { officeItems } from "@/config/site";
import { localeHref } from "@/components/locale-link";
import { OfficeNav } from "@/components/dashboard/office-nav";

/** Every office page gets the same tab bar. proxy.ts sends visitors without a staff session to /login. */
export default async function OfficeLayout({ children }: LayoutProps<"/[locale]/dashboard">) {
  const locale = await rootLocale();
  const t = await getTranslations("office.nav");
  const items = officeItems.map((item) => ({ href: localeHref(locale, item.href), label: t(item.key) }));

  return (
    <>
      <OfficeNav items={items} label={t("label")} />
      {children}
    </>
  );
}
