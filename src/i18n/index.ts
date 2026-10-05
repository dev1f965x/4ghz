import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { en } from "./en";
import { ko } from "./ko";
import { detectLocale, type Locale, locales } from "./locale";

i18n.on("languageChanged", (language) => {
  document.documentElement.lang = language;
});

/** Starts i18next in the stored locale, or the Windows display language when none was chosen. */
export function initI18n(stored: Locale | undefined) {
  return i18n.use(initReactI18next).init({
    resources: { en: { translation: en }, ko: { translation: ko } },
    lng: detectLocale(stored, navigator.languages),
    fallbackLng: "en",
    supportedLngs: locales,
    initAsync: false,
    // React escapes rendered text already.
    interpolation: { escapeValue: false },
  });
}
