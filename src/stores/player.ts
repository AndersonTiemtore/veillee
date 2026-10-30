"use client";

import type { Howl } from "howler";
import { create } from "zustand";

export interface Track {
  /** Version id: one track per story version. */
  id: string;
  slug: string;
  titre: string;
  langue: string;
  /** BCP 47 tag of the spoken language. */
  lang: string;
  /** Opus first, AAC fallback. */
  sources: string[];
  vtt?: string;
  demo: boolean;
}

type Status = "idle" | "loading" | "playing" | "paused" | "error";

interface PlayerState {
  track?: Track;
  status: Status;
  position: number;
  duration: number;
  rate: number;
  /** Loads a track (if new) and starts playing. Only call from a user gesture. */
  play: (track?: Track, at?: number) => Promise<void>;
  pause: () => void;
  toggle: () => void;
  seek: (seconds: number) => void;
  skip: (delta: number) => void;
  setRate: (rate: number) => void;
  close: () => void;
}

export const RATES = [0.75, 1, 1.25, 1.5] as const;
const SKIP_SECONDS = 10;

// The Howler instance lives outside React so playback survives navigation.
let howl: Howl | null = null;
let ticker: ReturnType<typeof setInterval> | undefined;

export const usePlayer = create<PlayerState>()((set, get) => {
  const stopTicker = () => {
    clearInterval(ticker);
    ticker = undefined;
  };
  const startTicker = () => {
    stopTicker();
    ticker = setInterval(() => {
      if (howl) set({ position: howl.seek() as number });
    }, 200);
  };

  async function load(track: Track) {
    howl?.unload();
    stopTicker();
    set({ track, status: "loading", position: 0, duration: 0 });
    const { Howl } = await import("howler");
    howl = new Howl({
      src: track.sources,
      format: track.sources.map((s) => s.split(".").pop() ?? ""),
      html5: true, // streams; no full download before playing
      preload: "metadata",
      rate: get().rate,
      onload: () => set({ duration: howl?.duration() ?? 0 }),
      onplay: () => {
        set({ status: "playing", duration: howl?.duration() ?? get().duration });
        startTicker();
        updateMediaSession(get());
      },
      onpause: () => {
        stopTicker();
        set({ status: "paused" });
      },
      onend: () => {
        stopTicker();
        set({ status: "paused", position: get().duration });
      },
      onseek: () => set({ position: (howl?.seek() as number) ?? 0 }),
      onloaderror: () => set({ status: "error" }),
      onplayerror: () => set({ status: "error" }),
    });
    setupMediaSession();
    updateMediaSession(get());
  }

  return {
    status: "idle",
    position: 0,
    duration: 0,
    rate: 1,

    async play(track, at) {
      if (track && track.id !== get().track?.id) await load(track);
      if (!howl) return;
      if (at !== undefined) {
        howl.seek(at);
        set({ position: at });
      }
      if (!howl.playing()) howl.play();
    },
    pause() {
      howl?.pause();
    },
    toggle() {
      if (howl?.playing()) howl.pause();
      else void get().play();
    },
    seek(seconds) {
      if (!howl) return;
      const t = Math.max(0, Math.min(seconds, get().duration || seconds));
      howl.seek(t);
      set({ position: t });
    },
    skip(delta) {
      get().seek(get().position + delta);
    },
    setRate(rate) {
      howl?.rate(rate);
      set({ rate });
    },
    close() {
      howl?.unload();
      howl = null;
      stopTicker();
      set({ track: undefined, status: "idle", position: 0, duration: 0 });
      if ("mediaSession" in navigator) navigator.mediaSession.metadata = null;
    },
  };
});

let mediaSessionReady = false;

/** Lock-screen and headset controls (Media Session API). */
function setupMediaSession() {
  if (mediaSessionReady || !("mediaSession" in navigator)) return;
  mediaSessionReady = true;
  const s = () => usePlayer.getState();
  const handlers: [MediaSessionAction, MediaSessionActionHandler][] = [
    ["play", () => void s().play()],
    ["pause", () => s().pause()],
    ["seekbackward", (d) => s().skip(-(d.seekOffset ?? SKIP_SECONDS))],
    ["seekforward", (d) => s().skip(d.seekOffset ?? SKIP_SECONDS)],
    ["seekto", (d) => d.seekTime !== undefined && s().seek(d.seekTime)],
    ["stop", () => s().close()],
  ];
  for (const [action, handler] of handlers) {
    try {
      navigator.mediaSession.setActionHandler(action, handler);
    } catch {
      // Action not supported by this browser.
    }
  }
}

function updateMediaSession({ track }: PlayerState) {
  if (!track || !("mediaSession" in navigator)) return;
  navigator.mediaSession.metadata = new MediaMetadata({
    title: track.titre,
    artist: track.langue,
    album: "Veillée — contes et légendes du Burkina Faso",
    artwork: [{ src: "/icon.svg", sizes: "512x512", type: "image/svg+xml" }],
  });
}

export { SKIP_SECONDS };
