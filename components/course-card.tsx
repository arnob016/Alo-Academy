import { useLocale, useTranslations } from "next-intl";
import { Link } from "./locale-link";
import type { Course } from "@/content/courses";
import { card } from "./ui";

export function CourseCard({
  course,
  compact = false,
  showLevel = true,
}: {
  course: Course;
  compact?: boolean;
  /** Off where the level is already the section heading. */
  showLevel?: boolean;
}) {
  const locale = useLocale();
  const t = useTranslations("course");
  const tLevels = useTranslations("levels");
  const fewSeats = course.seatsLeft <= 5;

  return (
    <article className={`${card} flex flex-col p-6`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        {showLevel && <p className="text-sm font-medium text-muted">{tLevels(course.level)}</p>}
        <p
          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            fewSeats ? "bg-accent/25 text-ink" : "bg-brand/10 text-brand"
          }`}
        >
          {fewSeats && <span className="sr-only">{t("fewSeats")}: </span>}
          {t("seatsLeft", { count: course.seatsLeft })}
        </p>
      </div>

      <h3 className="mt-3 text-xl font-semibold text-ink">{course.name[locale]}</h3>
      <p className="mt-2 leading-relaxed text-muted">{course.description[locale]}</p>

      <dl className="mt-5 grid grid-cols-2 gap-3 rounded-lg bg-surface p-4">
        <div>
          <dt className="text-sm text-muted">{t("monthlyFee")}</dt>
          <dd className="text-lg font-semibold text-ink">{t("fee", { amount: course.monthlyFee })}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted">{t("admissionFee")}</dt>
          <dd className="text-lg font-semibold text-ink">{t("fee", { amount: course.admissionFee })}</dd>
        </div>
        {!compact && (
          <div className="col-span-2">
            <dt className="text-sm text-muted">{t("duration")}</dt>
            <dd className="font-medium text-ink">{course.duration[locale]}</dd>
          </div>
        )}
      </dl>

      {!compact && (
        <>
          <h4 className="mt-5 text-sm font-semibold text-ink">{t("subjects")}</h4>
          <ul className="mt-2 flex flex-wrap gap-2">
            {course.subjects[locale].map((subject) => (
              <li key={subject} className="rounded-full border border-brand/15 px-3 py-1 text-sm text-ink">
                {subject}
              </li>
            ))}
          </ul>

          <h4 className="mt-5 text-sm font-semibold text-ink">{t("batches")}</h4>
          <ul className="mt-2 space-y-1.5">
            {course.batches.map((batch) => (
              <li key={batch.id} className="text-sm text-ink">
                <span className="font-medium">{batch.label[locale]}</span>
                <span className="text-muted"> — {batch.schedule[locale]}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="mt-auto pt-6">
        <Link
          href={`/admission?course=${course.id}`}
          className="inline-flex font-semibold text-brand underline-offset-4 hover:underline"
        >
          {t("apply")} →
        </Link>
      </div>
    </article>
  );
}
