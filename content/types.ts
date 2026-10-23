import type { Locale } from "@/i18n/routing";

/** A value written once per language, e.g. `{ bn: "হোম", en: "Home" }`. */
export type Localized<T = string> = Record<Locale, T>;
