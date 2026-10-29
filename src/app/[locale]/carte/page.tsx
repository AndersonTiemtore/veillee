import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { MapExplorer } from "@/components/map/MapExplorer";
import { Link } from "@/i18n/navigation";
import { regions } from "@/lib/data";
import { filterOptions, mapRegions, mapStories } from "@/lib/data/views";

export async function generateMetadata({ params }: PageProps<"/[locale]/carte">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "map" });
  return { title: t("title"), description: t("intro") };
}

export default async function MapPage({ params }: PageProps<"/[locale]/carte">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("map");

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-2 text-2xl font-bold sm:text-3xl">{t("title")}</h1>
      <p className="prose-conte mb-6 text-muted">{t("intro")}</p>
      {/* Filters and the selected region live in the URL (useSearchParams). */}
      <Suspense fallback={<StaticRegionList />}>
        <MapExplorer regions={mapRegions()} stories={mapStories()} options={filterOptions()} />
      </Suspense>
    </div>
  );
}

/** Server-rendered region list: shown before hydration and without JavaScript. */
async function StaticRegionList() {
  const t = await getTranslations("map");
  return (
    <section aria-labelledby="liste-regions-statique">
      <h2 id="liste-regions-statique" className="mb-4 text-xl font-bold">
        {t("regionList")}
      </h2>
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {regions.map((r) => (
          <li key={r.id}>
            <Link href={`/regions/${r.slug}`} className="card flex justify-between gap-3 p-3">
              <span>
                <span className="block font-bold">{r.nom}</span>
                <span className="text-xs text-muted">{r.chefLieu}</span>
              </span>
              <span className="text-sm text-muted">{t("storiesCount", { count: r.nbRecits })}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
