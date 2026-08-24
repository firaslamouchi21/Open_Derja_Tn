import en from "./locales/en.json";
import fr from "./locales/fr.json";
import ar from "./locales/ar.json";
import type { TextDirection } from "./direction";

export * from "./direction";

export const UI_LOCALES = ["en", "fr", "ar"] as const;

export type UiLocale = (typeof UI_LOCALES)[number];

export const DEFAULT_UI_LOCALE: UiLocale = "fr";

export const dictionaries: Record<UiLocale, typeof en> = { en, fr, ar };

export function getDictionary(locale: UiLocale) {
  return dictionaries[locale];
}

export function uiLocaleDirection(locale: UiLocale): TextDirection {
  return locale === "ar" ? "rtl" : "ltr";
}
