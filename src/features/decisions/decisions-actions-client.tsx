"use client"

import { useMemo, useState } from "react"
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

import { initialMeetings } from "@/features/meetings/mock-data"
import { initialMembers } from "@/features/members/mock-data"
import { ActionForm } from "./action-form"
import { ActionsKanban } from "./actions-kanban"
import { DecisionForm } from "./decision-form"
import { initialActions, initialDecisions } from "./mock-data"
import { ACTION_PRIORITIES, ACTION_STATUSES, DECISION_STATUSES } from "./types"
import type { ActionPriority, ActionRecord, ActionStatus, BoardView, DecisionRecord, DecisionStatus } from "./types"
import { dateToday, formatDate, isOverdue, moveAction, nextDecisionReference, normalizedOrder } from "./utils"

const actionFilters = ["Toutes les priorités", ...ACTION_PRIORITIES] as const
const decisionFilters = ["Toutes les décisions", ...DECISION_STATUSES] as const

type ToDelete = { kind: "decision" | "action"; id: string }

function decisionBadge(status: DecisionStatus) {
  return <Badge variant={status === "Rejetée" ? "destructive" : status === "Adoptée" ? "default" : "outline"}>{status}</Badge>
}

function actionBadge(status: ActionStatus) {
  return <Badge variant={status === "Terminée" ? "default" : status === "En cours" ? "secondary" : "outline"}>{status}</Badge>
}

function StatCard({ label, value, icon: Icon }: { label: string; value: number; icon: LucideIcon }) {
  return (
    <Card><CardContent className="flex items-center gap-4 p-5">
      <div className="rounded-lg bg-muted p-2.5"><Icon className="size-5 text-muted-foreground" /></div>
      <div><p className="text-sm text-muted-foreground">{label}</p><p className="text-2xl font-semibold">{value}</p></div>
    </CardContent></Card>
  )
}

const memberLabel = (id: string) => initialMembers.find((member) => member.id === id)?.name ?? "Membre inconnu"
const meetingLabel = (id: string) => initialMeetings.find((meeting) => meeting.id === id)?.title ?? "Réunion inconnue"

