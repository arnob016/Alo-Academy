import type { Metadata } from "next";
import { locale as rootLocale } from "next/root-params";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";

export const pagePaths = {
  home: "",
  courses: "/courses",
  teachers: "/teachers",
  admission: "/admission",
  contact: "/contact",
} as const;

export type PageKey = keyof typeof pagePaths;

/** Title, description, canonical, hreflang alternates and Open Graph for a page. */
export async function pageMetadata(page: PageKey): Promise<Metadata> {
  const locale = await rootLocale();
  const t = await getTranslations("pages");
  const tMeta = await getTranslations("meta");
  const path = pagePaths[page];
  const title = t(`${page}.title`);
  const description = t(`${page}.description`);

  return {
    title: page === "home" ? { absolute: title } : title,
    description,
    alternates: {
      canonical: `/${locale}${path}`,
      languages: {
        ...Object.fromEntries(routing.locales.map((l) => [l, `/${l}${path}`])),
        "x-default": `/${routing.defaultLocale}${path}`,
      },
    },
    openGraph: {
      title,
      description,
      url: `/${locale}${path}`,
      siteName: tMeta("siteName"),
      locale: locale === "bn" ? "bn_BD" : "en_US",
      type: "website",
      // Setting openGraph here replaces the inherited file-based image, so re-add it.
      images: [{ url: `/${locale}/opengraph-image`, width: 1200, height: 630, alt: tMeta("title") }],
    },
    twitter: { card: "summary_large_image", images: [`/${locale}/opengraph-image`] },
  };
}
