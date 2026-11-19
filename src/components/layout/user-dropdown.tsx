"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { UserRound } from "lucide-react"
import type { DictionaryType } from "@/lib/get-dictionary"
import type { LocaleType } from "@/types"
import { ensureLocalizedPathname } from "@/lib/i18n"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { signOutStatic } from "@/lib/static-auth"

export function UserDropdown({ dictionary, locale }: { dictionary: DictionaryType; locale: LocaleType }) {
  const router = useRouter()
  function signOut() {
    signOutStatic()
    router.replace(`/${locale}/sign-in`)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="gap-2 rounded-xl" title={dictionary.navigation.userNav.profile} aria-label={dictionary.navigation.userNav.profile}>
          <UserRound className="size-4" aria-hidden="true" />
          <span className="hidden text-sm sm:inline">{dictionary.navigation.userNav.profile}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={ensureLocalizedPathname("/profile", locale)}>{dictionary.navigation.userNav.profile}</Link>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={signOut}>{dictionary.navigation.userNav.signOut}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
