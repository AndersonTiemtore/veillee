import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function NotFound() {
  const t = useTranslations("pages");
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-24 text-center">
      <h1 className="mb-3 text-2xl font-bold">{t("notFound")}</h1>
      <p className="mb-8 text-muted">{t("notFoundHint")}</p>
      <Link href="/" className="btn-cta">
        {t("backHome")}
      </Link>
    </div>
  );
}
