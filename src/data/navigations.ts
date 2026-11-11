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
        href: "/apps/kanban",
        iconName: "Grid2x2",
      },
    ],
  },
  {
    title: "Modules à adapter",
    items: [
      {
        title: "Membres (prototype)",
        href: "/tables",
        iconName: "Users",
      },
      {
        title: "Ordre du jour (prototype)",
        href: "/forms/form-layouts",
        iconName: "TextCursorInput",
      },
      {
        title: "Procès-verbaux (prototype)",
        href: "/extended-ui/editor",
        iconName: "FileText",
      },
      {
        title: "Documents (prototype)",
        href: "/extended-ui/file-dropzone",
        iconName: "FolderOpen",
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
