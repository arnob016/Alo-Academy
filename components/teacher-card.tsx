import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import type { Teacher } from "@/content/teachers";
import { card } from "./ui";

export function TeacherCard({
  teacher,
  compact = false,
  headingLevel = 3,
}: {
  teacher: Teacher;
  compact?: boolean;
  headingLevel?: 2 | 3;
}) {
  const locale = useLocale();
  const t = useTranslations("teachersPage");
  const Heading = `h${headingLevel}` as const;

  return (
    <article className={`${card} flex flex-col items-center p-6 text-center`}>
      {teacher.photo ? (
        <Image
          src={teacher.photo}
          alt={teacher.name[locale]}
          width={96}
          height={96}
          className="size-24 rounded-full object-cover"
        />
      ) : (
        <div
          aria-hidden="true"
          className="grid size-24 place-items-center rounded-full bg-brand/10 text-2xl font-semibold text-brand"
        >
          {teacher.initials[locale]}
        </div>
      )}
      <Heading className="mt-4 text-lg font-semibold text-ink">{teacher.name[locale]}</Heading>
      <p className="font-medium text-brand">{teacher.subject[locale]}</p>
      <p className="mt-2 text-sm text-muted">{teacher.qualification[locale]}</p>
      <p className="mt-1 text-sm text-muted">{t("experience", { years: teacher.experienceYears })}</p>
      {!compact && <p className="mt-3 leading-relaxed text-ink">{teacher.bio[locale]}</p>}
    </article>
  );
}
