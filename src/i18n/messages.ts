import dyu from "../../messages/dyu.json";
import fr from "../../messages/fr.json";
import fuh from "../../messages/fuh.json";
import mos from "../../messages/mos.json";
import type { Locale } from "./routing";

type Messages = { [key: string]: string | Messages };

const CATALOGS: Record<Locale, Messages> = { fr, mos, dyu, fuh };

function deepMerge(base: Messages, override: Messages): Messages {
  const out: Messages = { ...base };
  for (const [key, value] of Object.entries(override)) {
    const current = out[key];
    out[key] =
      typeof value === "object" && typeof current === "object"
        ? deepMerge(current, value)
        : value;
  }
  return out;
}

/** French catalogue overlaid with whatever has been translated for `locale`. */
export function messagesFor(locale: Locale): Messages {
  return locale === "fr" ? fr : deepMerge(fr, CATALOGS[locale]);
}

/**
 * Language of the interface text actually shown. Until a catalogue has been
 * translated the page is in French, so `<html lang>` must say so.
 */
export function contentLanguage(locale: Locale): Locale {
  return Object.keys(CATALOGS[locale]).length > 0 ? locale : "fr";
}
