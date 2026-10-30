"use client";

import { Pause, Play, RotateCcw, RotateCw, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Flamme } from "@/components/ui/Pictogram";
import { RATES, SKIP_SECONDS, usePlayer } from "@/stores/player";

export const formatTime = (s: number) => {
  const total = Math.max(0, Math.floor(s || 0));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
};

/** Persistent player docked at the bottom, mounted once in the root layout. */
export function MiniPlayer() {
  const t = useTranslations("player");
  const { track, status, position, duration, rate, toggle, skip, seek, setRate, close } = usePlayer();
  if (!track) return null;
  const playing = status === "playing";

  return (
    <>
    {/* Keeps the footer reachable above the docked player. */}
    <div aria-hidden className="h-28 sm:h-20" />
    <section
      aria-label={t("label")}
      className="float-panel fixed inset-x-2 bottom-2 z-50 mx-auto flex max-w-3xl flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 sm:px-4"
    >
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? t("pause") : t("play")}
        className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-cta text-cta-text"
      >
        {playing ? <Pause aria-hidden size={20} /> : <Play aria-hidden size={20} />}
      </button>

      <div className="min-w-0 flex-1">
        <Link href={`/contes/${track.slug}`} className="flex items-center gap-1.5 truncate font-bold hover:text-accent">
          {playing ? <Flamme aria-hidden className="flicker shrink-0 text-flamme" width={16} height={16} /> : null}
          <span className="truncate">{track.titre}</span>
        </Link>
        <p className="truncate text-xs text-muted">
          <span lang={track.lang}>{track.langue}</span>
          {track.demo ? ` · ${t("demo")}` : null}
          {status === "loading" ? ` · ${t("loading")}` : null}
          {status === "error" ? ` · ${t("error")}` : null}
        </p>
      </div>

      <div className="order-last flex w-full items-center gap-2 text-xs tabular-nums sm:order-none sm:w-56">
        <span aria-hidden>{formatTime(position)}</span>
        <input
          type="range"
          min={0}
          max={Math.max(duration, 1)}
          step={0.1}
          value={Math.min(position, duration || position)}
          onChange={(e) => seek(Number(e.target.value))}
          aria-label={t("progress")}
          aria-valuetext={`${formatTime(position)} / ${formatTime(duration)}`}
          className="h-1 flex-1 accent-[var(--accent)]"
        />
        <span aria-hidden>{formatTime(duration)}</span>
      </div>

      <div className="flex items-center gap-1">
        <IconButton label={t("back")} onClick={() => skip(-SKIP_SECONDS)}>
          <RotateCcw aria-hidden size={18} />
        </IconButton>
        <IconButton label={t("forward")} onClick={() => skip(SKIP_SECONDS)}>
          <RotateCw aria-hidden size={18} />
        </IconButton>
        <label className="sr-only" htmlFor="vitesse">
          {t("speed")}
        </label>
        <select
          id="vitesse"
          value={rate}
          onChange={(e) => setRate(Number(e.target.value))}
          className="min-h-11 rounded-full border border-border bg-surface px-2 text-sm"
        >
          {RATES.map((r) => (
            <option key={r} value={r}>
              {r}×
            </option>
          ))}
        </select>
        <IconButton label={t("close")} onClick={close}>
          <X aria-hidden size={18} />
        </IconButton>
      </div>
    </section>
    </>
  );
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="inline-flex size-11 items-center justify-center rounded-full hover:bg-surface-hover"
    >
      {children}
    </button>
  );
}
