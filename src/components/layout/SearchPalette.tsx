"use client";

import type Fuse from "fuse.js";
import { Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import type { SearchEntry } from "@/data/schemas";
import { Link } from "@/i18n/navigation";

const MIN_QUERY = 2;
const MAX_RESULTS = 8;

/** ⌘K / Ctrl+K search over stories, regions, languages and themes. */
export function SearchPalette() {
  const t = useTranslations("search");
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [fuse, setFuse] = useState<Fuse<SearchEntry>>();
  const [query, setQuery] = useState("");

  async function open() {
    dialog.current?.showModal();
    input.current?.focus();
    if (fuse) return;
    // Index and Fuse are only downloaded when the palette is first opened.
    const [{ default: FuseCtor }, entries] = await Promise.all([
      import("fuse.js"),
      fetch("/data/search-index.json").then((r) => r.json() as Promise<SearchEntry[]>),
    ]);
    setFuse(
      new FuseCtor(entries, {
        keys: [
          { name: "title", weight: 3 },
          { name: "keywords", weight: 2 },
          { name: "subtitle", weight: 1 },
        ],
        ignoreDiacritics: true, // "riale" finds "Rialé", "nakambe" finds "Nakambé"
        threshold: 0.35,
        ignoreLocation: true,
      }),
    );
  }

  function close() {
    dialog.current?.close();
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (dialog.current?.open) close();
        else void open();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const trimmed = query.trim();
  const results = fuse && trimmed.length >= MIN_QUERY ? fuse.search(trimmed, { limit: MAX_RESULTS }) : [];

  return (
    <>
      <button
        type="button"
        onClick={() => void open()}
        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-3 text-sm text-muted hover:bg-surface-hover"
        aria-haspopup="dialog"
        aria-keyshortcuts="Control+K Meta+K"
      >
        <Search aria-hidden size={16} />
        <span className="hidden lg:inline">{t("open")}</span>
        <kbd className="hidden rounded border border-border px-1.5 text-xs lg:inline">Ctrl K</kbd>
        <span className="sr-only lg:hidden">{t("open")}</span>
      </button>

      <dialog
        ref={dialog}
        aria-label={t("label")}
        onClick={(e) => e.target === dialog.current && close()}
        onClose={() => setQuery("")}
        className="float-panel m-auto mt-[12vh] w-[min(36rem,calc(100%-1.5rem))] p-0 backdrop:bg-[rgb(42_29_20/0.45)]"
      >
        <div className="flex items-center gap-2 border-b border-border p-3">
          <Search aria-hidden size={18} className="shrink-0 text-muted" />
          <input
            ref={input}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                dialog.current?.querySelector<HTMLAnchorElement>("[data-result]")?.focus();
              } else if (e.key === "Escape") {
                // A search field swallows the first Escape (it clears itself).
                e.preventDefault();
                close();
              }
            }}
            placeholder={t("placeholder")}
            aria-label={t("label")}
            className="min-h-11 flex-1 bg-transparent text-lg outline-none"
          />
          <button
            type="button"
            onClick={close}
            aria-label={t("close")}
            className="inline-flex size-11 items-center justify-center rounded-full hover:bg-surface-hover"
          >
            <X aria-hidden size={18} />
          </button>
        </div>

        <div className="max-h-[50vh] overflow-y-auto p-2" aria-live="polite">
          {trimmed.length < MIN_QUERY ? (
            <p className="p-3 text-sm text-muted">{t("hint")}</p>
          ) : results.length === 0 ? (
            <p className="p-3 text-sm text-muted">{fuse ? t("empty", { query: trimmed }) : "…"}</p>
          ) : (
            <ul
              onKeyDown={(e) => {
                const items = [...(dialog.current?.querySelectorAll<HTMLAnchorElement>("[data-result]") ?? [])];
                const i = items.indexOf(document.activeElement as HTMLAnchorElement);
                if (e.key === "ArrowDown") items[Math.min(i + 1, items.length - 1)]?.focus();
                else if (e.key === "ArrowUp") (i <= 0 ? input.current : items[i - 1])?.focus();
                else return;
                e.preventDefault();
              }}
            >
              {results.map(({ item }) => (
                <li key={`${item.kind}-${item.id}`}>
                  <Link
                    href={item.href}
                    data-result
                    onClick={close}
                    className="flex items-center justify-between gap-3 rounded-[var(--r-card)] p-3 hover:bg-surface-hover focus:bg-surface-hover"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-bold">{item.title}</span>
                      {item.subtitle ? <span className="block truncate text-sm text-muted">{item.subtitle}</span> : null}
                    </span>
                    <span className="shrink-0 text-xs text-muted">{t(`kinds.${item.kind}`)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </dialog>
    </>
  );
}
