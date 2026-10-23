import { Suspense } from "react";
import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Link } from "@/components/locale-link";
import { HirePitch } from "@/components/demo/demo-blocks";
import { RefBox, SuccessRef } from "@/components/success-ref";
import { btnSecondary, container } from "@/components/ui";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("success");
  return { title: t("title"), robots: { index: false } };
}

export default function AdmissionSuccessPage() {
  const t = useTranslations("success");
  const tCommon = useTranslations("common");
  const refProps = {
    label: t("refLabel"),
    hint: t("refHint"),
    fallback: t("noRef"),
    copy: tCommon("copy"),
    copied: tCommon("copied"),
  };
  const next = ["verify", "call", "start"] as const;

  return (
    <div className={`${container} max-w-3xl space-y-10 py-14`}>
      <div className="text-center">
        <svg aria-hidden="true" viewBox="0 0 24 24" className="mx-auto size-14 text-brand" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M7.5 12.5l3 3 6-6.5" />
        </svg>
        <h1 className="mt-4 text-3xl font-semibold text-brand">{t("title")}</h1>
        <p className="mt-3 text-lg text-muted">{t("intro")}</p>
      </div>

      <Suspense fallback={<RefBox {...refProps} value={null} />}>
        <SuccessRef {...refProps} />
      </Suspense>

      <section aria-labelledby="next-steps">
        <h2 id="next-steps" className="text-xl font-semibold text-brand">
          {t("nextTitle")}
        </h2>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-ink">
          {next.map((key) => (
            <li key={key}>{t(`next.${key}`)}</li>
          ))}
        </ol>
      </section>

      <HirePitch />

      <div className="text-center">
        <Link href="/" className={btnSecondary}>
          {t("backHome")}
        </Link>
      </div>
    </div>
  );
}
