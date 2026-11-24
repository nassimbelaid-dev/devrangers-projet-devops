"use client"

import { useDemoData } from "@/lib/demo-store"
import type { MeetingMinutes } from "./types"
import { formatDate } from "./utils"
import { useUiText } from "@/features/ui-text"
import { committeeSeats } from "@/features/members/mock-data"
import { calculateBallot, outcomeLabel } from "@/features/votes/utils"

export function MinutesPreview({ minutes: pv }: { minutes: MeetingMinutes }) {
  const t = useUiText()
  const { meetings, members, decisions, actions, ballots } = useDemoData()
  const meeting = meetings.find((item) => item.id === pv.meetingId)
  if (!meeting) return <p className="text-sm text-muted-foreground">{t("Réunion introuvable.")}</p>
  const relatedDecisions = decisions.filter((item) => item.meetingId === meeting.id)
  const attendeeIds = meeting.attendance ? Object.entries(meeting.attendance).filter(([, present]) => present).map(([id]) => id) : pv.presentMemberIds
  const absent = meeting.participantIds.filter((id) => meeting.attendance?.[id] === false)
  const unreported = meeting.participantIds.filter((id) => meeting.attendance?.[id] === undefined)
  const meetingDecisions = relatedDecisions.map((decision) => ({ decision, ballot: ballots.find((entry) => entry.decisionId === decision.id) }))
  return (
    <article className="space-y-7 rounded-xl border bg-card px-6 py-8 text-sm leading-7 sm:px-8 sm:py-10">
      <div className="space-y-3 border-b pb-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">{t("Comité scientifique · Procès-verbal")}</p>
        <h3 className="text-xl font-semibold tracking-tight">{t("Procès-verbal de réunion")}</h3>
        <p className="text-xs text-muted-foreground">{pv.reference} · {t(pv.status)} · {t("Version")} {pv.version}</p>
      </div>
      <div className="space-y-1">
        <p className="font-semibold">{meeting.title}</p>
        <p className="text-muted-foreground">{formatDate(meeting.date)} · {meeting.startTime}–{meeting.endTime}</p>
        <p className="text-muted-foreground">{meeting.location}</p>
        <p className="text-xs text-muted-foreground">{t("État de la réunion")}: {t(meeting.status)}{meeting.startedAt ? ` · ${t("Démarrée")}: ${formatDate(meeting.startedAt)}` : ""}{meeting.closedAt ? ` · ${t("Clôturée")}: ${formatDate(meeting.closedAt)}` : ""}</p>
      </div>
      <section className="space-y-2">
        <h4 className="font-semibold">{t("Présents")}</h4>
        <p className="text-muted-foreground"><strong>{t("Présents")}:</strong> {attendeeIds.map((id) => members.find((m) => m.id === id)?.name ?? t("Inconnu")).join(", ") || "—"}</p>
        <p className="text-muted-foreground"><strong>{t("Absents")}:</strong> {absent.map((id) => members.find((m) => m.id === id)?.name ?? t("Inconnu")).join(", ") || "—"}</p>
        {unreported.length > 0 && <p className="text-muted-foreground"><strong>{t("Non renseigné")}:</strong> {unreported.map((id) => members.find((m) => m.id === id)?.name ?? t("Inconnu")).join(", ")}</p>}
        <p className="text-muted-foreground"><strong>{t("Suppléants présents")}:</strong> {attendeeIds.map((id) => members.find((m) => m.id === id && m.kind === "Suppléant")).filter(Boolean).map((member) => `${member!.name} (${t("remplaçant du titulaire")})`).join(", ") || "—"}</p>
      </section>
      <section className="space-y-2">
        <h4 className="font-semibold">{t("Ordre du jour")}</h4>
        <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
          {meeting.agenda.filter((item) => item.status === "Validé").map((item) => <li key={item.id}>{item.title}</li>)}
        </ol>
      </section>
      <section className="space-y-2">
        <h4 className="font-semibold">{t("Déroulement et échanges")}</h4>
        <p className="whitespace-pre-wrap text-muted-foreground">{pv.summary || t("À compléter…")}</p>
      </section>
      <section className="space-y-2">
        <h4 className="font-semibold">{t("Décisions")}</h4>
        {relatedDecisions.length ? (
          <ul className="space-y-3 text-muted-foreground">{meetingDecisions.map(({ decision, ballot }) => { const result = ballot ? calculateBallot(ballot, members, committeeSeats, meeting.date) : null; return <li key={decision.id}><span className="font-medium text-foreground">{decision.reference} · {decision.title}</span><p>{decision.description}</p><p>{t("Statut")}: {t(decision.status)}</p>{result && <p>{t("Résultat du scrutin")}: {t(outcomeLabel(result.outcome))} · {t("Pour")}: {result.pour} · {t("Contre")}: {result.contre} · {t("Abstention")}: {result.abstention} · {t("Quorum")}: {result.representedSeatCount}/{result.activeSeatCount}</p>}</li> })}</ul>
        ) : <p className="text-muted-foreground">{t("Aucune décision associée.")}</p>}
      </section>
      <section className="space-y-2"><h4 className="font-semibold">{t("Actions attribuées")}</h4>{actions.filter((action) => relatedDecisions.some((decision) => decision.id === action.decisionId)).length ? <ul className="space-y-2 text-muted-foreground">{actions.filter((action) => relatedDecisions.some((decision) => decision.id === action.decisionId)).map((action) => <li key={action.id}><span className="font-medium text-foreground">{action.title}</span> · {members.find((member) => member.id === action.assigneeId)?.name ?? "—"} · {action.dueDate ? formatDate(action.dueDate) : "—"} · {t(action.status)}</li>)}</ul> : <p className="text-muted-foreground">—</p>}</section>
      {pv.nextSteps && <section className="space-y-2"><h4 className="font-semibold">{t("Notes complémentaires du secrétaire")}</h4><p className="whitespace-pre-wrap text-muted-foreground">{pv.nextSteps}</p></section>}
      <div className="grid gap-6 border-t pt-6 sm:grid-cols-2">
        <div><p className="text-xs text-muted-foreground">{t("Secrétaire")}</p><p className="font-medium">{pv.secretary || "—"}</p></div>
        <div><p className="text-xs text-muted-foreground">{t("Président")}</p><p className="font-medium">{pv.president || "—"}</p></div>
      </div>
      {pv.submittedAt && <p className="border-t pt-4 text-xs text-muted-foreground">{t("Soumis par {name} le {date}", { name: pv.secretary, date: new Date(pv.submittedAt).toLocaleString() })}</p>}
      {pv.signedBy && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm dark:border-emerald-900 dark:bg-emerald-950/30"><p className="font-medium">{t("Signature simulée du président")}</p><p className="mt-1 text-muted-foreground">{pv.signedBy} · {pv.signedAt ? new Date(pv.signedAt).toLocaleString() : "—"}</p>{pv.archivedAt && <p className="mt-1 text-xs text-muted-foreground">{t("Archivé le {date}", { date: new Date(pv.archivedAt).toLocaleString() })} · {pv.archivedBy}</p>}</div>}
      
    </article>
  )
}
