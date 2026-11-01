import { locale as rootLocale } from "next/root-params";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import { inLocale } from "@/content/types";
import type { Locale } from "@/i18n/routing";
import { getPublicExams } from "@/lib/exams";
import { pickMessages } from "@/lib/messages";
import { pageMetadata } from "@/lib/seo";
import { PageHeader } from "@/components/page-header";
import { ResultsBoard, type ResultExam } from "@/components/results/results-board";
import { container } from "@/components/ui";

export const generateMetadata = () => pageMetadata("results");

export default async function ResultsPage() {
  const locale = (await rootLocale()) as Locale;
  const t = await getTranslations("results");
  const messages = await pickMessages(["results"] as const);

  // Entered from the office; cached, newest exam first.
  const resultExams: ResultExam[] = (await getPublicExams()).map((exam) => ({
    id: exam.id,
    title: inLocale(exam.title, locale),
    date: exam.date,
    fullMarks: exam.fullMarks,
    passMarks: exam.passMarks,
    scores: exam.scores.map(([roll, name, marks]) => ({ roll, name, marks })),
  }));

  return (
    <>
      <PageHeader title={t("title")} intro={t("intro")} />
      <div className={`${container} py-10`}>
        <NextIntlClientProvider messages={messages}>
          {resultExams.length ? <ResultsBoard exams={resultExams} /> : <p className="text-muted">{t("empty")}</p>}
        </NextIntlClientProvider>
      </div>
    </>
  );
}
