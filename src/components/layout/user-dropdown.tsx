"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { UserRound } from "lucide-react"
import type { DictionaryType } from "@/lib/get-dictionary"
import type { LocaleType } from "@/types"
import { ensureLocalizedPathname } from "@/lib/i18n"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { getRoleLabel, signOutStatic, useStaticAuth } from "@/lib/static-auth"

export function UserDropdown({ dictionary, locale }: { dictionary: DictionaryType; locale: LocaleType }) {
  const router = useRouter()
  const { user } = useStaticAuth()
  function signOut() {
    signOutStatic()
    router.replace(`/${locale}/sign-in`)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="gap-2 rounded-xl" title={dictionary.navigation.userNav.profile} aria-label={dictionary.navigation.userNav.profile}>
          <UserRound className="size-4" aria-hidden="true" />
          <span className="hidden text-left sm:inline"><span className="block max-w-36 truncate text-sm font-medium">{user ? `${user.firstName} ${user.lastName}` : dictionary.navigation.userNav.profile}</span><span className="block max-w-36 truncate text-xs text-muted-foreground">{user ? getRoleLabel(user.role) : ""}</span></span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {user && <div className="px-2 py-1.5"><p className="text-sm font-medium">{user.firstName} {user.lastName}</p><p className="text-xs text-muted-foreground">{getRoleLabel(user.role)}</p></div>}
        <DropdownMenuItem asChild>
          <Link href={ensureLocalizedPathname("/profile", locale)}>{dictionary.navigation.userNav.profile}</Link>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={signOut}>{dictionary.navigation.userNav.signOut}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
