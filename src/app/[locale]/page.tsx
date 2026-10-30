import { ArrowRight } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { IntroFire } from "@/components/home/IntroFire";
import { StoryOfTheNight, type NightCandidate } from "@/components/home/StoryOfTheNight";
import { RegionMiniMap } from "@/components/map/RegionMiniMap";
import { PatternDivider } from "@/components/ui/Pattern";
import { Flamme } from "@/components/ui/Pictogram";
import { Link } from "@/i18n/navigation";
import { contentVisible, counters, recits, regions } from "@/lib/data";

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");
  const types = await getTranslations("storyTypes");
  const count = counters();

  // Publishable stories (plus drafts in draft mode); never restricted ones.
  const candidates: NightCandidate[] = recits
    .filter(contentVisible)
    .sort((a, b) => a.slug.localeCompare(b.slug))
    .map((r) => ({ slug: r.slug, titre: r.titre, resume: r.resume, typeLabel: types(r.type) }));
  const storied = regions.filter((r) => r.nbRecits > 0).map((r) => r.id);

  return (
    <div className="mx-auto max-w-6xl px-4">
      <IntroFire welcome={t("welcome")} />

      <section className="flex flex-col items-center py-16 text-center sm:py-24">
        <Flamme aria-hidden className="flicker mb-6 text-flamme" width={96} height={96} />
        <h1 className="max-w-2xl text-2xl font-bold sm:text-3xl">{t("welcome")}</h1>
        <ul className="mt-8 flex flex-wrap justify-center gap-3 text-muted">
          <li className="pill border border-border px-4 py-1">{t("counters.stories", { count: count.recits })}</li>
          <li className="pill border border-border px-4 py-1">{t("counters.languages", { count: count.langues })}</li>
          <li className="pill border border-border px-4 py-1">{t("counters.regions", { count: count.regions })}</li>
        </ul>
      </section>

      <PatternDivider />

      <div className="grid gap-6 py-12 md:grid-cols-2">
        <StoryOfTheNight candidates={candidates} />

        <Link
          href="/carte"
          className="card group flex flex-col gap-4 p-6 transition-shadow hover:shadow-[var(--shadow-float)]"
        >
          <div className="mx-auto w-full max-w-xs">
            <RegionMiniMap highlighted={storied} label={t("exploreMapHint")} />
          </div>
          <span className="flex items-end justify-between gap-4">
            <span>
              <span className="block font-display text-xl font-bold">{t("exploreMap")}</span>
              <span className="text-muted">{t("exploreMapHint")}</span>
            </span>
            <ArrowRight aria-hidden className="shrink-0 text-accent transition-transform group-hover:translate-x-1" />
          </span>
        </Link>
      </div>
    </div>
  );
}
