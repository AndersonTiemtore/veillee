import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { Catalogue, type CatalogueItem } from "@/components/story/Catalogue";
import { cardView, longestDuration } from "@/components/story/StoryCard";
import { StoryCardView } from "@/components/story/StoryCardView";
import { recits } from "@/lib/data";
import { filterOptions, storyLangueIds } from "@/lib/data/views";

export async function generateMetadata({ params }: PageProps<"/[locale]/contes">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pages" });
  return { title: t("stories") };
}

export default async function CataloguePage({ params }: PageProps<"/[locale]/contes">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const items: CatalogueItem[] = recits.map((r) => ({
    card: cardView(r, t),
    titre: r.titre,
    type: r.type,
    langueIds: storyLangueIds(r),
    themeIds: r.themeIds,
    publicCible: r.publicCible,
    duree: longestDuration(r),
    dateCollecte: r.dateCollecte,
  }));

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold sm:text-3xl">{t("pages.stories")}</h1>
      {/* Filters live in the URL; the static fallback lists every story. */}
      <Suspense
        fallback={
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((i) => (
              <li key={i.card.id}>
                <StoryCardView card={i.card} />
              </li>
            ))}
          </ul>
        }
      >
        <Catalogue items={items} options={filterOptions()} />
      </Suspense>
    </div>
  );
}
