import { useTranslations } from "next-intl";
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
