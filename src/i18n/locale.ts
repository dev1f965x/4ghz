export const locales = ["ko", "en"] as const;
export type Locale = (typeof locales)[number];

const fallbackLocale: Locale = "en";

function isLocale(value: unknown): value is Locale {
  return locales.some((locale) => locale === value);
}

/**
 * An explicit choice from settings wins; otherwise the Windows display language, which
 * WebView2 reports in navigator.languages (Design Doc, Spike results).
 */
export function detectLocale(stored: Locale | undefined, languages: readonly string[]): Locale {
  if (stored) return stored;
  for (const language of languages) {
    const base = language.toLowerCase().split("-")[0];
    if (isLocale(base)) return base;
  }
  return fallbackLocale;
}
