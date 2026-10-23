import { useTranslations } from "next-intl";
import { teachers } from "@/content/teachers";
import { pageMetadata } from "@/lib/seo";
import { PageHeader } from "@/components/page-header";
import { TeacherCard } from "@/components/teacher-card";
import { container } from "@/components/ui";

export const generateMetadata = () => pageMetadata("teachers");

export default function TeachersPage() {
  const t = useTranslations("teachersPage");

  return (
    <>
      <PageHeader title={t("title")} intro={t("intro")} />
      <div className={`${container} grid gap-6 py-12 sm:grid-cols-2 lg:grid-cols-3`}>
        {teachers.map((teacher) => (
          <TeacherCard key={teacher.id} teacher={teacher} headingLevel={2} />
        ))}
      </div>
    </>
  );
}
