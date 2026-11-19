"use client"

import { useEffect } from "react"
import type { ReactNode } from "react"
import { useParams, usePathname, useRouter } from "next/navigation"
import { useStaticAuth } from "@/lib/static-auth"
import type { LocaleType } from "@/types"

export function StaticAuthGuard({ children }: { children: ReactNode }) {
  const authenticated = useStaticAuth()
  const router = useRouter()
  const pathname = usePathname()
  const params = useParams()
  const locale = params.lang as LocaleType

  useEffect(() => {
    if (!authenticated) router.replace(`/${locale}/sign-in?next=${encodeURIComponent(pathname)}`)
  }, [authenticated, locale, pathname, router])

  if (!authenticated) return null
  return children
}
