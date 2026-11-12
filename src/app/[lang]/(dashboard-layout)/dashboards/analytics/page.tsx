import type { Metadata } from "next"
import { CommitteeShell } from "@/components/committee-ui/committee-shell"

import { DashboardOverview } from "@/features/dashboard/dashboard-overview"

export const metadata: Metadata = {
  title: "Tableau de bord | Gestion du comité scientifique",
  description:
    "Vue d'ensemble des réunions, décisions, actions et notifications du comité scientifique.",
}

/**
 * Remplace uniquement l'écran de démonstration Analytics de Shadboard.
 * On conserve la même route afin de ne modifier ni la sidebar ni HOME_PATHNAME.
 */
export default async function AnalyticsPage({
  params,
}: {
  params: Promise<{ lang: string }>
}) {
  const { lang } = await params
  return <CommitteeShell module="dashboard"><DashboardOverview lang={lang} /></CommitteeShell>
}
