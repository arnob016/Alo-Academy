import { locale as rootLocale } from "next/root-params";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import { site } from "@/config/site";
import type { Locale } from "@/i18n/routing";
import { pickMessages } from "@/lib/messages";
import { pageMetadata } from "@/lib/seo";
import { ContactForm } from "@/components/forms/contact-form";
import { MapFacade } from "@/components/map-facade";
import { PageHeader } from "@/components/page-header";
import { card, container } from "@/components/ui";

export const generateMetadata = () => pageMetadata("contact");

export default async function ContactPage() {
  const locale = (await rootLocale()) as Locale;
  const t = await getTranslations("contactPage");
  const tForm = await getTranslations("contactForm");
  const tFooter = await getTranslations("footer");
  const messages = await pickMessages(["contactForm", "form", "errors"]);

  const details = [
    { label: t("address"), value: site.contact.address[locale] },
    { label: t("phone"), value: site.contact.phone, href: `tel:${site.contact.phone}` },
    { label: t("email"), value: site.contact.email, href: `mailto:${site.contact.email}` },
    { label: t("hours"), value: tFooter("hours") },
  ];

  return (
    <>
      <PageHeader title={t("title")} intro={t("intro")} />

      <div className={`${container} grid gap-8 py-12 lg:grid-cols-2`}>
        <div className="space-y-6">
          <dl className={`${card} grid gap-5 p-6 sm:grid-cols-2`}>
            {details.map((item) => (
              <div key={item.label}>
                <dt className="text-sm font-medium text-muted">{item.label}</dt>
                <dd className="mt-1 font-medium text-ink">
                  {item.href ? (
                    <a href={item.href} className="text-brand underline-offset-4 hover:underline">
                      {item.value}
                    </a>
                  ) : (
                    item.value
                  )}
                </dd>
              </div>
            ))}
          </dl>
          <MapFacade query={site.contact.mapQuery} title={t("mapTitle")} label={t("loadMap")} note={t("mapNote")} />
        </div>

        <section aria-labelledby="contact-form" className={`${card} p-6 sm:p-8`}>
          <h2 id="contact-form" className="mb-6 text-2xl font-semibold text-brand">
            {tForm("title")}
          </h2>
          <NextIntlClientProvider messages={messages}>
            <ContactForm turnstileSiteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ""} />
          </NextIntlClientProvider>
        </section>
      </div>
    </>
  );
}
