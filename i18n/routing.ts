import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["bn", "en"],
  defaultLocale: "bn",
  localePrefix: "always",
  // Always land on Bangla first; visitors switch with the header toggle.
  localeDetection: false,
});

export type Locale = (typeof routing.locales)[number];
