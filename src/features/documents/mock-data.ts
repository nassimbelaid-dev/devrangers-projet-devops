import type { CommitteeDocument, MeetingMinutes } from "./types"

/** Même identifiants fictifs r1/r2/r3 et m1..m6 que les modules précédents. */
export const initialDocuments: CommitteeDocument[] = [
  {
    id: "doc1", reference: "DOC-2026-001", title: "Ordre du jour — Bilan pédagogique du semestre",
    type: "Ordre du jour", status: "Validé", visibility: "Comité", meetingId: "r3",
    description: "Ordre du jour validé pour la réunion du 4 novembre.", updatedAt: "2026-11-03",
    versions: [
      { id: "v1", number: 1, date: "2026-10-30", author: "Lina Amrane", filename: "odj-bilan-v1.pdf", note: "Version initiale" },
      { id: "v2", number: 2, date: "2026-11-03", author: "Lina Amrane", filename: "odj-bilan-v2.pdf", note: "Ordre du jour validé" },
    ],
  },
  {
    id: "doc2", reference: "DOC-2026-002", title: "Rapport de synthèse des évaluations",
    type: "Rapport", status: "Brouillon", visibility: "Comité", meetingId: "r3",
    description: "Synthèse des observations pédagogiques du premier semestre.", updatedAt: "2026-11-07",
    versions: [{ id: "v3", number: 1, date: "2026-11-07", author: "Karim Haddad", filename: "synthese-evaluations.docx", note: "Document de travail" }],
  },
  {
    id: "doc3", reference: "DOC-2026-003", title: "Convocation — Réunion ordinaire de novembre",
    type: "Convocation", status: "Validé", visibility: "Présidence", meetingId: "r1",
    description: "Convocation à destination des membres du comité.", updatedAt: "2026-11-10",
    versions: [{ id: "v4", number: 1, date: "2026-11-10", author: "Lina Amrane", filename: "convocation-novembre.pdf", note: "Envoi fictif" }],
  },
  {
    id: "doc4", reference: "DOC-2026-004", title: "Procès-verbal — Bilan pédagogique du semestre",
    type: "Procès-verbal", status: "Validé", visibility: "Archives", meetingId: "r3",
    description: "Exemple de procès-verbal validé et classé.", updatedAt: "2026-11-06",
    versions: [{ id: "v5", number: 1, date: "2026-11-06", author: "Lina Amrane", filename: "pv-bilan-pedagogique.pdf", note: "Version d'archivage fictive" }],
  },
]

export const initialMinutes: MeetingMinutes[] = [
  {
    id: "pv1", reference: "PV-2026-001", meetingId: "r3", status: "Validé",
    presentMemberIds: ["m1", "m2", "m3", "m5"],
    summary: "Le comité a examiné le bilan pédagogique du semestre et échangé sur l'harmonisation des évaluations. Les recommandations ont été présentées et discutées.",
    nextSteps: "Diffuser la synthèse aux responsables pédagogiques et préparer une grille commune d'évaluation.",
    secretary: "Lina Amrane", president: "Karim Haddad", updatedAt: "2026-11-06", version: 2,
  },
]
