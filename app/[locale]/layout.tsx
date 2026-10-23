import type { Metadata } from "next";
import { Hind_Siliguri, Inter } from "next/font/google";
import { notFound } from "next/navigation";
import { locale as rootLocale } from "next/root-params";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { site, themeStyle } from "@/config/site";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { HireBar } from "@/components/demo/hire-bar";
import { themeBootScript } from "@/themes/registry";
import { ThemeRoot } from "@/themes/theme-root";
import { ThemeSwitcher } from "@/themes/switcher";
import "../globals.css";

const hindSiliguri = Hind_Siliguri({
  variable: "--font-hind-siliguri",
  weight: ["400", "600"],
  // `subsets` controls what gets preloaded; Latin glyphs still load on demand.
  subsets: ["bengali"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
  // Bangla is the default locale; avoid preloading Inter on every page.
  preload: false,
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta");
  return {
    metadataBase: new URL(site.url),
    title: { default: t("title"), template: `%s | ${t("siteName")}` },
    description: t("description"),
    twitter: { card: "summary_large_image" },
  };
}

export default async function LocaleLayout({
  children,
}: LayoutProps<"/[locale]">) {
  const locale = await rootLocale();
  if (!hasLocale(routing.locales, locale)) notFound();

  const t = await getTranslations("common");
  const tDemo = await getTranslations("demo");

  // No NextIntlClientProvider at the root: layout-level client components get
  // their text and hrefs as props, so most pages ship no translation runtime.
  // Pages with forms add their own provider.
  return (
    // suppressHydrationWarning: the theme boot script sets data-theme before React hydrates.
    <html
      lang={locale}
      style={themeStyle}
      className={`${hindSiliguri.variable} ${inter.variable} antialiased`}
      suppressHydrationWarning
    >
      <head>
        {site.demo.enabled && <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />}
      </head>
      <body>
        {site.demo.enabled && (
          <HireBar
            href={site.demo.hireUrl}
            text={{ badge: tDemo("badge"), pitch: tDemo("pitch"), cta: tDemo("cta"), dismiss: tDemo("dismiss") }}
          />
        )}
        <div id="classic-root" className="flex min-h-dvh flex-col">
          <a
            href="#main"
            className="sr-only z-50 rounded-md bg-ink px-4 py-2 text-white focus:not-sr-only focus:absolute focus:left-4 focus:top-4"
          >
            {t("skipToContent")}
          </a>
          <Header />
          <main id="main" className="flex-1">
            {children}
          </main>
          <Footer />
        </div>
        {site.demo.enabled && (
          <>
            <ThemeRoot />
            <ThemeSwitcher locale={locale} />
          </>
        )}
      </body>
    </html>
  );
}
