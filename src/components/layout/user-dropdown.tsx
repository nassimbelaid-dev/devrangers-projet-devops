import Link from "next/link"
import { UserRound } from "lucide-react"
import type { DictionaryType } from "@/lib/get-dictionary"
import type { LocaleType } from "@/types"
import { ensureLocalizedPathname } from "@/lib/i18n"
import { Button } from "@/components/ui/button"

export function UserDropdown({ locale }: { dictionary: DictionaryType; locale: LocaleType }) {
  return (
    <Button variant="ghost" asChild className="gap-2 rounded-xl" title="Mon profil">
      <Link href={ensureLocalizedPathname("/profile", locale)} aria-label="Ouvrir mon profil">
        <UserRound className="size-4" aria-hidden="true" />
        <span className="hidden text-sm sm:inline">Mon profil</span>
      </Link>
    </Button>
  )
}
