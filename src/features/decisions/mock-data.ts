import type { ActionRecord, DecisionRecord } from "./types"

/** Sources fictives : IDs cohérents avec meetings/mock-data.ts et members/mock-data.ts. */
export const initialDecisions: DecisionRecord[] = [
  {
    id: "d1", reference: "DEC-2026-001",
    title: "Harmoniser les modalités d'évaluation du S1",
    description: "Adopter une grille commune d'évaluation pour les unités fondamentales et préparer une note à diffuser aux enseignants.",
    meetingId: "r3", date: "2026-11-04", status: "Adoptée",
  },
  {
    id: "d2", reference: "DEC-2026-002",
    title: "Mettre à jour les critères des sujets de PFE",
    description: "Définir les critères d'éligibilité et le calendrier de validation des propositions de projets de fin d'études.",
    meetingId: "r3", date: "2026-11-04", status: "Adoptée",
  },
  {
    id: "d3", reference: "DEC-2026-003",
    title: "Révision du calendrier des soutenances",
    description: "Proposition en attente d'examen lors de la prochaine réunion du comité scientifique.",
    meetingId: "r1", date: "2026-11-18", status: "En attente",
  },
  {
    id: "d4", reference: "DEC-2026-004",
    title: "Centraliser les comptes rendus pédagogiques",
    description: "Réunir les comptes rendus validés et leur attribuer un responsable d'archivage.",
    meetingId: "r3", date: "2026-11-04", status: "Adoptée",
  },
  {
    id: "d5", reference: "DEC-2026-005",
    title: "Ajouter une session facultative de soutenance",
    description: "Proposition non retenue à l'issue de la réunion.",
    meetingId: "r3", date: "2026-11-04", status: "Rejetée",
  },
]

export const initialActions: ActionRecord[] = [
  { id: "ac1", title: "Rédiger la grille d'évaluation commune", description: "Préparer une proposition consolidée et la transmettre au secrétariat.", decisionId: "d1", assigneeId: "m3", dueDate: "2026-11-19", priority: "Haute", status: "À faire", order: 0 },
  { id: "ac2", title: "Recueillir les modalités par unité", description: "Collecter les informations des responsables des unités d'enseignement.", decisionId: "d1", assigneeId: "m4", dueDate: "2026-11-13", priority: "Normale", status: "En cours", order: 0 },
  { id: "ac3", title: "Rédiger la note sur les sujets de PFE", description: "Synthétiser les critères de validation pour l'année universitaire.", decisionId: "d2", assigneeId: "m2", dueDate: "2026-11-24", priority: "Haute", status: "À faire", order: 1 },
  { id: "ac4", title: "Vérifier les dossiers de propositions PFE", description: "Préparer un inventaire des dossiers à examiner.", decisionId: "d2", assigneeId: "m1", dueDate: "2026-11-09", priority: "Haute", status: "En cours", order: 1 },
  { id: "ac5", title: "Archiver les PV du semestre précédent", description: "Classer les PV et préparer une table de correspondance.", decisionId: "d4", assigneeId: "m5", dueDate: "2026-11-07", priority: "Normale", status: "Terminée", order: 0 },
  { id: "ac6", title: "Préparer l'index des documents", description: "Définir un classement par année universitaire et type de document.", decisionId: "d4", assigneeId: "m5", dueDate: "2026-11-27", priority: "Basse", status: "À faire", order: 2 },
]
