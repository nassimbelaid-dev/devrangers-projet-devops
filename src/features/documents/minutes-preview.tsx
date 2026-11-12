import { initialMeetings, committeeMembers } from "@/features/meetings/mock-data"
import { initialDecisions } from "@/features/decisions/mock-data"
import type { MeetingMinutes } from "./types"
import { formatDate, memberName } from "./utils"

export function MinutesPreview({ minutes: pv }: { minutes: MeetingMinutes }) {
  const meeting = initialMeetings.find((item) => item.id === pv.meetingId)
  if (!meeting) return <p className="text-sm text-muted-foreground">Réunion introuvable.</p>
  const decisions = initialDecisions.filter((item) => item.meetingId === meeting.id)
  const absent = meeting.participantIds.filter((id) => !pv.presentMemberIds.includes(id))
  return (
    <article className="space-y-7 rounded-xl border bg-card px-6 py-8 text-sm leading-7 sm:px-8 sm:py-10">
      <div className="space-y-3 border-b pb-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Comité scientifique · Aperçu non officiel</p>
        <h3 className="text-xl font-semibold tracking-tight">Procès-verbal de réunion</h3>
        <p className="text-xs text-muted-foreground">{pv.reference} · {pv.status} · Version {pv.version}</p>
      </div>
      <div className="space-y-1">
        <p className="font-semibold">{meeting.title}</p>
        <p className="text-muted-foreground">{formatDate(meeting.date)} · {meeting.startTime}–{meeting.endTime}</p>
        <p className="text-muted-foreground">{meeting.location}</p>
      </div>
      <section className="space-y-2">
        <h4 className="font-semibold">Présents</h4>
        <p className="text-muted-foreground">{pv.presentMemberIds.map(memberName).join(", ") || "Aucun"}</p>
        {absent.length > 0 && <p className="text-muted-foreground">Absents parmi les invités : {absent.map(memberName).join(", ")}</p>}
      </section>
      <section className="space-y-2">
        <h4 className="font-semibold">Ordre du jour</h4>
        <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
          {meeting.agenda.map((item) => <li key={item.id}>{item.title}</li>)}
        </ol>
      </section>
      <section className="space-y-2">
        <h4 className="font-semibold">Déroulement et échanges</h4>
        <p className="whitespace-pre-wrap text-muted-foreground">{pv.summary || "À compléter…"}</p>
      </section>
      <section className="space-y-2">
        <h4 className="font-semibold">Décisions</h4>
        {decisions.length ? (
          <ul className="space-y-2 text-muted-foreground">{decisions.map((item) => <li key={item.id}><span className="font-medium text-foreground">{item.reference}</span> · {item.title} ({item.status})</li>)}</ul>
        ) : <p className="text-muted-foreground">Aucune décision fictive associée.</p>}
      </section>
      <section className="space-y-2"><h4 className="font-semibold">Suites à donner</h4><p className="whitespace-pre-wrap text-muted-foreground">{pv.nextSteps || "À compléter…"}</p></section>
      <div className="grid gap-6 border-t pt-6 sm:grid-cols-2">
        <div><p className="text-xs text-muted-foreground">Secrétaire</p><p className="font-medium">{pv.secretary || "—"}</p></div>
        <div><p className="text-xs text-muted-foreground">Président</p><p className="font-medium">{pv.president || "—"}</p></div>
      </div>
      <p className="text-xs text-muted-foreground">{committeeMembers.length} membres dans le jeu de démonstration. Aucun document officiel n'est produit.</p>
    </article>
  )
}
