import { useLocale } from "next-intl";
import type { Testimonial } from "@/content/testimonials";
import { CartoonPortrait } from "./portrait/cartoon-portrait";
import { card } from "./ui";

export function TestimonialList({ testimonials }: { testimonials: Testimonial[] }) {
  const locale = useLocale();

  return (
    <ul className="grid gap-6 md:grid-cols-3">
      {testimonials.map((item) => (
        <li key={item.id}>
          <figure className={`${card} flex h-full flex-col p-6`}>
            <svg aria-hidden="true" viewBox="0 0 24 24" className="size-7 text-accent" fill="currentColor">
              <path d="M9.5 6C6.5 6 4 8.5 4 11.5V18h6v-6H7c0-1.7 1.3-3 3-3V6h-.5zm9 0c-3 0-5.5 2.5-5.5 5.5V18h6v-6h-3c0-1.7 1.3-3 3-3V6h-.5z" />
            </svg>
            <blockquote className="mt-3 flex-1 leading-relaxed text-ink">
              {item.quote[locale]}
            </blockquote>
            <figcaption className="mt-5 flex items-center gap-3">
              <div className="size-12 shrink-0 overflow-hidden rounded-full">
                <CartoonPortrait look={item.look} className="size-full" />
              </div>
              <div>
                <p className="font-semibold text-ink">{item.name[locale]}</p>
                <p className="text-sm text-muted">{item.role[locale]}</p>
              </div>
            </figcaption>
          </figure>
        </li>
      ))}
    </ul>
  );
}
