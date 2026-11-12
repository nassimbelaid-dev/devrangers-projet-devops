import Link from "next/link"
import { UsersRound } from "lucide-react"
import type { DictionaryType } from "@/lib/get-dictionary"
import type { LocaleType } from "@/types"
import { ensureLocalizedPathname } from "@/lib/i18n"
import { Button } from "@/components/ui/button"

export function UserDropdown({ locale }: { dictionary: DictionaryType; locale: LocaleType }) {
  return (
    <Button variant="ghost" asChild className="gap-2 rounded-xl" title="Annuaire du comité">
      <Link href={ensureLocalizedPathname("/members", locale)} aria-label="Ouvrir l'annuaire des membres">
        <UsersRound className="size-4" aria-hidden="true" />
        <span className="hidden text-sm sm:inline">Membres</span>
      </Link>
    </Button>
  )
}
