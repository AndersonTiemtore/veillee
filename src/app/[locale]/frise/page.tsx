import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { StoryCard } from "@/components/story/StoryCard";
import { Couronne } from "@/components/ui/Pictogram";
import { recits } from "@/lib/data";

export async function generateMetadata({ params }: PageProps<"/[locale]/frise">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pages" });
  return { title: t("timeline") };
}

// Stories placed on the timeline: founding myths and historical accounts.
const TIMELINE_TYPES = new Set(["mythe_fondateur", "recit_historique"]);

export default async function TimelinePage({ params }: PageProps<"/[locale]/frise">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("timeline");
  const tp = await getTranslations("pages");

  // No story is linked to a Periode/Epoque in the ontology yet, so every
  // candidate is "awaiting dating"; the timeline itself appears once they are.
  const candidates = recits.filter((r) => TIMELINE_TYPES.has(r.type) && !r.restreint);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="mb-2 text-2xl font-bold sm:text-3xl">{tp("timeline")}</h1>
      <p className="prose-conte mb-8 text-muted">{t("intro")}</p>

      <div className="card mb-10 flex flex-col items-center gap-4 p-8 text-center">
        <Couronne aria-hidden width={48} height={48} className="text-accent" />
        {/* The empty axis keeps the page's shape. */}
        <div aria-hidden className="relative my-2 h-1 w-full max-w-xl rounded-full bg-border">
          {[0, 25, 50, 75, 100].map((x) => (
            <span
              key={x}
              className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-border bg-surface"
              style={{ left: `${x}%` }}
            />
          ))}
        </div>
        <p className="prose-conte max-w-xl text-muted">{t("empty")}</p>
      </div>

      {candidates.length > 0 ? (
        <section aria-labelledby="non-dates">
          <h2 id="non-dates" className="mb-4 text-xl font-bold">
            {t("undated")}
          </h2>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {candidates.map((r) => (
              <li key={r.id}>
                <StoryCard recit={r} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
