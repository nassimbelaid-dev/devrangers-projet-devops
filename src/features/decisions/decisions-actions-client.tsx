"use client"

import { useMemo, useState } from "react"
import { useDemoCollection, useDemoData } from "@/lib/demo-store"
import { useUiText } from "@/features/ui-text"
import {
  CalendarClock, CheckCircle2, ClipboardCheck, Eye, LayoutGrid, List, Pencil, Plus,
  Search, Trash2, TriangleAlert,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"

import { ActionForm } from "./action-form"
import { ActionsKanban } from "./actions-kanban"
import { DecisionForm } from "./decision-form"
import { ACTION_PRIORITIES, ACTION_STATUSES, DECISION_STATUSES } from "./types"
import type { ActionPriority, ActionRecord, ActionStatus, BoardView, DecisionRecord, DecisionStatus } from "./types"
import { dateToday, formatDate, isOverdue, moveAction, nextDecisionReference, normalizedOrder } from "./utils"
import { hasPermission, useStaticAuth } from "@/lib/static-auth"

const actionFilters = ["Toutes les priorités", ...ACTION_PRIORITIES] as const
const decisionFilters = ["Toutes les décisions", ...DECISION_STATUSES] as const

type ToDelete = { kind: "decision" | "action"; id: string }

function decisionBadge(status: DecisionStatus, t: (source: string) => string) {
  return <Badge variant={status === "Rejetée" ? "destructive" : status === "Adoptée" ? "default" : "outline"}>{t(status)}</Badge>
}

function actionBadge(status: ActionStatus, t: (source: string) => string) {
  return <Badge variant={status === "Terminée" ? "default" : status === "En cours" ? "secondary" : "outline"}>{t(status)}</Badge>
}

function StatCard({ label, value, icon: Icon }: { label: string; value: number; icon: LucideIcon }) {
  return (
    <Card><CardContent className="flex items-center gap-4 p-5">
      <div className="rounded-lg bg-muted p-2.5"><Icon className="size-5 text-muted-foreground" /></div>
      <div><p className="text-sm text-muted-foreground">{label}</p><p className="text-2xl font-semibold">{value}</p></div>
    </CardContent></Card>
  )
}


export function DecisionsActionsClient() {
  const t = useUiText()
  const { user } = useStaticAuth()
  const canManageActions = hasPermission(user, "actions", "create") || hasPermission(user, "actions", "delete")
  const isAssignedMember = user?.role === "member" && Boolean(user.memberId)
  const { meetings: linkedMeetings, members: linkedMembers } = useDemoData()
  const memberLabel = (id: string) => linkedMembers.find((member) => member.id === id)?.name ?? "Membre inconnu"
  const meetingLabel = (id: string) => linkedMeetings.find((meeting) => meeting.id === id)?.title ?? "Réunion inconnue"
  const [decisions, setDecisions] = useDemoCollection("decisions")
  const [actions, setActions] = useDemoCollection("actions")
  const [view, setView] = useState<BoardView>("kanban")
  const [search, setSearch] = useState("")
  const [priorityFilter, setPriorityFilter] = useState<(typeof actionFilters)[number]>("Toutes les priorités")
  const [decisionFilter, setDecisionFilter] = useState<(typeof decisionFilters)[number]>("Toutes les décisions")
  const [decisionFormOpen, setDecisionFormOpen] = useState(false)
  const [actionFormOpen, setActionFormOpen] = useState(false)
  const [editingDecision, setEditingDecision] = useState<DecisionRecord | null>(null)
  const [editingAction, setEditingAction] = useState<ActionRecord | null>(null)
  const [decisionFormVersion, setDecisionFormVersion] = useState(0)
  const [actionFormVersion, setActionFormVersion] = useState(0)
  const [defaultActionStatus, setDefaultActionStatus] = useState<ActionStatus>("À faire")
  const [defaultDecisionId, setDefaultDecisionId] = useState("")
  const [detailDecisionId, setDetailDecisionId] = useState<string | null>(null)
  const [detailActionId, setDetailActionId] = useState<string | null>(null)
  const [toDelete, setToDelete] = useState<ToDelete | null>(null)

  const today = dateToday()
  const selectedDecision = decisions.find((item) => item.id === detailDecisionId) ?? null
  const selectedAction = actions.find((item) => item.id === detailActionId) ?? null
  const deleteDecision = toDelete?.kind === "decision" ? decisions.find((item) => item.id === toDelete.id) : undefined
  const deleteAction = toDelete?.kind === "action" ? actions.find((item) => item.id === toDelete.id) : undefined
  const dependentActionCount = deleteDecision ? actions.filter((item) => item.decisionId === deleteDecision.id).length : 0

  const roleActions = isAssignedMember ? actions.filter((action) => action.assigneeId === user?.memberId) : actions
  const filteredActions = useMemo(() => {
    const query = search.toLocaleLowerCase("fr").trim()
    return roleActions.filter((action) => {
      const related = decisions.find((decision) => decision.id === action.decisionId)
      const haystack = `${action.title} ${action.description} ${memberLabel(action.assigneeId)} ${related?.reference ?? ""}`.toLocaleLowerCase("fr")
      return (!query || haystack.includes(query)) && (priorityFilter === "Toutes les priorités" || action.priority === priorityFilter)
    })
  }, [roleActions, decisions, search, priorityFilter, linkedMembers])

  const filteredDecisions = useMemo(() => {
    const query = search.toLocaleLowerCase("fr").trim()
    return decisions.filter((decision) => {
      const haystack = `${decision.reference} ${decision.title} ${decision.description} ${meetingLabel(decision.meetingId)}`.toLocaleLowerCase("fr")
      return (!query || haystack.includes(query)) && (decisionFilter === "Toutes les décisions" || decision.status === decisionFilter)
    }).sort((a, b) => b.date.localeCompare(a.date))
  }, [decisions, search, decisionFilter, linkedMeetings])

  const ongoing = actions.filter((action) => action.status === "En cours").length
  const completed = actions.filter((action) => action.status === "Terminée").length
  const overdue = actions.filter((action) => isOverdue(action, today)).length

  function openDecisionForm(item: DecisionRecord | null = null) {
    if (!canManageActions) return
    setDetailDecisionId(null)
    setEditingDecision(item)
    setDecisionFormVersion((n) => n + 1)
    setDecisionFormOpen(true)
  }

  function saveDecision(item: DecisionRecord): string | null {
    if (!canManageActions) return t("Vous ne pouvez pas modifier les décisions.")
    if (item.status !== "Adoptée" && actions.some((action) => action.decisionId === item.id)) {
      return t("Cette décision est liée à des actions. Elle doit rester adoptée ou ces actions doivent être dissociées.")
    }
    setDecisions((current) => current.some((old) => old.id === item.id)
      ? current.map((old) => old.id === item.id ? item : old)
      : [item, ...current])
    return null
  }

  function openActionForm(item: ActionRecord | null = null, status: ActionStatus = "À faire", decisionId = "") {
    if (!canManageActions) return
    setDetailDecisionId(null)
    setDetailActionId(null)
    setEditingAction(item)
    setDefaultActionStatus(status)
    setDefaultDecisionId(decisionId)
    setActionFormVersion((n) => n + 1)
    setActionFormOpen(true)
  }

  function saveAction(item: ActionRecord) {
    if (!canManageActions) return
    setActions((current) => {
      const old = current.find((action) => action.id === item.id)
      const updated = old
        ? current.map((action) => action.id === item.id ? { ...item, order: old.status === item.status ? old.order : 9999 } : action)
        : [...current, item]
      return normalizedOrder(updated)
    })
  }

  function confirmDelete() {
    if (!canManageActions || !toDelete) return
    if (toDelete.kind === "decision") {
      if (actions.some((action) => action.decisionId === toDelete.id)) return
      setDecisions((current) => current.filter((item) => item.id !== toDelete.id))
      setDetailDecisionId(null)
    } else {
      setActions((current) => normalizedOrder(current.filter((item) => item.id !== toDelete.id)))
      setDetailActionId(null)
    }
    setToDelete(null)
  }

  function changeTab(next: BoardView) {
    setView(next)
    setSearch("")
    setPriorityFilter("Toutes les priorités")
    setDecisionFilter("Toutes les décisions")
  }

  function updateAssignedActionStatus(id: string, status: ActionStatus) {
    if (!isAssignedMember || !user?.memberId) return
    setActions((current) => current.map((action) => action.id === id && action.assigneeId === user.memberId ? { ...action, status } : action))
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("Décisions et suivi des actions")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("Consultez les décisions adoptées et suivez les responsabilités et les échéances sur un tableau Kanban.")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canManageActions && <><Button variant="outline" onClick={() => openDecisionForm()}><Plus className="mr-2 size-4" /> {t("Décision")}</Button>
          <Button onClick={() => openActionForm()}><Plus className="mr-2 size-4" /> {t("Nouvelle action")}</Button></>}
        </div>
      </div>

      

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t("Décisions adoptées")} value={decisions.filter((item) => item.status === "Adoptée").length} icon={ClipboardCheck} />
        <StatCard label={t("Actions en cours")} value={ongoing} icon={CalendarClock} />
        <StatCard label={t("Actions terminées")} value={completed} icon={CheckCircle2} />
        <StatCard label={t("Actions en retard")} value={overdue} icon={TriangleAlert} />
      </div>

      <Card>
        <div className="flex flex-col justify-between gap-3 border-b p-4 lg:flex-row lg:items-center">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant={view === "kanban" ? "default" : "outline"} onClick={() => changeTab("kanban")}>
              <LayoutGrid className="mr-2 size-4" /> {t("Kanban")}
            </Button>
            <Button size="sm" variant={view === "list" ? "default" : "outline"} onClick={() => changeTab("list")}>
              <List className="mr-2 size-4" /> {t("Liste des actions")}
            </Button>
            <Button size="sm" variant={view === "decisions" ? "default" : "outline"} onClick={() => changeTab("decisions")}>
              <ClipboardCheck className="mr-2 size-4" /> {t("Décisions")}
            </Button>
          </div>
          <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
            <div className="relative sm:min-w-64">
              <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)}
                placeholder={t(view === "decisions" ? "Chercher une décision..." : "Chercher une action...")}
                aria-label={t("Rechercher")} />
            </div>
            {view === "decisions" ? (
              <Select value={decisionFilter} onValueChange={(value) => setDecisionFilter(value as (typeof decisionFilters)[number])}>
                <SelectTrigger className="sm:w-48"><SelectValue /></SelectTrigger>
                <SelectContent>{decisionFilters.map((status) => <SelectItem key={status} value={status}>{t(status)}</SelectItem>)}</SelectContent>
              </Select>
            ) : (
              <Select value={priorityFilter} onValueChange={(value) => setPriorityFilter(value as (typeof actionFilters)[number])}>
                <SelectTrigger className="sm:w-48"><SelectValue /></SelectTrigger>
                <SelectContent>{actionFilters.map((priority) => <SelectItem key={priority} value={priority}>{t(priority)}</SelectItem>)}</SelectContent>
              </Select>
            )}
          </div>
        </div>

        {view === "kanban" && (
          <div className="p-3">
            <ActionsKanban actions={filteredActions} decisions={decisions}
              onMove={(id, status, beforeId) => {
                if (canManageActions) setActions((current) => moveAction(current, id, status, beforeId))
                else if (isAssignedMember && roleActions.some((action) => action.id === id)) updateAssignedActionStatus(id, status)
              }}
              onAdd={(status) => openActionForm(null, status)} onDetails={setDetailActionId} canAdd={canManageActions} />
          </div>
        )}

        {view === "list" && (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>{t("Action")}</TableHead><TableHead>{t("Décision")}</TableHead><TableHead>{t("Responsable")}</TableHead>
                <TableHead>{t("Échéance")}</TableHead><TableHead>{t("Priorité")}</TableHead><TableHead>{t("Statut")}</TableHead>
                <TableHead className="text-right">{t("Actions")}</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {filteredActions.length === 0 ? <TableRow><TableCell colSpan={7} className="py-12 text-center text-muted-foreground">{t("Aucune action trouvée.")}</TableCell></TableRow>
                  : filteredActions.map((action) => {
                    const linked = decisions.find((decision) => decision.id === action.decisionId)
                    return <TableRow key={action.id}>
                      <TableCell className="min-w-48 font-medium">{action.title}</TableCell>
                      <TableCell className="whitespace-nowrap">{linked?.reference ?? "—"}</TableCell>
                      <TableCell className="whitespace-nowrap">{memberLabel(action.assigneeId)}</TableCell>
                      <TableCell className={`whitespace-nowrap ${isOverdue(action, today) ? "font-medium text-destructive" : ""}`}>
                        {formatDate(action.dueDate)}{isOverdue(action, today) ? ` · ${t("Retard")}` : ""}
                      </TableCell>
                      <TableCell><Badge variant={action.priority === "Haute" ? "destructive" : "outline"}>{t(action.priority)}</Badge></TableCell>
                      <TableCell>{isAssignedMember ? <Select value={action.status} onValueChange={(value) => updateAssignedActionStatus(action.id, value as ActionStatus)}><SelectTrigger className="w-32"><SelectValue /></SelectTrigger><SelectContent>{ACTION_STATUSES.map((status) => <SelectItem key={status} value={status}>{t(status)}</SelectItem>)}</SelectContent></Select> : actionBadge(action.status, t)}</TableCell>
                      <TableCell><div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" aria-label={t("Voir l'action")} onClick={() => setDetailActionId(action.id)}><Eye className="size-4" /></Button>
                        {canManageActions && <><Button size="icon" variant="ghost" aria-label={t("Modifier l'action")} onClick={() => openActionForm(action)}><Pencil className="size-4" /></Button>
                        <Button size="icon" variant="ghost" aria-label={t("Supprimer l'action")} onClick={() => setToDelete({ kind: "action", id: action.id })}><Trash2 className="size-4" /></Button></>}
                      </div></TableCell>
                    </TableRow>
                  })}
              </TableBody>
            </Table>
            <p className="p-4 text-xs text-muted-foreground">{t("{count} action(s) affichée(s) sur {total}.", { count: filteredActions.length, total: actions.length })}</p>
          </div>
        )}

        {view === "decisions" && (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>{t("Référence")}</TableHead><TableHead>{t("Décision")}</TableHead><TableHead>{t("Réunion")}</TableHead>
                <TableHead>{t("Date")}</TableHead><TableHead>{t("Actions liées")}</TableHead><TableHead>{t("Statut")}</TableHead>
                <TableHead className="text-right">{t("Actions")}</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {filteredDecisions.length === 0 ? <TableRow><TableCell colSpan={7} className="py-12 text-center text-muted-foreground">{t("Aucune décision trouvée.")}</TableCell></TableRow>
                  : filteredDecisions.map((decision) => <TableRow key={decision.id}>
                    <TableCell className="whitespace-nowrap font-mono text-xs">{decision.reference}</TableCell>
                    <TableCell className="min-w-56 font-medium">{decision.title}</TableCell>
                    <TableCell className="min-w-40 text-sm">{meetingLabel(decision.meetingId)}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatDate(decision.date)}</TableCell>
                    <TableCell>{actions.filter((action) => action.decisionId === decision.id).length}</TableCell>
                    <TableCell>{decisionBadge(decision.status, t)}</TableCell>
                    <TableCell><div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" aria-label={t("Voir la décision")} onClick={() => setDetailDecisionId(decision.id)}><Eye className="size-4" /></Button>
                      {canManageActions && <><Button size="icon" variant="ghost" aria-label={t("Modifier la décision")} onClick={() => openDecisionForm(decision)}><Pencil className="size-4" /></Button>
                      <Button size="icon" variant="ghost" aria-label={t("Supprimer la décision")} onClick={() => setToDelete({ kind: "decision", id: decision.id })}><Trash2 className="size-4" /></Button></>}
                    </div></TableCell>
                  </TableRow>)}
              </TableBody>
            </Table>
            <p className="p-4 text-xs text-muted-foreground">{t("{count} décision(s) affichée(s) sur {total}.", { count: filteredDecisions.length, total: decisions.length })}</p>
          </div>
        )}
      </Card>

      {decisionFormOpen && <DecisionForm key={decisionFormVersion} open={decisionFormOpen} initial={editingDecision}
        reference={editingDecision?.reference ?? nextDecisionReference(decisions)}
        onOpenChange={setDecisionFormOpen} onSave={saveDecision} />}
      {actionFormOpen && <ActionForm key={actionFormVersion} open={actionFormOpen} initial={editingAction}
        decisions={decisions} defaultStatus={defaultActionStatus} defaultDecisionId={defaultDecisionId}
        onOpenChange={setActionFormOpen} onSave={saveAction} />}

      <Dialog open={Boolean(selectedDecision)} onOpenChange={(open) => { if (!open) setDetailDecisionId(null) }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader><DialogTitle>{selectedDecision?.reference} — {selectedDecision?.title}</DialogTitle>
            <DialogDescription>{t("Détails de la décision et actions de suivi associées.")}</DialogDescription></DialogHeader>
          {selectedDecision && <div className="space-y-4 text-sm">
            <div className="flex flex-wrap items-center gap-2">{decisionBadge(selectedDecision.status, t)}
              <span className="text-muted-foreground">{formatDate(selectedDecision.date)}</span></div>
            <div><p className="font-medium">{t("Réunion associée")}</p><p className="mt-1 text-muted-foreground">{meetingLabel(selectedDecision.meetingId)}</p></div>
            <div><p className="font-medium">{t("Description")}</p><p className="mt-1 whitespace-pre-wrap text-muted-foreground">{selectedDecision.description || t("Aucune description.")}</p></div>
            <div className="space-y-2 border-t pt-4">
              <p className="font-medium">{t("Actions de suivi")} ({actions.filter((item) => item.decisionId === selectedDecision.id).length})</p>
              {actions.filter((item) => item.decisionId === selectedDecision.id).length === 0 && <p className="text-muted-foreground">{t("Aucune action associée.")}</p>}
              {actions.filter((item) => item.decisionId === selectedDecision.id).map((action) => (
                <div key={action.id} className="flex items-center justify-between gap-2 rounded-lg border p-3">
                  <div className="min-w-0"><p className="font-medium">{action.title}</p>
                    <p className="text-xs text-muted-foreground">{memberLabel(action.assigneeId)} · {formatDate(action.dueDate)}</p></div>
                  {actionBadge(action.status, t)}
                </div>
              ))}
            </div>
          </div>}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDetailDecisionId(null)}>{t("Fermer")}</Button>
            {canManageActions && selectedDecision?.status === "Adoptée" && <Button onClick={() => openActionForm(null, "À faire", selectedDecision.id)}>
              <Plus className="mr-2 size-4" /> {t("Ajouter une action")}
            </Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(selectedAction)} onOpenChange={(open) => { if (!open) setDetailActionId(null) }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader><DialogTitle>{selectedAction?.title}</DialogTitle>
            <DialogDescription>{t("Détails de l'action et de son avancement.")}</DialogDescription></DialogHeader>
          {selectedAction && <div className="space-y-4 text-sm">
            <div className="flex flex-wrap gap-2">{actionBadge(selectedAction.status, t)}
              <Badge variant={selectedAction.priority === "Haute" ? "destructive" : "outline"}>{t("Priorité")} {t(selectedAction.priority)}</Badge></div>
            <div><p className="font-medium">{t("Description")}</p><p className="mt-1 whitespace-pre-wrap text-muted-foreground">{selectedAction.description || t("Aucune description.")}</p></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><p className="font-medium">{t("Responsable")}</p><p className="mt-1 text-muted-foreground">{memberLabel(selectedAction.assigneeId)}</p></div>
              <div><p className="font-medium">{t("Échéance")}</p><p className="mt-1 text-muted-foreground">{formatDate(selectedAction.dueDate)}</p></div>
            </div>
            <div><p className="font-medium">{t("Décision rattachée")}</p>
              <p className="mt-1 text-muted-foreground">{decisions.find((item) => item.id === selectedAction.decisionId)?.reference ?? t("Aucune")}</p></div>
            {isAssignedMember && <div className="space-y-2"><p className="font-medium">{t("Mettre à jour mon avancement")}</p><Select value={selectedAction.status} onValueChange={(value) => updateAssignedActionStatus(selectedAction.id, value as ActionStatus)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{ACTION_STATUSES.map((status) => <SelectItem key={status} value={status}>{t(status)}</SelectItem>)}</SelectContent></Select></div>}
          </div>}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDetailActionId(null)}>{t("Fermer")}</Button>
            {canManageActions && selectedAction && <Button onClick={() => openActionForm(selectedAction)}><Pencil className="mr-2 size-4" /> {t("Modifier")}</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(toDelete)} onOpenChange={(open) => { if (!open) setToDelete(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("Confirmer la suppression ?")}</DialogTitle>
            <DialogDescription>
              {deleteDecision ? t("Supprimer la décision {reference} ?", { reference: deleteDecision.reference }) : deleteAction ? t("Supprimer l'action « {title} » ?", { title: deleteAction.title }) : ""}
              {dependentActionCount > 0 && ` ${t("Cette décision comporte {count} action(s) liée(s). Dissocie ou supprime-les avant de supprimer cette décision.", { count: dependentActionCount })}`}
              {dependentActionCount === 0 && ` ${t("L'opération est uniquement locale et peut être annulée en rechargeant la page.")}`}
            </DialogDescription></DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setToDelete(null)}>{t("Annuler")}</Button>
            <Button variant="destructive" disabled={dependentActionCount > 0} onClick={confirmDelete}>{t("Supprimer")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
