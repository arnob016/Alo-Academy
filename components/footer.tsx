import { useLocale, useTranslations } from "next-intl";
import { Link } from "./locale-link";
import { navItems, site } from "@/config/site";

export function Footer() {
  const locale = useLocale();
  const t = useTranslations("footer");
  const tNav = useTranslations("nav");

  return (
    <footer className="mt-16 bg-brand-dark text-white/85">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <p className="text-lg font-semibold text-white">{site.name[locale]}</p>
          <p className="mt-3 max-w-md leading-relaxed">{t("about")}</p>
        </div>

        <div>
          <h2 className="font-semibold text-white">{t("quickLinks")}</h2>
          <ul className="mt-3 space-y-2">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="hover:text-accent">
                  {tNav(item.key)}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="font-semibold text-white">{t("contact")}</h2>
          <address className="mt-3 space-y-2 not-italic">
            <p>{site.contact.address[locale]}</p>
            <p>
              <a href={`tel:${site.contact.phone}`} className="hover:text-accent">
                {site.contact.phone}
              </a>
            </p>
            <p>
              <a href={`mailto:${site.contact.email}`} className="hover:text-accent">
                {site.contact.email}
              </a>
            </p>
          </address>
          <h2 className="mt-6 font-semibold text-white">{t("officeHours")}</h2>
          <p className="mt-2">{t("hours")}</p>
        </div>
      </div>

      <div className="border-t border-white/10">
        <p className="mx-auto max-w-6xl px-4 py-5 text-sm text-white/70">
          © {site.name[locale]}. {t("rights")}
        </p>
      </div>
    </footer>
  );
}
