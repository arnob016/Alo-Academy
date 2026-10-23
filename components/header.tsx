import { useLocale, useTranslations } from "next-intl";
import { Link, localeHref } from "./locale-link";
import { navItems } from "@/config/site";
import { LanguageSwitcher } from "./language-switcher";
import { Logo } from "./logo";
import { MainNav } from "./main-nav";

export function Header() {
  const locale = useLocale();
  const t = useTranslations("common");
  const tNav = useTranslations("nav");
  const tLang = useTranslations("lang");

  return (
    <header className="sticky top-0 z-40 border-b border-brand/10 bg-surface/95 backdrop-blur">
      <div className="relative mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Logo />
        <div className="flex items-center gap-2">
          <MainNav
            items={navItems.map((item) => ({ href: localeHref(locale, item.href), label: tNav(item.key) }))}
            homeHref={localeHref(locale, "/")}
            labels={{ label: tNav("label"), openMenu: tNav("openMenu"), closeMenu: tNav("closeMenu") }}
          />
          <LanguageSwitcher target={locale === "bn" ? "en" : "bn"} text={tLang("switch")} label={tLang("label")} />
          <Link
            href="/admission"
            className="hidden rounded-md bg-accent px-4 py-2 font-semibold text-ink transition-colors hover:bg-accent/85 sm:inline-block"
          >
            {t("admitNow")}
          </Link>
        </div>
      </div>
    </header>
  );
}
