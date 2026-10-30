"use client";

import { Volume2, VolumeX } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import type { RecitType, Scene } from "@/data/schemas";
import { useReducedMotion } from "@/lib/a11y/motion";
import { typeColor } from "@/lib/map/style";
import type { Quiz } from "@/lib/quiz";
import { usePlayer, type Track } from "@/stores/player";
import { StoryTypeIcon } from "@/components/ui/Pictogram";
import { QuizCard } from "./QuizCard";

interface Props {
  scenes: Scene[];
  type: RecitType;
  lang: string;
  /** Audio of the version the scenes belong to, if any. */
  track?: Track;
  morale?: string;
  quizzes: Quiz[];
}

const DETOUR_MS = 1400;

/** Index of the last scene shown when `unlocked` choice scenes have been passed. */
function revealedUntil(scenes: Scene[], passedChoices: Set<number>): number {
  for (let i = 0; i < scenes.length; i++) {
    const s = scenes[i]!;
    if (s.choix.length > 0 && !passedChoices.has(s.ordre)) return i;
  }
  return scenes.length - 1;
}

export function LiveMode({ scenes: unsorted, type, lang, track, morale, quizzes }: Props) {
  const t = useTranslations("live");
  const reducedMotion = useReducedMotion();
  const scenes = useMemo(() => [...unsorted].sort((a, b) => a.ordre - b.ordre), [unsorted]);
  const [started, setStarted] = useState(false);
  const [passed, setPassed] = useState<Set<number>>(new Set());
  const [detour, setDetour] = useState(false);
  const [sound, setSound] = useState(false);
  const [segment, setSegment] = useState<Scene>();
  const root = useRef<HTMLDivElement>(null);
  const { play, pause, position, status, track: current } = usePlayer();

  const lastShown = revealedUntil(scenes, passed);
  const finished = lastShown === scenes.length - 1 && scenes[lastShown]!.choix.length === 0;
  const shown = scenes.slice(0, lastShown + 1);

  // Stop at the end of the scene's audio excerpt.
  useEffect(() => {
    if (!segment?.finAudio || current?.id !== track?.id || status !== "playing") return;
    if (position >= segment.finAudio) pause();
  }, [position, segment, status, current?.id, track?.id, pause]);

  // Entrance animations (GSAP ScrollTrigger), skipped when motion is reduced.
  useEffect(() => {
    if (!started || reducedMotion || !root.current) return;
    let revert: (() => void) | undefined;
    let cancelled = false;
    void Promise.all([import("gsap"), import("gsap/ScrollTrigger")]).then(([{ gsap }, { ScrollTrigger }]) => {
      if (cancelled || !root.current) return;
      gsap.registerPlugin(ScrollTrigger);
      const ctx = gsap.context(() => {
        for (const el of gsap.utils.toArray<HTMLElement>("[data-scene]")) {
          gsap.from(el.querySelector("[data-illu]"), {
            opacity: 0,
            scale: 0.94,
            duration: 0.4,
            ease: "power2.out",
            scrollTrigger: { trigger: el, start: "top 75%" },
          });
          gsap.from(el.querySelector("[data-text]"), {
            opacity: 0,
            y: 24,
            duration: 0.4,
            ease: "power2.out",
            scrollTrigger: { trigger: el, start: "top 70%" },
          });
        }
      }, root.current);
      revert = () => ctx.revert();
    });
    return () => {
      cancelled = true;
      revert?.();
    };
  }, [started, reducedMotion, lastShown]);

  function goTo(ordre: number) {
    // Wait for newly revealed scenes to render.
    requestAnimationFrame(() => {
      const heading = root.current?.querySelector<HTMLElement>(`#scene-${ordre}`);
      heading?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
      heading?.focus({ preventScroll: true });
    });
    const scene = scenes.find((s) => s.ordre === ordre);
    if (sound && track && scene?.debutAudio !== undefined) {
      setSegment(scene);
      void play(track, scene.debutAudio);
    }
  }

  function choose(scene: Scene, index: number) {
    const choice = scene.choix[index]!;
    if (choice.vraieFin) {
      setPassed((p) => new Set(p).add(scene.ordre));
      goTo(choice.cibleOrdre);
      return;
    }
    setDetour(true);
    setTimeout(
      () => {
        setDetour(false);
        goTo(choice.cibleOrdre);
      },
      reducedMotion ? 0 : DETOUR_MS,
    );
  }

  function restart() {
    setPassed(new Set());
    goTo(scenes[0]!.ordre);
  }

  if (!started) {
    return (
      <div className="card flex flex-col items-start gap-4 p-6">
        <p className="prose-conte">{t("intro")}</p>
        <button
          type="button"
          className="btn-cta"
          onClick={() => {
            setStarted(true);
            goTo(scenes[0]!.ordre);
          }}
        >
          {t("start")}
        </button>
      </div>
    );
  }

  return (
    <div ref={root} className="relative">
      {track ? (
        <label className="mb-4 inline-flex min-h-11 items-center gap-2 text-sm">
          <input
            type="checkbox"
            role="switch"
            className="size-5 accent-[var(--accent)]"
            checked={sound}
            onChange={(e) => setSound(e.target.checked)}
          />
          {sound ? <Volume2 aria-hidden size={18} /> : <VolumeX aria-hidden size={18} />}
          {t("sound")}
        </label>
      ) : null}

      <ol className="space-y-6">
        {shown.map((scene, i) => {
          const isLast = i === scenes.length - 1;
          return (
            <li key={scene.ordre}>
              <section
                data-scene
                aria-labelledby={`scene-${scene.ordre}`}
                className="grid min-h-[60vh] items-center gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]"
              >
                <div
                  data-illu
                  aria-hidden
                  className="card flex aspect-square items-center justify-center md:sticky md:top-24"
                  style={{ color: typeColor(type) }}
                >
                  <StoryTypeIcon type={type} width={96} height={96} strokeWidth={1} />
                </div>
                <div data-text>
                  <h3
                    id={`scene-${scene.ordre}`}
                    tabIndex={-1}
                    className="mb-3 scroll-mt-28 text-sm font-bold tracking-wide text-accent uppercase"
                  >
                    {t("scene", { n: scene.ordre })}
                  </h3>
                  <p lang={lang} className="prose-conte mb-6 text-xl">
                    {scene.texte}
                  </p>

                  {scene.choix.length > 0 ? (
                    <fieldset>
                      <legend className="mb-3 font-bold">{t("choose")}</legend>
                      <div className="flex flex-col gap-3 sm:flex-row">
                        {scene.choix.map((c, ci) => (
                          <button
                            key={c.libelle}
                            type="button"
                            lang={lang}
                            disabled={detour || passed.has(scene.ordre)}
                            onClick={() => choose(scene, ci)}
                            className="min-h-12 rounded-full border-2 border-[var(--accent)] px-5 font-bold hover:bg-surface-hover disabled:opacity-50"
                          >
                            {c.libelle}
                          </button>
                        ))}
                      </div>
                    </fieldset>
                  ) : !isLast ? (
                    <button type="button" className="btn-cta" onClick={() => goTo(scenes[i + 1]!.ordre)}>
                      {t("next")}
                    </button>
                  ) : null}
                </div>
              </section>
            </li>
          );
        })}
      </ol>

      {finished ? (
        <section aria-labelledby="fin-recit" className="mt-10 space-y-6">
          <h3 id="fin-recit" tabIndex={-1} className="scroll-mt-28 text-2xl font-bold">
            {t("end")}
          </h3>
          {morale ? (
            <div className="card p-5">
              <p className="mb-1 text-sm font-bold text-accent">{t("moral")}</p>
              <p lang={lang} className="prose-conte">
                {morale}
              </p>
            </div>
          ) : null}
          {quizzes.map((q) => (
            <QuizCard key={q.context} quiz={q} lang={lang} />
          ))}
          <button type="button" className="text-accent underline underline-offset-4" onClick={restart}>
            {t("restart")}
          </button>
        </section>
      ) : null}

      <div
        role="status"
        aria-live="assertive"
        className={`pointer-events-none fixed inset-0 z-40 flex items-center justify-center bg-[color-mix(in_srgb,var(--bg)_88%,transparent)] p-6 transition-opacity duration-300 ${
          detour ? "opacity-100" : "opacity-0"
        }`}
      >
        {detour ? <p className="prose-conte max-w-md text-center text-xl font-bold">{t("detour")}</p> : null}
      </div>
    </div>
  );
}
