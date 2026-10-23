import { useLocale } from "next-intl";
import type { Faq } from "@/content/faq";

export function FaqList({ faqs }: { faqs: Faq[] }) {
  const locale = useLocale();

  return (
    <div className="divide-y divide-brand/10 rounded-xl border border-brand/10 bg-white">
      {faqs.map((faq) => (
        <details key={faq.id} className="group px-5 py-4">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-ink [&::-webkit-details-marker]:hidden">
            {faq.question[locale]}
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="size-5 shrink-0 text-brand transition-transform group-open:rotate-180"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </summary>
          <p className="mt-3 leading-relaxed text-muted">{faq.answer[locale]}</p>
        </details>
      ))}
    </div>
  );
}
