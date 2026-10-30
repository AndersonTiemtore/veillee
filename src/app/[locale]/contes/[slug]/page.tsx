import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { ListenMode } from "@/components/story/ListenMode";
import { ReadMode } from "@/components/story/ReadMode";
import { StoryCard } from "@/components/story/StoryCard";
import { StoryTabs } from "@/components/story/StoryTabs";
import { PatternDivider } from "@/components/ui/Pattern";
import { StoryTypeIcon } from "@/components/ui/Pictogram";
import type { Recit } from "@/data/schemas";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import {
  contentVisible,
  ethnieById,
  instrumentById,
  langueById,
  recits,
  regionById,
  siteById,
  themeById,
} from "@/lib/data";
import { listenVersions, liveVersion, readColumns, relatedStories } from "@/lib/data/story";
import { quizFromScenes } from "@/lib/quiz";
import { LiveMode } from "@/components/story/LiveMode";
import { typeColor } from "@/lib/map/style";
import { bcp47 } from "@/lib/media/vtt";
import { SHOW_DRAFTS, siteUrl } from "@/lib/site";

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => recits.map((r) => ({ locale, slug: r.slug })));
}

export const dynamicParams = false;

const findStory = (slug: string) => recits.find((r) => r.slug === slug);

export async function generateMetadata({ params }: PageProps<"/[locale]/contes/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const r = findStory(slug);
  if (!r) return {};
  // Restricted stories expose nothing beyond their title.
  const description = r.restreint ? undefined : r.resume;
  return {
    title: r.titre,
    description,
    alternates: { canonical: `/contes/${r.slug}` },
    openGraph: { title: r.titre, description, type: "article" },
  };
}

function jsonLd(r: Recit) {
  const site = r.siteId ? siteById.get(r.siteId) : undefined;
  const region = r.regionIds.map((id) => regionById.get(id)).find(Boolean);
  const place =
    site ?? (r.lieu && region ? { nom: region.nom, lat: r.lieu.lat, lon: r.lieu.lon } : undefined);
  return {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: r.titre,
    url: `${siteUrl()}/contes/${r.slug}`,
    genre: r.type,
    description: r.restreint ? undefined : r.resume,
    inLanguage: [...new Set(r.versions.map((v) => bcp47(v.codeIso)))],
    license: "https://creativecommons.org/licenses/by-nc/4.0/",
    isAccessibleForFree: true,
    contentLocation: place
      ? {
          "@type": "Place",
          name: place.nom,
          address: { "@type": "PostalAddress", addressCountry: "BF", addressRegion: region?.nom },
          geo: { "@type": "GeoCoordinates", latitude: place.lat, longitude: place.lon },
        }
      : undefined,
  };
}

