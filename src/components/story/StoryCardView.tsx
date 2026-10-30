import type { RecitType } from "@/data/schemas";
import { Link } from "@/i18n/navigation";
import { typeColor } from "@/lib/map/style";
import { StoryTypeIcon } from "@/components/ui/Pictogram";

/** Everything a catalogue card shows, precomputed on the server. */
export interface CardView {
  id: string;
  slug: string;
  titre: string;
  type: RecitType;
  typeLabel: string;
  /** "En cours de collecte", "Brouillon", "Récit protégé"… */
  status?: string;
  meta: string;
}

/** Presentational card, usable from server and client components. */
export function StoryCardView({ card }: { card: CardView }) {
  const color = typeColor(card.type);
  return (
    <Link
      href={`/contes/${card.slug}`}
      className="card group flex h-full flex-col overflow-hidden transition-shadow hover:shadow-[var(--shadow-float)]"
    >
      <div
        aria-hidden
        className="flex aspect-[16/9] items-center justify-center bg-bg"
        style={{
          color,
          backgroundImage: `radial-gradient(circle at 50% 120%, color-mix(in srgb, ${color} 22%, transparent), transparent 70%)`,
        }}
      >
        <StoryTypeIcon type={card.type} width={56} height={56} />
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="pill border px-2 py-0.5" style={{ borderColor: color }}>
            {card.typeLabel}
          </span>
          {card.status ? <span className="pill border border-border px-2 py-0.5 text-muted">{card.status}</span> : null}
        </div>
        <h3 className="text-lg font-bold group-hover:text-accent">{card.titre}</h3>
        <p className="mt-auto text-xs text-muted">{card.meta}</p>
      </div>
    </Link>
  );
}
