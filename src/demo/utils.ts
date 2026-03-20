import type { Info } from "../core/base/types";

/**
 * Finds the best matching Info object based on the user's browser locales.
 *
 * @param infos - The list of Info objects from the character definition.
 * @returns The best matching Info object, or the first one if no match is found.
 */
export function getBestMatchingInfo(infos: Info[]): Info {
  const userLocales = navigator.languages || [navigator.language];

  for (const userLocale of userLocales) {
    const normalizedUserLocale = userLocale.toLowerCase();

    // Exact match (e.g. en-US === en-us)
    const exactMatch = infos.find((info) => info.locale?.baseName?.toLowerCase() === normalizedUserLocale);
    if (exactMatch) return exactMatch;

    // Language-only match (e.g. "en" matches "en-US")
    const userLang = normalizedUserLocale.split("-")[0];
    const langMatch = infos.find((info) => info.locale?.language?.toLowerCase() === userLang);
    if (langMatch) return langMatch;
  }

  // Fallback to English (0x0409 or 0x0009)
  const englishMatch = infos.find((info) => info.languageCode === "0x0409" || info.languageCode === "0x0009");
  if (englishMatch) return englishMatch;

  // Last resort: first available
  return infos[0];
}
