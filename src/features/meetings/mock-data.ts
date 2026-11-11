import type { CommitteeMember, Meeting } from "./types"

/** Données fictives utilisées uniquement par le frontend. */
export const committeeMembers: CommitteeMember[] = [
  { id: "m1", name: "Karim Haddad", role: "Président" },
  { id: "m2", name: "Lina Amrane", role: "Secrétaire" },
  { id: "m3", name: "Nadia Bouzid", role: "Membre" },
  { id: "m4", name: "Yanis Aït Ali", role: "Membre" },
  { id: "m5", name: "Amine Cherif", role: "Responsable archives" },
  { id: "m6", name: "Sara Bensaïd", role: "Membre suppléante" },
]

export const initialMeetings: Meeting[] = [
  {
    id: "r1",
    title: "Réunion ordinaire du comité scientifique",
    date: "2026-11-18",
    startTime: "09:00",
    endTime: "11:00",
    location: "Salle de conférences — Département d'informatique",
    description: "Examen des dossiers pédagogiques et suivi des recommandations.",
    status: "Planifiée",
    participantIds: ["m1", "m2", "m3", "m4", "m5"],
    agenda: [
      { id: "a1", title: "Validation de l'ordre du jour", proposedById: "m2", status: "Validé" },
      { id: "a2", title: "Examen des propositions de sujets de mémoire", proposedById: "m3", status: "Validé" },
      { id: "a3", title: "Questions diverses", proposedById: "m4", status: "Proposé" },
    ],
  },
  {
    id: "r2",
    title: "Suivi des projets de fin d'études",
    date: "2026-11-25",
    startTime: "14:00",
    endTime: "15:30",
    location: "Salle B12",
    description: "Point d'avancement sur les propositions de PFE.",
    status: "Planifiée",
    participantIds: ["m1", "m2", "m3", "m6"],
    agenda: [
      { id: "a4", title: "État des propositions de PFE", proposedById: "m1", status: "Validé" },
      { id: "a5", title: "Répartition des encadrants", proposedById: "m3", status: "Proposé" },
    ],
  },
  {
    id: "r3",
    title: "Bilan pédagogique du semestre",
    date: "2026-11-04",
    startTime: "10:00",
    endTime: "12:00",
    location: "Salle de réunion A",
    description: "Analyse des évaluations et des recommandations du semestre.",
    status: "Terminée",
    participantIds: ["m1", "m2", "m3", "m5"],
    agenda: [
      { id: "a6", title: "Présentation du bilan pédagogique", proposedById: "m2", status: "Validé" },
      { id: "a7", title: "Évolution des modalités d'évaluation", proposedById: "m5", status: "Validé" },
    ],
  },
]
