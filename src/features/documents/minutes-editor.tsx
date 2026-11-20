"use client"

import { useDemoData } from "@/lib/demo-store"

import { useEffect, useState } from "react"
import { Archive, CheckCircle2, Download, PenLine, RotateCcw, Save } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { MeetingMinutes } from "./types"
import { memberName, printMinutes, today } from "./utils"
import { MinutesPreview } from "./minutes-preview"
import { useUiText } from "@/features/ui-text"
import { useStaticAuth } from "@/lib/static-auth"

interface Props {
  minutes: MeetingMinutes
  onSave: (next: MeetingMinutes) => void
}

export function MinutesEditor({ minutes, onSave }: Props) {
  const t = useUiText()
  const { user } = useStaticAuth()
  const { meetings, members, decisions } = useDemoData()
  const [form, setForm] = useState<MeetingMinutes>(() => ({ ...minutes, presentMemberIds: [...minutes.presentMemberIds] }))
  const [feedback, setFeedback] = useState("")
  const meeting = meetings.find((item) => item.id === form.meetingId)
  const isLocked = form.status === "Signé" || form.status === "Archivé"
  const canDraft = user?.role === "secretary"
  const canSign = user?.role === "president"
  const canArchive = user?.role === "archivist" || user?.role === "admin"

  useEffect(() => { setForm({ ...minutes, presentMemberIds: [...minutes.presentMemberIds] }) }, [minutes])

  function update<K extends keyof MeetingMinutes>(key: K, value: MeetingMinutes[K]) {
    setForm((current) => ({ ...current, [key]: value }))
    setFeedback("")
  }
  function togglePresent(id: string, checked: boolean) {
    update("presentMemberIds", checked ? [...form.presentMemberIds, id] : form.presentMemberIds.filter((memberId) => memberId !== id))
  }
  function save() {
    if (!canDraft || isLocked || form.status !== "Brouillon") return
    const next = { ...form, version: minutes.version + 1, updatedAt: today() }
    onSave(next)
    setFeedback(t("Brouillon enregistré en mémoire pour cette session."))
  }
  function validate() {
    if (!canDraft || form.status !== "Brouillon") return
    if (!form.summary.trim() || !form.presentMemberIds.length) {
      setFeedback(t("Ajoutez au moins un membre présent et un compte rendu avant de soumettre le PV."))
      return
    }
    const next = { ...form, status: "À signer" as const, version: minutes.version + 1, updatedAt: today() }
    onSave(next)
    setFeedback(t("Le PV est transmis au président pour signature."))
  }
  function reopen() {
    if (!canDraft || form.status !== "À signer") return
    const next = { ...form, status: "Brouillon" as const, version: minutes.version + 1, updatedAt: today() }
    onSave(next)
    setFeedback(t("Le PV est de nouveau en brouillon."))
  }
  function sign() {
    if (!user || user.role !== "president" || form.status !== "À signer") return
    const next = { ...form, status: "Signé" as const, signedBy: `${user.firstName} ${user.lastName}`, signedAt: today(), version: minutes.version + 1, updatedAt: today() }
    onSave(next)
    setFeedback(t("Signature simulée enregistrée. Le PV est maintenant verrouillé."))
  }
  function archive() {
    if (!canArchive || form.status !== "Signé") return
    const next = { ...form, status: "Archivé" as const, archivedAt: today(), version: minutes.version + 1, updatedAt: today() }
    onSave(next)
    setFeedback(t("Le PV signé a été archivé."))
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3"><span className="text-sm font-medium">{form.reference}</span><Badge variant={isLocked ? "secondary" : "outline"}>{t(form.status)}</Badge><span className="text-xs text-muted-foreground">v{form.version}</span></div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => { if (!printMinutes(form, meetings, decisions, members)) setFeedback(t("Impossible d'ouvrir l'impression : autorisez les fenêtres contextuelles.")) }}><Download className="mr-2 size-4" />{t("Imprimer / PDF")}</Button>
          {canDraft && form.status === "Brouillon" && <><Button size="sm" variant="outline" onClick={save}><Save className="mr-2 size-4" />{t("Enregistrer")}</Button><Button size="sm" onClick={validate}><CheckCircle2 className="mr-2 size-4" />{t("Soumettre au président")}</Button></>}
          {canDraft && form.status === "À signer" && <Button size="sm" variant="outline" onClick={reopen}><PenLine className="mr-2 size-4" />{t("Reprendre le brouillon")}</Button>}
          {canSign && form.status === "À signer" && <Button size="sm" onClick={sign}><CheckCircle2 className="mr-2 size-4" />{t("Signer le PV")}</Button>}
          {canArchive && form.status === "Signé" && <Button size="sm" onClick={archive}><Archive className="mr-2 size-4" />{t("Archiver le PV")}</Button>}
        </div>
      </div>

      <div className="grid items-start gap-10 xl:grid-cols-2">
        <section className="min-w-0 space-y-8">
          <div className="space-y-2 border-b pb-5"><h3 className="text-lg font-semibold tracking-tight">{t("Contenu du procès-verbal")}</h3><p className="text-sm leading-6 text-muted-foreground">{t("Complétez le compte rendu et vérifiez les présences avant validation.")}</p></div>
          <fieldset disabled={!canDraft || isLocked} className="space-y-7 disabled:opacity-70">
            <div className="space-y-3">
              <Label>{t("Présents à la réunion")}</Label>
              <div className="divide-y rounded-xl border px-4">
                {(meeting?.participantIds ?? []).map((id) => {
                  const member = members.find((item) => item.id === id)
                  return <label key={id} className="flex min-h-12 cursor-pointer items-center gap-3 py-3 text-sm">
                    <input type="checkbox" checked={form.presentMemberIds.includes(id)} onChange={(event) => togglePresent(id, event.target.checked)} className="size-4 accent-primary" />
                    <span className="font-medium">{(members.find((item) => item.id === id)?.name ?? t("Inconnu"))}</span><span className="ml-auto text-xs text-muted-foreground">{member?.role ?? t("Membre")}</span>
                  </label>
                })}
              </div>
              <p className="text-xs text-muted-foreground">{t("Présences simulées, indépendantes du module Votes.")}</p>
            </div>
            <div className="space-y-2"><Label htmlFor="minutes-summary">{t("Déroulement et échanges *")}</Label><Textarea id="minutes-summary" rows={7} value={form.summary} onChange={(event) => update("summary", event.target.value)} placeholder={t("Résumez les échanges et les conclusions…")} /></div>
            <div className="space-y-2"><Label htmlFor="minutes-actions">{t("Suites à donner")}</Label><Textarea id="minutes-actions" rows={4} value={form.nextSteps} onChange={(event) => update("nextSteps", event.target.value)} placeholder={t("Actions, responsables ou échéances évoquées…")} /></div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="minutes-secretary">{t("Secrétaire")}</Label><Input id="minutes-secretary" value={form.secretary} onChange={(event) => update("secretary", event.target.value)} /></div>
              <div className="space-y-2"><Label htmlFor="minutes-president">{t("Président")}</Label><Input id="minutes-president" value={form.president} onChange={(event) => update("president", event.target.value)} /></div>
            </div>
          </fieldset>
          {feedback && <p role="status" className="rounded-lg border px-4 py-3 text-sm text-muted-foreground">{feedback}</p>}
          {isLocked && <p className="text-xs text-muted-foreground">{t("Une fois signé, le PV est verrouillé. L'archiviste peut classer la version signée.")}</p>}
        </section>
        <section className="min-w-0 space-y-4"><div><h3 className="text-lg font-semibold">{t("Aperçu")}</h3><p className="mt-1 text-sm text-muted-foreground">{t("Mis à jour automatiquement pendant la saisie.")}</p></div><MinutesPreview minutes={form} /></section>
      </div>
    </div>
  )
}
