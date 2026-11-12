import { initialMeetings } from "@/features/meetings/mock-data"
import type { AgendaProposal } from "./types"

/** Réutilise les mêmes IDs a1...a7, r1...r3 et m1...m6 que le module Réunions. */
const descriptions: Record<string, string> = {
  a1: "Présentation et adoption des points inscrits pour cette séance.",
  a2: "Étude des sujets proposés et identification des dossiers à compléter.",
  a3: "Recueil des nouvelles questions soulevées par les membres.",
  a4: "État d'avancement des dossiers de projets de fin d'études.",
  a5: "Proposition de répartition des encadrants selon les spécialités.",
  a6: "Synthèse des principaux indicateurs pédagogiques du semestre.",
  a7: "Discussion des modalités d'évaluation et pistes d'amélioration.",
}

const seededAgenda: AgendaProposal[] = initialMeetings.flatMap((meeting) =>
  meeting.agenda.map((item, index) => ({
    id: item.id,
    meetingId: meeting.id,
    title: item.title,
    description: descriptions[item.id] ?? "Point proposé pour discussion en réunion.",
    proposedById: item.proposedById,
    createdAt: `2026-11-${String(Math.min(10, 2 + index)).padStart(2, "0")}T10:00:00Z`,
    status: item.status,
    order: item.status === "Validé" ? index : null,
    attachments: item.id === "a2" ? [{ id: "sample-a2", name: "propositions-pfe.pdf", size: 0 }] : [],
    reviewedById: item.status === "Validé" ? "m1" : undefined,
  }))
)

export const initialAgendaProposals: AgendaProposal[] = [
  ...seededAgenda,
  {
    id: "agenda-rejected-demo", meetingId: "r1", title: "Réserver une séance supplémentaire",
    description: "Proposition de séance dédiée aux dossiers complémentaires.",
    proposedById: "m5", createdAt: "2026-11-09T09:30:00Z", status: "Rejeté", order: null,
    attachments: [], reviewedById: "m1", reviewNote: "À proposer lors du prochain calendrier semestriel.",
  },
]
