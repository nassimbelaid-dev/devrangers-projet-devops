import type { NavigationType } from "@/types"

export const navigationsData: NavigationType[] = [
  {
    title: "Comité scientifique",
    items: [
      { title: "Tableau de bord", href: "/dashboards/analytics", iconName: "ChartPie" },
      { title: "Réunions", href: "/meetings", iconName: "CalendarDays" },
      { title: "Membres", href: "/members", iconName: "Users" },
      { title: "Ordre du jour", href: "/agenda", iconName: "ListOrdered" },
      { title: "Votes et résultats", href: "/votes", iconName: "CheckCircle" },
      { title: "Décisions et actions", href: "/actions", iconName: "Grid2x2" },
      { title: "Documents", href: "/documents", iconName: "FolderOpen" },
      { title: "Centre de notifications", href: "/notifications", iconName: "Bell" },
    ],
  },
  {
    title: "Compte",
    items: [
      { title: "Mon profil", href: "/profile", iconName: "User" },
    ],
  },
]
