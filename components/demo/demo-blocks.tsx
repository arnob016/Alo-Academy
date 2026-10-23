import { useTranslations } from "next-intl";
import { Link } from "@/components/locale-link";
import { site } from "@/config/site";

/*
 * Portfolio-only blocks. All use the neutral zinc palette (not the Alo Academy
 * brand colors) and render nothing when NEXT_PUBLIC_DEMO_MODE=false.
 */

export function DemoBanner() {
  const t = useTranslations("demo");
  if (!site.demo.enabled) return null;

  return (
    <div role="note" className="flex gap-3 rounded-lg border-2 border-dashed border-zinc-900 bg-zinc-50 p-4 text-zinc-900">
      <svg aria-hidden="true" viewBox="0 0 24 24" className="mt-0.5 size-6 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M12 3l9 16H3L12 3zM12 10v4M12 17.5v.01" />
      </svg>
      <div>
        <p className="font-bold">{t("bannerTitle")}</p>
        <p className="mt-1 text-sm">{t("bannerText")}</p>
      </div>
    </div>
  );
}

export function DemoGuide() {
  const t = useTranslations("demo");
  if (!site.demo.enabled) return null;

  const steps = ["lang", "fill", "submit", "sheet"] as const;

  return (
    <section aria-labelledby="demo-guide" className="rounded-lg bg-zinc-900 p-5 text-white">
      <h2 id="demo-guide" className="flex items-center gap-2 font-semibold">
        <span className="rounded bg-white px-1.5 py-0.5 text-xs font-bold uppercase text-zinc-900">
          {t("badge")}
        </span>
        {t("guideTitle")}
      </h2>
      <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm text-zinc-200">
        {steps.map((step) => (
          <li key={step}>{t(`guide.${step}`)}</li>
        ))}
      </ol>
      {site.demo.publicSheetUrl && (
        <a
          href={site.demo.publicSheetUrl}
          target="_blank"
          rel="noopener"
          className="mt-4 inline-block text-sm font-semibold underline underline-offset-4"
        >
          {t("openSheet")} ↗
        </a>
      )}
    </section>
  );
}

export function TryDemoStrip() {
  const t = useTranslations("demo");
  if (!site.demo.enabled) return null;

  return (
    <div className="flex flex-col gap-4 rounded-xl bg-zinc-900 p-5 text-white sm:flex-row sm:items-center sm:justify-between">
      <p className="flex items-start gap-3">
        <span className="mt-0.5 rounded bg-white px-1.5 py-0.5 text-xs font-bold uppercase text-zinc-900">
          {t("badge")}
        </span>
        <span className="text-zinc-100">{t("stripText")}</span>
      </p>
      <Link
        href="/admission"
        className="shrink-0 rounded-md bg-white px-4 py-2 text-center font-semibold text-zinc-900 hover:bg-zinc-200"
      >
        {t("stripCta")}
      </Link>
    </div>
  );
}

/** Shown on the success page, the moment a visitor has just seen the whole flow work. */
export function HirePitch() {
  const t = useTranslations("demo");
  if (!site.demo.enabled) return null;

  const extras = ["admin", "cms", "login", "gateway", "sms"] as const;

  return (
    <section aria-labelledby="hire-pitch" className="rounded-xl bg-zinc-900 p-6 text-white sm:p-8">
      {site.demo.publicSheetUrl && (
        <div className="mb-6 rounded-lg bg-white/10 p-4">
          <a
            href={site.demo.publicSheetUrl}
            target="_blank"
            rel="noopener"
            className="font-semibold underline underline-offset-4"
          >
            {t("seeRow")} ↗
          </a>
          <p className="mt-1 text-sm text-zinc-300">{t("seeRowHint")}</p>
        </div>
      )}

      <h2 id="hire-pitch" className="text-2xl font-semibold">{t("pitchTitle")}</h2>
      <p className="mt-3 max-w-2xl leading-relaxed text-zinc-200">{t("pitchText")}</p>

      <h3 className="mt-6 font-semibold">{t("alsoTitle")}</h3>
      <ul className="mt-2 grid gap-2 text-zinc-200 sm:grid-cols-2">
        {extras.map((key) => (
          <li key={key} className="flex gap-2">
            <span aria-hidden="true">✓</span>
            {t(`also.${key}`)}
          </li>
        ))}
      </ul>

      {site.demo.hireUrl && (
        <a
          href={site.demo.hireUrl}
          target="_blank"
          rel="noopener"
          className="mt-7 inline-block rounded-md bg-white px-6 py-3 font-semibold text-zinc-900 hover:bg-zinc-200"
        >
          {t("cta")}
        </a>
      )}
    </section>
  );
}
