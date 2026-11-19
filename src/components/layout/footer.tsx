import type { DictionaryType } from "@/lib/get-dictionary"

export function Footer({ dictionary }: { dictionary: DictionaryType }) {
  return (
    <footer className="border-t border-border/60 bg-background/70 px-5 py-4 text-xs text-muted-foreground">
      <div className="container flex flex-col gap-2 sm:flex-row sm:justify-between">
        <span>© {new Date().getFullYear()} {dictionary.navigation.comitéScientifique}</span>
        <span>{dictionary.navigation.designSystem} · DevRangers</span>
      </div>
    </footer>
  )
}
