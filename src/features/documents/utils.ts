import { committeeMembers, initialMeetings } from "@/features/meetings/mock-data"
import { initialDecisions } from "@/features/decisions/mock-data"
import type { MeetingMinutes } from "./types"

export function formatDate(date: string) {
  if (!date) return "—"
  return new Date(`${date}T12:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
}

export function meetingLabel(id: string) {
  return initialMeetings.find((meeting) => meeting.id === id)?.title ?? "Sans réunion"
}

export function memberName(id: string) {
  return committeeMembers.find((member) => member.id === id)?.name ?? "Membre inconnu"
}

export const today = () => new Date().toISOString().slice(0, 10)
export const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

/** Encodage obligatoire avant insertion dans la fenêtre d'impression. */
export function escapeHTML(value: string): string {
  const entities: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }
  return value.replace(/[&<>"']/g, (char) => entities[char] ?? char)
}

export function buildPrintableMinutes(pv: MeetingMinutes) {
  const meeting = initialMeetings.find((item) => item.id === pv.meetingId)
  if (!meeting) return ""
  const all = (value: string) => escapeHTML(value)
  const agenda = meeting.agenda.map((item) => `<li>${all(item.title)} — ${all(item.status)}</li>`).join("")
  const decisions = initialDecisions.filter((decision) => decision.meetingId === pv.meetingId)
    .map((decision) => `<li><strong>${all(decision.reference)} :</strong> ${all(decision.title)} — ${all(decision.status)}</li>`).join("")
  const attendees = pv.presentMemberIds.map((id) => all(memberName(id))).join(", ") || "Aucun"
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"/><title>${all(pv.reference)} — Procès-verbal</title>
  <style>body{font-family:Arial,sans-serif;color:#20242d;max-width:800px;margin:50px auto;line-height:1.65;padding:0 32px}h1{font-size:25px;margin-bottom:4px}h2{font-size:16px;margin-top:36px;border-bottom:1px solid #ddd;padding-bottom:8px}small{color:#666}li{margin:8px 0}.meta{margin:28px 0;padding:16px 0;border-top:1px solid #ddd;border-bottom:1px solid #ddd}.signatures{display:flex;justify-content:space-between;margin-top:70px}pre{font:inherit;white-space:pre-wrap}@media print{body{margin:20px auto;padding:0} @page{size:A4;margin:20mm}}</style></head><body>
  <small>Département d'informatique · Comité scientifique · Document de démonstration</small>
  <h1>Procès-verbal de réunion</h1><small>${all(pv.reference)} · ${all(pv.status)} · Version ${pv.version}</small>
  <div class="meta"><strong>${all(meeting.title)}</strong><br/>${all(formatDate(meeting.date))} · ${all(meeting.startTime)}–${all(meeting.endTime)}<br/>${all(meeting.location)}</div>
  <h2>Présences</h2><p>${attendees}</p>
  <h2>Ordre du jour</h2><ol>${agenda}</ol>
  <h2>Déroulement et échanges</h2><pre>${all(pv.summary || "Non renseigné")}</pre>
  <h2>Décisions associées</h2>${decisions ? `<ul>${decisions}</ul>` : "<p>Aucune décision enregistrée dans les données fictives.</p>"}
  <h2>Actions à suivre</h2><pre>${all(pv.nextSteps || "Non renseigné")}</pre>
  <div class="signatures"><div>Secrétaire<br/><strong>${all(pv.secretary || "—")}</strong></div><div>Président<br/><strong>${all(pv.president || "—")}</strong></div></div>
  <p style="margin-top:75px;font-size:11px;color:#777">Prototype non officiel — aperçu généré localement, sans signature ni valeur administrative.</p>
  </body></html>`
}

export function printMinutes(pv: MeetingMinutes): boolean {
  const html = buildPrintableMinutes(pv)
  if (!html) return false
  const popup = window.open("", "_blank", "width=950,height=1100")
  if (!popup) return false
  popup.document.open()
  popup.document.write(html)
  popup.document.close()
  popup.focus()
  // L'impression est déclenchée par le navigateur ; « Enregistrer au format PDF » est proposé par celui-ci.
  popup.print()
  return true
}
