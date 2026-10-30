"use client";

import { Pause, Play } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/lib/a11y/motion";
import { activeCue, parseVtt, type Cue } from "@/lib/media/vtt";
import { usePlayer, type Track } from "@/stores/player";

export interface ListenVersion {
  id: string;
  langue: string;
  lang: string;
  sources: string[];
  vtt?: string;
  demo: boolean;
  dureeSecondes?: number;
  /** Shown as transcript when there are no subtitles. */
  fallbackText?: string[];
}

interface Props {
  slug: string;
  titre: string;
  versions: ListenVersion[];
  illustration: React.ReactNode;
}

export function ListenMode({ slug, titre, versions, illustration }: Props) {
  const t = useTranslations("listen");
  const reducedMotion = useReducedMotion();
  // Prefer a version that can actually be heard.
  const [versionId, setVersionId] = useState(
    (versions.find((v) => v.sources.length > 0) ?? versions[0])?.id,
  );
  const version = versions.find((v) => v.id === versionId);
  const [cues, setCues] = useState<{ url: string; cues: Cue[] }>();

  const { track, status, position, play, pause } = usePlayer();
  const isCurrent = track?.id === version?.id;
  const playing = isCurrent && status === "playing";
  const current = isCurrent && cues ? activeCue(cues.cues, position) : -1;
  const listRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const url = version?.vtt;
    if (!url || cues?.url === url) return;
    let alive = true;
    fetch(url)
      .then((r) => r.text())
      .then((text) => alive && setCues({ url, cues: parseVtt(text) }))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [version?.vtt, cues?.url]);

  // Keep the spoken sentence in view.
  useEffect(() => {
    if (current < 0) return;
    listRef.current
      ?.querySelector(`[data-cue="${current}"]`)
      ?.scrollIntoView({ block: "nearest", behavior: reducedMotion ? "auto" : "smooth" });
  }, [current, reducedMotion]);

  if (!version) return null;

  const trackFor = (v: ListenVersion): Track => ({
    id: v.id,
    slug,
    titre,
    langue: v.langue,
    lang: v.lang,
    sources: v.sources,
    vtt: v.vtt,
    demo: v.demo,
  });
  const canPlay = version.sources.length > 0;
  const shownCues = cues && cues.url === version.vtt ? cues.cues : [];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <div className="card flex aspect-[4/3] items-center justify-center overflow-hidden">{illustration}</div>

      <div className="flex flex-col gap-4">
        {versions.length > 1 ? (
          <label className="text-sm font-bold">
            {t("language")}
            <select
              value={version.id}
              onChange={(e) => setVersionId(e.target.value)}
              className="mt-1 block min-h-11 w-full rounded-full border border-border bg-surface px-4 font-normal"
            >
              {versions.map((v) => (
                <option key={v.id} value={v.id} lang={v.lang}>
                  {v.langue}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {canPlay ? (
          <button
            type="button"
            onClick={() => (playing ? pause() : void play(trackFor(version)))}
            className="btn-cta self-start"
          >
            {playing ? <Pause aria-hidden size={18} /> : <Play aria-hidden size={18} />}
            {playing ? t("pause") : isCurrent ? t("resume") : t("play")}
            {version.dureeSecondes ? (
              <span className="font-normal opacity-80">
                · {t("duration", { minutes: Math.max(1, Math.round(version.dureeSecondes / 60)) })}
              </span>
            ) : null}
          </button>
        ) : (
          <p className="text-muted">{t("noAudio")}</p>
        )}
        {version.demo ? <p className="text-xs text-muted">{t("demoNotice")}</p> : null}

        {shownCues.length > 0 ? (
          <section aria-labelledby="transcription">
            <h3 id="transcription" className="text-lg font-bold">
              {t("transcript")}
            </h3>
            <p className="mb-2 text-xs text-muted">{t("transcriptHint")}</p>
            <ol ref={listRef} lang={version.lang} className="prose-conte max-h-80 space-y-1 overflow-y-auto">
              {shownCues.map((cue, i) => (
                <li key={`${cue.start}-${i}`}>
                  <button
                    type="button"
                    data-cue={i}
                    aria-current={i === current ? "true" : undefined}
                    onClick={() => void play(trackFor(version), cue.start)}
                    className="w-full rounded-[var(--r-card)] px-3 py-1.5 text-left transition-colors hover:bg-surface-hover aria-[current]:bg-[color-mix(in_srgb,var(--flamme)_28%,transparent)] aria-[current]:font-bold"
                  >
                    {cue.text}
                  </button>
                </li>
              ))}
            </ol>
          </section>
        ) : version.fallbackText?.length ? (
          <section aria-labelledby="transcription">
            <h3 id="transcription" className="text-lg font-bold">
              {t("transcript")}
            </h3>
            <div lang={version.lang} className="prose-conte space-y-2">
              {version.fallbackText.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
