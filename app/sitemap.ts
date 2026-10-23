import type { MetadataRoute } from "next";
import { site } from "@/config/site";
import { routing } from "@/i18n/routing";
import { pagePaths } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  return Object.values(pagePaths).flatMap((path) => {
    const languages = Object.fromEntries(routing.locales.map((l) => [l, `${site.url}/${l}${path}`]));
    return routing.locales.map((locale) => ({
      url: `${site.url}/${locale}${path}`,
      changeFrequency: "monthly" as const,
      priority: path === "" ? 1 : 0.8,
      alternates: { languages },
    }));
  });
}
