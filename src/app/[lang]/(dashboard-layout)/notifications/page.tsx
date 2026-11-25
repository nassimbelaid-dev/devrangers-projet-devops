import { NotificationsClient } from "@/features/notifications/notifications-client"

import type { Metadata } from "next"

import { CommitteeShell } from "@/components/committee-ui/committee-shell"

export const metadata: Metadata = {
  title: "Notifications | Gestion du comité scientifique",
  description: "Centre de notifications simulées du comité scientifique",
}

export default function NotificationsPage() {
  return (
    <CommitteeShell module="notifications">
      <NotificationsClient />
    </CommitteeShell>
  )
}
