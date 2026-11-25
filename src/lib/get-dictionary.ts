import "server-only"

import { notFound } from "next/navigation"

const dictionaries = {
  fr: () =>
    import("@/data/dictionaries/fr.json").then((module) => module.default),
  en: () =>
    import("@/data/dictionaries/en.json").then((module) => module.default),
  ar: () =>
    import("@/data/dictionaries/ar.json").then((module) => module.default),
}

export async function getDictionary(locale: string) {
  if (locale !== "fr" && locale !== "en" && locale !== "ar") {
    notFound()
  }

  return dictionaries[locale]()
}

export type DictionaryType = Awaited<ReturnType<typeof getDictionary>>
