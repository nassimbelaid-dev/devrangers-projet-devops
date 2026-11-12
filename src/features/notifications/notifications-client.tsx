"use client"

import { useMemo, useState } from "react"
import { useDemoCollection } from "@/lib/demo-store"
import { usePathname } from "next/navigation"
import {
  Archive, ArchiveRestore, Bell, CheckCheck, Inbox, Plus, RotateCcw, Search,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"

import { initialNotifications } from "./mock-data"
import type {
  CommitteeNotification, NotificationKind, NotificationKindFilter, NotificationTab,
} from "./types"
import { NotificationIcon } from "./notification-icon"
import { NotificationDetails } from "./notification-details"
import { NotificationSimulator } from "./notification-simulator"
import {
  createDemoNotification, filterNotifications, formatNotificationDate, kindLabels, unreadTotal,
} from "./utils"

const kinds: NotificationKind[] = ["convocation", "rappel-reunion", "echeance-action", "avis-decision"]
const tabs: { value: NotificationTab; label: string }[] = [
  { value: "toutes", label: "Toutes" },
  { value: "non-lues", label: "Non lues" },
  { value: "archivees", label: "Archives" },
]

function Count({ title, value }: { title: string; value: number }) {
  return (
    <div className="space-y-2 px-2 sm:px-4">
      <p className="text-xs font-medium text-muted-foreground">{title}</p>
      <p className="text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">{value}</p>
    </div>
  )
}

export function NotificationsClient() {
  const [items, setItems] = useDemoCollection("notifications")
  const [tab, setTab] = useState<NotificationTab>("toutes")
  const [kindFilter, setKindFilter] = useState<NotificationKindFilter>("tous")
  const [query, setQuery] = useState("")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [simulateOpen, setSimulateOpen] = useState(false)
  const [simulationKind, setSimulationKind] = useState<NotificationKind>("convocation")
  const [simulationOrdinal, setSimulationOrdinal] = useState(0)

  const pathname = usePathname()
  const locale = pathname.split("/").filter(Boolean)[0] || "en"
  const visible = useMemo(
    () => filterNotifications(items, tab, kindFilter, query),
    [items, tab, kindFilter, query]
  )
  const unread = unreadTotal(items)
  const archived = items.filter((item) => item.archived).length
  const active = items.length - archived
  const selected = items.find((item) => item.id === selectedId) ?? null

  function setRead(id: string, read: boolean) {
    setItems((current) => current.map((item) => item.id === id ? { ...item, read } : item))
  }

  function openDetails(id: string) {
    setRead(id, true)
    setSelectedId(id)
  }

  function toggleArchive(id: string) {
    setItems((current) => current.map((item) => item.id === id ? {
      ...item, archived: !item.archived,
    } : item))
    setSelectedId(null)
  }

  function markAllRead() {
    setItems((current) => current.map((item) => item.archived ? item : { ...item, read: true }))
  }

  function simulate() {
    setSimulationOrdinal((current) => current + 1)
    const fresh = createDemoNotification(simulationKind, simulationOrdinal + 1)
    setItems((current) => [fresh, ...current])
    setQuery("")
    setKindFilter("tous")
    setTab("toutes")
    setSimulateOpen(false)
    setSelectedId(null)
  }

  function reset() {
    setItems(initialNotifications)
    setQuery("")
    setKindFilter("tous")
    setTab("toutes")
    setSelectedId(null)
    setSimulateOpen(false)
    setSimulationOrdinal(0)
  }

  return (
    <div className="mx-auto max-w-6xl space-y-10 px-4 py-6 md:px-8 md:py-9">
      <header className="flex flex-col justify-between gap-6 lg:flex-row lg:items-start">
        <div className="max-w-2xl space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Comité scientifique</p>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Centre de notifications</h1>
          <p className="text-sm leading-6 text-muted-foreground">
            Retrouvez les convocations, rappels, échéances des actions et avis de décisions du comité.
          </p>
        </div>
        <Button onClick={() => setSimulateOpen(true)} className="w-full shrink-0 sm:w-auto">
          <Plus className="mr-2 size-4" aria-hidden="true" /> Créer une notification
        </Button>
      </header>

      

      <section aria-label="Résumé des notifications" className="grid grid-cols-3 divide-x border-y py-7">
        <Count title="Actives" value={active} />
        <Count title="Non lues" value={unread} />
        <Count title="Archivées" value={archived} />
      </section>

      <section className="space-y-7" aria-labelledby="inbox-title">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h2 id="inbox-title" className="text-lg font-semibold tracking-tight">Boîte de réception</h2>
            <p className="text-sm text-muted-foreground">Consultez et classez les dernières notifications.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={markAllRead} disabled={!unread}>
              <CheckCheck className="mr-2 size-4" aria-hidden="true" /> Tout marquer lu
            </Button>
            <Button variant="ghost" size="sm" onClick={reset} title="Réinitialiser les notifications">
              <RotateCcw className="mr-2 size-4" aria-hidden="true" /> Réinitialiser
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div role="tablist" aria-label="État des notifications" className="flex max-w-full gap-1 overflow-x-auto border-b">
            {tabs.map((entry) => (
              <button
                key={entry.value}
                type="button"
                role="tab"
                aria-selected={tab === entry.value}
                onClick={() => setTab(entry.value)}
                className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                  tab === entry.value
                    ? "border-foreground text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {entry.label}
                {entry.value === "non-lues" && unread > 0 && (
                  <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums text-foreground">{unread}</span>
                )}
              </button>
            ))}
          </div>
          <div className="flex w-full flex-col gap-3 sm:flex-row lg:max-w-xl">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" aria-hidden="true" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Rechercher une notification..."
                aria-label="Rechercher une notification"
                className="pl-9"
              />
            </div>
            <Select value={kindFilter} onValueChange={(value) => setKindFilter(value as NotificationKindFilter)}>
              <SelectTrigger aria-label="Filtrer par type" className="w-full sm:w-48">
                <SelectValue placeholder="Tous les types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tous">Tous les types</SelectItem>
                {kinds.map((kind) => <SelectItem value={kind} key={kind}>{kindLabels[kind]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div aria-live="polite" className="min-h-64">
          <p className="mb-3 text-xs text-muted-foreground">
            {visible.length} notification{visible.length > 1 ? "s" : ""} affichée{visible.length > 1 ? "s" : ""}
          </p>
          {visible.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 border-y px-5 py-16 text-center">
              <Inbox className="size-8 text-muted-foreground/70" aria-hidden="true" />
              <p className="font-medium">Aucune notification à afficher</p>
              <p className="max-w-sm text-sm leading-6 text-muted-foreground">
                Modifiez les filtres, consultez un autre onglet ou simulez un nouvel événement.
              </p>
              <Button variant="outline" size="sm" onClick={() => { setQuery(""); setKindFilter("tous"); setTab("toutes") }}>
                Réinitialiser les filtres
              </Button>
            </div>
          ) : (
            <ul className="divide-y border-y">
              {visible.map((item) => (
                <li key={item.id} className="group flex items-start gap-4 px-1 py-5 transition-colors hover:bg-muted/20 sm:px-3 sm:py-6">
                  <NotificationIcon kind={item.kind} />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="text-xs font-medium text-muted-foreground">{kindLabels[item.kind]}</span>
                      {item.priority === "importante" && (
                        <span className="text-xs font-medium text-foreground/80">À surveiller</span>
                      )}
                      {!item.read && !item.archived && (
                        <span className="size-2 rounded-full bg-foreground" aria-label="Non lue" title="Non lue" />
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => openDetails(item.id)}
                      className={`block w-full text-left text-sm tracking-tight hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:text-base ${!item.read ? "font-semibold" : "font-medium"}`}
                    >
                      {item.title}
                    </button>
                    <p className="text-sm leading-6 text-muted-foreground">{item.preview}</p>
                    <p className="text-xs text-muted-foreground">{formatNotificationDate(item.createdAt)} · {item.context}</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    onClick={() => toggleArchive(item.id)}
                    title={item.archived ? "Restaurer la notification" : "Archiver la notification"}
                    aria-label={`${item.archived ? "Restaurer" : "Archiver"} : ${item.title}`}
                  >
                    {item.archived ? <ArchiveRestore className="size-4" /> : <Archive className="size-4" />}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <div className="flex items-start gap-3 border-t pt-6 text-sm text-muted-foreground">
        <Bell className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <p className="leading-6">
          Les exemples sont indépendants des autres modules. Les changements de réunions, d'actions et de décisions
          ne déclenchent pas automatiquement de notifications dans cette maquette.
        </p>
      </div>

      <NotificationDetails
        notification={selected}
        locale={locale}
        onClose={() => setSelectedId(null)}
        onToggleRead={setRead}
        onToggleArchive={toggleArchive}
      />
      <NotificationSimulator
        open={simulateOpen}
        kind={simulationKind}
        onKindChange={setSimulationKind}
        onClose={() => setSimulateOpen(false)}
        onCreate={simulate}
      />
    </div>
  )
}
