import { useTranslations } from "next-intl";
import { Flamme } from "./Pictogram";

/** Placeholder for sections delivered in a later phase. */
export function ComingSoon({ title }: { title: string }) {
  const t = useTranslations("status");
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-24 text-center">
      <Flamme aria-hidden className="mb-6 text-flamme" width={48} height={48} />
      <h1 className="mb-3 text-2xl font-bold">{title}</h1>
      <p className="text-muted">{t("comingSoon")}</p>
    </div>
  );
}