export default async function StoryPage({ params }: PageProps<"/[locale]/contes/[slug]">) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const r = findStory(slug);
  if (!r) notFound();

  const t = await getTranslations("story");
  const tm = await getTranslations("modes");
  const tc = await getTranslations("credits");
  const ta = await getTranslations("around");
  const ts = await getTranslations("status");
  const types = await getTranslations("storyTypes");

  const site = r.siteId ? siteById.get(r.siteId) : undefined;
  const regions = r.regionIds.map((id) => regionById.get(id)!).filter(Boolean);
  const visible = contentVisible(r);
  const draft = visible && !r.publiable;
  const conteurs = [...new Set(r.versions.map((v) => v.conteur).filter(Boolean))];
  const related = relatedStories(r);
  const live = liveVersion(r);

  const illustration = (
    <div aria-hidden className="flex size-full items-center justify-center" style={{ color: typeColor(r.type) }}>
      <StoryTypeIcon type={r.type} width={120} height={120} strokeWidth={1} />
    </div>
  );

  return (
    <article className="mx-auto max-w-6xl px-4 py-10">
      {/* JSON-LD: data only, escaped against </script> injection. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd(r)).replace(/</g, "\\u003c") }}
      />

      <header className="mb-8 max-w-3xl">
        <p className="mb-3 inline-flex items-center gap-2 text-sm text-muted">
          <StoryTypeIcon type={r.type} style={{ color: typeColor(r.type) }} />
          {types(r.type)}
          {draft && SHOW_DRAFTS ? (
            <span className="pill ml-2 border border-[var(--accent)] px-2 py-0.5 text-xs text-accent">{ts("draft")}</span>
          ) : null}
        </p>
        <h1 className="mb-4 text-2xl font-bold sm:text-3xl">{r.titre}</h1>
        {!r.restreint ? <p className="prose-conte text-muted">{r.resume ?? t("noSummary")}</p> : null}
      </header>

      {r.restreint ? (
        <div role="note" className="card mb-10 max-w-3xl p-6">
          <h2 className="mb-2 text-lg text-accent">{t("restricted")}</h2>
          <p className="prose-conte text-muted">{t("restrictedText")}</p>
        </div>
      ) : !visible ? (
        <div role="note" className="card mb-10 max-w-3xl p-6">
          <h2 className="mb-2 text-lg text-accent">{t("collecting")}</h2>
          <p className="prose-conte mb-4 text-muted">{t("collectingText")}</p>
          <Link href="/contribuer" className="btn-cta">
            {t("youKnowIt")}
          </Link>
        </div>
      ) : r.versions.length > 0 ? (
        <div className="mb-12">
          <StoryTabs
            label={tm("label")}
            tabs={[
              {
                id: "ecouter",
                label: tm("listen"),
                content: (
                  <ListenMode slug={r.slug} titre={r.titre} versions={listenVersions(r)} illustration={illustration} />
                ),
              },
              { id: "lire", label: tm("read"), content: <ReadMode columns={readColumns(r)} /> },
              ...(live && r.estInteractif
                ? [
                    {
                      id: "vivre",
                      label: tm("live"),
                      content: (
                        <LiveMode
                          scenes={live.version.scenes}
                          type={r.type}
                          lang={bcp47(live.version.codeIso)}
                          track={
                            live.listen && live.listen.sources.length > 0
                              ? {
                                  id: live.listen.id,
                                  slug: r.slug,
                                  titre: r.titre,
                                  langue: live.listen.langue,
                                  lang: live.listen.lang,
                                  sources: live.listen.sources,
                                  vtt: live.listen.vtt,
                                  demo: live.listen.demo,
                                }
                              : undefined
                          }
                          morale={r.morale}
                          quizzes={quizFromScenes(live.version.scenes)}
                        />
                      ),
                    },
                  ]
                : []),
            ]}
          />
        </div>
      ) : (
        <div role="note" className="card mb-10 max-w-3xl p-6">
          <h2 className="mb-2 text-lg text-accent">{t("collecting")}</h2>
          <p className="prose-conte mb-4 text-muted">{t("collectingText")}</p>
          <Link href="/contribuer" className="btn-cta">
            {t("youKnowIt")}
          </Link>
        </div>
      )}

      <PatternDivider />

      <div className="grid gap-6 py-10 md:grid-cols-[1fr_20rem]">
        <section aria-labelledby="autour" className="card p-6">
          <h2 id="autour" className="mb-4 text-xl font-bold">
            {ta("title")}
          </h2>
          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-[11rem_1fr]">
            {regions.length > 0 ? (
              <Row label={t("region")}>
                {regions.map((reg) => (
                  <Link key={reg.id} href={`/regions/${reg.slug}`} className="text-accent underline underline-offset-4">
                    {reg.nom}
                  </Link>
                ))}
              </Row>
            ) : null}
            {site ? (
              <Row label={ta("site")}>
                {site.nom}{" "}
                {regions[0] ? (
                  <Link
                    href={`/carte?region=${regions[0].slug}`}
                    className="text-sm text-accent underline underline-offset-4"
                  >
                    ({ta("seeOnMap")})
                  </Link>
                ) : null}
              </Row>
            ) : null}
            {!r.restreint && r.ethnieIds.length > 0 ? (
              <Row label={ta("people")}>{r.ethnieIds.map((id) => ethnieById.get(id)?.nom).join(", ")}</Row>
            ) : null}
            {!r.restreint && r.instrumentIds.length > 0 ? (
              <Row label={ta("instrument")}>
                {r.instrumentIds.map((id) => {
                  const i = instrumentById.get(id)!;
                  return (
                    <span key={id} className="block">
                      <span className="font-bold">{i.nom}</span>
                      {i.description ? <span className="block text-sm text-muted">{i.description}</span> : null}
                    </span>
                  );
                })}
              </Row>
            ) : null}
            {!r.restreint && r.personnages.length > 0 ? (
              <Row label={t("characters")}>{r.personnages.map((p) => p.nom).join(", ")}</Row>
            ) : null}
            {!r.restreint && r.themeIds.length > 0 ? (
              <Row label={t("themes")}>{r.themeIds.map((id) => themeById.get(id)?.label).join(", ")}</Row>
            ) : null}
            {!r.restreint && r.langueAEnregistrer.length > 0 ? (
              <Row label={t("toRecord")}>{r.langueAEnregistrer.map((id) => langueById.get(id)?.nom).join(", ")}</Row>
            ) : null}
          </dl>
        </section>

        <aside aria-labelledby="droits" className="card h-fit p-6">
          <h2 id="droits" className="mb-4 text-lg font-bold">
            {tc("title")}
          </h2>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-muted">{tc("storyteller")}</dt>
              <dd>{conteurs.length > 0 ? conteurs.join(", ") : tc("unknownStoryteller")}</dd>
            </div>
            <div>
              <dt className="text-muted">{tc("license")}</dt>
              <dd>
                <a
                  href="https://creativecommons.org/licenses/by-nc/4.0/deed.fr"
                  className="underline underline-offset-4"
                  rel="license noopener"
                  target="_blank"
                >
                  {tc("licenseValue")}
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-muted">{tc("sources")}</dt>
              <dd>{tc("sourcesValue")}</dd>
            </div>
          </dl>
        </aside>
      </div>

      {!r.restreint ? (
        <section aria-labelledby="lies">
          <h2 id="lies" className="mb-4 text-xl font-bold">
            {ta("related")}
          </h2>
          {related.length > 0 ? (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {related.map((o) => (
                <li key={o.id}>
                  <StoryCard recit={o} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted">{ta("noRelated")}</p>
          )}
        </section>
      ) : null}
    </article>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="text-muted">{label}</dt>
      <dd>{children}</dd>
    </>
  );
}
