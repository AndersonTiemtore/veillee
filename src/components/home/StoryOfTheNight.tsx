"use client";

import { useTranslations } from "next-intl";
import { useSyncExternalStore } from "react";
import { Link } from "@/i18n/navigation";

export interface NightCandidate {
  slug: string;
  titre: string;
  resume?: string;
  typeLabel: string;
}

const noop = () => () => {};
/** Days since the Unix epoch, in Ouagadougou time (UTC+0). */
const today = () => Math.floor(Date.now() / 86_400_000);

/** "Conte de la veillée": the same story for everyone on a given day. */
export function StoryOfTheNight({ candidates }: { candidates: NightCandidate[] }) {
  const t = useTranslations("home");
  const day = useSyncExternalStore(noop, today, () => null);
  const story = day === null || candidates.length === 0 ? undefined : candidates[day % candidates.length];

  return (
    <section aria-labelledby="conte-du-jour" className="card flex flex-col p-6">
      <h2 id="conte-du-jour" className="mb-3 text-xl text-accent">
        {t("storyOfTheNight")}
      </h2>
      {candidates.length === 0 ? (
        <p className="prose-conte text-muted">{t("storyOfTheNightEmpty")}</p>
      ) : story ? (
        <>
          <p className="text-sm text-muted">{story.typeLabel}</p>
          <p className="mb-2 font-display text-xl font-bold">{story.titre}</p>
          {story.resume ? <p className="prose-conte mb-4 text-muted">{story.resume}</p> : null}
          <Link href={`/contes/${story.slug}`} className="btn-cta mt-auto self-start">
            {t("storyOfTheNightCta")}
          </Link>
        </>
      ) : (
        <div aria-hidden className="h-32" />
      )}
    </section>
  );
}
