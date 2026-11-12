"use client"

import Link from "next/link"
import type { ReactNode } from "react"
import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  ClipboardList,
  Clock3,
  FolderOpen,
  ListChecks,
  MapPin,
  Plus,
  Sparkles,
  UsersRound,
  Vote,
  type LucideIcon,
} from "lucide-react"

import { useDashboardData, frenchDate } from "./dashboard-data"

type DashboardProps = { lang: string }
type Tone = "blue" | "amber" | "emerald" | "violet"

const metricTones: Record<
  Tone,
  { surface: string; icon: string; detail: string }
> = {
  blue: {
    surface: "bg-blue-50 dark:bg-blue-950/35",
    icon: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
    detail: "text-blue-700 dark:text-blue-300",
  },
  amber: {
    surface: "bg-amber-50 dark:bg-amber-950/30",
    icon: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
    detail: "text-amber-700 dark:text-amber-300",
  },
  emerald: {
    surface: "bg-emerald-50 dark:bg-emerald-950/30",
    icon: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
    detail: "text-emerald-700 dark:text-emerald-300",
  },
  violet: {
    surface: "bg-violet-50 dark:bg-violet-950/30",
    icon: "bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300",
    detail: "text-violet-700 dark:text-violet-300",
  },
}

function MetricCard({
  title,
  value,
  description,
  icon: Icon,
  tone,
  href,
}: {
  title: string
  value: number
  description: string
  icon: LucideIcon
  tone: Tone
  href: string
}) {
  const styles = metricTones[tone]

  return (
    <Link
      href={href}
      className={`group flex min-w-0 flex-col justify-between gap-7 rounded-2xl border border-border/60 p-5 transition-all hover:-translate-y-0.5 hover:shadow-sm sm:p-6 ${styles.surface}`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-sm font-medium text-foreground/80">{title}</span>
        <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${styles.icon}`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>
      <div>
        <p className="text-4xl font-semibold tracking-tight text-foreground tabular-nums">
          {value}
        </p>
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-xs leading-5 text-muted-foreground">{description}</span>
          <ArrowUpRight
            className={`h-4 w-4 shrink-0 opacity-60 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 ${styles.detail}`}
            aria-hidden="true"
          />
        </div>
      </div>
    </Link>
  )
}

function SectionHeading({
  title,
  hint,
  href,
  linkLabel = "Voir tout",
}: {
  title: string
  hint?: string
  href?: string
  linkLabel?: string
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div className="space-y-1">
        <h2 className="text-base font-semibold tracking-tight text-foreground sm:text-lg">
          {title}
        </h2>
        {hint ? <p className="text-sm text-muted-foreground">{hint}</p> : null}
      </div>
      {href ? (
        <Link
          href={href}
          className="inline-flex items-center gap-1 text-sm font-medium text-indigo-700 transition-colors hover:text-indigo-900 dark:text-indigo-300 dark:hover:text-indigo-200"
        >
          {linkLabel}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      ) : null}
    </div>
  )
}

function Panel({
  children,
  className = "",
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`min-w-0 rounded-2xl border border-border/70 bg-card p-5 sm:p-7 ${className}`}>
      {children}
    </section>
  )
}

function MeetingList({ lang }: DashboardProps) {
  const { dashboardMeetings } = useDashboardData()
  return (
    <Panel>
      <SectionHeading
        title="Réunions planifiées"
        hint="Les prochaines séances prévues dans les données de démonstration"
        href={`/${lang}/meetings`}
      />
      {dashboardMeetings.length === 0 ? (
        <p className="py-8 text-sm text-muted-foreground">Aucune réunion planifiée.</p>
      ) : (
        <div className="divide-y divide-border/70">
          {dashboardMeetings.map((meeting) => {
            const [year, month, day] = meeting.date.split("-")
            return (
              <Link
                key={meeting.id}
                href={`/${lang}/meetings`}
                className="group flex items-center gap-4 py-4 first:pt-0 last:pb-0 sm:gap-5"
              >
                <div className="flex h-[62px] w-[60px] shrink-0 flex-col items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                  <span className="text-2xl font-semibold leading-none tabular-nums">
                    {day}
                  </span>
                  <span className="mt-1 text-[11px] font-semibold uppercase tracking-wider">
                    {frenchDate(`${year}-${month}-${day}`, { month: "short" }).replace(/[0-9.\s]/g, "")}
                  </span>
                </div>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <p className="line-clamp-2 text-sm font-semibold text-foreground group-hover:text-indigo-700 dark:group-hover:text-indigo-300">
                    {meeting.title}
                  </p>
                  <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                      {meeting.startTime} – {meeting.endTime}
                    </span>
                    <span className="inline-flex min-w-0 items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <span className="truncate">{meeting.location}</span>
                    </span>
                  </p>
                </div>
                <ChevronRight className="hidden h-4 w-4 shrink-0 text-muted-foreground/60 transition-transform group-hover:translate-x-1 sm:block" aria-hidden="true" />
              </Link>
            )
          })}
        </div>
      )}
    </Panel>
  )
}

function ActionBreakdown({ lang }: DashboardProps) {
  const { dashboardActionTotal, dashboardActionCounts } = useDashboardData()
  const total = dashboardActionTotal || 1
  const items = [
    { label: "À faire", value: dashboardActionCounts.todo, color: "bg-amber-400", text: "text-amber-600 dark:text-amber-400" },
    { label: "En cours", value: dashboardActionCounts.inProgress, color: "bg-blue-500", text: "text-blue-600 dark:text-blue-400" },
    { label: "Terminées", value: dashboardActionCounts.done, color: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400" },
  ]

  return (
    <Panel>
      <SectionHeading
        title="Avancement des actions"
        hint="Répartition par statut"
        href={`/${lang}/actions`}
        linkLabel="Kanban"
      />
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-4xl font-semibold tabular-nums text-foreground">
            {dashboardActionTotal}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">actions au total</p>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
          {Math.round((dashboardActionCounts.done / total) * 100)} % terminées
        </div>
      </div>
      <div
        className="mt-7 flex h-3 w-full overflow-hidden rounded-full bg-muted"
        role="img"
        aria-label={`Actions : ${dashboardActionCounts.todo} à faire, ${dashboardActionCounts.inProgress} en cours et ${dashboardActionCounts.done} terminées`}
      >
        {items.map((item) => (
          <div
            key={item.label}
            style={{ width: `${(item.value / total) * 100}%` }}
            className={`${item.color} h-full first:rounded-l-full last:rounded-r-full`}
          />
        ))}
      </div>
      <div className="mt-6 space-y-3">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
              {item.label}
            </span>
            <span className={`text-sm font-semibold tabular-nums ${item.text}`}>
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </Panel>
  )
}

function PriorityActions({ lang }: DashboardProps) {
  const { dashboardPendingActions } = useDashboardData()
  return (
    <Panel>
      <SectionHeading
        title="Actions à suivre"
        hint="Les échéances les plus proches dans la démonstration"
        href={`/${lang}/actions`}
      />
      <div className="divide-y divide-border/70">
        {dashboardPendingActions.map((action) => (
          <Link
            key={action.id}
            href={`/${lang}/actions`}
            className="group flex items-start justify-between gap-3 py-4 first:pt-0 last:pb-0"
          >
            <div className="flex min-w-0 items-start gap-3">
              <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${action.overdue ? "bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400" : "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300"}`}>
                {action.overdue ? (
                  <Clock3 className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <CircleDot className="h-4 w-4" aria-hidden="true" />
                )}
              </div>
              <div className="min-w-0 space-y-1">
                <p className="line-clamp-2 text-sm font-medium text-foreground group-hover:text-indigo-700 dark:group-hover:text-indigo-300">
                  {action.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {action.assignee} · {action.status}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1 text-right">
              <span className="text-xs font-medium tabular-nums text-foreground">
                {frenchDate(action.dueDate)}
              </span>
              <span className={`text-[11px] ${action.overdue ? "font-medium text-rose-600 dark:text-rose-400" : "text-muted-foreground"}`}>
                {action.overdue ? "En retard" : action.priority === "Haute" ? "Priorité haute" : "À suivre"}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </Panel>
  )
}

function DecisionBreakdown({ lang }: DashboardProps) {
  const { dashboardDecisionTotal, dashboardDecisionCounts } = useDashboardData()
  const total = dashboardDecisionTotal || 1
  const adopted = (dashboardDecisionCounts.adopted / total) * 360
  const pending = adopted + (dashboardDecisionCounts.pending / total) * 360
  const background = `conic-gradient(#10b981 0deg ${adopted}deg, #fbbf24 ${adopted}deg ${pending}deg, #fb7185 ${pending}deg 360deg)`

  return (
    <Panel>
      <SectionHeading
        title="Décisions du comité"
        hint="Bilan des décisions enregistrées"
        href={`/${lang}/votes`}
        linkLabel="Votes"
      />
      <div className="flex flex-wrap items-center justify-center gap-7 py-2 sm:flex-nowrap">
        <div
          className="relative flex h-40 w-40 shrink-0 items-center justify-center rounded-full"
          style={{ background }}
          role="img"
          aria-label={`${dashboardDecisionCounts.adopted} décisions adoptées, ${dashboardDecisionCounts.pending} en attente, ${dashboardDecisionCounts.rejected} rejetées`}
        >
          <div className="flex h-[122px] w-[122px] flex-col items-center justify-center rounded-full bg-card">
            <span className="text-3xl font-semibold tabular-nums text-foreground">
              {dashboardDecisionTotal}
            </span>
            <span className="text-[11px] text-muted-foreground">décisions</span>
          </div>
        </div>
        <div className="min-w-[148px] flex-1 space-y-4">
          {[
            { name: "Adoptées", count: dashboardDecisionCounts.adopted, dot: "bg-emerald-500" },
            { name: "En attente", count: dashboardDecisionCounts.pending, dot: "bg-amber-400" },
            { name: "Rejetées", count: dashboardDecisionCounts.rejected, dot: "bg-rose-400" },
          ].map((item) => (
            <div key={item.name} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className={`h-2.5 w-2.5 rounded-full ${item.dot}`} />
                {item.name}
              </span>
              <span className="text-sm font-semibold tabular-nums text-foreground">
                {item.count}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  )
}

function RecentActivity({ lang }: DashboardProps) {
  const { dashboardRecentNotifications } = useDashboardData()
  return (
    <Panel>
      <SectionHeading
        title="Activité récente"
        hint="Dernières notifications de démonstration"
        href={`/${lang}/notifications`}
      />
      <div className="divide-y divide-border/70">
        {dashboardRecentNotifications.map((notification) => {
          const kindColor =
            notification.kind === "convocation"
              ? "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"
              : notification.kind === "echeance-action"
                ? "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
                : notification.kind === "avis-decision"
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                  : "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300"
          const Icon =
            notification.kind === "convocation"
              ? CalendarDays
              : notification.kind === "echeance-action"
                ? Clock3
                : notification.kind === "avis-decision"
                  ? CheckCircle2
                  : Bell
          return (
            <Link
              key={notification.id}
              href={`/${lang}/notifications`}
              className="group flex items-start gap-3 py-4 first:pt-0 last:pb-0"
            >
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${kindColor}`}>
                <Icon className="h-4 w-4" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <p className="line-clamp-1 text-sm font-medium text-foreground group-hover:text-indigo-700 dark:group-hover:text-indigo-300">
                  {notification.title}
                </p>
                <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">
                  {notification.preview}
                </p>
              </div>
              <span className="shrink-0 text-[11px] text-muted-foreground">
                {frenchDate(notification.createdAt)}
              </span>
            </Link>
          )
        })}
      </div>
    </Panel>
  )
}

function QuickAccess({ lang }: DashboardProps) {
  const routes: { name: string; label: string; href: string; icon: LucideIcon; tone: string }[] = [
    { name: "Ordres du jour", label: "Propositions et validations", href: "/agenda", icon: ClipboardList, tone: "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300" },
    { name: "Membres", label: "Annuaire et mandats", href: "/members", icon: UsersRound, tone: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300" },
    { name: "Documents", label: "PV et rapports", href: "/documents", icon: FolderOpen, tone: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300" },
    { name: "Votes", label: "Scrutins et résultats", href: "/votes", icon: Vote, tone: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300" },
  ]

  return (
    <Panel>
      <SectionHeading title="Accès rapides" hint="Retrouver les principaux espaces du comité" />
      <div className="grid gap-3 sm:grid-cols-2">
        {routes.map(({ name, label, href, icon: Icon, tone }) => (
          <Link
            key={href}
            href={`/${lang}${href}`}
            className="group flex min-w-0 items-start gap-3 rounded-xl border border-border/70 p-3.5 transition-colors hover:border-indigo-200 hover:bg-muted/30 dark:hover:border-indigo-800"
          >
            <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tone}`}>
              <Icon className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1 space-y-1">
              <span className="block text-sm font-medium text-foreground">{name}</span>
              <span className="block text-xs leading-4 text-muted-foreground">{label}</span>
            </span>
            <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground/60 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
        ))}
      </div>
    </Panel>
  )
}

export function DashboardOverview({ lang }: DashboardProps) {
  const { dashboardMetrics, dashboardDecisionTotal, dashboardNotifications } = useDashboardData()
  const { dashboardMetrics, dashboardDecisionTotal, dashboardNotifications } = useDashboardData()
  const { dashboardMetrics, dashboardDecisionTotal, dashboardNotifications } = useDashboardData()
  const { dashboardMetrics, dashboardDecisionTotal, dashboardNotifications } = useDashboardData()
  const { dashboardMetrics, dashboardDecisionTotal, dashboardNotifications } = useDashboardData()
  const { dashboardMetrics, dashboardDecisionTotal, dashboardNotifications } = useDashboardData()
  const { dashboardMetrics, dashboardDecisionTotal, dashboardNotifications } = useDashboardData()
  const stats: {
    title: string
    value: number
    description: string
    icon: LucideIcon
    tone: Tone
    href: string
  }[] = [
    {
      title: "Réunions planifiées",
      value: dashboardMetrics.scheduledMeetings,
      description: "Séances à venir dans la démo",
      icon: CalendarDays,
      tone: "blue",
      href: `/${lang}/meetings`,
    },
    {
      title: "Actions à suivre",
      value: dashboardMetrics.openActions,
      description: "À faire ou en cours",
      icon: ListChecks,
      tone: "amber",
      href: `/${lang}/actions`,
    },
    {
      title: "Décisions adoptées",
      value: dashboardMetrics.adoptedDecisions,
      description: `Parmi ${dashboardDecisionTotal} décisions`,
      icon: CheckCircle2,
      tone: "emerald",
      href: `/${lang}/votes`,
    },
    {
      title: "Notifications non lues",
      value: dashboardMetrics.unreadNotifications,
      description: `${dashboardNotifications.length} notifications actives`,
      icon: Bell,
      tone: "violet",
      href: `/${lang}/notifications`,
    },
  ]

  return (
    <main className="mx-auto w-full max-w-[1500px] space-y-7 px-4 py-7 sm:space-y-8 sm:px-6 sm:py-9 xl:px-8">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600 dark:text-indigo-400">
            Département d'informatique
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Tableau de bord
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            Vue d'ensemble des réunions, décisions et actions du comité scientifique.
          </p>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-700 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-300">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          Démonstration · novembre 2026
        </span>
      </header>

      <div className="relative isolate overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-600 to-sky-600 px-6 py-7 text-white sm:px-8 sm:py-8">
        <div aria-hidden="true" className="pointer-events-none absolute -right-14 -top-28 -z-10 h-72 w-72 rounded-full border-[45px] border-white/10" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-36 right-32 -z-10 h-64 w-64 rounded-full bg-white/5" />
        <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white/95">
              <CircleDot className="h-3.5 w-3.5" aria-hidden="true" />
              Espace du comité scientifique
            </div>
            <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
              Pilotez les activités du comité en un seul endroit.
            </h2>
            <p className="max-w-xl text-sm leading-6 text-indigo-50">
              Consultez les réunions à venir, suivez les décisions et gardez un œil sur les actions prioritaires.
            </p>
          </div>
          <Link
            href={`/${lang}/meetings`}
            className="inline-flex h-10 w-fit shrink-0 items-center justify-center gap-2 rounded-lg bg-white px-4 text-sm font-semibold text-indigo-700 shadow-sm transition-colors hover:bg-indigo-50"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Gérer les réunions
          </Link>
        </div>
      </div>

      <section aria-label="Indicateurs principaux" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => <MetricCard key={stat.title} {...stat} />)}
      </section>

      <div className="grid items-start gap-5 lg:grid-cols-12 lg:gap-6">
        <div className="lg:col-span-7"><MeetingList lang={lang} /></div>
        <div className="lg:col-span-5"><ActionBreakdown lang={lang} /></div>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-12 lg:gap-6">
        <div className="lg:col-span-7"><PriorityActions lang={lang} /></div>
        <div className="lg:col-span-5"><DecisionBreakdown lang={lang} /></div>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-12 lg:gap-6">
        <div className="lg:col-span-7"><RecentActivity lang={lang} /></div>
        <div className="lg:col-span-5"><QuickAccess lang={lang} /></div>
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-4 text-xs text-muted-foreground">
        <span>
          {dashboardMetrics.activeMembers} membres avec mandat en cours · Données fictives au 12 novembre 2026
        </span>
        <span>Les changements des autres modules ne sont pas encore synchronisés.</span>
      </footer>
    </main>
  )
}
