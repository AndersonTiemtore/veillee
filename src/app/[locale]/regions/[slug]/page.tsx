import type { Metadata } from "next";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { RegionMiniMap } from "@/components/map/RegionMiniMap";
import { StoryCard } from "@/components/story/StoryCard";
import { PatternDivider } from "@/components/ui/Pattern";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { ethnieById, instrumentById, langueById, recits, regions, siteById } from "@/lib/data";

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => regions.map((r) => ({ locale, slug: r.slug })));
}

export const dynamicParams = false;

const findRegion = (slug: string) => regions.find((r) => r.slug === slug);

export async function generateMetadata({ params }: PageProps<"/[locale]/regions/[slug]">): Promise<Metadata> {
  const { locale, slug } = await params;
  const region = findRegion(slug);
  if (!region) return {};
  const t = await getTranslations({ locale, namespace: "map" });
  return {
    title: region.nom,
    description: `${t("chefLieu", { name: region.chefLieu })} — ${t("storiesCount", { count: region.nbRecits })}`,
  };
}

export default async function RegionPage({ params }: PageProps<"/[locale]/regions/[slug]">) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const region = findRegion(slug);
  if (!region) notFound();

  const t = await getTranslations("region");
  const tm = await getTranslations("map");
  const ts = await getTranslations("story");
  const format = await getFormatter();

  const stories = recits.filter((r) => r.regionIds.includes(region.id));
  const regionLangues = region.langueIds
    .map((id) => langueById.get(id)!)
    .sort((a, b) => (b.nombreLocuteurs ?? 0) - (a.nombreLocuteurs ?? 0));
  const regionEthnies = region.ethnieIds
    .map((id) => ethnieById.get(id)!)
    .sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
  const regionInstruments = region.instrumentIds.map((id) => instrumentById.get(id)!);
  const regionSites = region.siteIds.map((id) => siteById.get(id)!).sort((a, b) => a.nom.localeCompare(b.nom, "fr"));

  // Joking kinships among the peoples of the region (each pair once).
  const here = new Set(region.ethnieIds);
  const kinships = new Map<string, [string, string]>();
  for (const e of regionEthnies)
    for (const other of e.parentePlaisanterieIds) {
      const o = ethnieById.get(other);
      if (!o || !here.has(other)) continue;
      const key = [e.id, other].sort().join("|");
      if (!kinships.has(key)) kinships.set(key, [e.nom, o.nom]);
    }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="grid gap-8 md:grid-cols-[1fr_18rem] md:items-start">
        <header>
          <h1 className="mb-2 text-2xl font-bold sm:text-3xl">{region.nom}</h1>
          <p className="mb-4 text-muted">
            {tm("chefLieu", { name: region.chefLieu })} · {tm("storiesCount", { count: region.nbRecits })}
          </p>
          <Link href={`/carte?region=${region.slug}`} className="text-accent underline underline-offset-4">
            {t("onMap")}
          </Link>
        </header>
        <div className="card p-3">
          <RegionMiniMap regionId={region.id} label={region.nom} />
        </div>
      </div>

      <section aria-labelledby="recits" className="py-10">
        <h2 id="recits" className="mb-4 text-xl font-bold">
          {t("stories")}
        </h2>
        {stories.length > 0 ? (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {stories.map((r) => (
              <li key={r.id}>
                <StoryCard recit={r} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="card p-6">
            <p className="mb-4 text-muted">{t("noStories")}</p>
            <Link href="/contribuer" className="btn-cta">
              {ts("youKnowIt")}
            </Link>
          </div>
        )}
      </section>

      <PatternDivider />

      <section aria-labelledby="autour" className="py-10">
        <h2 id="autour" className="mb-6 text-xl font-bold">
          {t("around")}
        </h2>
        <div className="grid gap-6 md:grid-cols-2">
          <Block title={t("languages")} empty={t("none")}>
            {regionLangues.map((l) => (
              <li key={l.id}>
                <span lang={l.codeIso}>{l.nom}</span>
                {l.nombreLocuteurs ? (
                  <span className="text-muted">
                    {" "}
                    — {t("speakers", { count: format.number(l.nombreLocuteurs) })}
                  </span>
                ) : null}
              </li>
            ))}
          </Block>
          <Block title={t("ethnies")} empty={t("none")}>
            {regionEthnies.map((e) => (
              <li key={e.id}>{e.nom}</li>
            ))}
          </Block>
          <Block title={t("jokingKinship")} empty={t("none")}>
            {[...kinships.values()].map(([a, b]) => (
              <li key={`${a}-${b}`}>{t("jokingKinshipWith", { a, b })}</li>
            ))}
          </Block>
          <Block title={t("instruments")} empty={t("none")}>
            {regionInstruments.map((i) => (
              <li key={i.id}>
                <span className="font-bold">{i.nom}</span>
                {i.description ? <span className="block text-sm text-muted">{i.description}</span> : null}
              </li>
            ))}
          </Block>
        </div>

        <div className="mt-6">
          <Block title={t("sites")} empty={t("none")} columns>
            {regionSites.map((s) => (
              <li key={s.id}>{s.nom}</li>
            ))}
          </Block>
        </div>
      </section>
    </div>
  );
}

function Block({
  title,
  empty,
  columns,
  children,
}: {
  title: string;
  empty: string;
  columns?: boolean;
  children: React.ReactNode[];
}) {
  return (
    <div className="card p-5">
      <h3 className="mb-3 text-lg text-accent">{title}</h3>
      {children.length > 0 ? (
        <ul className={`space-y-1 ${columns ? "sm:columns-2 lg:columns-3" : ""}`}>{children}</ul>
      ) : (
        <p className="text-muted">{empty}</p>
      )}
    </div>
  );
}
