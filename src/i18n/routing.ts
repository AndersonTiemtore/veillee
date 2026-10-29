import { defineRouting } from "next-intl/routing";

/**
 * Interface locales. Only French is translated for the MVP; Mooré, Dioula and
 * Fulfulde are wired in and fall back to French until a human translator
 * fills messages/{mos,dyu,fuh}.json. Never machine-translate them.
 */
export const routing = defineRouting({
  locales: ["fr", "mos", "dyu", "fuh"],
  defaultLocale: "fr",
  localePrefix: "as-needed",
  // Browsers rarely advertise these languages correctly; let users choose.
  localeDetection: false,
});

export type Locale = (typeof routing.locales)[number];
