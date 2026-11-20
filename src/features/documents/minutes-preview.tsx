"use client"

import { useDemoData } from "@/lib/demo-store"
import type { MeetingMinutes } from "./types"
import { formatDate } from "./utils"
import { useUiText } from "@/features/ui-text"

export function MinutesPreview({ minutes: pv }: { minutes: MeetingMinutes }) {
  const t = useUiText()
  const { meetings, members, decisions } = useDemoData()
  const meeting = meetings.find((item) => item.id === pv.meetingId)
  if (!meeting) return <p className="text-sm text-muted-foreground">{t("Réunion introuvable.")}</p>
  const relatedDecisions = decisions.filter((item) => item.meetingId === meeting.id)
  const absent = meeting.participantIds.filter((id) => !pv.presentMemberIds.includes(id))
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
      </div>
      <section className="space-y-2">
        <h4 className="font-semibold">{t("Présents")}</h4>
        <p className="text-muted-foreground">{pv.presentMemberIds.map((id) => members.find((m) => m.id === id)?.name ?? t("Inconnu")).join(", ") || t("Aucun")}</p>
        {absent.length > 0 && <p className="text-muted-foreground">{t("Absents parmi les invités : {names}", { names: absent.map((id) => members.find((m) => m.id === id)?.name ?? t("Inconnu")).join(", ") })}</p>}
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
          <ul className="space-y-2 text-muted-foreground">{relatedDecisions.map((item) => <li key={item.id}><span className="font-medium text-foreground">{item.reference}</span> · {item.title} ({t(item.status)})</li>)}</ul>
        ) : <p className="text-muted-foreground">{t("Aucune décision associée.")}</p>}
      </section>
      <section className="space-y-2"><h4 className="font-semibold">{t("Suites à donner")}</h4><p className="whitespace-pre-wrap text-muted-foreground">{pv.nextSteps || t("À compléter…")}</p></section>
      <div className="grid gap-6 border-t pt-6 sm:grid-cols-2">
        <div><p className="text-xs text-muted-foreground">{t("Secrétaire")}</p><p className="font-medium">{pv.secretary || "—"}</p></div>
        <div><p className="text-xs text-muted-foreground">{t("Président")}</p><p className="font-medium">{pv.president || "—"}</p></div>
      </div>
      {pv.signedBy && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm dark:border-emerald-900 dark:bg-emerald-950/30"><p className="font-medium">{t("Signature simulée du président")}</p><p className="mt-1 text-muted-foreground">{pv.signedBy} · {pv.signedAt ? formatDate(pv.signedAt) : "—"}</p>{pv.archivedAt && <p className="mt-1 text-xs text-muted-foreground">{t("Archivé le {date}", { date: formatDate(pv.archivedAt) })}</p>}</div>}
      
    </article>
  )
}
