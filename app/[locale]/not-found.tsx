import { useTranslations } from "next-intl";
import { Link } from "@/components/locale-link";

export default function NotFound() {
  const t = useTranslations("notFound");

  return (
    <section className="mx-auto max-w-6xl px-4 py-24 text-center">
      <h1 className="text-3xl font-semibold text-brand">{t("title")}</h1>
      <Link href="/" className="mt-6 inline-block font-medium text-brand underline">
        {t("back")}
      </Link>
    </section>
  );
}
