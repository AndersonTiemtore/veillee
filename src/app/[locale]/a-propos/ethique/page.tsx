import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ComingSoon } from "@/components/ui/ComingSoon";

export async function generateMetadata({ params }: PageProps<"/[locale]/a-propos/ethique">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pages" });
  return { title: t("ethics") };
}

export default async function Page({ params }: PageProps<"/[locale]/a-propos/ethique">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pages");
  return <ComingSoon title={t("ethics")} />;
}
