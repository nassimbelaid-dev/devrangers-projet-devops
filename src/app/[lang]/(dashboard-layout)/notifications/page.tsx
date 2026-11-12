import type { Metadata } from "next"
import { NotificationsClient } from "@/features/notifications/notifications-client"

export const metadata: Metadata = {
  title: "Notifications | Gestion du comité scientifique",
  description: "Centre de notifications simulées du comité scientifique",
}

export default function NotificationsPage() {
  return <NotificationsClient />
}
