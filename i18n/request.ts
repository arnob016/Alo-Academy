import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { locale as rootLocale } from "next/root-params";
import { routing } from "./routing";

// Reads the locale from `next/root-params` instead of request headers so pages
// stay statically rendered. Server Actions can't use root params, so they must
// pass the locale explicitly (e.g. `getTranslations({ locale, namespace })`).
export default getRequestConfig(async ({ locale: explicitLocale }) => {
  const requested = explicitLocale ?? (await rootLocale());
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  return {
    locale,
    timeZone: "Asia/Dhaka",
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
