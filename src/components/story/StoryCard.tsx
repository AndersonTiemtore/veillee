import { useTranslations } from "next-intl";
import type { Recit } from "@/data/schemas";
import { Link } from "@/i18n/navigation";
import { langueById, regionById } from "@/lib/data";
import { typeColor } from "@/lib/map/style";
import { SHOW_DRAFTS } from "@/lib/site";
import { StoryTypeIcon } from "@/components/ui/Pictogram";

const minutes = (s?: number) => (s ? Math.max(1, Math.round(s / 60)) : undefined);

/** Catalogue card. No illustration has established rights yet: a pictogram stands in. */
export function StoryCard({ recit }: { recit: Recit }) {
  const t = useTranslations();
  const color = typeColor(recit.type);
  const region = recit.regionIds.map((id) => regionById.get(id)?.nom).filter(Boolean).join(", ");
  const langues = [...new Set(recit.versions.map((v) => langueById.get(v.langueId)?.nom))].filter(Boolean);
  const duree = minutes(Math.max(0, ...recit.versions.map((v) => v.dureeSecondes ?? 0)));
  const collecting = !recit.publiable;

  return (
    <Link
      href={`/contes/${recit.slug}`}
      className="card group flex h-full flex-col overflow-hidden transition-shadow hover:shadow-glow"
    >
      <div
        aria-hidden
        className="flex aspect-[16/9] items-center justify-center bg-bg"
        style={{
          color,
          backgroundImage: `radial-gradient(circle at 50% 120%, color-mix(in srgb, ${color} 22%, transparent), transparent 70%)`,
        }}
      >
        <StoryTypeIcon type={recit.type} width={56} height={56} />
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="pill border px-2 py-0.5" style={{ borderColor: color }}>
            {t(`storyTypes.${recit.type}`)}
          </span>
          {recit.restreint ? (
            <span className="pill border border-border px-2 py-0.5 text-muted">{t("story.restricted")}</span>
          ) : collecting ? (
            <span className="pill border border-border px-2 py-0.5 text-muted">
              {SHOW_DRAFTS ? t("status.draft") : t("status.collecting")}
            </span>
          ) : null}
        </div>
        <h3 className="text-lg font-bold group-hover:text-accent">{recit.titre}</h3>
        <p className="mt-auto text-xs text-muted">
          {[region, langues.join(" · "), duree ? `${duree} min` : undefined].filter(Boolean).join(" — ")}
        </p>
      </div>
    </Link>
  );
}
