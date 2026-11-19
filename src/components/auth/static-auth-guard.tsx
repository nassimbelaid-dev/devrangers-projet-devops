"use client"

import { useEffect } from "react"
import type { ReactNode } from "react"
import { useParams, usePathname, useRouter } from "next/navigation"
import { hasPermission, moduleForPath, useStaticAuth } from "@/lib/static-auth"
import type { LocaleType } from "@/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export function StaticAuthGuard({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useStaticAuth()
  const router = useRouter()
  const pathname = usePathname()
  const params = useParams()
  const locale = params.lang as LocaleType

  useEffect(() => {
    if (!isAuthenticated) router.replace(`/${locale}/sign-in?next=${encodeURIComponent(pathname)}`)
  }, [isAuthenticated, locale, pathname, router])

  if (!isAuthenticated) return null
  const route = pathname.replace(/^\/[a-z]{2}(?=\/|$)/, "")
  if (!hasPermission(user, moduleForPath(route))) return <main className="flex min-h-[60vh] items-center justify-center p-6"><Card className="w-full max-w-md"><CardHeader><CardTitle>Accès non autorisé</CardTitle></CardHeader><CardContent className="space-y-4"><p className="text-sm text-muted-foreground">Votre rôle ne permet pas de consulter cette page.</p><Button asChild><Link href={`/${locale}/dashboards/analytics`}>Retour au tableau de bord</Link></Button></CardContent></Card></main>
  return children
}
