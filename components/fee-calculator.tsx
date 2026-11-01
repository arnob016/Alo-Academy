"use client";

import { useState } from "react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { card } from "./ui";

export type FeeCourse = { id: string; name: string; monthlyFee: number; admissionFee: number; durationMonths: number };

/**
 * What a family pays on day one: the admission fee plus monthly fees paid in
 * advance, with the advance and sibling discounts from config/site.ts.
 */
export function FeeCalculator({
  courses,
  advance,
  siblingPercent,
  admissionHref,
}: {
  courses: FeeCourse[];
  /** Months paid in advance → discount percent. */
  advance: Record<number, number>;
  siblingPercent: number;
  /** Locale-prefixed admission page path. */
  admissionHref: string;
}) {
  const t = useTranslations("fees");
  const format = useFormatter();
  const [courseId, setCourseId] = useState(courses[0]?.id ?? "");
  const [months, setMonths] = useState(1);
  const [sibling, setSibling] = useState(false);

  const course = courses.find((c) => c.id === courseId) ?? courses[0];
  if (!course) return null;

  // Never offer more months than the course lasts.
  const options = Object.keys(advance)
    .map(Number)
    .filter((n) => n <= course.durationMonths)
    .sort((a, b) => a - b);
  const count = options.includes(months) ? months : (options[0] ?? 1);
  const advancePercent = advance[count] ?? 0;

  const monthlyTotal = course.monthlyFee * count;
  const advanceOff = Math.round((monthlyTotal * advancePercent) / 100);
  const siblingOff = sibling ? Math.round((monthlyTotal * siblingPercent) / 100) : 0;
  const total = course.admissionFee + monthlyTotal - advanceOff - siblingOff;
  const effective = Math.round((monthlyTotal - advanceOff - siblingOff) / count);
  const taka = (n: number) => `৳${format.number(n)}`;

  const lines = [
    { label: t("admissionFee"), value: taka(course.admissionFee) },
    { label: t("monthly", { count }), value: taka(monthlyTotal) },
    ...(advanceOff ? [{ label: t("advanceDiscount", { percent: advancePercent }), value: `− ${taka(advanceOff)}`, off: true }] : []),
    ...(siblingOff ? [{ label: t("siblingDiscount", { percent: siblingPercent }), value: `− ${taka(siblingOff)}`, off: true }] : []),
  ];

  return (
    <div className={`${card} grid gap-8 p-6 sm:p-8 lg:grid-cols-2`}>
      <div className="space-y-5">
        <label className="block font-medium text-ink">
          {t("course")}
          <select
            value={course.id}
            onChange={(e) => setCourseId(e.target.value)}
            className="mt-1.5 block w-full rounded-md border border-ink/25 bg-white px-3 py-2.5 text-ink"
          >
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <fieldset>
          <legend className="font-medium text-ink">{t("months")}</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {options.map((n) => (
              <label
                key={n}
                className={`cursor-pointer rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-accent ${
                  n === count ? "border-brand bg-brand text-white" : "border-brand/20 bg-white text-ink hover:border-brand/50"
                }`}
              >
                <input
                  type="radio"
                  name="fee-months"
                  value={n}
                  checked={n === count}
                  onChange={() => setMonths(n)}
                  className="sr-only"
                />
                {t("monthsOption", { count: n })}
                {advance[n] ? <span className={n === count ? "text-white/80" : "text-emerald-700"}> −{format.number(advance[n])}%</span> : null}
              </label>
            ))}
          </div>
        </fieldset>

        {siblingPercent > 0 && (
          <label className="flex items-center gap-3 text-ink">
            <input
              type="checkbox"
              checked={sibling}
              onChange={(e) => setSibling(e.target.checked)}
              className="size-5 rounded border-ink/30 accent-brand"
            />
            {t("sibling")}
          </label>
        )}
        <p className="text-sm text-muted">{t("note")}</p>
      </div>

      <div className="rounded-xl bg-surface p-5">
        <dl className="divide-y divide-brand/10">
          {lines.map((line) => (
            <div key={line.label} className="flex justify-between gap-4 py-2.5">
              <dt className="text-ink">{line.label}</dt>
              <dd className={`font-semibold tabular-nums ${"off" in line ? "text-emerald-700" : "text-ink"}`}>{line.value}</dd>
            </div>
          ))}
          <div className="flex items-baseline justify-between gap-4 pt-4">
            <dt className="font-semibold text-ink">{t("total")}</dt>
            <dd aria-live="polite" className="text-3xl font-semibold text-brand tabular-nums">
              {taka(total)}
            </dd>
          </div>
        </dl>
        {count > 1 || siblingOff ? <p className="mt-2 text-right text-sm text-muted">{t("effective", { amount: effective })}</p> : null}
        <Link
          href={`${admissionHref}?course=${course.id}`}
          className="mt-5 inline-flex w-full items-center justify-center rounded-md bg-accent px-5 py-3 font-semibold text-ink hover:bg-accent/85"
        >
          {t("apply")} →
        </Link>
      </div>
    </div>
  );
}
