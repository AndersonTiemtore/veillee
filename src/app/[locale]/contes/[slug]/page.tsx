import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { StoryTypeIcon } from "@/components/ui/Pictogram";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { ethnieById, langueById, recits, regionById, siteById, themeById } from "@/lib/data";
import { typeColor } from "@/lib/map/style";

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => recits.map((r) => ({ locale, slug: r.slug })));
}

export const dynamicParams = false;

const findStory = (slug: string) => recits.find((r) => r.slug === slug);

export async function generateMetadata({ params }: PageProps<"/[locale]/contes/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const r = findStory(slug);
  if (!r) return {};
  return { title: r.titre, description: r.restreint ? undefined : r.resume };
}

export default async function StoryPage({ params }: PageProps<"/[locale]/contes/[slug]">) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const r = findStory(slug);
  if (!r) notFound();

  const t = await getTranslations("story");
  const types = await getTranslations("storyTypes");
  const site = r.siteId ? siteById.get(r.siteId) : undefined;
  const regions = r.regionIds.map((id) => regionById.get(id)!).filter(Boolean);

  return (
    <article className="mx-auto max-w-3xl px-4 py-10">
      <p className="mb-3 inline-flex items-center gap-2 text-sm text-muted">
        <StoryTypeIcon type={r.type} style={{ color: typeColor(r.type) }} />
        {types(r.type)}
      </p>
      <h1 className="mb-6 text-2xl font-bold sm:text-3xl">{r.titre}</h1>

      {r.restreint ? (
        <div role="note" className="card mb-8 p-5">
          <h2 className="mb-2 text-lg text-accent">{t("restricted")}</h2>
          <p className="prose-conte text-muted">{t("restrictedText")}</p>
        </div>
      ) : !r.publiable ? (
        <div role="note" className="card mb-8 p-5">
          <h2 className="mb-2 text-lg text-accent">{t("collecting")}</h2>
          <p className="prose-conte mb-4 text-muted">{t("collectingText")}</p>
          <Link href="/contribuer" className="btn-cta">
            {t("youKnowIt")}
          </Link>
        </div>
      ) : null}

      {!r.restreint ? <p className="prose-conte mb-8">{r.resume ?? t("noSummary")}</p> : null}

      <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-[10rem_1fr]">
        {regions.length > 0 ? (
          <>
            <dt className="text-muted">{t("region")}</dt>
            <dd>
              {regions.map((reg) => (
                <Link key={reg.id} href={`/regions/${reg.slug}`} className="text-accent underline underline-offset-4">
                  {reg.nom}
                </Link>
              ))}
            </dd>
          </>
        ) : null}
        {site ? (
          <>
            <dt className="text-muted">{t("site")}</dt>
            <dd>{site.nom}</dd>
          </>
        ) : null}
        {!r.restreint && r.ethnieIds.length > 0 ? (
          <>
            <dt className="text-muted">{t("people")}</dt>
            <dd>{r.ethnieIds.map((id) => ethnieById.get(id)?.nom).join(", ")}</dd>
          </>
        ) : null}
        {!r.restreint && r.personnages.length > 0 ? (
          <>
            <dt className="text-muted">{t("characters")}</dt>
            <dd>{r.personnages.map((p) => p.nom).join(", ")}</dd>
          </>
        ) : null}
        {!r.restreint && r.themeIds.length > 0 ? (
          <>
            <dt className="text-muted">{t("themes")}</dt>
            <dd>{r.themeIds.map((id) => themeById.get(id)?.label).join(", ")}</dd>
          </>
        ) : null}
        {!r.restreint && r.langueAEnregistrer.length > 0 ? (
          <>
            <dt className="text-muted">{t("toRecord")}</dt>
            <dd>{r.langueAEnregistrer.map((id) => langueById.get(id)?.nom).join(", ")}</dd>
          </>
        ) : null}
      </dl>
    </article>
  );
}
