"use client"

import { useEffect } from "react"
import Link from "next/link"
import { useParams, usePathname, useRouter } from "next/navigation"
import { useUiText } from "@/features/ui-text"

import type { LocaleType } from "@/types"
import type { ReactNode } from "react"

import {
  getCurrentDemoUser,
  hasPermission,
  moduleForPath,
  useStaticAuth,
} from "@/lib/static-auth"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function StaticAuthGuard({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useStaticAuth()
  const t = useUiText()
  const router = useRouter()
  const pathname = usePathname()
  const params = useParams()
  const locale = params.lang as LocaleType

  useEffect(() => {
    if (!isAuthenticated && !getCurrentDemoUser())
      router.replace(`/${locale}/sign-in?next=${encodeURIComponent(pathname)}`)
  }, [isAuthenticated, locale, pathname, router])

  if (!isAuthenticated) return null
  const route = pathname.replace(/^\/[a-z]{2}(?=\/|$)/, "")
  if (!hasPermission(user, moduleForPath(route)))
    return (
      <main className="flex min-h-[60vh] items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>{t("Accès non autorisé")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t("Votre rôle ne permet pas de consulter cette page.")}
            </p>
            <Button asChild>
              <Link href={`/${locale}/dashboards/analytics`}>
                {t("Retour au tableau de bord")}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    )
  return children
}
