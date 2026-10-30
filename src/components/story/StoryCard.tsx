import "server-only";
import { useTranslations } from "next-intl";
import type { Recit } from "@/data/schemas";
import { langueById, regionById } from "@/lib/data";
import { SHOW_DRAFTS } from "@/lib/site";
import { StoryCardView, type CardView } from "./StoryCardView";

type T = ReturnType<typeof useTranslations>;

export const longestDuration = (r: Recit) => Math.max(0, ...r.versions.map((v) => v.dureeSecondes ?? 0));

/** Card view model; no illustration has established rights yet, a pictogram stands in. */
export function cardView(recit: Recit, t: T): CardView {
  const region = recit.regionIds.map((id) => regionById.get(id)?.nom).filter(Boolean).join(", ");
  const langues = [...new Set(recit.versions.map((v) => langueById.get(v.langueId)?.nom))].filter(Boolean);
  const duree = longestDuration(recit);
  const status = recit.restreint
    ? t("story.restricted")
    : recit.publiable
      ? undefined
      : SHOW_DRAFTS
        ? t("status.draft")
        : t("status.collecting");
  return {
    id: recit.id,
    slug: recit.slug,
    titre: recit.titre,
    type: recit.type,
    typeLabel: t(`storyTypes.${recit.type}`),
    status,
    meta: [region, langues.join(" · "), duree ? `${Math.max(1, Math.round(duree / 60))} min` : undefined]
      .filter(Boolean)
      .join(" — "),
  };
}

export function StoryCard({ recit }: { recit: Recit }) {
  const t = useTranslations();
  return <StoryCardView card={cardView(recit, t)} />;
}
