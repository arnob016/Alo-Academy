"use client";

import { useState, type FormEvent } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { grade } from "@/content/results";
import { card } from "../ui";

export type ResultExam = {
  id: string;
  title: string;
  date: string;
  fullMarks: number;
  passMarks: number;
  scores: { roll: string; name: string; marks: number }[];
};

const MERIT_SIZE = 10;
const BANDS = 10;

/** Ranks with ties sharing a place (1, 2, 2, 4…). */
function rank(scores: ResultExam["scores"]) {
  const sorted = [...scores].sort((a, b) => b.marks - a.marks || a.roll.localeCompare(b.roll));
  return sorted.map((s) => ({ ...s, rank: sorted.findIndex((o) => o.marks === s.marks) + 1 }));
}

const toEnglishDigits = (v: string) => v.replace(/[০-৯]/g, (d) => String(d.charCodeAt(0) - 0x09e6));

export function ResultsBoard({ exams }: { exams: ResultExam[] }) {
  const t = useTranslations("results");
  const format = useFormatter();
  const [examId, setExamId] = useState(exams[0]?.id);
  const [roll, setRoll] = useState("");
  const [looked, setLooked] = useState<string | null>(null);
  const [hoverBand, setHoverBand] = useState<number | null>(null);

  const exam = exams.find((e) => e.id === examId) ?? exams[0];
  if (!exam) return null;

  const ranked = rank(exam.scores);
  const total = ranked.length;
  const percent = (marks: number) => (marks / exam.fullMarks) * 100;
  const average = ranked.reduce((sum, s) => sum + s.marks, 0) / total;
  const passed = ranked.filter((s) => s.marks >= exam.passMarks).length;
  const bands = Array.from({ length: BANDS }, (_, i) =>
    ranked.filter((s) => Math.min(BANDS - 1, Math.floor(percent(s.marks) / (100 / BANDS))) === i).length,
  );
  const maxBand = Math.max(1, ...bands);
  // Rolls can contain letters ("A-12"); the office saves them upper-case, a parent may not type them so.
  const sameRoll = (roll: string) => roll.toUpperCase() === looked;
  const found = looked === null ? undefined : ranked.find((s) => sameRoll(s.roll));
  // Rolls are per batch, so a parent may have the wrong exam selected.
  const otherExam = looked && !found ? exams.find((e) => e.id !== exam.id && e.scores.some((s) => sameRoll(s.roll))) : undefined;
  const one = (n: number) => format.number(n, { maximumFractionDigits: 1 });

  const stats = [
    { key: "students", value: format.number(total) },
    { key: "highest", value: `${format.number(ranked[0]?.marks ?? 0)} / ${format.number(exam.fullMarks)}` },
    { key: "average", value: one(average) },
    { key: "passRate", value: `${format.number(Math.round((passed / total) * 100))}%` },
  ] as const;

  function onLookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLooked(toEnglishDigits(roll).trim().toUpperCase());
  }

  /** Switches exam; `keepRoll` carries a lookup over (from the "sat another exam" hint). */
  function chooseExam(id: string, keepRoll?: string) {
    setExamId(id);
    setLooked(keepRoll ?? null);
    setRoll(keepRoll ?? "");
  }

  return (
    <div className="space-y-8">
      <div role="group" aria-label={t("exam")} className="flex flex-wrap gap-2">
        {exams.map((e) => (
          <button
            key={e.id}
            type="button"
            onClick={() => chooseExam(e.id)}
            aria-pressed={e.id === exam.id}
            className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors ${
              e.id === exam.id ? "border-brand bg-brand text-white" : "border-brand/20 bg-white text-ink hover:border-brand/50"
            }`}
          >
            {e.title}
          </button>
        ))}
      </div>

      <div>
        <h2 className="text-2xl font-semibold text-brand">{exam.title}</h2>
        <p className="mt-1 text-muted">
          {t("heldOn", {
            // A date typed badly into the Sheet reads as "".
            date: exam.date ? format.dateTime(new Date(`${exam.date}T00:00:00+06:00`), { dateStyle: "long" }) : "—",
            full: exam.fullMarks,
            pass: exam.passMarks,
          })}
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.key} className={`${card} flex flex-col p-5`}>
            <dt className="text-sm text-muted">{t(`stats.${s.key}`)}</dt>
            <dd className="order-first text-3xl font-semibold text-brand tabular-nums">{s.value}</dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:items-start">
        {/* Lookup + distribution */}
        <div className="space-y-8">
          <section aria-labelledby="result-lookup" className={`${card} p-6`}>
            <h3 id="result-lookup" className="text-lg font-semibold text-brand">
              {t("lookup")}
            </h3>
            <form onSubmit={onLookup} className="mt-4 flex flex-wrap items-end gap-3">
              <label className="flex flex-col text-sm font-medium text-ink">
                {t("roll")}
                <input
                  value={roll}
                  onChange={(e) => setRoll(e.target.value)}
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder={exam.scores[0]?.roll}
                  className="mt-1.5 w-40 rounded-md border border-ink/25 bg-white px-3 py-2 text-base tabular-nums"
                />
              </label>
              <button type="submit" className="rounded-md bg-brand px-4 py-2.5 font-semibold text-white hover:bg-brand-dark">
                {t("show")}
              </button>
            </form>

            <div aria-live="polite">
              {looked !== null &&
                (found ? (
                  <div className="mt-5 rounded-lg bg-surface p-4">
                    <p className="font-semibold text-ink">{t("yourResult", { roll: found.roll, name: found.name })}</p>
                    <p className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                      <span className="text-3xl font-semibold text-brand tabular-nums">
                        {format.number(found.marks)}
                        <span className="text-base font-normal text-muted"> / {format.number(exam.fullMarks)}</span>
                      </span>
                      <span className="rounded bg-brand px-2 py-0.5 text-sm font-bold text-white">{grade(percent(found.marks))}</span>
                      <span className="font-medium text-ink">{t("rankOf", { rank: found.rank, total })}</span>
                    </p>
                    <p className="mt-1 text-sm text-muted">
                      {Math.abs(found.marks - average) < 0.05
                        ? t("atAvg")
                        : found.marks > average
                          ? t("aboveAvg", { diff: Math.round((found.marks - average) * 10) / 10 })
                          : t("belowAvg", { diff: Math.round((average - found.marks) * 10) / 10 })}
                    </p>
                  </div>
                ) : (
                  <div role="alert" className="mt-5 rounded-md bg-red-50 p-3 text-sm font-medium text-red-800">
                    <p>{t("notFound", { roll: looked || "—" })}</p>
                    {otherExam && (
                      <p className="mt-2">
                        {t("otherExam", { roll: looked, exam: otherExam.title })}{" "}
                        <button
                          type="button"
                          onClick={() => chooseExam(otherExam.id, looked)}
                          className="font-semibold text-brand underline underline-offset-2"
                        >
                          {t("switchExam")}
                        </button>
                      </p>
                    )}
                  </div>
                ))}
            </div>
          </section>

          <section aria-labelledby="distribution" className={`${card} p-6`}>
            <h3 id="distribution" className="text-lg font-semibold text-brand">
              {t("distribution")}
            </h3>
            <div className="relative mt-8 h-44">
              {/* Recessive gridlines at half and full height of the tallest band. */}
              <div aria-hidden="true" className="absolute inset-x-0 top-0 border-t border-ink/10" />
              <div aria-hidden="true" className="absolute inset-x-0 top-1/2 border-t border-ink/10" />
              <div
                aria-hidden="true"
                className="absolute inset-y-0 z-10 border-l-2 border-dashed border-ink/50"
                style={{ left: `${(exam.passMarks / exam.fullMarks) * 100}%` }}
              >
                <span className="absolute -top-6 -translate-x-1/2 text-xs font-semibold whitespace-nowrap text-muted">
                  {t("passLine")}
                </span>
              </div>
              <ul className="absolute inset-0 flex items-end gap-0.5 border-b border-ink/30">
                {bands.map((count, i) => {
                  const from = i * (100 / BANDS);
                  const to = from + 100 / BANDS;
                  const label = `${t("band", { from, to })}: ${t("bandCount", { count })}`;
                  return (
                    <li
                      key={i}
                      tabIndex={0}
                      aria-label={label}
                      onMouseEnter={() => setHoverBand(i)}
                      onMouseLeave={() => setHoverBand(null)}
                      onFocus={() => setHoverBand(i)}
                      onBlur={() => setHoverBand(null)}
                      className="relative flex h-full flex-1 items-end outline-none focus-visible:bg-brand/5"
                    >
                      <span
                        className={`block w-full rounded-t-[4px] transition-opacity ${hoverBand !== null && hoverBand !== i ? "opacity-50" : ""} bg-brand`}
                        style={{ height: `${(count / maxBand) * 100}%` }}
                      />
                      {hoverBand === i && (
                        <span
                          role="tooltip"
                          className="absolute bottom-full left-1/2 z-20 mb-2 -translate-x-1/2 rounded-md bg-ink px-2 py-1 text-xs font-semibold whitespace-nowrap text-white shadow-lg"
                        >
                          {label}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
            <div aria-hidden="true" className="mt-2 flex justify-between text-xs text-muted tabular-nums">
              <span>{format.number(0)}%</span>
              <span>{format.number(50)}%</span>
              <span>{format.number(100)}%</span>
            </div>
          </section>
        </div>

        {/* Merit list */}
        <section aria-labelledby="merit" className={`${card} overflow-hidden`}>
          <h3 id="merit" className="border-b border-brand/10 px-5 py-4 text-lg font-semibold text-brand">
            {t("merit", { count: Math.min(MERIT_SIZE, total) })}
          </h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface text-left text-xs tracking-wide text-muted uppercase">
                <th scope="col" className="px-5 py-2 font-semibold">{t("rank")}</th>
                <th scope="col" className="py-2 font-semibold">{t("roll")}</th>
                <th scope="col" className="py-2 font-semibold">{t("name")}</th>
                <th scope="col" className="py-2 text-right font-semibold">{t("marks")}</th>
                <th scope="col" className="px-5 py-2 text-right font-semibold">{t("grade")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand/10">
              {ranked.slice(0, MERIT_SIZE).map((s) => (
                <tr key={s.roll} className={sameRoll(s.roll) ? "bg-accent/20" : ""}>
                  <td className="px-5 py-2.5 font-semibold text-brand tabular-nums">{format.number(s.rank)}</td>
                  <td className="py-2.5 text-muted tabular-nums">{s.roll}</td>
                  <td className="py-2.5 font-medium text-ink">{s.name}</td>
                  <td className="py-2.5 text-right text-ink tabular-nums">{format.number(s.marks)}</td>
                  <td className="px-5 py-2.5 text-right font-semibold text-ink">{grade(percent(s.marks))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}
