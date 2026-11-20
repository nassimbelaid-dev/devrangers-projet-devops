"use client"

import { useMemo, useState } from "react"
import { useDemoCollection, useDemoData } from "@/lib/demo-store"
import { useUiText } from "@/features/ui-text"
import { ArrowDown, ArrowUp, Check, Eye, FileText, ListOrdered, Pencil, Plus, RotateCcw, Search, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

import { AgendaDetails } from "./agenda-details"
import { AgendaForm } from "./agenda-form"
import type { AgendaProposal, AgendaTab } from "./types"
import { formatAgendaDate, makeAgendaId, memberLabel, moveValidatedPoint, sortAgenda } from "./utils"
import { getRoleLabel, hasPermission, useStaticAuth } from "@/lib/static-auth"

export function AgendaClient() {
  const t = useUiText()
  const { user } = useStaticAuth()
  const tabs: { id: AgendaTab; title: string }[] = [
    { id: "proposals", title: t("À examiner") },
    { id: "validated", title: t("Ordre du jour validé") },
    { id: "all", title: t("Tous les points") },
  ]
  function statusBadge(status: AgendaProposal["status"]) {
    if (status === "Rejeté") return <Badge variant="destructive">{t(status)}</Badge>
    if (status === "Validé") return <Badge variant="secondary">{t(status)}</Badge>
    return <Badge variant="outline">{t(status)}</Badge>
  }
  const { meetings, members } = useDemoData()
  const committeeMembers = members
  const [items, setItems] = useDemoCollection("agenda")
  const [meetingId, setMeetingId] = useState("r1")
  const [tab, setTab] = useState<AgendaTab>("proposals")
  const [search, setSearch] = useState("")
  const [formOpen, setFormOpen] = useState(false)
  const [formVersion, setFormVersion] = useState(0)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [detailsId, setDetailsId] = useState<string | null>(null)
  const [rejectId, setRejectId] = useState<string | null>(null)
  const [rejectNote, setRejectNote] = useState("")
  const [rejectError, setRejectError] = useState("")

  const currentMeeting = meetings.find((meeting) => meeting.id === meetingId) ?? meetings[0]
  const actorId = user?.memberId ?? user?.id ?? ""
  const president = user?.role === "president"
  const canPropose = Boolean(user?.memberId && hasPermission(user, "agenda", "create"))
  const editableMeeting = currentMeeting.status === "Planifiée"
  const currentItems = useMemo(
    () => sortAgenda(items.filter((item) => item.meetingId === meetingId)),
    [items, meetingId]
  )
  const pending = currentItems.filter((item) => item.status === "Proposé")
  const validated = currentItems.filter((item) => item.status === "Validé")
  const rejected = currentItems.filter((item) => item.status === "Rejeté")
  const visibleItems = useMemo(() => {
    const subset = currentItems.filter((item) =>
      tab === "all" || (tab === "proposals" && item.status === "Proposé") ||
      (tab === "validated" && item.status === "Validé")
    )
    const query = search.trim().toLocaleLowerCase("fr")
    if (!query) return subset
    return subset.filter((item) => `${item.title} ${item.description} ${memberLabel(item.proposedById, committeeMembers)}`
      .toLocaleLowerCase("fr").includes(query))
  }, [currentItems, tab, search, committeeMembers])
  const editing = items.find((item) => item.id === editingId) ?? null
  const details = items.find((item) => item.id === detailsId) ?? null
  const rejectedItem = items.find((item) => item.id === rejectId) ?? null

  function changeMeeting(value: string) {
    setMeetingId(value)
    setSearch("")
    setTab("proposals")
    setDetailsId(null)
    setEditingId(null)
  }

  function openCreate() {
    if (!editableMeeting || !canPropose) return
    setEditingId(null)
    setFormVersion((current) => current + 1)
    setFormOpen(true)
  }

  function openEdit(item: AgendaProposal) {
    if (!editableMeeting || !hasPermission(user, "agenda", "edit") || item.status !== "Proposé" || item.proposedById !== actorId) return
    setEditingId(item.id)
    setFormVersion((current) => current + 1)
    setFormOpen(true)
  }

  function saveProposal(data: Pick<AgendaProposal, "title" | "description" | "attachments">) {
    if (!editableMeeting || !canPropose) return
    if (editing) {
      if (!hasPermission(user, "agenda", "edit") || editing.status !== "Proposé" || editing.proposedById !== actorId) return
      setItems((current) => current.map((item) => item.id === editing.id ? { ...item, ...data } : item))
    } else {
      setItems((current) => [...current, {
        id: makeAgendaId(), meetingId, proposedById: actorId,
        createdAt: new Date().toISOString(), status: "Proposé", order: null,
        ...data,
      }])
      setTab("proposals")
      setSearch("")
    }
    setEditingId(null)
  }

  function approve(id: string) {
    if (!president || !hasPermission(user, "agenda", "approve") || !editableMeeting) return
    setItems((current) => {
      const toReview = current.find((item) => item.id === id && item.meetingId === meetingId)
      if (!toReview || toReview.status !== "Proposé") return current
      const orders = current
        .filter((item) => item.meetingId === meetingId && item.status === "Validé")
        .map((item) => item.order ?? 0)
      const nextOrder = orders.length ? Math.max(...orders) + 1 : 0
      return current.map((item) => item.id === id ? {
        ...item, status: "Validé", order: nextOrder, reviewedById: actorId, reviewNote: undefined,
      } : item)
    })
  }

  function reject() {
    if (!president || !hasPermission(user, "agenda", "approve") || !editableMeeting || !rejectedItem || rejectedItem.status !== "Proposé") return
    if (!rejectNote.trim()) {
      setRejectError(t("Indiquez un motif pour expliquer le rejet au membre."))
      return
    }
    setItems((current) => current.map((item) => item.id === rejectedItem.id && item.status === "Proposé"
      ? { ...item, status: "Rejeté", order: null, reviewedById: actorId, reviewNote: rejectNote.trim() }
      : item))
    setRejectId(null)
    setRejectNote("")
    setRejectError("")
  }

  function reopen(item: AgendaProposal) {
    if (!editableMeeting) return
    const canReopen = (president && hasPermission(user, "agenda", "approve") && item.status !== "Proposé") ||
      (hasPermission(user, "agenda", "edit") && item.status === "Rejeté" && item.proposedById === actorId)
    if (!canReopen) return
    setItems((current) => current.map((entry) => entry.id === item.id ? {
      ...entry, status: "Proposé", order: null, reviewedById: undefined, reviewNote: undefined,
    } : entry))
    setTab("proposals")
  }

  function move(id: string, direction: -1 | 1) {
    if (!president || !hasPermission(user, "agenda", "approve") || !editableMeeting) return
    setItems((current) => moveValidatedPoint(current, meetingId, id, direction))
  }

  return (
    <div className="mx-auto max-w-6xl space-y-10 px-4 py-6 md:px-8 md:py-9">
      <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("Comité scientifique")}</p>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{t("Ordres du jour")}</h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            {t("Proposez des sujets, examinez les demandes et organisez les points retenus pour chaque réunion.")}
          </p>
        </div>
        {canPropose && <Button onClick={openCreate} disabled={!editableMeeting} className="shrink-0">
          <Plus className="mr-2 size-4" /> {t("Proposer un point")}
        </Button>}
      </header>

      <div className="flex flex-col gap-5 border-y py-5 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
        <div className="grid flex-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="agenda-meeting">{t("Réunion")}</Label>
            <Select value={meetingId} onValueChange={changeMeeting}>
              <SelectTrigger id="agenda-meeting" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>{meetings.map((meeting) => <SelectItem key={meeting.id} value={meeting.id}>{meeting.title}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>{t("Compte connecté")}</Label><div className="flex h-10 items-center rounded-md border bg-muted/30 px-3 text-sm"><span className="truncate">{user ? `${user.firstName} ${user.lastName} · ${getRoleLabel(user.role)}` : t("Aucun compte connecté")}</span></div></div>
        </div>
        <div className="space-y-1 text-sm lg:max-w-64">
          <p className="font-medium">{formatAgendaDate(`${currentMeeting.date}T12:00:00Z`)} · {currentMeeting.startTime}</p>
          <p className="text-xs leading-5 text-muted-foreground">{currentMeeting.location}</p>
        </div>
      </div>

      
      {!editableMeeting && <div className="rounded-lg border border-dashed px-5 py-4 text-sm text-muted-foreground">
        {t("Cette réunion est {status}. Son ordre du jour est consultable, mais sa modification est désactivée dans son état actuel.", { status: t(currentMeeting.status).toLowerCase() })}
      </div>}

      <div className="grid grid-cols-3 divide-x border-b pb-8">
        <Metric label={t("À examiner")} count={pending.length} />
        <Metric label={t("Validés")} count={validated.length} />
        <Metric label={t("Rejetés")} count={rejected.length} />
      </div>

      <section className="space-y-6">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">{t("Points de la réunion")}</h2>
            <p className="text-sm text-muted-foreground">{t("Examinez les propositions et consultez l'ordre du jour officiel.")}</p>
          </div>
          <div className="relative w-full sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input className="pl-9" aria-label={t("Rechercher un point")} placeholder={t("Rechercher un point…")}
              value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>
        </div>

        <div className="flex flex-wrap gap-2" role="tablist" aria-label={t("Afficher les points")}>
          {tabs.map((option) => <Button key={option.id} role="tab" aria-selected={tab === option.id}
            variant={tab === option.id ? "default" : "ghost"} size="sm" onClick={() => setTab(option.id)}>
            {option.title}{option.id === "proposals" ? ` (${pending.length})` : option.id === "validated" ? ` (${validated.length})` : ` (${currentItems.length})`}
          </Button>)}
        </div>

        <div className="overflow-hidden rounded-xl border bg-card">
          {visibleItems.length === 0 ? <div className="flex min-h-64 flex-col items-center justify-center gap-3 px-6 text-center">
            <ListOrdered className="size-8 text-muted-foreground/60" />
            <h3 className="text-sm font-medium">{t("Aucun point à afficher")}</h3>
            <p className="max-w-md text-sm leading-6 text-muted-foreground">
              {t(search.trim() ? "Essayez une autre recherche." : tab === "proposals" ? "Les propositions à examiner apparaîtront ici." : tab === "validated" ? "Le président n'a pas encore validé de point." : "Aucun point pour cette réunion.")}
            </p>
          </div> : <div className="divide-y">
            {visibleItems.map((item) => {
              const rank = validated.findIndex((entry) => entry.id === item.id)
              const ownProposal = item.proposedById === actorId
              const canEdit = editableMeeting && hasPermission(user, "agenda", "edit") && item.status === "Proposé" && ownProposal
              const canReview = editableMeeting && president && hasPermission(user, "agenda", "approve") && item.status === "Proposé"
              const canReopen = editableMeeting && ((president && hasPermission(user, "agenda", "approve") && item.status !== "Proposé") || (hasPermission(user, "agenda", "edit") && ownProposal && item.status === "Rejeté"))
              return <article key={item.id} className="flex flex-col gap-5 px-5 py-6 md:flex-row md:items-start md:gap-6 md:px-7">
                <div className="flex min-w-0 flex-1 items-start gap-4">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-sm font-semibold text-muted-foreground">
                    {item.status === "Validé" ? String(rank + 1).padStart(2, "0") : <FileText className="size-4" />}
                  </span>
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h3 className="text-sm font-semibold leading-6 md:text-base">{item.title}</h3>
                      {statusBadge(item.status)}
                    </div>
                    <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">{item.description || t("Aucune description renseignée.")}</p>
                    <p className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>{memberLabel(item.proposedById, committeeMembers)}</span>
                      <span>·</span><span>{formatAgendaDate(item.createdAt)}</span>
                      {item.attachments.length > 0 && <><span>·</span><span>{t("Pièces jointes")} ({item.attachments.length})</span></>}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-1 self-end md:max-w-96 md:justify-end md:self-center">
                  {item.status === "Validé" && president && hasPermission(user, "agenda", "approve") && editableMeeting && <div className="mr-1 flex items-center">
                    <Button variant="ghost" size="icon" title={t("Monter ce point")} aria-label={t("Monter {title}", { title: item.title })}
                      disabled={rank === 0} onClick={() => move(item.id, -1)}><ArrowUp className="size-4" /></Button>
                    <Button variant="ghost" size="icon" title={t("Descendre ce point")} aria-label={t("Descendre {title}", { title: item.title })}
                      disabled={rank === validated.length - 1} onClick={() => move(item.id, 1)}><ArrowDown className="size-4" /></Button>
                  </div>}
                  <Button variant="ghost" size="sm" onClick={() => setDetailsId(item.id)}>
                    <Eye className="mr-1.5 size-4" /> {t("Voir")}
                  </Button>
                  {canEdit && <Button variant="outline" size="sm" onClick={() => openEdit(item)}>
                    <Pencil className="mr-1.5 size-4" /> {t("Modifier")}
                  </Button>}
                  {canReview && <>
                    <Button variant="outline" size="sm" onClick={() => { setRejectId(item.id); setRejectNote(""); setRejectError("") }}>
                      <X className="mr-1.5 size-4" /> {t("Rejeter")}
                    </Button>
                    <Button size="sm" onClick={() => approve(item.id)}>
                      <Check className="mr-1.5 size-4" /> {t("Valider")}
                    </Button>
                  </>}
                  {canReopen && <Button variant="outline" size="sm" onClick={() => reopen(item)}>
                    <RotateCcw className="mr-1.5 size-4" /> {t(president ? "Réexaminer" : "Resoumettre")}
                  </Button>}
                </div>
              </article>
            })}
          </div>}
          <div className="border-t px-6 py-3 text-xs text-muted-foreground">
            {t("{count} point(s) affiché(s) sur {total} pour cette réunion.", { count: visibleItems.length, total: currentItems.length })}
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-xl bg-muted/40 px-6 py-6 md:px-8" aria-label={t("Aperçu de l'ordre du jour validé")}>
        <div className="flex items-center gap-2"><ListOrdered className="size-5 text-muted-foreground" /><h2 className="font-semibold">{t("Aperçu de l'ordre du jour validé")}</h2></div>
        {validated.length === 0 ? <p className="text-sm text-muted-foreground">{t("Aucun point validé pour cette réunion.")}</p> :
          <ol className="space-y-3">{validated.map((item, index) => <li key={item.id} className="flex gap-4 text-sm leading-6">
            <span className="w-6 shrink-0 tabular-nums text-muted-foreground">{String(index + 1).padStart(2, "0")}</span>
            <span>{item.title}</span>
          </li>)}</ol>}
        <p className="pt-2 text-xs leading-5 text-muted-foreground">{t("Les points sont classés à l'aide des flèches (profil Président). Cet ordre est repris dans la fiche de la réunion.")}</p>
      </section>

      {formOpen && <AgendaForm key={formVersion} open={formOpen} initial={editing}
        proposerName={memberLabel(editing?.proposedById ?? actorId, committeeMembers)}
        meetingName={currentMeeting.title} onOpenChange={setFormOpen} onSave={saveProposal} />}
      <AgendaDetails item={details} onOpenChange={(open) => { if (!open) setDetailsId(null) }} />

      <Dialog open={Boolean(rejectedItem)} onOpenChange={(open) => { if (!open) { setRejectId(null); setRejectError("") } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("Rejeter la proposition")}</DialogTitle>
            <DialogDescription>{rejectedItem?.title}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <Label htmlFor="agenda-rejection-note">{t("Motif du rejet *")}</Label>
            <Textarea id="agenda-rejection-note" rows={4} value={rejectNote} maxLength={600}
              onChange={(event) => { setRejectNote(event.target.value); setRejectError("") }}
              placeholder={t("Précisez pourquoi ce sujet n'est pas retenu…")} />
            {rejectError && <p role="alert" className="text-sm text-destructive">{rejectError}</p>}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setRejectId(null)}>{t("Annuler")}</Button>
            <Button variant="destructive" onClick={reject}>{t("Confirmer le rejet")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Metric({ label, count }: { label: string; count: number }) {
  return <div className="space-y-2 px-3 text-center sm:px-6">
    <p className="text-xs text-muted-foreground sm:text-sm">{label}</p>
    <p className="text-2xl font-semibold tabular-nums sm:text-3xl">{count}</p>
  </div>
}
