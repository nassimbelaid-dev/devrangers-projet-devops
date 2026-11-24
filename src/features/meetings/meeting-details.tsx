"use client"

import { CalendarDays, Clock3, MapPin, Pencil, Users, Check, Circle, Play, Square } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { createMeetingMinutes, runMeetingWorkflow, sendMeetingInvitationsFromStore, useDemoCollection, useDemoData } from "@/lib/demo-store"
import { useStaticAuth } from "@/lib/static-auth"
import { useState } from "react"
import { useUiText } from "@/features/ui-text"
import type { Meeting } from "./types"

interface MeetingDetailsProps {
  meeting: Meeting | null
  onClose: () => void
  onEdit: (meeting: Meeting) => void
}

function readableDate(date: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`))
}

export function MeetingDetails({ meeting, onClose, onEdit }: MeetingDetailsProps) {
  const t = useUiText()
  const { members: committeeMembers, meetings, minutes, ballots, decisions } = useDemoData()
  const [, setMeetings] = useDemoCollection("meetings")
  const { user } = useStaticAuth()
  const [notice, setNotice] = useState("")
  const [busy, setBusy] = useState(false)
  if (!meeting) return null

  const currentMeeting = meetings.find((item) => item.id === meeting.id) ?? meeting
  const linkedMinutes = minutes.find((item) => item.meetingId === meeting.id)
  const linkedDecisionIds = decisions.filter((item) => item.meetingId === meeting.id).map((item) => item.id)
  const openBallots = ballots.filter((item) => linkedDecisionIds.includes(item.decisionId) && item.state !== "Clôturé")
  const stage = ["Planifiée", "En cours", "Clôturée", "PV signé"].indexOf(currentMeeting.status)
  const canStart = user?.role === "president" && stage === 0
  const canClose = user?.role === "president" && stage === 1
  const canTakeAttendance = (user?.role === "president" || user?.role === "secretary") && stage === 1
  const runAction = (action: "start" | "close") => {
    if (!user || !window.confirm(t(action === "start" ? "Confirmer le démarrage de cette réunion ?" : "Confirmer la clôture de cette réunion ?"))) return
    setBusy(true)
    const result = runMeetingWorkflow(action, meeting.id, user)
    setNotice(result.error ? t(result.error) : t(action === "start" ? "La réunion a démarré." : "La réunion est clôturée."))
    setBusy(false)
  }

  const participants = committeeMembers.filter((member) =>
    meeting.participantIds.includes(member.id)
  )
  const attendance = currentMeeting.attendance ?? {}
  const presentCount = participants.filter((member) => attendance[member.id] === true).length
  const absentCount = participants.filter((member) => attendance[member.id] === false).length
  const unsetCount = participants.length - presentCount - absentCount
  const updateAttendance = (updates: Record<string, boolean>) => setMeetings((all) => all.map((item) => item.id === currentMeeting.id ? { ...item, attendance: { ...(item.attendance ?? {}), ...updates } } : item))
  const sendInvitations = () => {
    if (!user || !window.confirm(t("Confirmer l'envoi des convocations à tous les participants ?"))) return
    setBusy(true)
    const result = sendMeetingInvitationsFromStore(currentMeeting.id, user)
    setNotice(result.error ? t(result.error) : t("Les convocations ont été envoyées aux participants disposant d'un compte."))
    setBusy(false)
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto w-[calc(100vw-2rem)] sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{meeting.title}</DialogTitle>
          <DialogDescription>{t("Informations et participants de la réunion.")}</DialogDescription>
        </DialogHeader>

        <section aria-label={t("Progression du workflow")} className="rounded-xl border p-4">
          <ol className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {["Planifiée", "En cours", "Clôturée", "PV signé"].map((label, index) => {
              const complete = stage > index
              const active = stage === index
              const date = index === 1 ? currentMeeting.startedAt : index === 2 ? currentMeeting.closedAt : index === 3 ? linkedMinutes?.signedAt : undefined
              return <li key={label} aria-current={active ? "step" : undefined} className={`min-w-0 rounded-lg p-2 text-center text-xs ${active ? "bg-primary text-primary-foreground" : complete ? "bg-muted text-foreground" : "text-muted-foreground"}`}>
                <span className="flex items-center justify-center gap-1">{complete ? <Check className="size-3.5" /> : active ? <Play className="size-3.5" /> : <Circle className="size-3.5" />}{t(label)}</span>
                {date && <time className="mt-1 block text-[10px] opacity-80">{new Date(date).toLocaleString()}</time>}
              </li>
            })}
          </ol>
        </section>
        {notice && <p role="status" className="rounded-lg border px-3 py-2 text-sm">{notice}</p>}
        {stage === 0 && user?.role === "secretary" && <section className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
          <div className="text-sm"><p className="font-medium">{t("Convocations")}</p><p className="text-muted-foreground">{currentMeeting.invitationsSentAt ? t("Envoyées le {date}", { date: new Date(currentMeeting.invitationsSentAt).toLocaleString() }) : t("Non envoyées")}</p></div>
          <Button disabled={busy} onClick={sendInvitations}>{t(currentMeeting.invitationsSentAt ? "Renvoyer les convocations" : "Envoyer les convocations")}</Button>
        </section>}
        {(canStart || canClose) && <div className="flex flex-wrap gap-2">
          {canStart && <Button disabled={busy} onClick={() => runAction("start")}><Play className="me-2 size-4" />{t("Démarrer la réunion")}</Button>}
          {canClose && <Button disabled={busy || openBallots.length > 0} variant="destructive" onClick={() => runAction("close")}><Square className="me-2 size-4" />{t("Clôturer la réunion")}</Button>}
          {canClose && openBallots.length > 0 && <p className="w-full text-sm text-destructive">{t("La clôture est bloquée : {count} scrutin(s) sont encore ouverts.", { count: openBallots.length })}</p>}
          {canClose && currentMeeting.agenda.some((item) => item.status === "Validé") && <p className="w-full text-xs text-muted-foreground">{t("Points non traités : ils seront signalés dans le compte rendu sans bloquer la clôture.")}</p>}
        </div>}
        {stage >= 2 && <div className="flex flex-wrap gap-2">
          {user?.role === "secretary" && !linkedMinutes && stage === 2 && <Button onClick={() => {
            const result = createMeetingMinutes(meeting.id, user)
            if (result.error) { setNotice(t(result.error)); return }
            window.location.assign(`${window.location.pathname.split("/").slice(0, 2).join("/")}/documents?minutes=${result.id}#pv`)
          }}>{t("Rédiger le procès-verbal")}</Button>}
          {linkedMinutes && <Button asChild variant="outline"><a href={`${window.location.pathname.split("/").slice(0, 2).join("/")}/documents?minutes=${linkedMinutes.id}#pv`}>{t(linkedMinutes.status === "Signé" || linkedMinutes.status === "Archivé" ? "Consulter le procès-verbal signé" : "Ouvrir le procès-verbal")}</a></Button>}
        </div>}

        <Tabs defaultValue="infos">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="infos">{t("Informations")}</TabsTrigger>
            <TabsTrigger value="participants">{t("Participants")} ({participants.length})</TabsTrigger>
            <TabsTrigger value="agenda">{t("Ordre du jour")} ({meeting.agenda.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="infos" className="space-y-3 pt-3 text-sm">
            <Badge variant="secondary">{t(meeting.status)}</Badge>
            <p className="flex items-center gap-2"><CalendarDays className="size-4 text-muted-foreground" />{readableDate(meeting.date)}</p>
            <p className="flex items-center gap-2"><Clock3 className="size-4 text-muted-foreground" />{meeting.startTime} – {meeting.endTime}</p>
            <p className="flex items-center gap-2"><MapPin className="size-4 text-muted-foreground" />{meeting.location}</p>
            <p className="flex items-center gap-2"><Users className="size-4 text-muted-foreground" />{t("{count} membre(s) invité(s)", { count: participants.length })}</p>
            <div className="rounded-lg bg-muted/40 p-3">
              {meeting.description || t("Aucune description renseignée.")}
            </div>
          </TabsContent>

          <TabsContent value="participants" className="space-y-3 pt-3">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg border p-2"><strong className="block text-lg text-emerald-700">{presentCount}</strong><span className="text-xs">{t("Présents")}</span></div>
              <div className="rounded-lg border p-2"><strong className="block text-lg text-rose-700">{absentCount}</strong><span className="text-xs">{t("Absents")}</span></div>
              <div className="rounded-lg border p-2"><strong className="block text-lg text-muted-foreground">{unsetCount}</strong><span className="text-xs">{t("Non renseignés")}</span></div>
            </div>
            {canTakeAttendance && <Button size="sm" variant="outline" onClick={() => updateAttendance(Object.fromEntries(participants.map((member) => [member.id, true])))}>{t("Marquer tous présents")}</Button>}
            {participants.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("Aucun participant sélectionné.")}</p>
            ) : participants.map((member) => (
              <div key={member.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
                <div><span className="font-medium text-sm">{member.name}</span><span className="ms-2 text-xs text-muted-foreground">{member.role} · {t(member.kind)}</span>
                  {member.kind === "Suppléant" && participants.some((other) => other.kind === "Titulaire" && other.seatId === member.seatId && attendance[other.id] === false) && <Badge className="mt-1 block w-fit" variant="secondary">{t("Remplace le titulaire absent")}</Badge>}
                </div>
                <div className="flex gap-1">
                  {([true, false, undefined] as const).map((state) => <Button key={String(state)} size="sm" variant={attendance[member.id] === state ? "default" : "outline"} disabled={!canTakeAttendance} onClick={() => { if (state === undefined) { const copy = { ...(currentMeeting.attendance ?? {}) }; delete copy[member.id]; setMeetings((all) => all.map((item) => item.id === currentMeeting.id ? { ...item, attendance: copy } : item)) } else updateAttendance({ [member.id]: state }) }}>{t(state === true ? "Présent" : state === false ? "Absent" : "Non renseigné")}</Button>)}
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="agenda" className="space-y-2 pt-3">
            {meeting.agenda.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("Aucun point à l'ordre du jour.")}</p>
            ) : meeting.agenda.map((item, index) => (
              <div key={item.id} className="flex items-start justify-between gap-3 rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">{index + 1}. {item.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("Proposé par {name}", { name: committeeMembers.find((member) => member.id === item.proposedById)?.name ?? t("Membre") })}
                  </p>
                </div>
                <Badge variant="outline">{t(item.status)}</Badge>
              </div>
            ))}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t("Fermer")}</Button>
          {stage === 0 && <Button onClick={() => onEdit(currentMeeting)}>
            <Pencil className="mr-2 size-4" /> {t("Modifier")}
          </Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
