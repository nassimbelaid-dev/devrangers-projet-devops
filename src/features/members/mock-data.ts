import type { CommitteeMemberRecord, CommitteeSeat } from "./types"

/** Les identifiants m1 à m6 sont cohérents avec les démonstrations du module Réunions. */
export const committeeSeats: CommitteeSeat[] = [
  { id: "s1", label: "Siège 01" },
  { id: "s2", label: "Siège 02" },
  { id: "s3", label: "Siège 03" },
  { id: "s4", label: "Siège 04" },
  { id: "s5", label: "Siège 05" },
  { id: "s6", label: "Siège 06" },
]

/** Données 100 % fictives, jamais enregistrées sur serveur. */
export const initialMembers: CommitteeMemberRecord[] = [
  {
    id: "m1", name: "Karim Haddad", email: "karim.haddad@example.com", phone: "0550 10 20 30",
    role: "Président", kind: "Titulaire", seatId: "s1", mandateStart: "2025-09-01",
    mandateEnd: "2028-08-31", notes: "Présidence du comité scientifique.",
  },
  {
    id: "m2", name: "Lina Amrane", email: "lina.amrane@example.com", phone: "0550 20 30 40",
    role: "Secrétaire", kind: "Titulaire", seatId: "s2", mandateStart: "2025-09-01",
    mandateEnd: "2028-08-31", notes: "Préparation des convocations et des procès-verbaux.",
  },
  {
    id: "m3", name: "Nadia Bouzid", email: "nadia.bouzid@example.com", phone: "0550 30 40 50",
    role: "Membre", kind: "Titulaire", seatId: "s3", mandateStart: "2025-09-01",
    mandateEnd: "2028-08-31", notes: "",
  },
  {
    id: "m4", name: "Yanis Aït Ali", email: "yanis.aitali@example.com", phone: "0550 40 50 60",
    role: "Membre", kind: "Titulaire", seatId: "s4", mandateStart: "2025-09-01",
    mandateEnd: "2028-08-31", notes: "",
  },
  {
    id: "m5", name: "Amine Cherif", email: "amine.cherif@example.com", phone: "0550 50 60 70",
    role: "Responsable archives", kind: "Titulaire", seatId: "s5", mandateStart: "2025-09-01",
    mandateEnd: "2028-08-31", notes: "Gestion des documents du comité.",
  },
  {
    id: "m6", name: "Sara Bensaïd", email: "sara.bensaid@example.com", phone: "0550 60 70 80",
    role: "Membre", kind: "Suppléant", seatId: "s3", mandateStart: "2025-09-01",
    mandateEnd: "2028-08-31", notes: "Suppléante de la titulaire du siège 03.",
  },
  {
    id: "m7", name: "Fares Mezi", email: "fares.mezi@example.com", phone: "",
    role: "Membre", kind: "Titulaire", seatId: "s6", mandateStart: "2023-09-01",
    mandateEnd: "2026-06-30", notes: "Ancien membre (historique de mandat).",
  },
]
