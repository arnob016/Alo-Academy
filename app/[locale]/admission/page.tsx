import { Suspense } from "react";
import { locale as rootLocale } from "next/root-params";
import { NextIntlClientProvider } from "next-intl";
import { getFormatter, getTranslations } from "next-intl/server";
import { site } from "@/config/site";
import { courses, levels } from "@/content/courses";
import type { Locale } from "@/i18n/routing";
import { pickMessages } from "@/lib/messages";
import { pageMetadata } from "@/lib/seo";
import { AdmissionForm, AdmissionFormFromUrl, type FormCourse } from "@/components/forms/admission-form";
import { CopyButton } from "@/components/copy-button";
import { DemoBanner, DemoGuide } from "@/components/demo/demo-blocks";
import { PageHeader } from "@/components/page-header";
import { card, container } from "@/components/ui";

export const generateMetadata = () => pageMetadata("admission");

export default async function AdmissionPage() {
  const locale = (await rootLocale()) as Locale;
  const t = await getTranslations("admissionPage");
  const tCourse = await getTranslations("course");
  const tCommon = await getTranslations("common");
  const format = await getFormatter();
  const messages = await pickMessages(
    site.demo.enabled ? (["form", "errors", "levels", "demo"] as const) : (["form", "errors", "levels"] as const),
  );

  const formCourses: FormCourse[] = courses.map((course) => ({
    id: course.id,
    level: course.level,
    name: course.name[locale],
    admissionFee: course.admissionFee,
    batches: course.batches.map((b) => ({ id: b.id, label: b.label[locale], schedule: b.schedule[locale] })),
  }));
  const methods = (Object.keys(site.payments.methods) as (keyof typeof site.payments.methods)[]).filter(
    (m) => site.payments.methods[m],
  );
  const formProps = {
    courses: formCourses,
    levels,
    methods,
    demo: site.demo.enabled,
    turnstileSiteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "",
  };

  const accountType = site.payments.bkashAccountType;
  const steps = ["open", "send", "copy", "fill"] as const;

  return (
    <>
      <PageHeader title={t("title")} intro={t("intro")} />

      {/* Mobile order: how to pay → form → fee table. Desktop: form left, both panels right. */}
      <div className={`${container} grid gap-8 py-10 lg:grid-cols-[1fr_22rem] lg:grid-rows-[auto_1fr] lg:items-start`}>
        <aside className="space-y-6 lg:col-start-2 lg:row-start-1">
          <DemoBanner />
          <DemoGuide />

          <section aria-labelledby="how-to-pay" className={`${card} p-6`}>
            <h2 id="how-to-pay" className="text-lg font-semibold text-brand">
              {t("howToPay")}
            </h2>
            <ol className="mt-4 space-y-3">
              {steps.map((step, i) => (
                <li key={step} className="flex gap-3">
                  <span aria-hidden="true" className="grid size-7 shrink-0 place-items-center rounded-full bg-brand text-sm font-semibold text-white">
                    {format.number(i + 1)}
                  </span>
                  <span className="text-ink">
                    {step === "open"
                      ? t("steps.open", { action: accountType === "merchant" ? t("payment") : t("sendMoney") })
                      : t(`steps.${step}`)}
                  </span>
                </li>
              ))}
            </ol>

            <div className="mt-6 rounded-lg bg-[#e2136e]/10 p-4">
              <p className="text-sm font-medium text-ink">{t("payTo")}</p>
              <div className="mt-1 flex flex-wrap items-center gap-3">
                <p className="font-mono text-2xl font-bold tracking-wide text-[#a10d4f]">
                  {site.payments.bkashNumber}
                </p>
                <CopyButton
                  value={site.payments.bkashNumber}
                  labels={{ copy: tCommon("copy"), copied: tCommon("copied") }}
                  className="text-[#a10d4f]"
                />
              </div>
              <p className="text-sm text-muted">{t("accountType", { type: accountType })}</p>
            </div>
          </section>
        </aside>

        <section aria-labelledby="admission-form" className={`${card} p-6 sm:p-8 lg:col-start-1 lg:row-span-2 lg:row-start-1`}>
          <h2 id="admission-form" className="mb-6 text-2xl font-semibold text-brand">
            {t("formTitle")}
          </h2>
          <NextIntlClientProvider messages={messages}>
            {/* Same form as the fallback, so there's no layout shift once ?course= is read. */}
            <Suspense fallback={<AdmissionForm {...formProps} />}>
              <AdmissionFormFromUrl {...formProps} />
            </Suspense>
          </NextIntlClientProvider>
        </section>

        <section aria-labelledby="admission-fees" className={`${card} p-6 lg:col-start-2 lg:row-start-2`}>
          <h2 id="admission-fees" className="text-lg font-semibold text-brand">
            {t("feesTitle")}
          </h2>
          <table className="mt-3 w-full text-sm">
            <tbody className="divide-y divide-brand/10">
              {courses.map((course) => (
                <tr key={course.id}>
                  <th scope="row" className="py-2 pr-3 text-left font-normal text-ink">
                    {course.name[locale]}
                  </th>
                  <td className="py-2 text-right font-semibold whitespace-nowrap text-ink">
                    {tCourse("fee", { amount: course.admissionFee })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </>
  );
}
