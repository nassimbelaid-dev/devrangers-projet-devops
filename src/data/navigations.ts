import type { NavigationType } from "@/types"

export const navigationsData: NavigationType[] = [
  {
    title: "Comité scientifique",
    items: [
      {
        title: "Tableau de bord",
        href: "/dashboards/analytics",
        iconName: "ChartPie",
      },
      {
        title: "Réunions",
        href: "/meetings",
        iconName: "Calendar",
      },
      ,
      {
        title: "Suivi des actions",
        href: "/actions",
        iconName: "Grid2x2",
      },
    ],
  },
  {
    title: "Modules à adapter",
    items: [
      {
        title: "Membres (prototype)",
        href: "/members",
        iconName: "Users",
      },
      {
        title: "Ordre du jour (prototype)",
        href: "/agenda",
        iconName: "TextCursorInput",
      },
      {
        title: "Votes et résultats",
        href: "/votes",
        iconName: "ChartPie",
      },
      {
        title: "Documents (prototype)",
        href: "/documents",
        iconName: "FolderOpen",
      },
      {
        title: "Procès-verbaux (prototype)",
        href: "/documents#pv",
        iconName: "FileText",
      },
      {
        title: "Statistiques",
        href: "/charts/bar-charts",
        iconName: "ChartArea",
      },
    ],
  },
  {
    title: "Communication",
    items: [
      {
        title: "Notifications",
        href: "/notifications",
        iconName: "Bell",
      },
      {
        title: "E-mails",
        href: "/apps/email",
        iconName: "AtSign",
      },
      {
        title: "Messagerie",
        href: "/apps/chat",
        iconName: "MessageCircle",
      },
    ],
  },
  {
    title: "Compte",
    items: [
      {
        title: "Mon profil",
        href: "/pages/account/profile",
        iconName: "User",
      },
      {
        title: "Paramètres",
        href: "/pages/account/settings",
        iconName: "UserCog",
      },
    ],
  },
]
