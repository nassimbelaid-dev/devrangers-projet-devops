"use client"

import { useDemoData } from "@/lib/demo-store"

import { useEffect, useState } from "react"
import { CheckCircle2, Download, RotateCcw, Save } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { MeetingMinutes } from "./types"
import { memberName, printMinutes, today } from "./utils"
import { MinutesPreview } from "./minutes-preview"

interface Props {
  minutes: MeetingMinutes
  onSave: (next: MeetingMinutes) => void
}

export function MinutesEditor({ minutes, onSave }: Props) {
  const { meetings, members } = useDemoData()
  const [form, setForm] = useState<MeetingMinutes>(() => ({ ...minutes, presentMemberIds: [...minutes.presentMemberIds] }))
  const [feedback, setFeedback] = useState("")
  const meeting = meetings.find((item) => item.id === form.meetingId)
  const isLocked = form.status === "Validé"

  useEffect(() => { setForm({ ...minutes, presentMemberIds: [...minutes.presentMemberIds] }) }, [minutes])

  function update<K extends keyof MeetingMinutes>(key: K, value: MeetingMinutes[K]) {
    setForm((current) => ({ ...current, [key]: value }))
    setFeedback("")
  }
  function togglePresent(id: string, checked: boolean) {
    update("presentMemberIds", checked ? [...form.presentMemberIds, id] : form.presentMemberIds.filter((memberId) => memberId !== id))
  }
  function save() {
    const next = { ...form, version: minutes.version + 1, updatedAt: today() }
    onSave(next)
    setFeedback("Brouillon enregistré en mémoire pour cette session.")
  }
  function validate() {
    if (!form.summary.trim() || !form.presentMemberIds.length) {
      setFeedback("Ajoutez au moins un membre présent et un compte rendu avant de valider.")
      return
    }
    const next = { ...form, status: "Validé" as const, version: minutes.version + 1, updatedAt: today() }
    onSave(next)
    setFeedback("PV validé dans la simulation. Aucune signature réelle.")
  }
  function reopen() {
    const next = { ...form, status: "Brouillon" as const, version: minutes.version + 1, updatedAt: today() }
    onSave(next)
    setFeedback("PV rouvert en brouillon.")
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3"><span className="text-sm font-medium">{form.reference}</span><Badge variant={isLocked ? "secondary" : "outline"}>{form.status}</Badge><span className="text-xs text-muted-foreground">v{form.version}</span></div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => { if (!printMinutes(form)) setFeedback("Impossible d'ouvrir l'impression : autorisez les fenêtres contextuelles.") }}><Download className="mr-2 size-4" />Imprimer / PDF</Button>
          {isLocked ? <Button size="sm" variant="outline" onClick={reopen}><RotateCcw className="mr-2 size-4" />Rouvrir</Button> : <>
            <Button size="sm" variant="outline" onClick={save}><Save className="mr-2 size-4" />Enregistrer</Button>
            <Button size="sm" onClick={validate}><CheckCircle2 className="mr-2 size-4" />Valider</Button>
          </>}
        </div>
      </div>

      <div className="grid items-start gap-10 xl:grid-cols-2">
        <section className="min-w-0 space-y-8">
          <div className="space-y-2 border-b pb-5"><h3 className="text-lg font-semibold tracking-tight">Contenu du procès-verbal</h3><p className="text-sm leading-6 text-muted-foreground">Complétez le compte rendu et vérifiez les présences avant validation.</p></div>
          <fieldset disabled={isLocked} className="space-y-7 disabled:opacity-70">
            <div className="space-y-3">
              <Label>Présents à la réunion</Label>
              <div className="divide-y rounded-xl border px-4">
                {(meeting?.participantIds ?? []).map((id) => {
                  const member = members.find((item) => item.id === id)
                  return <label key={id} className="flex min-h-12 cursor-pointer items-center gap-3 py-3 text-sm">
                    <input type="checkbox" checked={form.presentMemberIds.includes(id)} onChange={(event) => togglePresent(id, event.target.checked)} className="size-4 accent-primary" />
                    <span className="font-medium">{(members.find((item) => item.id === id)?.name ?? "Inconnu")}</span><span className="ml-auto text-xs text-muted-foreground">{member?.role ?? "Membre"}</span>
                  </label>
                })}
              </div>
              <p className="text-xs text-muted-foreground">Présences simulées, indépendantes du module Votes.</p>
            </div>
            <div className="space-y-2"><Label htmlFor="minutes-summary">Déroulement et échanges *</Label><Textarea id="minutes-summary" rows={7} value={form.summary} onChange={(event) => update("summary", event.target.value)} placeholder="Résumez les échanges et les conclusions…" /></div>
            <div className="space-y-2"><Label htmlFor="minutes-actions">Suites à donner</Label><Textarea id="minutes-actions" rows={4} value={form.nextSteps} onChange={(event) => update("nextSteps", event.target.value)} placeholder="Actions, responsables ou échéances évoquées…" /></div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="minutes-secretary">Secrétaire</Label><Input id="minutes-secretary" value={form.secretary} onChange={(event) => update("secretary", event.target.value)} /></div>
              <div className="space-y-2"><Label htmlFor="minutes-president">Président</Label><Input id="minutes-president" value={form.president} onChange={(event) => update("president", event.target.value)} /></div>
            </div>
          </fieldset>
          {feedback && <p role="status" className="rounded-lg border px-4 py-3 text-sm text-muted-foreground">{feedback}</p>}
          {isLocked && <p className="text-xs text-muted-foreground">Les champs sont verrouillés dans la maquette après validation. « Rouvrir » permet de les modifier à nouveau.</p>}
        </section>
        <section className="min-w-0 space-y-4"><div><h3 className="text-lg font-semibold">Aperçu</h3><p className="mt-1 text-sm text-muted-foreground">Mis à jour automatiquement pendant la saisie.</p></div><MinutesPreview minutes={form} /></section>
      </div>
    </div>
  )
}
