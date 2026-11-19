import type { LocaleType } from "@/types"
import type { ReactNode } from "react"

import { getDictionary } from "@/lib/get-dictionary"

import { Layout } from "@/components/layout"
import { StaticAuthGuard } from "@/components/auth/static-auth-guard"

export default async function DashboardLayout(props: {
  children: ReactNode
  params: Promise<{ lang: LocaleType }>
}) {
  const params = await props.params

  const { children } = props

  const dictionary = await getDictionary(params.lang)

  return <StaticAuthGuard><Layout dictionary={dictionary}>{children}</Layout></StaticAuthGuard>
}
