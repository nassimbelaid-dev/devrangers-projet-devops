"use client"

import { useDemoData } from "@/lib/demo-store"

import { useState } from "react"
import type { FormEvent } from "react"

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
import { ACTION_PRIORITIES, ACTION_STATUSES } from "./types"
import type { ActionPriority, ActionRecord, ActionStatus, DecisionRecord } from "./types"

interface ActionFormProps {
  open: boolean
  initial: ActionRecord | null
  decisions: DecisionRecord[]
  defaultStatus: ActionStatus
  defaultDecisionId: string
  onOpenChange: (open: boolean) => void
  onSave: (action: ActionRecord) => void
}

function blankAction(defaultStatus: ActionStatus, defaultDecisionId: string): ActionRecord {
  return {
    id: `ac-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: "", description: "", dueDate: "", assigneeId: "",
    decisionId: defaultDecisionId, status: defaultStatus, priority: "Normale", order: 9999,
  }
}

export function ActionForm({ open, initial, decisions, defaultStatus, defaultDecisionId, onOpenChange, onSave }: ActionFormProps) {
  const { members } = useDemoData()
  const [form, setForm] = useState<ActionRecord>(() => initial ? { ...initial } : blankAction(defaultStatus, defaultDecisionId))
  const [error, setError] = useState("")

  function change<K extends keyof ActionRecord>(key: K, value: ActionRecord[K]) {
    setForm((current) => ({ ...current, [key]: value }))
    setError("")
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form.title.trim() || !form.assigneeId || !form.dueDate) {
      setError("Le titre, le responsable et l'échéance sont obligatoires.")
      return
    }
    onSave({ ...form, title: form.title.trim(), description: form.description.trim() })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{initial ? "Modifier l'action" : "Nouvelle action"}</DialogTitle>
          <DialogDescription>
            Attribuez une responsabilité, une échéance et un statut. Les changements sont locaux à cette page.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit}>
          <div className="space-y-2">
            <Label htmlFor="action-title">Intitulé de l'action *</Label>
            <Input id="action-title" value={form.title} onChange={(event) => change("title", event.target.value)}
              placeholder="Ex. Préparer la synthèse du rapport" maxLength={160} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="action-description">Description</Label>
            <Textarea id="action-description" rows={3} value={form.description}
              onChange={(event) => change("description", event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="action-decision">Décision associée (facultatif)</Label>
            <Select value={form.decisionId || "none"} onValueChange={(value) => change("decisionId", value === "none" ? "" : value)}>
              <SelectTrigger id="action-decision"><SelectValue placeholder="Sans décision associée" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sans décision associée</SelectItem>
                {decisions.filter((decision) => decision.status === "Adoptée" || decision.id === form.decisionId)
                  .map((decision) => (
                    <SelectItem key={decision.id} value={decision.id}>
                      {decision.reference} — {decision.title}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="action-assignee">Responsable *</Label>
              <Select value={form.assigneeId} onValueChange={(value) => change("assigneeId", value)}>
                <SelectTrigger id="action-assignee"><SelectValue placeholder="Sélectionner un membre" /></SelectTrigger>
                <SelectContent>
                  {members.map((member) => <SelectItem key={member.id} value={member.id}>{member.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="action-date">Échéance *</Label>
              <Input id="action-date" type="date" value={form.dueDate}
                onChange={(event) => change("dueDate", event.target.value)} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="action-priority">Priorité</Label>
              <Select value={form.priority} onValueChange={(value) => change("priority", value as ActionPriority)}>
                <SelectTrigger id="action-priority"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ACTION_PRIORITIES.map((priority) => <SelectItem key={priority} value={priority}>{priority}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="action-status">État d'avancement</Label>
              <Select value={form.status} onValueChange={(value) => change("status", value as ActionStatus)}>
                <SelectTrigger id="action-status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ACTION_STATUSES.map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          {error && <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button type="submit">{initial ? "Enregistrer" : "Créer l'action"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