export function DecisionsActionsClient() {
  const [decisions, setDecisions] = useState<DecisionRecord[]>(initialDecisions)
  const [actions, setActions] = useState<ActionRecord[]>(initialActions)
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

  const filteredActions = useMemo(() => {
    const query = search.toLocaleLowerCase("fr").trim()
    return actions.filter((action) => {
      const related = decisions.find((decision) => decision.id === action.decisionId)
      const haystack = `${action.title} ${action.description} ${memberLabel(action.assigneeId)} ${related?.reference ?? ""}`.toLocaleLowerCase("fr")
      return (!query || haystack.includes(query)) && (priorityFilter === "Toutes les priorités" || action.priority === priorityFilter)
    })
  }, [actions, decisions, search, priorityFilter])

  const filteredDecisions = useMemo(() => {
    const query = search.toLocaleLowerCase("fr").trim()
    return decisions.filter((decision) => {
      const haystack = `${decision.reference} ${decision.title} ${decision.description} ${meetingLabel(decision.meetingId)}`.toLocaleLowerCase("fr")
      return (!query || haystack.includes(query)) && (decisionFilter === "Toutes les décisions" || decision.status === decisionFilter)
    }).sort((a, b) => b.date.localeCompare(a.date))
  }, [decisions, search, decisionFilter])

  const ongoing = actions.filter((action) => action.status === "En cours").length
  const completed = actions.filter((action) => action.status === "Terminée").length
  const overdue = actions.filter((action) => isOverdue(action, today)).length

  function openDecisionForm(item: DecisionRecord | null = null) {
    setDetailDecisionId(null)
    setEditingDecision(item)
    setDecisionFormVersion((n) => n + 1)
    setDecisionFormOpen(true)
  }

  function saveDecision(item: DecisionRecord): string | null {
    if (item.status !== "Adoptée" && actions.some((action) => action.decisionId === item.id)) {
      return "Cette décision est liée à des actions. Elle doit rester adoptée ou ces actions doivent être dissociées."
    }
    setDecisions((current) => current.some((old) => old.id === item.id)
      ? current.map((old) => old.id === item.id ? item : old)
      : [item, ...current])
    return null
  }

  function openActionForm(item: ActionRecord | null = null, status: ActionStatus = "À faire", decisionId = "") {
    setDetailDecisionId(null)
    setDetailActionId(null)
    setEditingAction(item)
    setDefaultActionStatus(status)
    setDefaultDecisionId(decisionId)
    setActionFormVersion((n) => n + 1)
    setActionFormOpen(true)
  }

  function saveAction(item: ActionRecord) {
    setActions((current) => {
      const old = current.find((action) => action.id === item.id)
      const updated = old
        ? current.map((action) => action.id === item.id ? { ...item, order: old.status === item.status ? old.order : 9999 } : action)
        : [...current, item]
      return normalizedOrder(updated)
    })
  }

  function confirmDelete() {
    if (!toDelete) return
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

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Décisions et suivi des actions</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Consultez les décisions adoptées et suivez les responsabilités et les échéances sur un tableau Kanban.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => openDecisionForm()}><Plus className="mr-2 size-4" /> Décision</Button>
          <Button onClick={() => openActionForm()}><Plus className="mr-2 size-4" /> Nouvelle action</Button>
        </div>
      </div>

      <div className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
        Prototype frontend : données fictives, formulaires et glisser-déposer locaux. Aucun appel API, aucun stockage et aucun contrôle RBAC.
        Les réunions et membres affichés proviennent des données fictives des modules précédents.
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Décisions adoptées" value={decisions.filter((item) => item.status === "Adoptée").length} icon={ClipboardCheck} />
        <StatCard label="Actions en cours" value={ongoing} icon={CalendarClock} />
        <StatCard label="Actions terminées" value={completed} icon={CheckCircle2} />
        <StatCard label="Actions en retard" value={overdue} icon={TriangleAlert} />
      </div>

      <Card>
        <div className="flex flex-col justify-between gap-3 border-b p-4 lg:flex-row lg:items-center">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant={view === "kanban" ? "default" : "outline"} onClick={() => changeTab("kanban")}>
              <LayoutGrid className="mr-2 size-4" /> Kanban
            </Button>
            <Button size="sm" variant={view === "list" ? "default" : "outline"} onClick={() => changeTab("list")}>
              <List className="mr-2 size-4" /> Liste des actions
            </Button>
            <Button size="sm" variant={view === "decisions" ? "default" : "outline"} onClick={() => changeTab("decisions")}>
              <ClipboardCheck className="mr-2 size-4" /> Décisions
            </Button>
          </div>
          <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
            <div className="relative sm:min-w-64">
              <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)}
                placeholder={view === "decisions" ? "Chercher une décision..." : "Chercher une action..."}
                aria-label="Rechercher" />
            </div>
            {view === "decisions" ? (
              <Select value={decisionFilter} onValueChange={(value) => setDecisionFilter(value as (typeof decisionFilters)[number])}>
                <SelectTrigger className="sm:w-48"><SelectValue /></SelectTrigger>
                <SelectContent>{decisionFilters.map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}</SelectContent>
              </Select>
            ) : (
              <Select value={priorityFilter} onValueChange={(value) => setPriorityFilter(value as (typeof actionFilters)[number])}>
                <SelectTrigger className="sm:w-48"><SelectValue /></SelectTrigger>
                <SelectContent>{actionFilters.map((priority) => <SelectItem key={priority} value={priority}>{priority}</SelectItem>)}</SelectContent>
              </Select>
            )}
          </div>
        </div>

        {view === "kanban" && (
          <div className="p-3">
            <ActionsKanban actions={filteredActions} decisions={decisions}
              onMove={(id, status, beforeId) => setActions((current) => moveAction(current, id, status, beforeId))}
              onAdd={(status) => openActionForm(null, status)} onDetails={setDetailActionId} />
          </div>
        )}

        {view === "list" && (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Action</TableHead><TableHead>Décision</TableHead><TableHead>Responsable</TableHead>
                <TableHead>Échéance</TableHead><TableHead>Priorité</TableHead><TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {filteredActions.length === 0 ? <TableRow><TableCell colSpan={7} className="py-12 text-center text-muted-foreground">Aucune action trouvée.</TableCell></TableRow>
                  : filteredActions.map((action) => {
                    const linked = decisions.find((decision) => decision.id === action.decisionId)
                    return <TableRow key={action.id}>
                      <TableCell className="min-w-48 font-medium">{action.title}</TableCell>
                      <TableCell className="whitespace-nowrap">{linked?.reference ?? "—"}</TableCell>
                      <TableCell className="whitespace-nowrap">{memberLabel(action.assigneeId)}</TableCell>
                      <TableCell className={`whitespace-nowrap ${isOverdue(action, today) ? "font-medium text-destructive" : ""}`}>
                        {formatDate(action.dueDate)}{isOverdue(action, today) ? " · Retard" : ""}
                      </TableCell>
                      <TableCell><Badge variant={action.priority === "Haute" ? "destructive" : "outline"}>{action.priority}</Badge></TableCell>
                      <TableCell>{actionBadge(action.status)}</TableCell>
                      <TableCell><div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" aria-label="Voir l'action" onClick={() => setDetailActionId(action.id)}><Eye className="size-4" /></Button>
                        <Button size="icon" variant="ghost" aria-label="Modifier l'action" onClick={() => openActionForm(action)}><Pencil className="size-4" /></Button>
                        <Button size="icon" variant="ghost" aria-label="Supprimer l'action" onClick={() => setToDelete({ kind: "action", id: action.id })}><Trash2 className="size-4" /></Button>
                      </div></TableCell>
                    </TableRow>
                  })}
              </TableBody>
            </Table>
            <p className="p-4 text-xs text-muted-foreground">{filteredActions.length} action(s) affichée(s) sur {actions.length}.</p>
          </div>
        )}

        {view === "decisions" && (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Référence</TableHead><TableHead>Décision</TableHead><TableHead>Réunion</TableHead>
                <TableHead>Date</TableHead><TableHead>Actions liées</TableHead><TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {filteredDecisions.length === 0 ? <TableRow><TableCell colSpan={7} className="py-12 text-center text-muted-foreground">Aucune décision trouvée.</TableCell></TableRow>
                  : filteredDecisions.map((decision) => <TableRow key={decision.id}>
                    <TableCell className="whitespace-nowrap font-mono text-xs">{decision.reference}</TableCell>
                    <TableCell className="min-w-56 font-medium">{decision.title}</TableCell>
                    <TableCell className="min-w-40 text-sm">{meetingLabel(decision.meetingId)}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatDate(decision.date)}</TableCell>
                    <TableCell>{actions.filter((action) => action.decisionId === decision.id).length}</TableCell>
                    <TableCell>{decisionBadge(decision.status)}</TableCell>
                    <TableCell><div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" aria-label="Voir la décision" onClick={() => setDetailDecisionId(decision.id)}><Eye className="size-4" /></Button>
                      <Button size="icon" variant="ghost" aria-label="Modifier la décision" onClick={() => openDecisionForm(decision)}><Pencil className="size-4" /></Button>
                      <Button size="icon" variant="ghost" aria-label="Supprimer la décision" onClick={() => setToDelete({ kind: "decision", id: decision.id })}><Trash2 className="size-4" /></Button>
                    </div></TableCell>
                  </TableRow>)}
              </TableBody>
            </Table>
            <p className="p-4 text-xs text-muted-foreground">{filteredDecisions.length} décision(s) affichée(s) sur {decisions.length}.</p>
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
            <DialogDescription>Détails de la décision et actions de suivi associées.</DialogDescription></DialogHeader>
          {selectedDecision && <div className="space-y-4 text-sm">
            <div className="flex flex-wrap items-center gap-2">{decisionBadge(selectedDecision.status)}
              <span className="text-muted-foreground">{formatDate(selectedDecision.date)}</span></div>
            <div><p className="font-medium">Réunion associée</p><p className="mt-1 text-muted-foreground">{meetingLabel(selectedDecision.meetingId)}</p></div>
            <div><p className="font-medium">Description</p><p className="mt-1 whitespace-pre-wrap text-muted-foreground">{selectedDecision.description || "Aucune description."}</p></div>
            <div className="space-y-2 border-t pt-4">
              <p className="font-medium">Actions de suivi ({actions.filter((item) => item.decisionId === selectedDecision.id).length})</p>
              {actions.filter((item) => item.decisionId === selectedDecision.id).length === 0 && <p className="text-muted-foreground">Aucune action associée.</p>}
              {actions.filter((item) => item.decisionId === selectedDecision.id).map((action) => (
                <div key={action.id} className="flex items-center justify-between gap-2 rounded-lg border p-3">
                  <div className="min-w-0"><p className="font-medium">{action.title}</p>
                    <p className="text-xs text-muted-foreground">{memberLabel(action.assigneeId)} · {formatDate(action.dueDate)}</p></div>
                  {actionBadge(action.status)}
                </div>
              ))}
            </div>
          </div>}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDetailDecisionId(null)}>Fermer</Button>
            {selectedDecision?.status === "Adoptée" && <Button onClick={() => openActionForm(null, "À faire", selectedDecision.id)}>
              <Plus className="mr-2 size-4" /> Ajouter une action
            </Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(selectedAction)} onOpenChange={(open) => { if (!open) setDetailActionId(null) }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader><DialogTitle>{selectedAction?.title}</DialogTitle>
            <DialogDescription>Détails de l'action et de son avancement.</DialogDescription></DialogHeader>
          {selectedAction && <div className="space-y-4 text-sm">
            <div className="flex flex-wrap gap-2">{actionBadge(selectedAction.status)}
              <Badge variant={selectedAction.priority === "Haute" ? "destructive" : "outline"}>Priorité {selectedAction.priority.toLowerCase()}</Badge></div>
            <div><p className="font-medium">Description</p><p className="mt-1 whitespace-pre-wrap text-muted-foreground">{selectedAction.description || "Aucune description."}</p></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><p className="font-medium">Responsable</p><p className="mt-1 text-muted-foreground">{memberLabel(selectedAction.assigneeId)}</p></div>
              <div><p className="font-medium">Échéance</p><p className="mt-1 text-muted-foreground">{formatDate(selectedAction.dueDate)}</p></div>
            </div>
            <div><p className="font-medium">Décision rattachée</p>
              <p className="mt-1 text-muted-foreground">{decisions.find((item) => item.id === selectedAction.decisionId)?.reference ?? "Aucune"}</p></div>
          </div>}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDetailActionId(null)}>Fermer</Button>
            {selectedAction && <Button onClick={() => openActionForm(selectedAction)}><Pencil className="mr-2 size-4" /> Modifier</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(toDelete)} onOpenChange={(open) => { if (!open) setToDelete(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Confirmer la suppression ?</DialogTitle>
            <DialogDescription>
              {deleteDecision ? `Supprimer la décision ${deleteDecision.reference} ?` : deleteAction ? `Supprimer l'action « ${deleteAction.title} » ?` : ""}
              {dependentActionCount > 0 && ` Cette décision comporte ${dependentActionCount} action(s) liée(s). Dissocie ou supprime-les avant de supprimer cette décision.`}
              {dependentActionCount === 0 && " L'opération est uniquement locale et peut être annulée en rechargeant la page."}
            </DialogDescription></DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setToDelete(null)}>Annuler</Button>
            <Button variant="destructive" disabled={dependentActionCount > 0} onClick={confirmDelete}>Supprimer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
