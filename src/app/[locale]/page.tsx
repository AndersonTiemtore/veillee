import { MapPinned } from "lucide-react";
import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { use } from "react";
import { PatternDivider } from "@/components/ui/Pattern";
import { Flamme } from "@/components/ui/Pictogram";
import { Link } from "@/i18n/navigation";

export default function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations("home");

  return (
    <div className="mx-auto max-w-6xl px-4">
      <section className="flex flex-col items-center py-16 text-center sm:py-24">
        <Flamme aria-hidden className="flicker mb-6 text-flamme" width={96} height={96} />
        <h1 className="max-w-2xl text-2xl font-bold sm:text-3xl">{t("welcome")}</h1>
      </section>

      <PatternDivider />

      <div className="grid gap-6 py-12 md:grid-cols-2">
        <section aria-labelledby="conte-du-jour" className="card p-6">
          <h2 id="conte-du-jour" className="mb-3 text-xl text-accent">
            {t("storyOfTheNight")}
          </h2>
          <p className="prose-conte text-muted">{t("storyOfTheNightEmpty")}</p>
        </section>

        <Link
          href="/carte"
          className="card group flex flex-col justify-between p-6 transition-shadow hover:shadow-glow"
        >
          <MapPinned aria-hidden className="mb-4 text-accent" size={40} strokeWidth={1.5} />
          <span>
            <span className="block font-display text-xl font-bold">{t("exploreMap")}</span>
            <span className="text-muted">{t("exploreMapHint")}</span>
          </span>
        </Link>
      </div>
    </div>
  );
}
