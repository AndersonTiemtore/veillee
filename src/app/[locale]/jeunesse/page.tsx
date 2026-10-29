import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ComingSoon } from "@/components/ui/ComingSoon";

export async function generateMetadata({ params }: PageProps<"/[locale]/jeunesse">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pages" });
  return { title: t("youth") };
}

export default async function Page({ params }: PageProps<"/[locale]/jeunesse">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pages");
  return <ComingSoon title={t("youth")} />;
}
