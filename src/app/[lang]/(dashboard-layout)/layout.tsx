import { NotificationReminderScheduler } from "@/features/notifications/notification-reminder-scheduler"

import type { LocaleType } from "@/types"
import type { ReactNode } from "react"

import { getDictionary } from "@/lib/get-dictionary"

import { StaticAuthGuard } from "@/components/auth/static-auth-guard"
import { Layout } from "@/components/layout"

export default async function DashboardLayout(props: {
  children: ReactNode
  params: Promise<{ lang: LocaleType }>
}) {
  const params = await props.params

  const { children } = props

  const dictionary = await getDictionary(params.lang)

  return (
    <StaticAuthGuard>
      <NotificationReminderScheduler />
      <Layout dictionary={dictionary}>{children}</Layout>
    </StaticAuthGuard>
  )
}
