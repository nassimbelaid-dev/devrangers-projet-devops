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
import { DECISION_STATUSES } from "./types"
import type { DecisionRecord, DecisionStatus } from "./types"
import { dateToday } from "./utils"

interface DecisionFormProps {
  open: boolean
  initial: DecisionRecord | null
  reference: string
  onOpenChange: (open: boolean) => void
  onSave: (item: DecisionRecord) => string | null
}

function blankDecision(reference: string): DecisionRecord {
  return {
    id: `d-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    reference, title: "", description: "", date: dateToday(), meetingId: "", status: "En attente",
  }
}

export function DecisionForm({ open, initial, reference, onOpenChange, onSave }: DecisionFormProps) {
  const { meetings } = useDemoData()
  const [form, setForm] = useState<DecisionRecord>(() => initial ? { ...initial } : blankDecision(reference))
  const [error, setError] = useState("")

  function change<K extends keyof DecisionRecord>(key: K, value: DecisionRecord[K]) {
    setForm((current) => ({ ...current, [key]: value }))
    setError("")
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form.title.trim() || !form.meetingId || !form.date) {
      setError("Le titre, la réunion et la date sont obligatoires.")
      return
    }
    const result = onSave({ ...form, title: form.title.trim(), description: form.description.trim() })
    if (result) {
      setError(result)
      return
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{initial ? "Modifier la décision" : "Nouvelle décision"}</DialogTitle>
          <DialogDescription>
            Décision fictive rattachée à une réunion du comité, sans sauvegarde serveur.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="decision-ref">Référence</Label>
              <Input id="decision-ref" value={form.reference} readOnly className="bg-muted/40" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="decision-date">Date *</Label>
              <Input id="decision-date" type="date" value={form.date} onChange={(event) => change("date", event.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="decision-title">Intitulé de la décision *</Label>
            <Input id="decision-title" value={form.title} onChange={(event) => change("title", event.target.value)}
              placeholder="Ex. Valider le calendrier des soutenances" maxLength={160} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="decision-meeting">Réunion concernée *</Label>
            <Select value={form.meetingId} onValueChange={(value) => change("meetingId", value)}>
              <SelectTrigger id="decision-meeting"><SelectValue placeholder="Sélectionner une réunion" /></SelectTrigger>
              <SelectContent>
                {meetings.map((meeting) => (
                  <SelectItem key={meeting.id} value={meeting.id}>
                    {meeting.title} ({meeting.date})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="decision-status">Statut *</Label>
            <Select value={form.status} onValueChange={(value) => change("status", value as DecisionStatus)}>
              <SelectTrigger id="decision-status"><SelectValue /></SelectTrigger>
              <SelectContent>
                {DECISION_STATUSES.map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="decision-description">Description</Label>
            <Textarea id="decision-description" rows={4} value={form.description}
              onChange={(event) => change("description", event.target.value)}
              placeholder="Contenu et contexte de la décision..." />
          </div>
          <p className="text-xs text-muted-foreground">
            Les résultats des votes et le calcul du quorum seront traités dans un module séparé.
          </p>
          {error && <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button type="submit">{initial ? "Enregistrer" : "Créer la décision"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
